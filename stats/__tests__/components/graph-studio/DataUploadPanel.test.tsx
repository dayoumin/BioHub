import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphProject } from '@/types/graph-studio';
import { DataUploadPanel } from '@/components/graph-studio/DataUploadPanel';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';

const pushMock = vi.hoisted(() => vi.fn());
const listProjectsMock = vi.hoisted(() => vi.fn<() => GraphProject[]>(() => []));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => pushMock(...args),
  }),
}));

vi.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    isDragActive: false,
  }),
}));

vi.mock('@/lib/graph-studio/project-storage', () => ({
  GRAPH_PROJECTS_CHANGED_EVENT: 'graph-studio-projects-changed',
  listProjects: () => listProjectsMock(),
}));

describe('DataUploadPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    listProjectsMock.mockReturnValue([]);
    act(() => {
      useGraphStudioStore.getState().resetAll();
    });
  });

  it('keeps template selection out of the upload step', () => {
    render(<DataUploadPanel />);

    expect(screen.queryByTestId(/graph-studio-template-/)).not.toBeInTheDocument();
    expect(screen.getByText(/스타일 시작점은 다음 단계에서 고르고/i)).toBeInTheDocument();
  });

  it('still shows template guidance when recent projects are present', () => {
    const project: GraphProject = {
      id: 'project-1',
      name: 'Recent Project',
      chartSpec: {
        version: '1.0',
        chartType: 'bar',
        title: 'Recent Project',
        data: {
          sourceId: 'pkg-1',
          columns: [
            { name: 'group', type: 'nominal', uniqueCount: 1, sampleValues: ['A'], hasNull: false },
            { name: 'value', type: 'quantitative', uniqueCount: 1, sampleValues: ['1'], hasNull: false },
          ],
        },
        encoding: {
          x: { field: 'group', type: 'nominal' },
          y: { field: 'value', type: 'quantitative' },
        },
        style: { preset: 'default' },
        annotations: [],
        exportConfig: { format: 'png', dpi: 96 },
      },
      dataPackageId: 'pkg-1',
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
    };
    listProjectsMock.mockReturnValue([project]);

    render(<DataUploadPanel />);

    expect(screen.getByText(/스타일 시작점은 다음 단계에서 고르고/i)).toBeInTheDocument();
  });
});
