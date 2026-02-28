'use client';

/**
 * 데이터 업로드 패널
 *
 * CSV/Excel 업로드 → 파싱 → ColumnMeta 추론 → chartSpec 자동 생성
 */

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { inferColumnMeta } from '@/lib/graph-studio';
import type { DataPackage } from '@/types/graph-studio';
import { Upload, FileSpreadsheet } from 'lucide-react';

export function DataUploadPanel(): React.ReactElement {
  const { loadDataPackage } = useGraphStudioStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // processData를 먼저 선언해야 parseCsv/parseExcel deps에 포함 가능
  const processData = useCallback((fileName: string, data: Record<string, unknown>[]) => {
    const sourceId = `${fileName}-${Date.now()}`;
    const columns = inferColumnMeta(data);

    // 열 지향 DataPackage 구성
    const dataRecord: Record<string, unknown[]> = {};
    for (const col of columns) {
      dataRecord[col.name] = data.map(row => row[col.name]);
    }

    const pkg: DataPackage = {
      id: sourceId,
      source: 'upload',
      label: fileName,
      columns,
      data: dataRecord,
      createdAt: new Date().toISOString(),
    };

    // 원자적: DataPackage 설정 + ChartSpec 자동 생성 (createChartSpecFromDataPackage 내부 호출)
    loadDataPackage(pkg);
  }, [loadDataPackage]);

  const parseCsv = useCallback(async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV 파싱 오류: ${results.errors[0].message}`));
            return;
          }

          const data = results.data;
          if (data.length === 0) {
            reject(new Error('데이터가 비어 있습니다'));
            return;
          }

          processData(file.name, data);
          resolve();
        },
        error: (err) => reject(new Error(err.message)),
      });
    });
  }, [processData]);

  const parseExcel = useCallback(async (file: File) => {
    // xlsx 라이브러리는 동적 import (번들 크기 절약)
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[firstSheet],
    );

    if (data.length === 0) {
      throw new Error('데이터가 비어 있습니다');
    }

    processData(file.name, data);
  }, [processData]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setIsLoading(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'csv' || ext === 'tsv') {
        await parseCsv(file);
      } else if (ext === 'xlsx' || ext === 'xls') {
        await parseExcel(file);
      } else {
        setError('지원하는 형식: CSV, TSV, XLSX, XLS');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 파싱 실패');
    } finally {
      setIsLoading(false);
    }
  }, [parseCsv, parseExcel]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      if (files[0]) handleFile(files[0]);
    },
    accept: {
      'text/csv': ['.csv', '.tsv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  return (
    <div className="w-full max-w-lg">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Graph Studio</h2>
        <p className="text-muted-foreground">
          학술 논문용 고품질 그래프를 만들어보세요
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'}
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          {isLoading ? (
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          ) : isDragActive ? (
            <Upload className="h-12 w-12 text-primary" />
          ) : (
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">
              {isLoading
                ? '데이터 처리 중...'
                : isDragActive
                  ? '파일을 놓으세요'
                  : '파일을 드래그하거나 클릭하세요'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              CSV, TSV, Excel (.xlsx) 지원
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
