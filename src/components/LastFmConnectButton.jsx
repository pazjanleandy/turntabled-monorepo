import { useState } from "react";
import { buildApiAuthHeaders } from "../lib/apiAuth.js";

export default function LastFmConnectButton({ className = "" }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    setError("");

    try {
      const apiBase = import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE_URL ?? "";
      const authHeaders = await buildApiAuthHeaders();
      const response = await fetch(`${apiBase}/api/lastfm/connect`, {
        method: "GET",
        headers: authHeaders,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || typeof payload?.authorizationUrl !== "string") {
        const message =
          payload?.error?.message ||
          payload?.error ||
          `Unable to start Last.fm connection (${response.status}).`;
        throw new Error(message);
      }

      window.location.href = payload.authorizationUrl;
    } catch (nextError) {
      setError(nextError?.message ?? "Unable to start Last.fm connection.");
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-2">
      <button
        type="button"
        className={`btn-primary rounded-xl border border-orange-500/30 px-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${className}`}
        onClick={handleConnect}
        disabled={isConnecting}
        title="Connect Last.fm"
      >
        {isConnecting ? "Connecting..." : "Connect Last.fm"}
      </button>
      {error ? <p className="mb-0 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
