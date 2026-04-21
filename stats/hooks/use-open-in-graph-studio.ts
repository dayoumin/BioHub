import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store'
import { createAutoConfiguredChartSpec } from '@/lib/graph-studio/chart-spec-utils'
import type { ColumnMeta, ChartSpec, ChartType, DataPackage } from '@/types/graph-studio'

/** 어댑터 빌더 반환 공통 형태 */
export interface BuiltColumns {
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
  xField: string;
  yField: string | undefined;
  colorField?: string;
}

interface OpenOptions {
  built: BuiltColumns;
  chartType: ChartType;
  label: string;
  /** ChartSpec 생성 후 추가 커스터마이즈 (annotations, trendline 등) */
  customize?: (spec: ChartSpec) => void;
}

/**
 * Bio-Tools 결과를 Graph Studio로 핸드오프하는 공통 훅.
 * 반환된 함수를 호출하면 DataPackage + ChartSpec을 생성하고 /graph-studio로 이동.
 */
export function useOpenInGraphStudio(): (opts: OpenOptions) => void {
  const router = useRouter()
  const loadDataPackageWithSpec = useGraphStudioStore(s => s.loadDataPackageWithSpec)

  return useCallback((opts: OpenOptions) => {
    const { built, chartType, label, customize } = opts
    const pkgId = crypto.randomUUID()
    // histogram 등 yField가 undefined인 경우 xField로 대체 (createDefaultChartSpec이 필수 요구)
    const yField = built.yField ?? built.xField
    const spec = createAutoConfiguredChartSpec(pkgId, chartType, built.xField, yField, built.columns)

    if (built.colorField) {
      spec.encoding.color = { field: built.colorField, type: 'nominal' }
    }
    customize?.(spec)

    const pkg: DataPackage = {
      id: pkgId,
      source: 'bio-tools',
      label,
      columns: built.columns,
      data: built.data,
      lineageMode: 'manual',
      createdAt: new Date().toISOString(),
    }

    loadDataPackageWithSpec(pkg, spec)
    router.push('/graph-studio')
  }, [loadDataPackageWithSpec, router])
}
