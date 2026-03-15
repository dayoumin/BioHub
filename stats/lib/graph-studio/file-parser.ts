/**
 * CSV / XLSX 공통 파일 파싱 유틸
 *
 * DataUploadPanel과 LeftDataPanel이 동일한 파싱 로직을 공유.
 * - CSV/TSV: papaparse
 * - XLSX/XLS: xlsx (dynamic import — 번들 분할)
 */

import Papa from 'papaparse';
import { inferColumnMeta } from '@/lib/graph-studio/chart-spec-utils';
import type { ColumnMeta } from '@/types/graph-studio';

export interface ParsedFileData {
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
}

/**
 * 파일을 파싱하여 columnar 데이터 반환.
 * @throws 파싱 실패, 빈 데이터, 지원하지 않는 확장자
 */
export async function parseFile(file: File): Promise<ParsedFileData> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  let rows: Record<string, unknown>[];

  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
    rows = await parseCsv(file, ext === 'tsv');
  } else if (ext === 'xlsx' || ext === 'xls') {
    rows = await parseExcel(file);
  } else {
    throw new Error('지원하는 형식: CSV, TSV, XLSX, XLS');
  }

  if (rows.length === 0) {
    throw new Error('데이터가 비어 있습니다');
  }

  const columns = inferColumnMeta(rows);
  const data: Record<string, unknown[]> = Object.fromEntries(
    columns.map(col => [col.name, rows.map(row => row[col.name])]),
  );

  return { columns, data };
}

function parseCsv(file: File, isTsv: boolean): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimiter: isTsv ? '\t' : ',',
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV 파싱 오류: ${results.errors[0].message}`));
          return;
        }
        resolve(results.data);
      },
      error: (err) => reject(new Error(err.message)),
    });
  });
}

async function parseExcel(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet || !workbook.Sheets[firstSheet]) {
    throw new Error('워크북에 시트가 없습니다');
  }
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[firstSheet],
  );
}
