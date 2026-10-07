import { createPdf, PDF_FONTS, pdfToBuffer } from '../../../common/pdf/pdf.util';
import { formatMoney } from '../../../common/utils/money.util';
import { ReportTable } from './report-table';

const MARGIN = 28;
const HEADER_BG = '#0f766e';
const ZEBRA_BG = '#f1f5f9';
const FONT_SIZE = 7.5;
const CELL_PADDING = 3;

/** A4 landscape table with repeated header rows and page numbers. */
export const renderPdf = async (table: ReportTable): Promise<Buffer> => {
  const doc = createPdf({ size: 'A4', layout: 'landscape', margin: MARGIN, info: { Title: table.title } });
  const pageWidth = doc.page.width - MARGIN * 2;
  const totalWeight = table.columns.reduce((acc, c) => acc + c.width, 0);
  const widths = table.columns.map((c) => (c.width / totalWeight) * pageWidth);
  const bottom = () => doc.page.height - MARGIN - 14;

  doc.font(PDF_FONTS.BOLD).fontSize(14).fillColor('#0f172a').text(`${table.hospitalName} — ${table.title}`);
  doc.font(PDF_FONTS.REGULAR).fontSize(9).fillColor('#475569').text(table.period);
  doc.moveDown(0.4);
  for (const s of table.summary) {
    doc.font(PDF_FONTS.BOLD).fontSize(9).fillColor('#0f172a').text(`${s.label}: `, { continued: true }).font(PDF_FONTS.REGULAR).text(s.value);
  }
  doc.moveDown(0.6);

  const cellText = (value: unknown, money?: boolean): string => {
    if (value === null || value === undefined) return '';
    if (money && typeof value === 'number') return formatMoney(value);
    return String(value);
  };

  const rowHeight = (values: string[], font: string): number => {
    doc.font(font).fontSize(FONT_SIZE);
    return Math.max(...values.map((v, i) => doc.heightOfString(v || ' ', { width: widths[i] - CELL_PADDING * 2 }))) + CELL_PADDING * 2;
  };

  const drawRow = (values: string[], opts: { header?: boolean; zebra?: boolean }) => {
    const font = opts.header ? PDF_FONTS.BOLD : PDF_FONTS.REGULAR;
    const h = rowHeight(values, font);
    if (doc.y + h > bottom()) {
      doc.addPage();
      if (!opts.header) drawHeader();
    }
    const y = doc.y;
    if (opts.header || opts.zebra) doc.rect(MARGIN, y, pageWidth, h).fill(opts.header ? HEADER_BG : ZEBRA_BG);
    let x = MARGIN;
    values.forEach((v, i) => {
      const col = table.columns[i];
      doc
        .font(font)
        .fontSize(FONT_SIZE)
        .fillColor(opts.header ? '#ffffff' : '#0f172a')
        .text(v, x + CELL_PADDING, y + CELL_PADDING, {
          width: widths[i] - CELL_PADDING * 2,
          align: opts.header ? 'center' : (col.align ?? (col.money ? 'right' : 'left')),
        });
      x += widths[i];
    });
    doc.y = y + h;
  };

  const drawHeader = () => drawRow(table.columns.map((c) => c.header), { header: true });

  drawHeader();
  table.rows.forEach((r, i) => drawRow(table.columns.map((c) => cellText(r[c.key], c.money)), { zebra: i % 2 === 1 }));
  if (!table.rows.length) doc.font(PDF_FONTS.REGULAR).fontSize(9).fillColor('#64748b').text('—', MARGIN, doc.y + 6);

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font(PDF_FONTS.REGULAR)
      .fontSize(7)
      .fillColor('#94a3b8')
      .text(`${table.generatedAt} · ${i + 1}/${range.count}`, MARGIN, doc.page.height - MARGIN - 4, {
        width: pageWidth,
        align: 'right',
        lineBreak: false,
      });
    doc.page.margins.bottom = bottomMargin;
  }
  return pdfToBuffer(doc);
};
