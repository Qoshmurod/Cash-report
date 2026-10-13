import { existsSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';

export const PDF_FONTS = { REGULAR: 'DejaVu', BOLD: 'DejaVu-Bold' } as const;

const fontPath = (file: string): string => {
  // dist/common/pdf → dist/assets/fonts ; src/common/pdf → src/assets/fonts
  const candidate = join(__dirname, '..', '..', 'assets', 'fonts', file);
  if (!existsSync(candidate)) throw new Error(`PDF font not found: ${candidate}`);
  return candidate;
};

/** Creates a PDFKit document with a Unicode font (Latin, Uzbek ʻ/ʼ and Cyrillic glyphs). */
export const createPdf = (options: PDFKit.PDFDocumentOptions = {}): PDFKit.PDFDocument => {
  const doc = new PDFDocument({ bufferPages: true, ...options });
  doc.registerFont(PDF_FONTS.REGULAR, fontPath('DejaVuSans.ttf'));
  doc.registerFont(PDF_FONTS.BOLD, fontPath('DejaVuSans-Bold.ttf'));
  doc.font(PDF_FONTS.REGULAR);
  return doc;
};

export const pdfToBuffer = (doc: PDFKit.PDFDocument): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
