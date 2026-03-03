export default function LastFmConnectButton({ className = "" }) {
  const apiKey = import.meta.env.VITE_LASTFM_API_KEY;
  const callbackUrl = import.meta.env.PROD
    ? "https://turntabled-monorepo.vercel.app/auth/lastfm/callback"
    : "http://localhost:5173/auth/lastfm/callback";

  const handleConnect = () => {
    if (!apiKey) return;
    const authUrl = `https://www.last.fm/api/auth/?api_key=${apiKey}&cb=${encodeURIComponent(
      callbackUrl
    )}`;
    window.location.href = authUrl;
  };

  return (
    <button
      type="button"
      className={`btn-primary rounded-xl border border-orange-500/30 px-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${className}`}
      onClick={handleConnect}
      disabled={!apiKey}
      title={apiKey ? "Connect Last.fm" : "Missing VITE_LASTFM_API_KEY"}
    >
      Connect Last.fm
    </button>
  );
}
