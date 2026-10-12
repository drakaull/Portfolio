import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { fetchInbox, type Inbox } from '../../api/adminContact.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import adminStyles from './Admin.module.css'
import editorStyles from './Editor.module.css'
import styles from './MessageListPage.module.css'

const EXCERPT_LENGTH = 90

export function MessageListPage() {
  const { t, lang } = useTranslation()
  const [inbox, setInbox] = useState<Inbox | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    fetchInbox()
      .then(setInbox)
      .catch(() => setLoadFailed(true))
  }, [])

  const date = new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <section className={adminStyles.listPage}>
      <title>{`${t('admin.messages.title')} · ${t('admin.title')}`}</title>
      <Link to={`/${lang}/admin`}>{t('admin.home.backToDashboard')}</Link>
      <h1 className={adminStyles.title}>{t('admin.messages.title')}</h1>
      <p className={editorStyles.hint}>{t('admin.messages.retention')}</p>

      {loadFailed && (
        <p className={adminStyles.error} role="alert">
          {t('admin.error')}
        </p>
      )}
      {!inbox && !loadFailed && <p role="status">{t('admin.loading')}</p>}
      {inbox?.messages.length === 0 && <p>{t('admin.messages.empty')}</p>}
      {inbox && inbox.messages.length > 0 && (
        <ul className={adminStyles.list}>
          {inbox.messages.map((message) => (
            <li key={message.id} className={styles.item} data-unread={!message.read || undefined}>
              <span className={styles.top}>
                <Link to={`/${lang}/admin/messages/${message.id}`} className={styles.name}>
                  {!message.read && (
                    <span className={styles.dot} aria-label={t('admin.messages.unreadLabel')} />
                  )}
                  {message.name}
                </Link>
                <time className={styles.date} dateTime={message.created_at}>
                  {date.format(new Date(message.created_at))}
                </time>
              </span>
              <span className={styles.email}>{message.email}</span>
              <span className={styles.excerpt}>
                {message.message.length > EXCERPT_LENGTH
                  ? `${message.message.slice(0, EXCERPT_LENGTH).trimEnd()}…`
                  : message.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
