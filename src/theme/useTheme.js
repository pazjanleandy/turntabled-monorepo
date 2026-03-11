import { useContext } from 'react'
import { ThemeContext } from './theme-context.js'

export default function useTheme() {
  return useContext(ThemeContext)
}
