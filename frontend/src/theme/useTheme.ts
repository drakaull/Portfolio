import { useState } from 'react'

export type Theme = 'light' | 'dark'

// The initial theme is already on <html data-theme>, set by the inline script in index.html.
function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Storage can be blocked (private mode); the theme still applies for this visit.
    }
    setTheme(next)
  }

  return { theme, toggle }
}
