'use client';

/**
 * 좌측 데이터 패널 (G5.1)
 *
 * A. 데이터 소스 카드 — 파일명, 행/변수 수
 * B. 변수 목록 — 타입 배지 + 현재 인코딩 역할 표시
 * C. 데이터 교체 버튼
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { selectXYFields } from '@/lib/graph-studio/chart-spec-utils';
import { createDefaultChartSpec, CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults';
import { parseFile } from '@/lib/graph-studio/file-parser';
import { Button } from '@/components/ui/button';
import type { ColumnMeta, DataPackage } from '@/types/graph-studio';
import {
  Database,
  Hash,
  Type as TypeIcon,
  Calendar,
  ListOrdered,
  RefreshCw,
} from 'lucide-react';

// ─── 타입 배지 설정 ──────────────────────────────────────

const TYPE_CONFIG: Record<ColumnMeta['type'], { icon: React.ElementType; label: string; color: string }> = {
  quantitative: { icon: Hash, label: 'Num', color: 'text-blue-600 bg-blue-50' },
  nominal:      { icon: TypeIcon, label: 'Cat', color: 'text-emerald-600 bg-emerald-50' },
  ordinal:      { icon: ListOrdered, label: 'Ord', color: 'text-amber-600 bg-amber-50' },
  temporal:     { icon: Calendar, label: 'Date', color: 'text-violet-600 bg-violet-50' },
};

// ─── 컴포넌트 ────────────────────────────────────────────

export function LeftDataPanel(): React.ReactElement {
  const dataPackage = useGraphStudioStore(state => state.dataPackage);
  const chartSpec = useGraphStudioStore(state => state.chartSpec);
  const loadDataPackageWithSpec = useGraphStudioStore(state => state.loadDataPackageWithSpec);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rowCount = dataPackage
    ? (Object.values(dataPackage.data)[0]?.length ?? 0)
    : 0;

  // 현재 인코딩에서 사용 중인 필드 → 역할 매핑
  const fieldRoles = useMemo(() => {
    const map = new Map<string, string>();
    if (chartSpec) {
      if (chartSpec.encoding.x?.field) map.set(chartSpec.encoding.x.field, 'X');
      if (chartSpec.encoding.y?.field) map.set(chartSpec.encoding.y.field, 'Y');
      if (chartSpec.encoding.y2?.field) map.set(chartSpec.encoding.y2.field, 'Y2');
      if (chartSpec.encoding.color?.field) map.set(chartSpec.encoding.color.field, 'Color');
      if (chartSpec.encoding.shape?.field) map.set(chartSpec.encoding.shape.field, 'Shape');
      if (chartSpec.encoding.size?.field) map.set(chartSpec.encoding.size.field, 'Size');
      if (chartSpec.facet?.field) map.set(chartSpec.facet.field, 'Facet');
    }
    return map;
  }, [chartSpec]);

  // 데이터 교체 (CSV/XLSX) — 기존 스타일 보존
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 같은 파일 재선택 허용
    e.target.value = '';

    setIsLoading(true);
    setError(null);
    try {
      const { columns, data } = await parseFile(file);
      const pkg: DataPackage = {
        id: `upload-${Date.now()}`,
        source: 'upload',
        label: file.name,
        columns,
        data,
        createdAt: new Date().toISOString(),
      };

      // 기존 chartSpec에서 스타일 보존
      const existingSpec = chartSpec;
      const chartType = existingSpec?.chartType ?? 'bar';
      const { xField, yField } = selectXYFields(columns, CHART_TYPE_HINTS[chartType]);
      const newSpec = createDefaultChartSpec(pkg.id, chartType, xField, yField, columns);

      if (existingSpec) {
        // 스타일 + 주석 + 출력 설정 복원
        newSpec.style = { ...existingSpec.style };
        newSpec.exportConfig = { ...existingSpec.exportConfig };
        newSpec.annotations = [...existingSpec.annotations];
        // orientation 보존 (수평 막대)
        if (existingSpec.orientation) {
          newSpec.orientation = existingSpec.orientation;
        }
        // aggregate.groupBy — 새 컬럼에 있는 필드만 유지
        if (existingSpec.aggregate) {
          const colNames = new Set(columns.map(c => c.name));
          const validGroupBy = existingSpec.aggregate.groupBy.filter(f => colNames.has(f));
          if (validGroupBy.length > 0) {
            newSpec.aggregate = { y: existingSpec.aggregate.y, groupBy: validGroupBy };
          }
        }
      }

      loadDataPackageWithSpec(pkg, newSpec);
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 파싱 실패');
    } finally {
      setIsLoading(false);
    }
  }, [chartSpec, loadDataPackageWithSpec]);

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      data-testid="graph-studio-left-panel"
    >
      {/* A. 데이터 소스 카드 */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Database className="h-4 w-4 text-primary" />
          </div>
          {dataPackage ? (
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{dataPackage.label}</p>
              <p className="text-xs text-muted-foreground">
                {dataPackage.columns.length}개 변수 · {rowCount}행
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">데이터 없음</p>
          )}
        </div>
      </div>

      {/* B. 변수 목록 */}
      {dataPackage && (
        <div className="p-3 border-b border-border space-y-1.5">
          <h3 className="text-xs font-medium text-muted-foreground">변수 목록</h3>
          <div className="space-y-0.5">
            {dataPackage.columns.map(col => {
              const cfg = TYPE_CONFIG[col.type];
              const Icon = cfg.icon;
              const role = fieldRoles.get(col.name);
              return (
                <div
                  key={col.name}
                  className="flex items-center gap-1.5 text-xs px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                >
                  <Icon className={`h-3 w-3 shrink-0 ${cfg.color.split(' ')[0]}`} />
                  <span className="truncate flex-1">{col.name}</span>
                  {role && (
                    <span className="text-[10px] font-medium text-primary bg-primary/10 px-1 rounded shrink-0">
                      {role}
                    </span>
                  )}
                  <span className={`text-[10px] px-1 rounded shrink-0 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* C. 에러 + 데이터 교체 버튼 */}
      <div className="p-3 mt-auto space-y-2">
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt,.xlsx,.xls"
          className="sr-only"
          onChange={handleFileChange}
          data-testid="graph-studio-left-file-input"
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? '처리 중...' : '데이터 교체 (스타일 유지)'}
        </Button>
      </div>
    </div>
  );
}
