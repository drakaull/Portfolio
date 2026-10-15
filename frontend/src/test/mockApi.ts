import { vi } from 'vitest'

type Handler = (init?: RequestInit) => Response | Promise<Response>

/** Fake backend: one handler per "METHOD /path"; anything else answers 404. */
export function mockApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const handler = handlers[`${init?.method ?? 'GET'} ${url}`]
    return handler ? handler(init) : new Response(null, { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export const signedIn = () => Response.json({ username: 'leonard' })
export const signedOut = () => new Response(null, { status: 401 })
export const noContent = () => new Response(null, { status: 204 })
