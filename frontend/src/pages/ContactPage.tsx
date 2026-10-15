import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { sendContactMessage, type ContactField, type ContactForm } from '../api/contact.ts'
import { Button } from '../components/Button/Button.tsx'
import { PageHeader } from '../components/PageHeader/PageHeader.tsx'
import type { TranslationKey } from '../i18n/en.ts'
import { useTranslation } from '../i18n/useTranslation.ts'
import styles from './ContactPage.module.css'

const EMPTY: ContactForm = { name: '', email: '', message: '', leave_empty: '' }

const FIELD_ERRORS: Record<ContactField, TranslationKey> = {
  name: 'contact.invalidName',
  email: 'contact.invalidEmail',
  message: 'contact.invalidMessage',
}

type State = 'idle' | 'sending' | 'sent' | 'tooMany' | 'error'

export function ContactPage() {
  const { t, lang } = useTranslation()
  const [form, setForm] = useState<ContactForm>(EMPTY)
  const [state, setState] = useState<State>('idle')
  const [invalid, setInvalid] = useState<ContactField[]>([])

  function update(changes: Partial<ContactForm>) {
    setForm((current) => ({ ...current, ...changes }))
    if (state === 'sent') setState('idle')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState('sending')
    const result = await sendContactMessage(form, lang)
    if (result.status === 'sent') {
      setForm(EMPTY)
      setInvalid([])
      setState('sent')
    } else if (result.status === 'invalid') {
      setInvalid(result.fields)
      setState('idle')
    } else {
      setState(result.status) // the typed text is kept
    }
  }

  // Each field is named by its label only; the error is linked through aria-describedby.
  const field = (name: ContactField, control: (props: object) => ReactNode) => {
    const errorId = `contact-${name}-error`
    const hasError = invalid.includes(name)
    return (
      <div className={styles.field}>
        <label htmlFor={`contact-${name}`}>{t(`contact.${name}`)}</label>
        {control({
          id: `contact-${name}`,
          'aria-invalid': hasError,
          'aria-describedby': hasError ? errorId : undefined,
        })}
        {hasError && (
          <span id={errorId} className={styles.error}>
            {t(FIELD_ERRORS[name])}
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      <PageHeader eyebrow={t('eyebrow.contact')} title={t('contact.title')} />
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {field('name', (props) => (
          <input
            {...props}
            autoComplete="name"
            maxLength={100}
            required
            value={form.name}
            onChange={(event) => update({ name: event.target.value })}
          />
        ))}
        {field('email', (props) => (
          <input
            {...props}
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            value={form.email}
            onChange={(event) => update({ email: event.target.value })}
          />
        ))}
        {field('message', (props) => (
          <textarea
            {...props}
            rows={8}
            maxLength={5000}
            required
            value={form.message}
            onChange={(event) => update({ message: event.target.value })}
          />
        ))}

        {/* Trap for robots: out of sight, out of the tab order, ignored by screen readers. */}
        <div className={styles.trap} aria-hidden="true">
          <label htmlFor="contact-leave-empty">Leave this field empty</label>
          <input
            id="contact-leave-empty"
            name="leave_empty"
            tabIndex={-1}
            autoComplete="off"
            value={form.leave_empty}
            onChange={(event) => update({ leave_empty: event.target.value })}
          />
        </div>

        <div className={styles.actions}>
          <Button type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? t('contact.sending') : t('contact.send')}
          </Button>
          <p className={styles.privacy}>
            {t('contact.privacyNote')}{' '}
            <Link to={`/${lang}/privacy`}>{t('contact.privacyLink')}</Link>
          </p>
        </div>

        <p role="status" className={styles.sent}>
          {state === 'sent' && t('contact.sent')}
        </p>
        {(state === 'tooMany' || state === 'error') && (
          <p role="alert" className={styles.error}>
            {t(state === 'tooMany' ? 'contact.tooMany' : 'contact.error')}
          </p>
        )}
      </form>
    </>
  )
}
