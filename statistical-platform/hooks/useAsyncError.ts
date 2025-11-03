import { useCallback, useState } from 'react'

/**
 * Hook to throw errors that can be caught by Error Boundary
 * Useful for async errors that React Error Boundaries can't catch normally
 */
export const useAsyncError = () => {
  const [, setError] = useState()

  return useCallback(
    (error: Error) => {
      setError(() => {
        throw error
      })
    },
    []
  )
}