export default function Footer() {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <footer className="mt-1 border-t border-black/10 px-2 pt-4 text-center text-[11px] tracking-[0.04em] text-muted sm:text-xs lg:mt-2 lg:rounded-2xl lg:border lg:bg-white/70 lg:px-4 lg:py-3 lg:tracking-[0.08em] lg:shadow-subtle">
      Built with React + Node.js | Updated {today}
    </footer>
  )
}
