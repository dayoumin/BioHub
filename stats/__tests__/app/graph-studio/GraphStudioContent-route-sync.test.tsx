import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GraphStudioContent, { resolveGraphProjectName } from '@/app/graph-studio/GraphStudioContent';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import * as projectStorage from '@/lib/graph-studio/project-storage';
import type { ChartSpec, GraphProject } from '@/types/graph-studio';

vi.mock('next/navigation', () => ({
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({
    replace: (href: string) => {
      window.history.replaceState({}, '', href);
    },
  }),
}));

vi.mock('@/components/graph-studio/GraphStudioHeader', () => ({
  GraphStudioHeader: () => <div data-testid="graph-studio-header" />,
}));

vi.mock('@/components/graph-studio/DataUploadPanel', () => ({
  DataUploadPanel: () => <div data-testid="graph-studio-upload" />,
}));

vi.mock('@/components/graph-studio/ChartSetupPanel', () => ({
  ChartSetupPanel: () => <div data-testid="graph-studio-setup" />,
}));

vi.mock('@/components/graph-studio/ChartPreview', () => ({
  ChartPreview: () => <div data-testid="graph-studio-preview" />,
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

function makeSpec(title = 'Saved Graph'): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    title,
    data: { sourceId: 'src-1', columns: [] },
    encoding: {
      x: { field: 'group', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 96 },
  };
}

function makeProject(id = 'proj-1'): GraphProject {
  const now = new Date().toISOString();
  return {
    id,
    name: 'Saved Graph',
    chartSpec: makeSpec(),
    dataPackageId: '',
    createdAt: now,
    updatedAt: now,
  };
}

describe('GraphStudioContent route sync', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    act(() => {
      useGraphStudioStore.getState().resetAll();
    });
    window.history.replaceState({}, '', '/graph-studio');
  });

  it('writes the current project id into the route when the session attaches to a project', async () => {
    render(<GraphStudioContent />);

    act(() => {
      useGraphStudioStore.getState().setProject(makeProject());
    });

    await waitFor(() => {
      expect(window.location.search).toBe('?project=proj-1');
    });
  });

  it('clears a stale project query after the session detaches from that project', async () => {
    vi.spyOn(projectStorage, 'loadProject').mockReturnValue(makeProject());
    window.history.replaceState({}, '', '/graph-studio?project=proj-1');

    render(<GraphStudioContent />);

    await waitFor(() => {
      expect(useGraphStudioStore.getState().currentProject?.id).toBe('proj-1');
    });

    act(() => {
      useGraphStudioStore.getState().clearData();
    });

    await waitFor(() => {
      expect(window.location.search).toBe('');
    });
  });

  it('restores a project when the route query changes inside the same page session', async () => {
    const project = makeProject('proj-2');
    vi.spyOn(projectStorage, 'loadProject').mockImplementation((projectId: string) => {
      return projectId === 'proj-2' ? project : null;
    });

    const view = render(<GraphStudioContent />);

    act(() => {
      window.history.pushState({}, '', '/graph-studio?project=proj-2');
    });
    view.rerender(<GraphStudioContent />);

    await waitFor(() => {
      expect(useGraphStudioStore.getState().currentProject?.id).toBe('proj-2');
    });
  });
});

describe('resolveGraphProjectName', () => {
  it('prefers the existing saved project name', () => {
    expect(resolveGraphProjectName('Saved Name', 'Chart Title', 'dataset.csv')).toBe('Saved Name');
  });

  it('falls back to the chart title before the data label', () => {
    expect(resolveGraphProjectName(undefined, 'Chart Title', 'dataset.csv')).toBe('Chart Title');
  });

  it('falls back to the data label when the chart title is blank', () => {
    expect(resolveGraphProjectName(undefined, '   ', 'dataset.csv')).toBe('dataset.csv');
  });

  it('returns Untitled Chart only when every source is blank', () => {
    expect(resolveGraphProjectName(undefined, '   ', '  ')).toBe('Untitled Chart');
  });
});
