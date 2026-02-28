'use client';

/**
 * 프리셋 탭 — 학술 스타일 프리셋 적용
 */

import { useCallback } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { STYLE_PRESETS } from '@/lib/graph-studio/chart-spec-defaults';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import type { StylePreset } from '@/types/graph-studio';

interface PresetInfo {
  key: StylePreset;
  label: string;
  description: string;
}

const PRESET_LIST: PresetInfo[] = [
  {
    key: 'default',
    label: 'Default',
    description: '깔끔한 기본 스타일 (Arial, 컬러)',
  },
  {
    key: 'science',
    label: 'Science',
    description: 'Nature/Science 유사 (Times New Roman, 깔끔한 축)',
  },
  {
    key: 'ieee',
    label: 'IEEE',
    description: 'IEEE 학회 스타일 (흑백, 작은 폰트)',
  },
  {
    key: 'grayscale',
    label: 'Grayscale',
    description: '흑백 전용 (인쇄 친화, 패턴 구분)',
  },
];

export function PresetsTab(): React.ReactElement {
  const { chartSpec, updateChartSpec } = useGraphStudioStore();

  const handleApplyPreset = useCallback((presetKey: StylePreset) => {
    if (!chartSpec) return;
    const preset = STYLE_PRESETS[presetKey];
    updateChartSpec({
      ...chartSpec,
      style: { ...preset },
    });
  }, [chartSpec, updateChartSpec]);

  if (!chartSpec) {
    return <p className="text-sm text-muted-foreground">데이터를 먼저 업로드하세요</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">학술 스타일 프리셋을 선택하세요</p>

      {PRESET_LIST.map(preset => {
        const isActive = chartSpec.style.preset === preset.key;
        return (
          <Button
            key={preset.key}
            variant={isActive ? 'default' : 'outline'}
            className="w-full justify-between h-auto py-3 px-4"
            onClick={() => handleApplyPreset(preset.key)}
          >
            <div className="text-left">
              <div className="font-medium text-sm">{preset.label}</div>
              <div className={`text-xs mt-0.5 ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {preset.description}
              </div>
            </div>
            {isActive && <Check className="h-4 w-4 shrink-0 ml-2" />}
          </Button>
        );
      })}
    </div>
  );
}
