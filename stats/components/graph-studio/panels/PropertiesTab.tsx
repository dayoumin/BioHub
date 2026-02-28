'use client';

/**
 * 속성 탭 — 차트 유형, 축, 색상 등 직접 편집
 */

import { useCallback, useState, useEffect } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults';
import { selectXYFields } from '@/lib/graph-studio/chart-spec-utils';
import type { ChartType } from '@/types/graph-studio';

export function PropertiesTab(): React.ReactElement {
  const { chartSpec, updateChartSpec } = useGraphStudioStore();

  // 제목 입력: 로컬 state → onBlur 시에만 updateChartSpec
  // onChange마다 updateChartSpec하면 키입력 하나당 undo history 항목 생성
  const [titleInput, setTitleInput] = useState(chartSpec?.title ?? '');

  // chartSpec.title 외부 변경(AI 편집 등) 시 로컬 입력 동기화
  useEffect(() => {
    setTitleInput(chartSpec?.title ?? '');
  }, [chartSpec?.title]);

  const handleTitleBlur = useCallback(() => {
    if (!chartSpec) return;
    const newTitle = titleInput.trim() || undefined;
    if (newTitle !== chartSpec.title) {
      updateChartSpec({ ...chartSpec, title: newTitle });
    }
  }, [chartSpec, titleInput, updateChartSpec]);

  const handleChartTypeChange = useCallback((value: string) => {
    if (!chartSpec) return;
    const newType = value as ChartType;
    const hint = CHART_TYPE_HINTS[newType];
    const columns = chartSpec.data.columns;

    // 차트 유형에 맞는 x/y 필드 재선택 (encoding 동기화)
    const { xField, yField } = selectXYFields(columns, hint);
    const xCol = columns.find(c => c.name === xField);
    const yCol = columns.find(c => c.name === yField);

    updateChartSpec({
      ...chartSpec,
      chartType: newType,
      encoding: {
        ...chartSpec.encoding,
        x: { ...chartSpec.encoding.x, field: xField, type: xCol?.type ?? hint.suggestedXType },
        y: { ...chartSpec.encoding.y, field: yField, type: yCol?.type ?? 'quantitative' },
      },
    });
  }, [chartSpec, updateChartSpec]);

  const handleXFieldChange = useCallback((value: string) => {
    if (!chartSpec) return;
    // y와 동일 필드 선택 방지 (scatter 등 중복 버그)
    if (value === chartSpec.encoding.y.field) return;
    const column = chartSpec.data.columns.find(c => c.name === value);
    updateChartSpec({
      ...chartSpec,
      encoding: {
        ...chartSpec.encoding,
        x: {
          ...chartSpec.encoding.x,
          field: value,
          type: column?.type ?? 'nominal',
        },
      },
    });
  }, [chartSpec, updateChartSpec]);

  const handleYFieldChange = useCallback((value: string) => {
    if (!chartSpec) return;
    // x와 동일 필드 선택 방지 (scatter 등 중복 버그)
    if (value === chartSpec.encoding.x.field) return;
    const column = chartSpec.data.columns.find(c => c.name === value);
    updateChartSpec({
      ...chartSpec,
      encoding: {
        ...chartSpec.encoding,
        y: {
          ...chartSpec.encoding.y,
          field: value,
          type: column?.type ?? 'quantitative',
        },
      },
    });
  }, [chartSpec, updateChartSpec]);

  if (!chartSpec) {
    return <p className="text-sm text-muted-foreground">데이터를 먼저 업로드하세요</p>;
  }

  const columns = chartSpec.data.columns;

  return (
    <div className="space-y-4">
      {/* 차트 제목 */}
      <div className="space-y-1.5">
        <Label htmlFor="chart-title" className="text-xs">제목</Label>
        <Input
          id="chart-title"
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="차트 제목"
          className="h-8 text-sm"
        />
      </div>

      {/* 차트 유형 */}
      <div className="space-y-1.5">
        <Label className="text-xs">차트 유형</Label>
        <Select value={chartSpec.chartType} onValueChange={handleChartTypeChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CHART_TYPE_HINTS).map(([type, hint]) => (
              <SelectItem key={type} value={type} className="text-sm">
                {hint.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* X축 */}
      <div className="space-y-1.5">
        <Label className="text-xs">X축</Label>
        <Select value={chartSpec.encoding.x.field} onValueChange={handleXFieldChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {columns.map(col => (
              <SelectItem
                key={col.name}
                value={col.name}
                className="text-sm"
                disabled={col.name === chartSpec.encoding.y.field}
              >
                {col.name} ({col.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Y축 */}
      <div className="space-y-1.5">
        <Label className="text-xs">Y축</Label>
        <Select value={chartSpec.encoding.y.field} onValueChange={handleYFieldChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {columns.map(col => (
              <SelectItem
                key={col.name}
                value={col.name}
                className="text-sm"
                disabled={col.name === chartSpec.encoding.x.field}
              >
                {col.name} ({col.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
