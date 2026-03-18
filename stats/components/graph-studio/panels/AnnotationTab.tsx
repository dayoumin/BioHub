'use client';

/**
 * 주석 탭 — hline/vline 수동 편집기
 *
 * 우측 패널에서 수평선/수직선 참조선을 직접 추가·삭제.
 * text 주석은 픽셀 좌표 입력이 비직관적이므로 AI 채팅 사용 권장.
 */

import { useState, useCallback } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import type { HLineAnnotation, VLineAnnotation, AnnotationSpec } from '@/types/graph-studio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Trash2 } from 'lucide-react';

interface AnnotationForm {
  value: string;
  text: string;
  color: string;
  dashed: boolean;
}

const DEFAULT_FORM: AnnotationForm = {
  value: '',
  text: '',
  color: '#999999',
  dashed: false,
};

export function AnnotationTab(): React.ReactElement | null {
  const chartSpec = useGraphStudioStore((s) => s.chartSpec);
  const updateChartSpec = useGraphStudioStore((s) => s.updateChartSpec);

  const [showHlineForm, setShowHlineForm] = useState(false);
  const [showVlineForm, setShowVlineForm] = useState(false);
  const [hlineForm, setHlineForm] = useState<AnnotationForm>(DEFAULT_FORM);
  const [vlineForm, setVlineForm] = useState<AnnotationForm>(DEFAULT_FORM);

  const annotations: AnnotationSpec[] = chartSpec?.annotations ?? [];

  const updateAnnotations = useCallback((next: AnnotationSpec[]) => {
    if (!chartSpec) return;
    updateChartSpec({ ...chartSpec, annotations: next });
  }, [chartSpec, updateChartSpec]);

  const deleteAnnotation = useCallback((index: number) => {
    updateAnnotations(annotations.filter((_, i) => i !== index));
  }, [annotations, updateAnnotations]);

  const addHline = useCallback(() => {
    const val = parseFloat(hlineForm.value);
    if (isNaN(val)) return;
    const ann: HLineAnnotation = {
      type: 'hline',
      value: val,
      ...(hlineForm.text && { text: hlineForm.text }),
      color: hlineForm.color,
      ...(hlineForm.dashed && { strokeDash: [4, 4] }),
    };
    updateAnnotations([...annotations, ann]);
    setHlineForm(DEFAULT_FORM);
    setShowHlineForm(false);
  }, [hlineForm, annotations, updateAnnotations]);

  const addVline = useCallback(() => {
    const raw = vlineForm.value.trim();
    if (!raw) return;
    const numVal = Number(raw);
    const val: number | string = isNaN(numVal) ? raw : numVal;
    const ann: VLineAnnotation = {
      type: 'vline',
      value: val,
      ...(vlineForm.text && { text: vlineForm.text }),
      color: vlineForm.color,
      ...(vlineForm.dashed && { strokeDash: [4, 4] }),
    };
    updateAnnotations([...annotations, ann]);
    setVlineForm(DEFAULT_FORM);
    setShowVlineForm(false);
  }, [vlineForm, annotations, updateAnnotations]);

  if (!chartSpec) return null;

  return (
    <div className="space-y-3 py-1">

      {/* ── 수평선 ── */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium">수평선 (Y축)</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setShowHlineForm((v) => !v)}
            title={showHlineForm ? '닫기' : '수평선 추가'}
          >
            {showHlineForm ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          </Button>
        </div>

        {showHlineForm && (
          <div className="space-y-2 mb-2 p-2 border rounded-md bg-muted/30">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Y값 *</Label>
                <Input
                  className="h-7 text-xs mt-0.5"
                  placeholder="예: 0.05"
                  value={hlineForm.value}
                  onChange={(e) => setHlineForm((f) => ({ ...f, value: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && addHline()}
                />
              </div>
              <div>
                <Label className="text-xs">레이블</Label>
                <Input
                  className="h-7 text-xs mt-0.5"
                  placeholder="선택사항"
                  value={hlineForm.text}
                  onChange={(e) => setHlineForm((f) => ({ ...f, text: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && addHline()}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">색상</Label>
                <input
                  type="color"
                  className="h-6 w-8 cursor-pointer rounded border"
                  value={hlineForm.color}
                  onChange={(e) => setHlineForm((f) => ({ ...f, color: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Switch
                  id="hline-dashed"
                  checked={hlineForm.dashed}
                  onCheckedChange={(v) => setHlineForm((f) => ({ ...f, dashed: v }))}
                  className="scale-75 origin-left"
                />
                <Label htmlFor="hline-dashed" className="text-xs">점선</Label>
              </div>
              <Button
                size="sm"
                className="h-7 text-xs ml-auto"
                onClick={addHline}
                disabled={!hlineForm.value}
              >
                추가
              </Button>
            </div>
          </div>
        )}

        {annotations.some((a) => a.type === 'hline') ? (
          <ul className="space-y-1">
            {annotations.map((ann, i) =>
              ann.type !== 'hline' ? null : (
                <li
                  key={i}
                  className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-muted/40"
                >
                  <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0 font-mono">
                    H
                  </Badge>
                  <span
                    className="font-mono flex-1 truncate"
                    title={`Y=${ann.value}${ann.text ? ` "${ann.text}"` : ''}`}
                  >
                    Y={ann.value}
                    {ann.text && <span className="text-muted-foreground ml-1">"{ann.text}"</span>}
                  </span>
                  {ann.strokeDash && (
                    <span className="text-muted-foreground text-[10px]">- -</span>
                  )}
                  <button
                    onClick={() => deleteAnnotation(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              )
            )}
          </ul>
        ) : (
          !showHlineForm && (
            <p className="text-xs text-muted-foreground px-1">없음</p>
          )
        )}
      </section>

      <div className="border-t" />

      {/* ── 수직선 ── */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium">수직선 (X축)</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setShowVlineForm((v) => !v)}
            title={showVlineForm ? '닫기' : '수직선 추가'}
          >
            {showVlineForm ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          </Button>
        </div>

        {showVlineForm && (
          <div className="space-y-2 mb-2 p-2 border rounded-md bg-muted/30">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">X값 *</Label>
                <Input
                  className="h-7 text-xs mt-0.5"
                  placeholder="숫자 또는 카테고리명"
                  value={vlineForm.value}
                  onChange={(e) => setVlineForm((f) => ({ ...f, value: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && addVline()}
                />
              </div>
              <div>
                <Label className="text-xs">레이블</Label>
                <Input
                  className="h-7 text-xs mt-0.5"
                  placeholder="선택사항"
                  value={vlineForm.text}
                  onChange={(e) => setVlineForm((f) => ({ ...f, text: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && addVline()}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">색상</Label>
                <input
                  type="color"
                  className="h-6 w-8 cursor-pointer rounded border"
                  value={vlineForm.color}
                  onChange={(e) => setVlineForm((f) => ({ ...f, color: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Switch
                  id="vline-dashed"
                  checked={vlineForm.dashed}
                  onCheckedChange={(v) => setVlineForm((f) => ({ ...f, dashed: v }))}
                  className="scale-75 origin-left"
                />
                <Label htmlFor="vline-dashed" className="text-xs">점선</Label>
              </div>
              <Button
                size="sm"
                className="h-7 text-xs ml-auto"
                onClick={addVline}
                disabled={!vlineForm.value.trim()}
              >
                추가
              </Button>
            </div>
          </div>
        )}

        {annotations.some((a) => a.type === 'vline') ? (
          <ul className="space-y-1">
            {annotations.map((ann, i) =>
              ann.type !== 'vline' ? null : (
                <li
                  key={i}
                  className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-muted/40"
                >
                  <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0 font-mono">
                    V
                  </Badge>
                  <span
                    className="font-mono flex-1 truncate"
                    title={`X=${ann.value}${ann.text ? ` "${ann.text}"` : ''}`}
                  >
                    X={ann.value}
                    {ann.text && <span className="text-muted-foreground ml-1">"{ann.text}"</span>}
                  </span>
                  {ann.strokeDash && (
                    <span className="text-muted-foreground text-[10px]">- -</span>
                  )}
                  <button
                    onClick={() => deleteAnnotation(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              )
            )}
          </ul>
        ) : (
          !showVlineForm && (
            <p className="text-xs text-muted-foreground px-1">없음</p>
          )
        )}
      </section>

    </div>
  );
}
