import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";

export default function LastFmCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setError("Missing token from Last.fm.");
      return;
    }

    let cancelled = false;
    async function exchangeToken() {
      try {
        const response = await fetch("/api/lastfm/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to create Last.fm session.");
        }

        const data = await response.json();
        if (!data?.sessionKey || !data?.username) {
          throw new Error("Invalid session response.");
        }

        localStorage.setItem("lastfmSessionKey", data.sessionKey);
        localStorage.setItem("lastfmUsername", data.username);

        if (!cancelled) {
          setStatus("success");
          navigate("/profile", { replace: true });
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(err?.message || "Unexpected error.");
      }
    }

    exchangeToken();
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />

        <section className="card vinyl-texture">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Last.fm
          </p>
          <h1 className="mb-2 text-2xl text-text">Connecting your account</h1>
          {status === "loading" ? (
            <p className="mb-0 text-sm text-muted">Finishing authentication...</p>
          ) : null}
          {status === "error" ? (
            <p className="mb-0 text-sm text-red-600">{error}</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
