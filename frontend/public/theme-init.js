// Apply the theme before the first paint to avoid a flash of the wrong theme.
try {
  const stored = localStorage.getItem('theme')
  const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.dataset.theme = stored || (prefersDark ? 'dark' : 'light')
} catch {
  document.documentElement.dataset.theme = 'light'
}
