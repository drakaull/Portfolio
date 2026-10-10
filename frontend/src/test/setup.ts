import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Node 25+ exposes an experimental global localStorage that is empty without --localstorage-file
// and shadows jsdom's; put jsdom's working implementation back.
if (typeof localStorage.clear !== 'function') {
  const { jsdom } = globalThis as unknown as { jsdom: { window: Window } }
  Object.defineProperty(globalThis, 'localStorage', {
    value: jsdom.window.localStorage,
    configurable: true,
  })
}

// No test reaches the real backend: by default API calls stay pending; tests stub fetch as needed.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  )
})

// Vitest globals are off, so Testing Library cannot register its automatic cleanup.
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
