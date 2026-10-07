export type CellValue = string | number | null;

export interface ReportColumn {
  key: string;
  header: string;
  /** Relative width (PDF) / character width (XLSX). */
  width: number;
  money?: boolean;
  align?: 'left' | 'right' | 'center';
}

export interface ReportTable {
  title: string;
  period: string;
  summary: { label: string; value: string }[];
  columns: ReportColumn[];
  rows: Record<string, CellValue>[];
  generatedAt: string;
  hospitalName: string;
}
