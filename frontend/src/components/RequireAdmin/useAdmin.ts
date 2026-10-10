import { useOutletContext } from 'react-router'

export type AdminContext = { username: string }

/** The signed-in admin, for pages rendered inside RequireAdmin. */
export function useAdmin() {
  return useOutletContext<AdminContext>()
}
