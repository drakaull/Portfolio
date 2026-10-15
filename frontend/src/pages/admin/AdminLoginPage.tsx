import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { login, type LoginResult } from '../../api/admin.ts'
import { Button } from '../../components/Button/Button.tsx'
import { useTranslation } from '../../i18n/useTranslation.ts'
import type { TranslationKey } from '../../i18n/en.ts'
import styles from './Admin.module.css'

const ERRORS: Record<Exclude<LoginResult, 'ok'>, TranslationKey> = {
  invalid: 'admin.login.invalid',
  blocked: 'admin.login.blocked',
  error: 'admin.error',
}

export function AdminLoginPage() {
  const { t, lang } = useTranslation()
  const navigate = useNavigate()
  const [error, setError] = useState<TranslationKey | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    const result = await login(String(form.get('username')), String(form.get('password')))
    setSubmitting(false)
    if (result === 'ok') {
      navigate(`/${lang}/admin`, { replace: true })
    } else {
      setError(ERRORS[result])
    }
  }

  return (
    <section className={styles.card}>
      <title>{`${t('admin.login.title')} · ${t('admin.title')}`}</title>
      <h1 className={styles.title}>{t('admin.login.title')}</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          {t('admin.login.username')}
          <input name="username" autoComplete="username" required maxLength={50} />
        </label>
        <label className={styles.field}>
          {t('admin.login.password')}
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {t(error)}
          </p>
        )}
        <Button type="submit" disabled={submitting}>
          {t('admin.login.submit')}
        </Button>
      </form>
    </section>
  )
}
