/** Promise.race with auto-cleanup timeout (no timer leak) */
export function raceWithTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timerId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timerId !== undefined) clearTimeout(timerId)
  })
}
