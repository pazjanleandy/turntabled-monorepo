import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { X } from "phosphor-react";

export default function SignInModal({ isOpen, onClose, anchorTop, onSignIn }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    // Close when clicking anywhere OUTSIDE the modal content,
    // even if something else is layered above it (capture phase).
    const onPointerDownCapture = (e) => {
      const panel = panelRef.current;
      if (!panel) return;

      // If the click/tap happened inside the modal, do nothing.
      if (panel.contains(e.target)) return;

      onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDownCapture, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Optional backdrop (still fine to keep) */}
      <button
        type="button"
        aria-label="Close sign in modal"
        className="absolute inset-0 rounded-none border-0 bg-transparent p-0 shadow-none outline-none pointer-events-auto focus:outline-none"
        onClick={onClose}
      />

      <div
        className="absolute left-1/2 w-full -translate-x-1/2 px-5 md:px-10 lg:px-16 pointer-events-none"
        style={{ top: anchorTop ?? 96 }}
      >
        <div className="mx-auto w-full max-w-4xl pointer-events-none">
          <div
            ref={panelRef}
            className="relative pointer-events-auto rounded-none border border-black/5 bg-white/90 p-4 shadow-[0_18px_40px_-26px_rgba(15,15,15,0.45)] backdrop-blur-md vinyl-texture"
          >
            <button
              type="button"
              className="absolute right-3 top-3 rounded-full border border-black/10 p-1 text-muted transition hover:text-text"
              onClick={onClose}
              aria-label="Close sign in"
            >
              <X size={14} weight="bold" />
            </button>

            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <label className="flex-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                Username
                <input
                  type="text"
                  placeholder="username"
                  className="mt-2 w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm font-medium text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                />
              </label>

              <label className="flex-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                Password
                <input
                  type="password"
                  placeholder="********"
                  className="mt-2 w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm font-medium text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                />
              </label>

              <button
                type="button"
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent transition hover:text-[#ef6b2f]"
                onClick={onClose}
              >
                Forgotten?
              </button>

              <label className="flex items-center gap-2 text-[11px] font-semibold text-muted">
                <input type="checkbox" className="h-4 w-4" />
                Remember me
              </label>

              <Link
                to="/home"
                onClick={() => {
                  onSignIn?.()
                  onClose?.()
                }}
                className="btn-primary inline-flex items-center px-4 py-2 text-xs"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
