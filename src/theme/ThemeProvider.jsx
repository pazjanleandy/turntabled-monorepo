import { useEffect, useMemo, useState } from 'react'
import {
  THEME_DARK,
  THEME_LIGHT,
  applyThemeToDocument,
  getInitialTheme,
  persistTheme,
} from './theme.js'
import { ThemeContext } from './theme-context.js'

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => getInitialTheme())

  useEffect(() => {
    applyThemeToDocument(theme)
    persistTheme(theme)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === THEME_DARK,
      setTheme: (nextTheme) => setThemeState(nextTheme === THEME_DARK ? THEME_DARK : THEME_LIGHT),
      toggleTheme: () =>
        setThemeState((previous) => (previous === THEME_DARK ? THEME_LIGHT : THEME_DARK)),
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
