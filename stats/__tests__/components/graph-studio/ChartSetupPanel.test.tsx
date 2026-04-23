import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartSetupPanel } from '@/components/graph-studio/ChartSetupPanel';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import type { DataPackage, GraphProject } from '@/types/graph-studio';
import type { StyleTemplate } from '@/lib/graph-studio/style-template-storage';

const loadTemplatesMock = vi.hoisted(() => vi.fn<() => StyleTemplate[]>(() => []));
vi.mock('@/lib/graph-studio/style-template-storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/graph-studio/style-template-storage')>(
    '@/lib/graph-studio/style-template-storage',
  );
  return {
    ...actual,
    loadTemplates: () => loadTemplatesMock(),
  };
});

function makeDataPackage(): DataPackage {
  return {
    id: 'pkg-1',
    source: 'upload',
    label: 'growth.csv',
    columns: [
      { name: 'group', type: 'nominal', uniqueCount: 2, sampleValues: ['control', 'treated'], hasNull: false },
      { name: 'value', type: 'quantitative', uniqueCount: 4, sampleValues: ['1', '2'], hasNull: false },
      { name: 'score', type: 'quantitative', uniqueCount: 4, sampleValues: ['3', '4'], hasNull: false },
      { name: 'batch', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
    ],
    data: {
      group: ['control', 'treated'],
      value: [1, 2],
      score: [3, 4],
      batch: ['A', 'B'],
    },
    createdAt: '2026-04-14T00:00:00.000Z',
  };
}

function makeProject(): GraphProject {
  return {
    id: 'proj-1',
    name: 'Saved Project',
    projectId: 'research-project-1',
    chartSpec: {
      version: '1.0',
      chartType: 'bar',
      title: 'Saved Project',
      data: { sourceId: 'pkg-1', columns: makeDataPackage().columns },
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
      },
      style: { preset: 'default' },
      annotations: [],
      exportConfig: { format: 'svg', dpi: 96, transparentBackground: true },
    },
    dataPackageId: 'pkg-1',
    createdAt: '2026-04-14T00:00:00.000Z',
    updatedAt: '2026-04-14T00:00:00.000Z',
  };
}

describe('ChartSetupPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    loadTemplatesMock.mockReturnValue([]);
    localStorage.clear();
    act(() => {
      useGraphStudioStore.getState().resetAll();
    });
  });

  it('applies preset selection through the real create flow and loads the normalized chart into the store', async () => {
    const user = userEvent.setup();

    act(() => {
      useGraphStudioStore.getState().loadDataOnly(makeDataPackage());
    });

    render(<ChartSetupPanel />);

    await user.click(screen.getByTestId('chart-setup-preset-ieee'));
    expect(screen.getByTestId('chart-setup-preset-ieee')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('chart-setup-preset-default')).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByTestId('chart-setup-create-btn'));

    const state = useGraphStudioStore.getState();
    expect(state.chartSpec).not.toBeNull();
    expect(state.chartSpec?.style.preset).toBe('ieee');
    expect(state.chartSpec?.data.sourceId).toBe('pkg-1');
    expect(state.currentProject).toBeNull();
    expect(state.specHistory).toHaveLength(1);
    expect(state.historyIndex).toBe(0);
  });

  it('applies template selection, preserves existing export-only settings, and keeps the current project binding', async () => {
    const user = userEvent.setup();
    const template: StyleTemplate = {
      id: 'tmpl-1',
      name: 'Journal Template',
      category: 'journal',
      style: {
        preset: 'science',
        font: { family: 'Times New Roman, serif' },
        showDataLabels: true,
        showSampleCounts: true,
      },
      exportConfig: {
        dpi: 600,
        physicalWidth: 85,
      },
      createdAt: '2026-04-14T00:00:00.000Z',
      updatedAt: '2026-04-14T00:00:00.000Z',
    };
    loadTemplatesMock.mockReturnValue([template]);

    act(() => {
      useGraphStudioStore.getState().setProject(makeProject(), makeDataPackage());
      useGraphStudioStore.getState().goToSetup();
    });

    render(<ChartSetupPanel />);

    await user.click(screen.getByTestId('chart-setup-type-scatter'));
    await user.click(screen.getByTestId('chart-setup-template-tmpl-1'));
    expect(screen.getByTestId('chart-setup-template-tmpl-1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('chart-setup-preset-science')).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByTestId('chart-setup-create-btn'));

    const state = useGraphStudioStore.getState();
    expect(state.currentProject?.id).toBe('proj-1');
    expect(state.linkedResearchProjectId).toBe('research-project-1');
    expect(state.chartSpec?.chartType).toBe('scatter');
    expect(state.chartSpec?.style.preset).toBe('science');
    expect(state.chartSpec?.style.showDataLabels).toBeUndefined();
    expect(state.chartSpec?.style.showSampleCounts).toBeUndefined();
    expect(state.chartSpec?.exportConfig).toEqual({
      format: 'svg',
      dpi: 600,
      physicalWidth: 85,
      transparentBackground: true,
    });
  });

  it('re-hydrates the matching template when reopening setup from an existing chart', async () => {
    const user = userEvent.setup();
    const template: StyleTemplate = {
      id: 'tmpl-match',
      name: 'Matching Template',
      category: 'journal',
      style: {
        preset: 'science',
        font: { family: 'Times New Roman, serif' },
      },
      exportConfig: {
        dpi: 600,
        physicalWidth: 85,
      },
      createdAt: '2026-04-14T00:00:00.000Z',
      updatedAt: '2026-04-14T00:00:00.000Z',
    };
    loadTemplatesMock.mockReturnValue([template]);

    const matchingProject: GraphProject = {
      ...makeProject(),
      chartSpec: {
        ...makeProject().chartSpec,
        style: { ...template.style },
        exportConfig: {
          format: 'png',
          dpi: 600,
          physicalWidth: 85,
        },
      },
    };

    act(() => {
      useGraphStudioStore.getState().setProject(matchingProject, makeDataPackage());
      useGraphStudioStore.getState().goToSetup();
    });

    render(<ChartSetupPanel />);

    expect(screen.getByTestId('chart-setup-template-tmpl-match')).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByTestId('chart-setup-create-btn'));

    const state = useGraphStudioStore.getState();
    expect(state.chartSpec?.style).toMatchObject({
      preset: 'science',
      font: { family: 'Times New Roman, serif' },
    });
    expect(state.chartSpec?.exportConfig).toMatchObject({
      format: 'png',
      dpi: 600,
      physicalWidth: 85,
    });
  });

  it('resets preset state when the selected template disappears from storage', async () => {
    const user = userEvent.setup();
    const template: StyleTemplate = {
      id: 'tmpl-2',
      name: 'Institution Template',
      category: 'institution',
      style: { preset: 'science' },
      exportConfig: { dpi: 300 },
      createdAt: '2026-04-14T00:00:00.000Z',
      updatedAt: '2026-04-14T00:00:00.000Z',
    };
    loadTemplatesMock.mockReturnValue([template]);

    act(() => {
      useGraphStudioStore.getState().loadDataOnly(makeDataPackage());
    });

    render(<ChartSetupPanel />);

    await user.click(screen.getByTestId('chart-setup-template-tmpl-2'));

    expect(screen.getByTestId('chart-setup-template-tmpl-2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('chart-setup-preset-default')).toHaveAttribute('aria-pressed', 'false');

    loadTemplatesMock.mockReturnValue([]);
    act(() => {
      window.dispatchEvent(new CustomEvent('graph-studio-style-templates-changed', {
        detail: ['tmpl-2'],
      }));
    });

    expect(screen.queryByTestId('chart-setup-template-tmpl-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('chart-setup-preset-default')).toHaveClass('text-primary');
    expect(screen.getByTestId('chart-setup-preset-default')).toHaveAttribute('aria-pressed', 'true');
  });
});
