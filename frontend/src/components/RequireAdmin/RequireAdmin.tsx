import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router'
import { fetchCurrentAdmin } from '../../api/admin.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import type { AdminContext } from './useAdmin.ts'

type State =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; username: string | null }

/** Wraps every admin page except login: no session, no page. */
export function RequireAdmin() {
  const { t, lang } = useTranslation()
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    fetchCurrentAdmin()
      .then((username) => setState({ status: 'ready', username }))
      .catch(() => setState({ status: 'error' }))
  }, [])

  if (state.status === 'loading') return <p role="status">{t('admin.loading')}</p>
  if (state.status === 'error') return <p role="alert">{t('admin.error')}</p>
  if (state.username === null) return <Navigate to={`/${lang}/admin/login`} replace />
  return <Outlet context={{ username: state.username } satisfies AdminContext} />
}
