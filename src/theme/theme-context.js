import { createContext } from 'react'
import { THEME_LIGHT } from './theme.js'

export const ThemeContext = createContext({
  theme: THEME_LIGHT,
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
})
