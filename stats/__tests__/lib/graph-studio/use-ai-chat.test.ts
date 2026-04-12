import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultChartSpec } from '@/lib/graph-studio/chart-spec-defaults';
import { STORAGE_KEYS } from '@/lib/constants/storage-keys';
import { useAiChat } from '@/lib/graph-studio/use-ai-chat';
import { editChart } from '@/lib/graph-studio/ai-service';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import type { AiEditResponse, ChartSpec, GraphProject } from '@/types/graph-studio';

vi.mock('@/lib/graph-studio/ai-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/graph-studio/ai-service')>(
    '@/lib/graph-studio/ai-service',
  );

  return {
    ...actual,
    editChart: vi.fn(),
  };
});

function makeSpec(sourceId = 'src-1', title = 'Initial Title'): ChartSpec {
  const spec = createDefaultChartSpec(sourceId, 'bar', 'group', 'value', [
    { name: 'group', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
    { name: 'value', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
  ]);
  spec.title = title;
  return spec;
}

function makeProject(spec: ChartSpec, id = 'project-1'): GraphProject {
  const now = new Date().toISOString();
  return {
    id,
    name: 'Graph Project',
    chartSpec: spec,
    dataPackageId: '',
    createdAt: now,
    updatedAt: now,
  };
}

describe('useAiChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    act(() => {
      useGraphStudioStore.getState().resetAll();
    });
  });

  it('rejects stale AI responses when the chart changed during the request', async () => {
    let deferredResolve!: (value: AiEditResponse) => void;
    const deferredPromise = new Promise<AiEditResponse>((resolve) => {
      deferredResolve = resolve;
    });
    vi.mocked(editChart).mockImplementationOnce(() => deferredPromise);

    act(() => {
      useGraphStudioStore.getState().setChartSpec(makeSpec('src-1', 'Original Title'));
    });

    const { result } = renderHook(() => useAiChat());

    act(() => {
      result.current.setInputValue('Change the title');
    });

    act(() => {
      void result.current.handleSend();
    });

    act(() => {
      useGraphStudioStore.getState().updateChartSpec(makeSpec('src-1', 'User Changed Title'));
    });

    deferredResolve({
      patches: [{ op: 'replace', path: '/title', value: 'AI Title' }],
      explanation: 'Changed the title.',
      confidence: 0.9,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(useGraphStudioStore.getState().chartSpec?.title).toBe('User Changed Title');
    expect(result.current.messages.at(-1)?.role).toBe('error');
    expect(result.current.messages.some((message) => message.role === 'assistant')).toBe(false);
  });

  it('loads chat history from the project-scoped storage key', async () => {
    const spec = makeSpec('src-1', 'Scoped Title');
    const project = makeProject(spec, 'project-42');
    const baseKey = STORAGE_KEYS.graphStudio.aiChat;
    const projectKey = `${baseKey}:project:project-42`;

    act(() => {
      useGraphStudioStore.getState().setProject(project);
    });

    localStorage.setItem(
      baseKey,
      JSON.stringify([{ id: 'global', role: 'assistant', content: 'global-history' }]),
    );
    localStorage.setItem(
      projectKey,
      JSON.stringify([{ id: 'project', role: 'assistant', content: 'project-history' }]),
    );

    const { result } = renderHook(() => useAiChat());

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });

    expect(result.current.messages[0]?.content).toBe('project-history');
  });

  it('keeps chat history when the session detaches from a saved project', async () => {
    const spec = makeSpec('src-1', 'Scoped Title');
    const project = makeProject(spec, 'project-42');
    const baseKey = STORAGE_KEYS.graphStudio.aiChat;
    const projectKey = `${baseKey}:project:project-42`;
    const draftKey = `${baseKey}:draft:src-1`;

    act(() => {
      useGraphStudioStore.getState().setProject(project);
    });

    localStorage.setItem(
      projectKey,
      JSON.stringify([{ id: 'project', role: 'assistant', content: 'project-history' }]),
    );

    const { result, rerender } = renderHook(() => useAiChat());

    await waitFor(() => {
      expect(result.current.messages[0]?.content).toBe('project-history');
    });

    act(() => {
      useGraphStudioStore.getState().disconnectProject();
    });
    rerender();

    await waitFor(() => {
      expect(result.current.messages[0]?.content).toBe('project-history');
    });

    expect(localStorage.getItem(draftKey)).toContain('project-history');
  });
});
