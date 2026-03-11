'use client';

/**
 * 좌측 데이터 패널 (G5.0 — placeholder 골격)
 *
 * G5.1에서 구체적 내용 구현 예정:
 * - 데이터 소스 카드
 * - 변수 목록 (드래그 가능)
 * - 추천 차트 유형 그리드
 */

import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { Database } from 'lucide-react';

export function LeftDataPanel(): React.ReactElement {
  const dataPackage = useGraphStudioStore(state => state.dataPackage);

  return (
    <div
      className="flex flex-col h-full overflow-y-auto p-3 space-y-3"
      data-testid="graph-studio-left-panel"
    >
      {/* 데이터 소스 요약 */}
      <div className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5" />
          데이터 소스
        </h3>
        {dataPackage ? (
          <div className="text-xs space-y-0.5">
            <p className="font-medium truncate">{dataPackage.label}</p>
            <p className="text-muted-foreground">
              {dataPackage.columns.length}개 변수 · {Object.values(dataPackage.data)[0]?.length ?? 0}행
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">데이터 없음</p>
        )}
      </div>

      {/* 변수 목록 — G5.1 구현 예정 */}
      {dataPackage && (
        <div className="space-y-1">
          <h3 className="text-xs font-medium text-muted-foreground">변수 목록</h3>
          <div className="space-y-0.5">
            {dataPackage.columns.map(col => (
              <div
                key={col.name}
                className="text-xs px-2 py-1 rounded bg-muted/50 flex items-center justify-between"
              >
                <span className="truncate">{col.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                  {col.type === 'quantitative' ? 'Q' : col.type === 'nominal' ? 'N' : col.type === 'ordinal' ? 'O' : 'T'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
