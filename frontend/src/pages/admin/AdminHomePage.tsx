import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { fetchCurrentAdmin, logout } from '../../api/admin.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import styles from './Admin.module.css'

type State =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; username: string | null }

export function AdminHomePage() {
  const { t, lang } = useTranslation()
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    fetchCurrentAdmin()
      .then((username) => setState({ status: 'ready', username }))
      .catch(() => setState({ status: 'error' }))
  }, [])

  async function handleLogout() {
    await logout()
    navigate(`/${lang}/admin/login`, { replace: true })
  }

  if (state.status === 'ready' && state.username === null) {
    return <Navigate to={`/${lang}/admin/login`} replace />
  }

  return (
    <section className={styles.card}>
      <title>{t('admin.title')}</title>
      <h1 className={styles.title}>{t('admin.title')}</h1>
      {state.status === 'loading' && <p role="status">{t('admin.loading')}</p>}
      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {t('admin.error')}
        </p>
      )}
      {state.status === 'ready' && (
        <>
          <p>
            {t('admin.connectedAs')} <strong>{state.username}</strong>
          </p>
          <button type="button" className={styles.button} onClick={handleLogout}>
            {t('admin.logout')}
          </button>
        </>
      )}
    </section>
  )
}
