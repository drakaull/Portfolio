import Markdown from 'react-markdown'

/**
 * Markdown as shown to visitors. Used by the public pages and the admin preview, so both always
 * render the same way. react-markdown escapes raw HTML: injected tags show as text, never run.
 */
export function MarkdownText({ children }: { children: string }) {
  return <Markdown>{children}</Markdown>
}
