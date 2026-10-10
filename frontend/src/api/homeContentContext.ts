import { createContext, useContext } from 'react'
import type { HomeContentState } from './useHomeContent.ts'

// Loaded once by the public Layout and shared, so the home page and the footer make one request.
export const HomeContentContext = createContext<HomeContentState>({ status: 'loading' })

export function useSharedHomeContent(): HomeContentState {
  return useContext(HomeContentContext)
}
