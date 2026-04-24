export interface ReadyToolLike {
  ready: boolean
}

export function filterReadyTools<T extends ReadyToolLike>(
  ids: readonly string[],
  toolMap: Readonly<Record<string, T | undefined>>,
): T[] {
  return ids
    .map((toolId) => toolMap[toolId])
    .filter((tool): tool is T => tool !== undefined && tool.ready)
}
