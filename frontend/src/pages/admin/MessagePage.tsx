import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { deleteMessage, markUnread, openMessage, type Message } from '../../api/adminContact.ts'
import type { AdminResult } from '../../api/adminSkills.ts'
import { Button } from '../../components/Button/Button.tsx'
import { useTranslation } from '../../i18n/useTranslation.ts'
import adminStyles from './Admin.module.css'
import { SessionExpiredAlert } from './EditorParts.tsx'
import editorStyles from './Editor.module.css'
import styles from './MessagePage.module.css'

export function MessagePage() {
  const { t, lang } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState<Message | null>(null)
  const [loadState, setLoadState] = useState<'ok' | 'notFound' | 'error'>('ok')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [result, setResult] = useState<AdminResult>('ok')

  useEffect(() => {
    if (id === undefined) return
    openMessage(id)
      .then((found) => (found === null ? setLoadState('notFound') : setMessage(found)))
      .catch(() => setLoadState('error'))
  }, [id])

  const listPath = `/${lang}/admin/messages`
  const backToList = <Link to={listPath}>{t('admin.messages.back')}</Link>

  if (loadState !== 'ok') {
    return (
      <section className={editorStyles.editor}>
        {backToList}
        <p className={adminStyles.error} role="alert">
          {t(loadState === 'notFound' ? 'admin.messages.notFound' : 'admin.error')}
        </p>
      </section>
    )
  }
  if (message === null) return <p role="status">{t('admin.loading')}</p>

  async function act(action: Promise<AdminResult>) {
    const outcome = await action
    setResult(outcome)
    if (outcome === 'ok') navigate(listPath)
  }

  const date = new Intl.DateTimeFormat(lang, { dateStyle: 'full', timeStyle: 'short' })
  // The address is encoded so a crafted one ("a?bcc=…@x.be") cannot add recipients to the reply.
  const to = encodeURIComponent(message.email).replace('%40', '@')
  const subject = encodeURIComponent(`Re: ${t('admin.messages.replySubject')}`)
  const reply = `mailto:${to}?subject=${subject}`

  return (
    <section className={editorStyles.editor}>
      <title>{`${message.name} · ${t('admin.title')}`}</title>
      {backToList}
      <h1 className={adminStyles.title}>{message.name}</h1>

      <dl className={styles.facts}>
        <dt>{t('contact.email')}</dt>
        <dd>{message.email}</dd>
        <dt>{t('admin.messages.date')}</dt>
        <dd>
          <time dateTime={message.created_at}>{date.format(new Date(message.created_at))}</time>
        </dd>
        <dt>{t('admin.messages.pageLanguage')}</dt>
        <dd>{message.lang.toUpperCase()}</dd>
      </dl>

      {/* Shown as typed: plain text, line breaks kept, never interpreted as HTML or Markdown. */}
      <p className={styles.body}>{message.message}</p>

      <div className={editorStyles.footer}>
        <span className={editorStyles.actions}>
          <a className={styles.reply} href={reply}>
            {t('admin.messages.reply')}
          </a>
          <button
            type="button"
            className={editorStyles.secondary}
            onClick={() => void act(markUnread(message.id))}
          >
            {t('admin.messages.markUnread')}
          </button>
        </span>
        {!confirmingDelete && (
          <button
            type="button"
            className={editorStyles.danger}
            onClick={() => setConfirmingDelete(true)}
          >
            {t('admin.messages.delete')}
          </button>
        )}
      </div>

      {confirmingDelete && (
        <div className={editorStyles.confirm} role="alertdialog" aria-labelledby="delete-message">
          <p id="delete-message">{t('admin.messages.confirmDelete')}</p>
          <Button onClick={() => void act(deleteMessage(message.id))}>
            {t('admin.messages.delete')}
          </Button>
          <button
            type="button"
            className={editorStyles.secondary}
            onClick={() => setConfirmingDelete(false)}
          >
            {t('admin.cv.cancel')}
          </button>
        </div>
      )}
      {result === 'expired' && <SessionExpiredAlert />}
      {result === 'error' && (
        <p className={adminStyles.error} role="alert">
          {t('admin.error')}
        </p>
      )}
    </section>
  )
}
