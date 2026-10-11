import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

/** Primary action. For a link styled as a button, use <TextLink variant="button">. */
export function Button({
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={[styles.button, className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}
