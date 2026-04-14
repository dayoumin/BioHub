import type { ChartSnapshot } from '@/lib/graph-studio/chart-snapshot-storage';
import { dataUrlToUint8Array } from '@/lib/graph-studio/chart-snapshot-storage';
import { TOAST } from '@/lib/constants/toast-messages';

export const GRAPH_STUDIO_PROJECT_ROUTE_KEY = 'project';

interface RestoreProjectFromRouteInput {
  routeProjectId: string | null;
  currentProjectId: string | null;
  detachedProjectId: string | null;
}

interface ClearProjectRouteInput {
  routeProjectId: string | null;
  currentProjectId: string | null;
  detachedProjectId: string | null;
  routeProjectExists: boolean;
}

interface ResolveProjectRouteHrefInput {
  pathname: string;
  searchParams: URLSearchParams;
  projectId: string | null;
}

interface ResolveProjectRouteSyncHrefInput {
  pathname: string;
  searchParams: URLSearchParams;
  routeProjectId: string | null;
  currentProjectId: string | null;
  detachedProjectId: string | null;
  routeProjectExists: boolean;
}

interface SnapshotCaptureInstance {
  getDataURL: (options: {
    type: 'png';
    pixelRatio: number;
    backgroundColor: string;
  }) => string;
  getWidth: () => number;
  getHeight: () => number;
  getOption?: () => unknown;
}

interface PersistGraphStudioSessionInput {
  currentProjectName: string | undefined;
  chartTitle: string | undefined;
  dataLabel: string | undefined;
  saveCurrentProject: (name: string) => string | null;
  chartInstance: SnapshotCaptureInstance | null;
  saveSnapshot: (snapshot: ChartSnapshot) => Promise<void>;
  now?: () => string;
}

export type GraphStudioSessionSaveOutcome =
  | {
    status: 'save-error';
    name: string;
  }
  | {
    status: 'saved';
    name: string;
    projectId: string;
    snapshot: ChartSnapshot;
  }
  | {
    status: 'saved-without-snapshot';
    name: string;
    projectId: string;
    reason: 'missing-chart-instance' | 'snapshot-failed';
    error?: unknown;
  };

export interface GraphStudioSaveToastPayload {
  level: 'success' | 'warning' | 'error';
  message: string;
}

const GRAPH_STUDIO_SNAPSHOT_PIXEL_RATIO = 2;
const GRAPH_STUDIO_SNAPSHOT_BACKGROUND = '#ffffff';

function resolveSnapshotBackgroundColor(chartInstance: SnapshotCaptureInstance): string {
  if (typeof chartInstance.getOption !== 'function') {
    return GRAPH_STUDIO_SNAPSHOT_BACKGROUND;
  }

  const option = chartInstance.getOption();
  if (
    option !== null &&
    typeof option === 'object' &&
    'backgroundColor' in option &&
    typeof option.backgroundColor === 'string' &&
    option.backgroundColor.trim() !== ''
  ) {
    return option.backgroundColor;
  }

  return GRAPH_STUDIO_SNAPSHOT_BACKGROUND;
}

export function makeGraphStudioProjectChatStorageKey(baseKey: string, projectId: string): string {
  return `${baseKey}:project:${projectId}`;
}

export function makeGraphStudioDraftChatStorageKey(baseKey: string, sourceId: string): string {
  return `${baseKey}:draft:${sourceId}`;
}

export function resolveGraphStudioChatStorageKey(
  baseKey: string,
  currentProjectId: string | null,
  draftSourceId: string | null,
): string {
  if (currentProjectId) {
    return makeGraphStudioProjectChatStorageKey(baseKey, currentProjectId);
  }

  return draftSourceId
    ? makeGraphStudioDraftChatStorageKey(baseKey, draftSourceId)
    : baseKey;
}

export function resolveGraphProjectName(
  currentProjectName: string | undefined,
  chartTitle: string | undefined,
  dataLabel: string | undefined,
): string {
  const currentName = currentProjectName?.trim();
  if (currentName) return currentName;

  const trimmedTitle = chartTitle?.trim();
  if (trimmedTitle) return trimmedTitle;

  const trimmedDataLabel = dataLabel?.trim();
  if (trimmedDataLabel) return trimmedDataLabel;

  return 'Untitled Chart';
}

export function resolveDetachedProjectId(
  previousProjectId: string | null,
  currentProjectId: string | null,
  detachedProjectId: string | null,
): string | null {
  if (previousProjectId !== null && currentProjectId === null) {
    return previousProjectId;
  }

  if (currentProjectId !== null) {
    return null;
  }

  return detachedProjectId;
}

export function resolveGraphStudioProjectRouteHref({
  pathname,
  searchParams,
  projectId,
}: ResolveProjectRouteHrefInput): string {
  const nextParams = new URLSearchParams(searchParams.toString());

  if (projectId !== null) {
    nextParams.set(GRAPH_STUDIO_PROJECT_ROUTE_KEY, projectId);
  } else {
    nextParams.delete(GRAPH_STUDIO_PROJECT_ROUTE_KEY);
  }

  const nextQuery = nextParams.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function resolveGraphStudioProjectRouteSyncHref({
  pathname,
  searchParams,
  routeProjectId,
  currentProjectId,
  detachedProjectId,
  routeProjectExists,
}: ResolveProjectRouteSyncHrefInput): string | null {
  if (currentProjectId !== null) {
    if (routeProjectId === currentProjectId) return null;
    return resolveGraphStudioProjectRouteHref({
      pathname,
      searchParams,
      projectId: currentProjectId,
    });
  }

  if (!shouldClearProjectRoute({
    routeProjectId,
    currentProjectId,
    detachedProjectId,
    routeProjectExists,
  })) {
    return null;
  }

  return resolveGraphStudioProjectRouteHref({
    pathname,
    searchParams,
    projectId: null,
  });
}

export function createGraphStudioSnapshot(
  projectId: string,
  chartInstance: SnapshotCaptureInstance,
  updatedAt: string,
): ChartSnapshot {
  const dataUrl = chartInstance.getDataURL({
    type: 'png',
    pixelRatio: GRAPH_STUDIO_SNAPSHOT_PIXEL_RATIO,
    backgroundColor: resolveSnapshotBackgroundColor(chartInstance),
  });

  return {
    id: projectId,
    data: dataUrlToUint8Array(dataUrl),
    cssWidth: chartInstance.getWidth(),
    cssHeight: chartInstance.getHeight(),
    pixelRatio: GRAPH_STUDIO_SNAPSHOT_PIXEL_RATIO,
    updatedAt,
  };
}

export async function persistGraphStudioSession({
  currentProjectName,
  chartTitle,
  dataLabel,
  saveCurrentProject,
  chartInstance,
  saveSnapshot,
  now = () => new Date().toISOString(),
}: PersistGraphStudioSessionInput): Promise<GraphStudioSessionSaveOutcome> {
  const name = resolveGraphProjectName(currentProjectName, chartTitle, dataLabel);
  const projectId = saveCurrentProject(name);

  if (!projectId) {
    return { status: 'save-error', name };
  }

  if (!chartInstance) {
    return {
      status: 'saved-without-snapshot',
      name,
      projectId,
      reason: 'missing-chart-instance',
    };
  }

  try {
    const snapshot = createGraphStudioSnapshot(projectId, chartInstance, now());
    await saveSnapshot(snapshot);
    return {
      status: 'saved',
      name,
      projectId,
      snapshot,
    };
  } catch (error) {
    return {
      status: 'saved-without-snapshot',
      name,
      projectId,
      reason: 'snapshot-failed',
      error,
    };
  }
}

export function resolveGraphStudioSaveToastPayload(
  outcome: GraphStudioSessionSaveOutcome,
): GraphStudioSaveToastPayload {
  switch (outcome.status) {
    case 'saved':
      return {
        level: 'success',
        message: TOAST.project.savedToProject(outcome.name),
      };
    case 'saved-without-snapshot':
      return {
        level: 'warning',
        message: TOAST.graphStudio.savedWithoutSnapshot(outcome.name),
      };
    case 'save-error':
      return {
        level: 'error',
        message: TOAST.graphStudio.saveError,
      };
  }
}

export function shouldRestoreProjectFromRoute({
  routeProjectId,
  currentProjectId,
  detachedProjectId,
}: RestoreProjectFromRouteInput): boolean {
  if (!routeProjectId) return false;
  if (currentProjectId === routeProjectId) return false;
  if (detachedProjectId === routeProjectId) return false;
  return true;
}

export function shouldClearProjectRoute({
  routeProjectId,
  currentProjectId,
  detachedProjectId,
  routeProjectExists,
}: ClearProjectRouteInput): boolean {
  if (!routeProjectId || currentProjectId !== null) return false;

  const shouldClearDetachedRoute =
    detachedProjectId !== null &&
    routeProjectId === detachedProjectId;
  const shouldClearMissingRoute = !routeProjectExists;

  return shouldClearDetachedRoute || shouldClearMissingRoute;
}
