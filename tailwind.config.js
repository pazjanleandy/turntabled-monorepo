export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        accent: 'var(--accent)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        card: 'var(--card)',
      },
      boxShadow: {
        card: '0 12px 24px -16px rgba(15, 15, 15, 0.35), 0 2px 6px rgba(15, 15, 15, 0.08)',
        subtle: '0 1px 2px rgba(15, 15, 15, 0.06)',
      },
      borderRadius: {
        soft: '12px',
      },
      fontFamily: {
        sans: ['Manrope', 'Avenir Next', 'Segoe UI', 'sans-serif'],
        serif: ['Instrument Serif', 'Iowan Old Style', 'Palatino Linotype', 'serif'],
      },
    },
  },
}
