import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StyleTab } from '@/components/graph-studio/panels/StyleTab';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import type { ChartSpec } from '@/types/graph-studio';
import type { StyleTemplate } from '@/lib/graph-studio/style-template-storage';

const loadTemplatesMock = vi.hoisted(() => vi.fn<() => StyleTemplate[]>(() => []));
const saveTemplateMock = vi.hoisted(() => vi.fn());
const deleteTemplateMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/graph-studio/style-template-storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/graph-studio/style-template-storage')>(
    '@/lib/graph-studio/style-template-storage',
  );
  return {
    ...actual,
    loadTemplates: () => loadTemplatesMock(),
    saveTemplate: (...args: unknown[]) => saveTemplateMock(...args),
    deleteTemplate: (...args: unknown[]) => deleteTemplateMock(...args),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

function makeChartSpec(): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    title: 'Test Chart',
    data: {
      sourceId: 'pkg-1',
      columns: [
        { name: 'group', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
        { name: 'value', type: 'quantitative', uniqueCount: 2, sampleValues: ['1', '2'], hasNull: false },
      ],
    },
    encoding: {
      x: { field: 'group', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    style: {
      preset: 'default',
      font: { family: 'Arial, Helvetica, sans-serif', titleSize: 14, labelSize: 11, axisTitleSize: 11, size: 12 },
    },
    annotations: [],
    exportConfig: { format: 'png', dpi: 300 },
  };
}

describe('StyleTab', () => {
  beforeEach(() => {
    if (!Element.prototype.hasPointerCapture) {
      Object.defineProperty(Element.prototype, 'hasPointerCapture', {
        configurable: true,
        value: () => false,
      });
    }
    if (!Element.prototype.setPointerCapture) {
      Object.defineProperty(Element.prototype, 'setPointerCapture', {
        configurable: true,
        value: () => undefined,
      });
    }
    if (!Element.prototype.releasePointerCapture) {
      Object.defineProperty(Element.prototype, 'releasePointerCapture', {
        configurable: true,
        value: () => undefined,
      });
    }
    if (!Element.prototype.scrollIntoView) {
      Object.defineProperty(Element.prototype, 'scrollIntoView', {
        configurable: true,
        value: () => undefined,
      });
    }

    vi.restoreAllMocks();
    loadTemplatesMock.mockReturnValue([]);
    saveTemplateMock.mockReset();
    deleteTemplateMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    localStorage.clear();

    act(() => {
      useGraphStudioStore.getState().resetAll();
      useGraphStudioStore.getState().setChartSpec(makeChartSpec());
    });
  });

  it('saves the current chart style as a reusable template', async () => {
    const user = userEvent.setup();
    act(() => {
      useGraphStudioStore.getState().setExportConfig({
        format: 'png',
        dpi: 300,
        physicalWidth: 85,
        transparentBackground: true,
      });
    });
    render(<StyleTab />);

    await user.click(screen.getByTestId('style-tab-save-template-btn'));
    await user.type(screen.getByTestId('style-tab-template-name-input'), 'Institution Report');
    await user.click(screen.getByTestId('style-tab-template-category-trigger'));
    const institutionOptions = screen.getAllByRole('option');
    await user.click(institutionOptions[institutionOptions.length - 1]!);
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(saveTemplateMock).toHaveBeenCalledTimes(1);
    expect(saveTemplateMock.mock.calls[0]?.[0]).toMatchObject({
      name: 'Institution Report',
      category: 'institution',
      style: expect.objectContaining({ preset: 'default' }),
      exportConfig: {
        dpi: 300,
        physicalWidth: 85,
      },
    });
    expect(saveTemplateMock.mock.calls[0]?.[0]).not.toHaveProperty('exportConfig.format');
    expect(saveTemplateMock.mock.calls[0]?.[0]).not.toHaveProperty('exportConfig.transparentBackground');
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it('applies a saved template to the current chart while preserving export-only settings', async () => {
    const user = userEvent.setup();
    const template: StyleTemplate = {
      id: 'tmpl-1',
      name: 'Journal Submission',
      category: 'journal',
      style: {
        preset: 'science',
        font: { family: 'Times New Roman, serif', titleSize: 12, labelSize: 9, axisTitleSize: 9, size: 10 },
      },
      exportConfig: {
        dpi: 600,
        physicalWidth: 85,
        physicalHeight: 60,
      },
      createdAt: '2026-04-23T00:00:00.000Z',
      updatedAt: '2026-04-23T00:00:00.000Z',
    };
    loadTemplatesMock.mockReturnValue([template]);

    act(() => {
      useGraphStudioStore.getState().setExportConfig({
        format: 'svg',
        dpi: 150,
        transparentBackground: true,
      });
    });

    render(<StyleTab />);

    await user.click(screen.getByTestId('style-tab-template-library-toggle'));
    await user.click(screen.getByTestId('style-tab-template-apply-tmpl-1'));

    const state = useGraphStudioStore.getState();
    expect(state.chartSpec?.style.preset).toBe('science');
    expect(state.chartSpec?.style.font?.family).toBe('Times New Roman, serif');
    expect(state.chartSpec?.exportConfig).toEqual({
      format: 'svg',
      dpi: 600,
      physicalWidth: 85,
      physicalHeight: 60,
      transparentBackground: true,
    });
  });

  it('clears stale physical size when the applied template uses dpi only', async () => {
    const user = userEvent.setup();
    const template: StyleTemplate = {
      id: 'tmpl-dpi-only',
      name: 'DPI Only',
      category: 'journal',
      style: {
        preset: 'ieee',
      },
      exportConfig: {
        dpi: 600,
      },
      createdAt: '2026-04-23T00:00:00.000Z',
      updatedAt: '2026-04-23T00:00:00.000Z',
    };
    loadTemplatesMock.mockReturnValue([template]);

    act(() => {
      useGraphStudioStore.getState().setExportConfig({
        format: 'png',
        dpi: 150,
        physicalWidth: 120,
        physicalHeight: 80,
        transparentBackground: true,
      });
    });

    render(<StyleTab />);

    await user.click(screen.getByTestId('style-tab-template-library-toggle'));
    await user.click(screen.getByTestId('style-tab-template-apply-tmpl-dpi-only'));

    const state = useGraphStudioStore.getState();
    expect(state.chartSpec?.exportConfig).toEqual({
      format: 'png',
      dpi: 600,
      transparentBackground: true,
    });
  });

  it('deletes a saved template from the style tab', async () => {
    const user = userEvent.setup();
    const template: StyleTemplate = {
      id: 'tmpl-delete',
      name: 'Delete Me',
      category: 'institution',
      style: { preset: 'ieee' },
      exportConfig: { dpi: 300 },
      createdAt: '2026-04-23T00:00:00.000Z',
      updatedAt: '2026-04-23T00:00:00.000Z',
    };
    loadTemplatesMock.mockReturnValue([template]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<StyleTab />);

    await user.click(screen.getByTestId('style-tab-template-library-toggle'));
    await user.click(screen.getByTestId('style-tab-template-delete-tmpl-delete'));

    expect(deleteTemplateMock).toHaveBeenCalledWith('tmpl-delete');
  });

  it('renames a saved template and updates its category', async () => {
    const user = userEvent.setup();
    const template: StyleTemplate = {
      id: 'tmpl-edit',
      name: 'Initial Template',
      category: 'institution',
      style: { preset: 'science' },
      exportConfig: { dpi: 300 },
      createdAt: '2026-04-23T00:00:00.000Z',
      updatedAt: '2026-04-23T00:00:00.000Z',
    };
    loadTemplatesMock.mockReturnValue([template]);

    render(<StyleTab />);

    await user.click(screen.getByTestId('style-tab-template-library-toggle'));
    await user.click(screen.getByTestId('style-tab-template-edit-tmpl-edit'));
    await user.clear(screen.getByTestId('style-tab-template-edit-name-tmpl-edit'));
    await user.type(screen.getByTestId('style-tab-template-edit-name-tmpl-edit'), 'Journal Template');
    await user.click(screen.getByTestId('style-tab-template-edit-category-trigger-tmpl-edit'));
    const journalOptions = screen.getAllByRole('option');
    await user.click(journalOptions[0]!);
    await user.click(screen.getByTestId('style-tab-template-edit-save-tmpl-edit'));

    expect(saveTemplateMock).toHaveBeenCalledTimes(1);
    expect(saveTemplateMock.mock.calls[0]?.[0]).toMatchObject({
      id: 'tmpl-edit',
      name: 'Journal Template',
      category: 'journal',
    });
  });

  it('marks only the exactly matching template as active with the real comparator', () => {
    const exactTemplate: StyleTemplate = {
      id: 'tmpl-exact',
      name: 'Exact Match',
      category: 'institution',
      style: makeChartSpec().style,
      exportConfig: { dpi: 300 },
      createdAt: '2026-04-23T00:00:00.000Z',
      updatedAt: '2026-04-23T00:00:00.000Z',
    };
    const nearTemplate: StyleTemplate = {
      id: 'tmpl-near',
      name: 'Near Match',
      category: 'institution',
      style: {
        preset: 'default',
        font: {
          family: 'Times New Roman, serif',
          titleSize: 14,
          labelSize: 11,
          axisTitleSize: 11,
          size: 12,
        },
      },
      exportConfig: { dpi: 300 },
      createdAt: '2026-04-23T00:00:00.000Z',
      updatedAt: '2026-04-23T00:00:00.000Z',
    };
    loadTemplatesMock.mockReturnValue([exactTemplate, nearTemplate]);

    render(<StyleTab />);

    expect(screen.getByTestId('style-tab-active-template')).toHaveTextContent('Exact Match');
    expect(screen.getByTestId('style-tab-active-template')).toHaveTextContent('기관용');
    act(() => {
      screen.getByTestId('style-tab-template-library-toggle').click();
    });
    expect(screen.getByTestId('style-tab-template-tmpl-exact')).toHaveClass('bg-surface-container-highest');
    expect(screen.getByTestId('style-tab-template-tmpl-near')).toHaveClass('bg-surface-container-low');
  });
});
