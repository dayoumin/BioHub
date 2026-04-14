import { describe, expect, it, vi } from 'vitest';
import { persistGraphStudioSession } from '@/lib/graph-studio/session-coordinator';

describe('persistGraphStudioSession', () => {
  it('returns saved-without-snapshot when snapshot persistence fails after project save succeeds', async () => {
    const saveSnapshot = vi.fn<(_: { id: string }) => Promise<void>>().mockRejectedValue(new Error('idb failed'));
    const chartInstance = {
      getDataURL: () => 'data:image/png;base64,AA==',
      getWidth: () => 640,
      getHeight: () => 480,
    };

    const outcome = await persistGraphStudioSession({
      currentProjectName: undefined,
      chartTitle: 'Growth Curve',
      dataLabel: 'growth.csv',
      saveCurrentProject: () => 'proj-1',
      chartInstance,
      saveSnapshot,
      now: () => '2026-04-14T00:00:00.000Z',
    });

    expect(outcome).toMatchObject({
      status: 'saved-without-snapshot',
      name: 'Growth Curve',
      projectId: 'proj-1',
      reason: 'snapshot-failed',
    });
    if (outcome.status !== 'saved-without-snapshot') {
      throw new Error(`Unexpected outcome: ${outcome.status}`);
    }
    expect(outcome.error).toBeInstanceOf(Error);
    expect(saveSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      id: 'proj-1',
      updatedAt: '2026-04-14T00:00:00.000Z',
    }));
  });
});
