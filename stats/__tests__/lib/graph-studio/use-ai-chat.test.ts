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

  it('normalizes AI patch results before updating the store', async () => {
    vi.mocked(editChart).mockResolvedValueOnce({
      patches: [
        { op: 'add', path: '/encoding/y2', value: { field: 'secondary', type: 'quantitative' } },
        { op: 'add', path: '/facet', value: { field: 'group' } },
        { op: 'add', path: '/encoding/color', value: { field: 'group', type: 'nominal' } },
      ],
      explanation: '보조 축을 추가했습니다.',
      confidence: 0.8,
    });

    const spec = createDefaultChartSpec('src-1', 'bar', 'group', 'value', [
      { name: 'group', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
      { name: 'value', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
      { name: 'secondary', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
    ]);

    act(() => {
      useGraphStudioStore.getState().setChartSpec(spec);
    });

    const { result } = renderHook(() => useAiChat());

    act(() => {
      result.current.setInputValue('보조축 추가');
    });

    await act(async () => {
      await result.current.handleSend();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const nextSpec = useGraphStudioStore.getState().chartSpec;
    expect(nextSpec?.encoding.y2).toEqual({ field: 'secondary', type: 'quantitative' });
    expect(nextSpec?.facet).toBeUndefined();
    expect(nextSpec?.encoding.color).toBeUndefined();
    expect(result.current.messages.at(-1)?.role).toBe('assistant');
  });

  it('reselects compatible axes when AI changes only the chart type', async () => {
    vi.mocked(editChart).mockResolvedValueOnce({
      patches: [
        { op: 'replace', path: '/chartType', value: 'scatter' },
      ],
      explanation: '산점도로 변경했습니다.',
      confidence: 0.8,
    });

    const spec = createDefaultChartSpec('src-1', 'bar', 'group', 'value', [
      { name: 'group', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
      { name: 'value', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
      { name: 'secondary', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
    ]);

    act(() => {
      useGraphStudioStore.getState().setChartSpec(spec);
    });

    const { result } = renderHook(() => useAiChat());

    act(() => {
      result.current.setInputValue('산점도로 바꿔줘');
    });

    await act(async () => {
      await result.current.handleSend();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const nextSpec = useGraphStudioStore.getState().chartSpec;
    expect(nextSpec?.chartType).toBe('scatter');
    expect(nextSpec?.encoding.x.type).toBe('quantitative');
    expect(nextSpec?.encoding.y.type).toBe('quantitative');
    expect(nextSpec?.encoding.x.field).not.toBe(nextSpec?.encoding.y.field);
  });

  it('reselects compatible axes when AI changes chart type and only axis types', async () => {
    vi.mocked(editChart).mockResolvedValueOnce({
      patches: [
        { op: 'replace', path: '/chartType', value: 'scatter' },
        { op: 'replace', path: '/encoding/x/type', value: 'quantitative' },
      ],
      explanation: '산점도로 정리했습니다.',
      confidence: 0.82,
    });

    const initialSpec = makeSpec();
    initialSpec.data.columns.push({
      name: 'secondary',
      type: 'quantitative',
      uniqueCount: 10,
      sampleValues: [],
      hasNull: false,
    });
    act(() => {
      useGraphStudioStore.getState().updateChartSpec(initialSpec);
    });

    const { result } = renderHook(() => useAiChat());

    act(() => {
      result.current.setInputValue('scatter로 바꿔줘');
    });

    await act(async () => {
      await result.current.handleSend();
    });

    const nextSpec = useGraphStudioStore.getState().chartSpec;
    expect(nextSpec?.chartType).toBe('scatter');
    expect(nextSpec?.encoding.x.type).toBe('quantitative');
    expect(nextSpec?.encoding.y.type).toBe('quantitative');
    expect(['value', 'secondary']).toContain(nextSpec?.encoding.x.field);
    expect(['value', 'secondary']).toContain(nextSpec?.encoding.y.field);
    expect(nextSpec?.encoding.x.field).not.toBe(nextSpec?.encoding.y.field);
  });
});
