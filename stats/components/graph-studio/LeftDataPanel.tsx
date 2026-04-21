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
import { createAutoConfiguredChartSpec, selectXYFields } from '@/lib/graph-studio/chart-spec-utils';
import { CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults';
import {
  assignFieldRole,
  getFieldRoleMap,
  getRoleAssignmentVisibility,
  unassignFieldRole,
} from '@/lib/graph-studio/editor-actions';
import { toast } from 'sonner';
import { parseFile } from '@/lib/graph-studio/file-parser';
import { getDataSizeLevel, getRowCount } from '@/lib/graph-studio/chart-data-guard';
import { TOAST } from '@/lib/constants/toast-messages';
import { LargeDataBlockDialog } from './LargeDataBlockDialog';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { ColumnMeta, DataPackage, DataType } from '@/types/graph-studio';
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
  const disconnectProject = useGraphStudioStore(state => state.disconnectProject);
  const updateChartSpec = useGraphStudioStore(state => state.updateChartSpec);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedRowCount, setBlockedRowCount] = useState<number | null>(null);

  const rowCount = dataPackage ? getRowCount(dataPackage.data) : 0;

  // 현재 인코딩에서 사용 중인 필드 → 역할 매핑
  const fieldRoles = useMemo(() => {
    if (!chartSpec) return new Map<string, string>();
    return getFieldRoleMap(chartSpec);
  }, [chartSpec]);

  const roleVisibility = useMemo(
    () => (chartSpec ? getRoleAssignmentVisibility(chartSpec) : null),
    [chartSpec],
  );
  const canAssignColor = roleVisibility?.canAssignColor ?? false;
  const canAssignFacet = roleVisibility?.canAssignFacet ?? false;
  const canAssignY2 = roleVisibility?.canAssignY2 ?? false;

  const assignRole = useCallback((field: string, role: 'x' | 'y' | 'color' | 'facet' | 'y2', colType: DataType) => {
    if (!chartSpec) return;
    const nextSpec = assignFieldRole(chartSpec, field, role, colType);
    if (nextSpec) updateChartSpec(nextSpec);
  }, [chartSpec, updateChartSpec]);

  const unassignRole = useCallback((field: string) => {
    if (!chartSpec) return;
    const nextSpec = unassignFieldRole(chartSpec, field);
    if (nextSpec) updateChartSpec(nextSpec);
  }, [chartSpec, updateChartSpec]);

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
        lineageMode: 'manual',
        createdAt: new Date().toISOString(),
      };

      // 대용량 데이터 체크
      const incomingRowCount = getRowCount(pkg.data);
      const sizeLevel = getDataSizeLevel(incomingRowCount);
      if (sizeLevel === 'block') {
        setBlockedRowCount(incomingRowCount);
        return;
      }
      if (sizeLevel === 'warn') {
        toast.warning(TOAST.graphStudio.largeDataWarning(incomingRowCount));
      }

      // 기존 chartSpec에서 스타일 보존
      const existingSpec = chartSpec;
      const chartType = existingSpec?.chartType ?? 'bar';
      const { xField, yField } = selectXYFields(columns, CHART_TYPE_HINTS[chartType]);
      const newSpec = createAutoConfiguredChartSpec(pkg.id, chartType, xField, yField, columns);

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
      disconnectProject(); // 기존 프로젝트 덮어쓰기 방지
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 파싱 실패');
    } finally {
      setIsLoading(false);
    }
  }, [chartSpec, loadDataPackageWithSpec, disconnectProject]);

  return (
    <div
      className="flex h-full flex-col overflow-y-auto"
      data-testid="graph-studio-left-panel"
    >
      {/* A. 데이터 소스 카드 */}
      <div className="p-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg bg-surface-container-lowest px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
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
        <div className="px-3 pb-3">
          <div className="space-y-1.5 rounded-lg bg-surface-container-lowest p-2.5">
            <h3 className="px-1 text-xs font-medium text-muted-foreground">변수 목록</h3>
            <div className="space-y-0.5">
              {dataPackage.columns.map(col => (
                <VariableRow
                  key={col.name}
                  col={col}
                  role={fieldRoles.get(col.name)}
                  xField={chartSpec?.encoding.x.field ?? ''}
                  yField={chartSpec?.encoding.y.field ?? ''}
                  canAssignColor={canAssignColor}
                  canAssignFacet={canAssignFacet}
                  canAssignY2={canAssignY2}
                  onAssign={assignRole}
                  onUnassign={unassignRole}
                />
              ))}
            </div>
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

      <LargeDataBlockDialog
        open={blockedRowCount !== null}
        onOpenChange={() => setBlockedRowCount(null)}
        rowCount={blockedRowCount ?? 0}
      />
    </div>
  );
}

// ─── 변수 행 (Popover 자동 닫힘) ─────────────────────────

interface VariableRowProps {
  col: ColumnMeta;
  role: string | undefined;
  xField: string;
  yField: string;
  canAssignColor: boolean;
  canAssignFacet: boolean;
  canAssignY2: boolean;
  onAssign: (field: string, role: 'x' | 'y' | 'color' | 'facet' | 'y2', colType: DataType) => void;
  onUnassign: (field: string) => void;
}

function VariableRow({ col, role, xField, yField, canAssignColor, canAssignFacet, canAssignY2, onAssign, onUnassign }: VariableRowProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const cfg = TYPE_CONFIG[col.type];
  const Icon = cfg.icon;
  const isQuantitative = col.type === 'quantitative';
  const isCategorical = col.type === 'nominal' || col.type === 'ordinal';
  const canUnassign = role === 'Color' || role === 'Facet' || role === 'Y2';
  // useDataTabLogic parity: X===Y 방지 + Color/Y2에서 X/Y 필드 제외
  const isCurrentX = col.name === xField;
  const isCurrentY = col.name === yField;
  const isAxisField = isCurrentX || isCurrentY;

  const handleAssign = useCallback((r: 'x' | 'y' | 'color' | 'facet' | 'y2') => {
    onAssign(col.name, r, col.type);
    setOpen(false);
  }, [col.name, col.type, onAssign]);

  const handleUnassign = useCallback(() => {
    onUnassign(col.name);
    setOpen(false);
  }, [col.name, onUnassign]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-surface-container-low"
          data-testid={`left-panel-var-${col.name}`}
        >
          <Icon className={`h-3 w-3 shrink-0 ${cfg.color.split(' ')[0]}`} />
          <span className="truncate flex-1">{col.name}</span>
          {role && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-1 rounded shrink-0">
              {role}
            </span>
          )}
          <span className={`text-xs px-1 rounded shrink-0 ${cfg.color}`}>
            {cfg.label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1" side="right" align="start">
        <div className="space-y-0.5">
          <RoleMenuItem label="X축 지정" active={role === 'X'} disabled={isCurrentY} onClick={() => handleAssign('x')} />
          <RoleMenuItem label="Y축 지정" active={role === 'Y'} disabled={!isQuantitative || isCurrentX} onClick={() => handleAssign('y')} />
          {canAssignColor && (
            <RoleMenuItem label="색상 그룹" active={role === 'Color'} disabled={isAxisField} onClick={() => handleAssign('color')} />
          )}
          {canAssignFacet && (
            <RoleMenuItem label="패싯 분할" active={role === 'Facet'} disabled={!isCategorical} onClick={() => handleAssign('facet')} />
          )}
          {canAssignY2 && (
            <RoleMenuItem label="보조 Y축" active={role === 'Y2'} disabled={!isQuantitative || isAxisField} onClick={() => handleAssign('y2')} />
          )}
          {canUnassign && (
            <>
              <div className="my-1 h-1 rounded-full bg-surface-container-high" />
              <RoleMenuItem label="역할 해제" destructive onClick={handleUnassign} />
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── 역할 메뉴 항목 ─────────────────────────────────────

interface RoleMenuItemProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  onClick: () => void;
}

function RoleMenuItem({ label, active, disabled, destructive, onClick }: RoleMenuItemProps): React.ReactElement {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors
        ${disabled ? 'cursor-not-allowed text-muted-foreground/50' : 'cursor-pointer hover:bg-surface-container-low'}
        ${active ? 'bg-surface-container-high font-medium text-primary' : ''}
        ${destructive ? 'text-destructive hover:bg-destructive/10' : ''}`}
    >
      {label}
    </button>
  );
}
