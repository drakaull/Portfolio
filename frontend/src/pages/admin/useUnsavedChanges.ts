import { useEffect, type RefObject } from 'react'
import { useBlocker, type Blocker } from 'react-router'

// "/fr/admin/..." and "/en/admin/..." are the same page: switching the UI language keeps the form.
const withoutLang = (pathname: string) => pathname.replace(/^\/[^/]+/, '')

/**
 * Asks before leaving a form with unsaved changes, inside the app (returned blocker, shown with
 * UnsavedChangesDialog) and when closing the tab. Set `leaving` to true right before navigating
 * away after a save or a delete: nothing is left to lose then.
 */
export function useUnsavedChanges(dirty: boolean, leaving?: RefObject<boolean>): Blocker {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !leaving?.current &&
      dirty &&
      withoutLang(currentLocation.pathname) !== withoutLang(nextLocation.pathname),
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  return blocker
}
