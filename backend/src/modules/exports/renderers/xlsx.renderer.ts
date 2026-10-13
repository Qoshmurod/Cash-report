import ExcelJS from 'exceljs';
import { ReportTable } from './report-table';

const HEADER_FILL = 'FF0F766E';
const ZEBRA_FILL = 'FFF1F5F9';
const MONEY_FORMAT = '#,##0';

export const renderXlsx = async (table: ReportTable): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = table.hospitalName;
  wb.created = new Date();
  const ws = wb.addWorksheet(table.title.slice(0, 31), { views: [{ state: 'frozen', ySplit: 0 }] });
  const lastCol = table.columns.length;

  ws.mergeCells(1, 1, 1, lastCol);
  ws.getCell(1, 1).value = `${table.hospitalName} — ${table.title}`;
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  ws.mergeCells(2, 1, 2, lastCol);
  ws.getCell(2, 1).value = table.period;
  ws.getCell(2, 1).font = { italic: true, color: { argb: 'FF475569' } };

  let rowIdx = 3;
  for (const s of table.summary) {
    ws.getCell(rowIdx, 1).value = s.label;
    ws.getCell(rowIdx, 1).font = { bold: true };
    ws.getCell(rowIdx, 2).value = s.value;
    rowIdx += 1;
  }
  rowIdx += 1;

  const headerRow = ws.getRow(rowIdx);
  table.columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    ws.getColumn(i + 1).width = c.width;
  });
  headerRow.height = 22;
  ws.views = [{ state: 'frozen', ySplit: rowIdx }];
  ws.autoFilter = { from: { row: rowIdx, column: 1 }, to: { row: rowIdx, column: lastCol } };

  table.rows.forEach((r, ri) => {
    const row = ws.getRow(rowIdx + 1 + ri);
    table.columns.forEach((c, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = r[c.key] ?? '';
      if (c.money) cell.numFmt = MONEY_FORMAT;
      cell.alignment = { horizontal: c.align ?? (c.money ? 'right' : 'left'), vertical: 'top', wrapText: true };
      if (ri % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_FILL } };
    });
  });

  ws.getCell(rowIdx + table.rows.length + 2, 1).value = `Generated: ${table.generatedAt}`;
  ws.getCell(rowIdx + table.rows.length + 2, 1).font = { size: 9, color: { argb: 'FF94A3B8' } };

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer as ArrayBuffer);
};
