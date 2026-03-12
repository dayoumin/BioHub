'use client';

/**
 * 좌측 데이터 패널 (G5.1)
 *
 * A. 데이터 소스 카드 — 파일명, 행/변수 수
 * B. 변수 목록 — 타입 배지 + 현재 인코딩 역할 표시
 * C. 추천 차트 썸네일 — 데이터 기반 chart-recommender
 * D. 데이터 교체 버튼
 */

import { useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { recommendCharts } from '@/lib/graph-studio/chart-recommender';
import { inferColumnMeta, selectXYFields } from '@/lib/graph-studio/chart-spec-utils';
import { createDefaultChartSpec, CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults';
import { Button } from '@/components/ui/button';
import type { ChartType, ColumnMeta, DataPackage } from '@/types/graph-studio';
import {
  Database,
  Hash,
  Type as TypeIcon,
  Calendar,
  ListOrdered,
  RefreshCw,
} from 'lucide-react';
import { CHART_TYPE_ICONS } from '@/lib/graph-studio/chart-icons';

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

  const rowCount = dataPackage
    ? (Object.values(dataPackage.data)[0]?.length ?? 0)
    : 0;

  // 현재 인코딩에서 사용 중인 필드 → 역할 매핑
  const fieldRoles = new Map<string, string>();
  if (chartSpec) {
    if (chartSpec.encoding.x?.field) fieldRoles.set(chartSpec.encoding.x.field, 'X');
    if (chartSpec.encoding.y?.field) fieldRoles.set(chartSpec.encoding.y.field, 'Y');
    if (chartSpec.encoding.y2?.field) fieldRoles.set(chartSpec.encoding.y2.field, 'Y2');
    if (chartSpec.encoding.color?.field) fieldRoles.set(chartSpec.encoding.color.field, 'Color');
    if (chartSpec.encoding.shape?.field) fieldRoles.set(chartSpec.encoding.shape.field, 'Shape');
    if (chartSpec.encoding.size?.field) fieldRoles.set(chartSpec.encoding.size.field, 'Size');
    if (chartSpec.facet?.field) fieldRoles.set(chartSpec.facet.field, 'Facet');
  }

  // 추천 차트
  const recommendations = dataPackage ? recommendCharts(dataPackage.columns) : [];

  // 차트 유형 변경
  const handleChartTypeSelect = useCallback((chartType: ChartType) => {
    if (!dataPackage) return;
    const { xField, yField } = selectXYFields(dataPackage.columns, CHART_TYPE_HINTS[chartType]);
    const spec = createDefaultChartSpec(dataPackage.id, chartType, xField, yField, dataPackage.columns);
    loadDataPackageWithSpec(dataPackage, spec);
  }, [dataPackage, loadDataPackageWithSpec]);

  // 데이터 교체 (CSV 파일)
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (!result.data.length) return;
        const columns = inferColumnMeta(result.data);
        const data: Record<string, unknown[]> = Object.fromEntries(
          columns.map(col => [col.name, result.data.map(row => row[col.name])]),
        );
        const pkg: DataPackage = {
          id: `upload-${Date.now()}`,
          source: 'upload',
          label: file.name,
          columns,
          data,
          createdAt: new Date().toISOString(),
        };
        const chartType: ChartType = columns.some(c => c.type === 'nominal' || c.type === 'ordinal')
          && columns.some(c => c.type === 'quantitative') ? 'bar' : 'scatter';
        const { xField, yField } = selectXYFields(columns, CHART_TYPE_HINTS[chartType]);
        const spec = createDefaultChartSpec(pkg.id, chartType, xField, yField, columns);
        loadDataPackageWithSpec(pkg, spec);
      },
    });
    // 같은 파일 재선택 허용
    e.target.value = '';
  }, [loadDataPackageWithSpec]);

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

      {/* C. 추천 차트 */}
      {recommendations.length > 0 && (
        <div className="p-3 border-b border-border space-y-1.5">
          <h3 className="text-xs font-medium text-muted-foreground">추천 차트</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {recommendations.map(rec => {
              const Icon = CHART_TYPE_ICONS[rec.type];
              const isActive = chartSpec?.chartType === rec.type;
              return (
                <button
                  key={rec.type}
                  type="button"
                  onClick={() => handleChartTypeSelect(rec.type)}
                  className={[
                    'flex flex-col items-center gap-1 p-2 rounded-md border text-xs transition-colors',
                    isActive
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate w-full text-center">{rec.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* D. 데이터 교체 버튼 */}
      <div className="p-3 mt-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          className="sr-only"
          onChange={handleFileChange}
          data-testid="graph-studio-left-file-input"
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          데이터 교체
        </Button>
      </div>
    </div>
  );
}
