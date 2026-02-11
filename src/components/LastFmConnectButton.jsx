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
      className={`btn-primary px-4 py-2 text-sm ${className}`}
      onClick={handleConnect}
      disabled={!apiKey}
      title={apiKey ? "Connect Last.fm" : "Missing VITE_LASTFM_API_KEY"}
    >
      Connect Last.fm
    </button>
  );
}
