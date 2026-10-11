import { useEffect, useState } from 'react'

export type JsonState<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'notFound' }
  | { status: 'ready'; data: T }

type Result<T> = { url: string; state: JsonState<T> }

/** GET a JSON resource; a new `url` aborts the previous request so a slow answer cannot win. */
export function useJson<T>(url: string): JsonState<T> {
  const [result, setResult] = useState<Result<T> | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(url, { signal: controller.signal })
      .then(async (response): Promise<JsonState<T>> => {
        if (response.status === 404) return { status: 'notFound' }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return { status: 'ready', data: (await response.json()) as T }
      })
      .then((state) => setResult({ url, state }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ url, state: { status: 'error' } })
      })
    return () => controller.abort()
  }, [url])

  // A result for another URL means the current request is still in flight.
  return result?.url === url ? result.state : { status: 'loading' }
}
