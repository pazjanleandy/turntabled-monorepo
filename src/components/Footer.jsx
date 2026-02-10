export default function Footer() {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <footer className="mt-6 rounded-soft bg-white/70 px-4 py-3 text-center text-xs text-muted shadow-subtle">
      Made using React + Node.js · Last updated {today}
    </footer>
  )
}
