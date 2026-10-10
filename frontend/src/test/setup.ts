import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Node 25+ exposes an experimental global localStorage that is empty without --localstorage-file
// and shadows jsdom's; put jsdom's working implementation back.
if (typeof localStorage.clear !== 'function') {
  const { jsdom } = globalThis as unknown as { jsdom: { window: Window } }
  Object.defineProperty(globalThis, 'localStorage', {
    value: jsdom.window.localStorage,
    configurable: true,
  })
}

// Vitest globals are off, so Testing Library cannot register its automatic cleanup.
afterEach(cleanup)
