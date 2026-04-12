import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GraphStudioContent from '@/app/graph-studio/GraphStudioContent';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import type { ChartSpec, DataPackage } from '@/types/graph-studio';

const saveSnapshotMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastWarningMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({
    replace: (href: string) => {
      window.history.replaceState({}, '', href);
    },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    warning: (...args: unknown[]) => toastWarningMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

vi.mock('@/lib/graph-studio/chart-snapshot-storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/graph-studio/chart-snapshot-storage')>(
    '@/lib/graph-studio/chart-snapshot-storage',
  );

  return {
    ...actual,
    saveSnapshot: (...args: unknown[]) => saveSnapshotMock(...args),
  };
});

vi.mock('@/components/graph-studio/GraphStudioHeader', () => ({
  GraphStudioHeader: ({
    onSave,
    isSaving,
  }: {
    onSave?: () => void;
    isSaving?: boolean;
  }) => (
    <button
      type="button"
      data-testid="graph-studio-save"
      onClick={onSave}
      disabled={isSaving}
    >
      {isSaving ? 'saving' : 'save'}
    </button>
  ),
}));

vi.mock('@/components/graph-studio/DataUploadPanel', () => ({
  DataUploadPanel: () => <div data-testid="graph-studio-upload" />,
}));

vi.mock('@/components/graph-studio/ChartSetupPanel', () => ({
  ChartSetupPanel: () => <div data-testid="graph-studio-setup" />,
}));

vi.mock('@/components/graph-studio/LeftDataPanel', () => ({
  LeftDataPanel: () => <div data-testid="graph-studio-left-panel" />,
}));

vi.mock('@/components/graph-studio/RightPropertyPanel', () => ({
  RightPropertyPanel: () => <div data-testid="graph-studio-right-panel" />,
}));

vi.mock('@/components/graph-studio/AiPanel', () => ({
  AiPanel: () => <div data-testid="graph-studio-ai-panel" />,
}));

const fakeEchartsInstance = {
  getDataURL: vi.fn(() => 'data:image/png;base64,AA=='),
  getWidth: vi.fn(() => 640),
  getHeight: vi.fn(() => 480),
};

vi.mock('@/components/graph-studio/ChartPreview', () => ({
  ChartPreview: ({
    echartsRef,
  }: {
    echartsRef: { current: unknown };
  }) => {
    echartsRef.current = {
      getEchartsInstance: () => fakeEchartsInstance,
    };
    return <div data-testid="graph-studio-preview" />;
  },
}));

function makeSpec(title = 'Growth Curve'): ChartSpec {
  return {
    version: '1.0',
    chartType: 'line',
    title,
    data: { sourceId: 'src-1', columns: [] },
    encoding: {
      x: { field: 'time', type: 'temporal' },
      y: { field: 'value', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 96 },
  };
}

function makePkg(label = 'growth-data.csv'): DataPackage {
  return {
    id: 'pkg-1',
    source: 'upload',
    label,
    columns: [],
    data: {},
    createdAt: new Date().toISOString(),
  };
}

describe('GraphStudioContent save flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    saveSnapshotMock.mockReset();
    toastSuccessMock.mockReset();
    toastWarningMock.mockReset();
    toastErrorMock.mockReset();
    fakeEchartsInstance.getDataURL.mockReturnValue('data:image/png;base64,AA==');

    act(() => {
      useGraphStudioStore.getState().resetAll();
      useGraphStudioStore.getState().loadDataPackageWithSpec(makePkg(), makeSpec());
    });

    window.history.replaceState({}, '', '/graph-studio');
  });

  it('uses the chart title as the first saved project name', async () => {
    saveSnapshotMock.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<GraphStudioContent />);

    await user.click(screen.getByTestId('graph-studio-save'));

    await waitFor(() => {
      expect(useGraphStudioStore.getState().currentProject?.name).toBe('Growth Curve');
    });
  });

  it('keeps the previous snapshot and warns when snapshot persistence fails', async () => {
    saveSnapshotMock.mockRejectedValue(new Error('idb failed'));
    const user = userEvent.setup();

    render(<GraphStudioContent />);

    await user.click(screen.getByTestId('graph-studio-save'));

    await waitFor(() => {
      expect(saveSnapshotMock).toHaveBeenCalled();
    });

    expect(toastWarningMock).toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalled();
  });
});
