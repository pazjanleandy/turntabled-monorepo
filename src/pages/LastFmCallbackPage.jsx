import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import BackButton from "../components/BackButton.jsx";
import { buildApiAuthHeaders } from "../lib/apiAuth.js";

const CALLBACK_TIMEOUT_MS = 15000;

async function finalizeLastFmConnection({ token, signal }) {
  const apiBase = import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE_URL ?? "";
  const authHeaders = await buildApiAuthHeaders();
  const response = await fetch(`${apiBase}/api/lastfm/callback`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.error?.message || payload?.error || "Unable to connect Last.fm.";
    throw new Error(message);
  }
}

export default function LastFmCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [error, setError] = useState("");
  const inFlightRef = useRef(null);
  const inFlightTokenRef = useRef("");

  useEffect(() => {
    if (!token) {
      return;
    }

    let subscribed = true;

    if (inFlightTokenRef.current !== token) {
      inFlightTokenRef.current = token;
      inFlightRef.current = null;
    }

    if (!inFlightRef.current) {
      inFlightRef.current = (async () => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), CALLBACK_TIMEOUT_MS);
        try {
          await finalizeLastFmConnection({ token, signal: controller.signal });
        } finally {
          window.clearTimeout(timeoutId);
        }
      })();
    }

    inFlightRef.current
      .then(() => {
        if (!subscribed) return;
        navigate("/profile?lastfm=connected", { replace: true });
      })
      .catch((nextError) => {
        if (!subscribed) return;
        if (nextError?.name === "AbortError") {
          setError("Last.fm connection timed out. Please try again.");
          return;
        }
        setError(nextError?.message ?? "Unable to connect Last.fm.");
      });

    return () => {
      subscribed = false;
    };
  }, [navigate, token]);

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <Navbar className="mx-auto mt-6 w-[min(100%,1080px)]" />
        <BackButton className="self-start" />

        <section className="card vinyl-texture">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Last.fm
          </p>
          <h1 className="mb-2 text-2xl text-text">Connecting your account</h1>
          {!token && (
            <p className="mb-0 text-sm text-red-600">Missing token from Last.fm.</p>
          )}
          {error && token ? <p className="mb-0 text-sm text-red-600">{error}</p> : null}
          {token && !error ? (
            <p className="mb-0 text-sm text-muted">Finishing authentication...</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}

