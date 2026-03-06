import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CalendarPlus, ChatCircle, Heart, NotePencil, Star } from "phosphor-react";
import Navbar from "../components/Navbar.jsx";
import NavbarGuest from "../components/NavbarGuest.jsx";
import BackButton from "../components/BackButton.jsx";
import CoverImage from "../components/CoverImage.jsx";
import StarRating from "../components/StarRating.jsx";
import LogDatesModal from "../components/album/LogDatesModal.jsx";
import ReviewModal from "../components/album/ReviewModal.jsx";
import useAuthStatus from "../hooks/useAuthStatus.js";
import { buildApiAuthHeaders } from "../lib/apiAuth.js";
import { supabase } from "../supabase.js";

const BACKLOG_UPDATED_EVENT_NAME = "turntabled:backlog-updated";

function LogCard({
  onLogDates,
  onWriteReview,
  onFavorite,
  isFavorited = false,
  favoriteBusy = false,
  ratingValue = 0,
  disabled,
}) {
  const numericRating = Number(ratingValue);
  const safeRating =
    Number.isFinite(numericRating) && numericRating >= 0 ? Math.min(numericRating, 5) : 0;

  return (
    <div className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-[0_18px_36px_-26px_rgba(15,15,15,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Log this album
          </p>
          <div className="flex items-center gap-2">
            <Star size={14} weight="fill" className="text-accent" />
            <p className="mb-0 text-sm font-semibold text-text">Rate it</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed ${
              isFavorited
                ? "border-orange-500/35 bg-accent/15 text-accent hover:bg-accent/20 disabled:opacity-100"
                : "border-black/5 bg-white/90 text-text hover:bg-white disabled:opacity-50"
            }`}
            onClick={onFavorite}
            disabled={disabled || favoriteBusy}
            title={
              disabled
                ? "Login required"
                : isFavorited
                  ? "Remove from favorites"
                  : "Add to favorites"
            }
          >
            <Heart size={14} weight={isFavorited ? "fill" : "bold"} />
            {favoriteBusy ? "Saving..." : isFavorited ? "Favorited" : "Favorite"}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onWriteReview}
            disabled={disabled}
            title={disabled ? "Login required" : "Write a review"}
          >
            <NotePencil size={14} weight="bold" />
            Write a review
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onLogDates}
            disabled={disabled}
            title={disabled ? "Login required" : "Log album"}
          >
            <CalendarPlus size={14} weight="bold" />
            Log album
          </button>
        </div>
      </div>

      <div className="mt-3">
        <StarRating value={safeRating} readOnly={disabled} size={16} />
      </div>
    </div>
  );
}

function formatReviewDate(value) {
  if (!value) return "Recently";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCommentDate(value) {
  if (!value) return "Now";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Now";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getReviewerInitials(username = "") {
  const normalized = String(username).trim().replace(/^@/, "");
  if (!normalized) return "U";
  return normalized.slice(0, 2).toUpperCase();
}

function AlbumReviewCard({
  review,
  isSignedIn = false,
  currentUserId = "",
  likeBusy = false,
  commentBusy = false,
  editBusyCommentId = "",
  deleteBusyCommentId = "",
  onToggleLike = null,
  onAddComment = null,
  onEditComment = null,
  onDeleteComment = null,
}) {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState("");
  const [editingCommentDraft, setEditingCommentDraft] = useState("");
  const [activeCommentMenuId, setActiveCommentMenuId] = useState("");
  const username =
    typeof review?.user?.username === "string" && review.user.username.trim()
      ? review.user.username.trim()
      : "unknown-user";
  const profilePath =
    username && username !== "unknown-user" ? `/friends/${encodeURIComponent(username)}` : null;
  const ratingValue = typeof review?.rating === "number" ? review.rating : 0;
  const comments = Array.isArray(review?.comments) ? review.comments : [];
  const likeCount = Number.isFinite(Number(review?.likeCount)) ? Number(review.likeCount) : 0;
  const commentCount =
    Number.isFinite(Number(review?.commentCount)) ? Number(review.commentCount) : comments.length;
  const hasLiked = Boolean(review?.viewerHasLiked);

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    if (!isSignedIn || commentBusy) return;
    const nextComment = commentDraft.trim();
    if (!nextComment || typeof onAddComment !== "function") return;
    const posted = await onAddComment(review, nextComment);
    if (posted) {
      setCommentDraft("");
      setIsCommentsOpen(true);
      setActiveCommentMenuId("");
    }
  };

  const handleStartCommentEdit = (comment) => {
    const commentId = comment?.id ?? "";
    if (!commentId) return;
    setEditingCommentId(commentId);
    setEditingCommentDraft(comment?.commentText ?? "");
    setIsCommentsOpen(true);
    setActiveCommentMenuId("");
  };

  const handleCancelCommentEdit = () => {
    setEditingCommentId("");
    setEditingCommentDraft("");
    setActiveCommentMenuId("");
  };

  const handleCommentEditSubmit = async (event, comment) => {
    event.preventDefault();
    if (!isSignedIn || typeof onEditComment !== "function") return;

    const commentId = comment?.id ?? "";
    const nextText = editingCommentDraft.trim();
    if (!commentId || !nextText || editBusyCommentId === commentId) return;

    const updated = await onEditComment(review, comment, nextText);
    if (updated) {
      setEditingCommentId("");
      setEditingCommentDraft("");
    }
  };

  const handleCommentDelete = async (comment) => {
    if (!isSignedIn || typeof onDeleteComment !== "function") return;

    const commentId = comment?.id ?? "";
    if (!commentId || deleteBusyCommentId === commentId) return;
    setActiveCommentMenuId("");

    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) return;

    const removed = await onDeleteComment(review, comment);
    if (removed && editingCommentId === commentId) {
      setEditingCommentId("");
      setEditingCommentDraft("");
    }
  };

  return (
    <article className="flex items-start gap-3 py-4">
      <div className="mt-0.5">
        {review?.user?.avatarUrl ? (
          <img
            src={review.user.avatarUrl}
            alt={`${username} avatar`}
            className="h-10 w-10 rounded-full border border-black/10 object-cover"
          />
        ) : (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-accent/15 text-xs font-semibold uppercase text-accent">
            {getReviewerInitials(username)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="mb-0 text-sm text-muted">Review by</p>
          {profilePath ? (
            <Link
              to={profilePath}
              className="text-sm font-semibold text-text transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              @{username.replace(/^@/, "")}
            </Link>
          ) : (
            <p className="mb-0 text-sm font-semibold text-text">@{username.replace(/^@/, "")}</p>
          )}
          <StarRating value={ratingValue} readOnly size={13} />
          <span className="text-xs font-semibold text-muted">{ratingValue}/5</span>
          <span className="text-xs text-muted">{formatReviewDate(review?.reviewedAt ?? review?.addedAt)}</span>
        </div>
        <p className="mb-0 mt-2 whitespace-pre-wrap text-sm text-slate-700">{review?.reviewText}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`inline-flex items-center gap-1 appearance-none border-0 bg-transparent p-0 shadow-none hover:translate-y-0 hover:bg-transparent text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
              hasLiked
                ? "text-text"
                : "text-muted hover:text-text"
            } disabled:cursor-not-allowed disabled:opacity-60`}
            onClick={() => onToggleLike?.(review)}
            disabled={!isSignedIn || likeBusy || !review?.backlogId}
            title={isSignedIn ? "Like review" : "Login required"}
          >
            <Heart
              size={14}
              weight={hasLiked ? "fill" : "bold"}
              color={hasLiked ? "var(--accent)" : undefined}
            />
            {likeCount}
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1 appearance-none border-0 bg-transparent p-0 shadow-none hover:translate-y-0 hover:bg-transparent text-[11px] font-semibold uppercase tracking-[0.12em] text-muted transition hover:text-text"
            onClick={() => {
              setIsCommentsOpen((open) => !open);
              setActiveCommentMenuId("");
            }}
          >
            <ChatCircle size={14} weight="bold" />
            {commentCount}
          </button>
        </div>

        {isCommentsOpen ? (
          <div className="mt-2.5 rounded-xl border border-black/10 bg-[#f8f6f4]/85">
            <div className="relative px-2.5 py-2.5 sm:px-3">
              {comments.length > 0 ? (
                <>
                  <div className="pointer-events-none absolute bottom-0 left-[1.25rem] top-0 border-l border-black/10 sm:left-[1.45rem]" />
                  <ul className="relative divide-y divide-black/5">
                    {comments.map((comment) => {
                      const commentUsername =
                        typeof comment?.user?.username === "string" && comment.user.username.trim()
                          ? comment.user.username.trim()
                          : "unknown-user";
                      const commentProfilePath =
                        commentUsername && commentUsername !== "unknown-user"
                          ? `/friends/${encodeURIComponent(commentUsername)}`
                          : null;
                      const isOwnComment =
                        Boolean(currentUserId) &&
                        typeof comment?.user?.id === "string" &&
                        comment.user.id === currentUserId;
                      const isEditing = editingCommentId === comment?.id;
                      const isEditBusy = editBusyCommentId === comment?.id;
                      const isDeleteBusy = deleteBusyCommentId === comment?.id;

                      return (
                        <li
                          key={comment?.id ?? `${commentUsername}-${comment?.createdAt ?? ""}`}
                          className="group relative py-2 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 shrink-0">
                              {comment?.user?.avatarUrl ? (
                                <img
                                  src={comment.user.avatarUrl}
                                  alt={`${commentUsername} avatar`}
                                  className="h-6 w-6 rounded-full border border-black/10 object-cover"
                                />
                              ) : (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-accent/15 text-[9px] font-semibold uppercase text-accent">
                                  {getReviewerInitials(commentUsername)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 pr-8">
                              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 leading-none">
                                {commentProfilePath ? (
                                  <Link
                                    to={commentProfilePath}
                                    className="text-[12px] font-semibold text-text transition hover:text-accent"
                                  >
                                    @{commentUsername.replace(/^@/, "")}
                                  </Link>
                                ) : (
                                  <span className="text-[12px] font-semibold text-text">
                                    @{commentUsername.replace(/^@/, "")}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500">
                                  {formatCommentDate(comment?.createdAt)}
                                </span>
                                {comment?.updatedAt && comment?.updatedAt !== comment?.createdAt ? (
                                  <span className="text-[10px] text-slate-500">(edited)</span>
                                ) : null}
                              </div>

                              {isEditing ? (
                                <form
                                  onSubmit={(event) => handleCommentEditSubmit(event, comment)}
                                  className="mt-1.5 flex items-center gap-1.5"
                                >
                                  <input
                                    type="text"
                                    value={editingCommentDraft}
                                    onChange={(event) => setEditingCommentDraft(event.target.value)}
                                    className="min-w-0 flex-1 rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                                    maxLength={500}
                                  />
                                  <button
                                    type="submit"
                                    className="rounded-full border border-black/10 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={isEditBusy || !editingCommentDraft.trim()}
                                  >
                                    {isEditBusy ? "Saving" : "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-full border border-black/10 bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted transition hover:bg-white"
                                    onClick={handleCancelCommentEdit}
                                    disabled={isEditBusy}
                                  >
                                    Cancel
                                  </button>
                                </form>
                              ) : (
                                <p className="mb-0 mt-1 text-[13px] leading-snug text-slate-700 whitespace-pre-wrap">
                                  {comment?.commentText}
                                </p>
                              )}
                            </div>

                            {isOwnComment ? (
                              <div className="absolute right-0 top-1">
                                <button
                                  type="button"
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-transparent bg-transparent p-0 text-[11px] font-semibold text-slate-500 opacity-55 transition hover:border-black/10 hover:bg-white/80 hover:text-text sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                                  onClick={() =>
                                    setActiveCommentMenuId((current) =>
                                      current === comment?.id ? "" : comment?.id ?? ""
                                    )
                                  }
                                  aria-haspopup="menu"
                                  aria-expanded={activeCommentMenuId === comment?.id}
                                  disabled={isEditBusy || isDeleteBusy}
                                >
                                  ...
                                </button>
                                {activeCommentMenuId === comment?.id ? (
                                  <div
                                    className="absolute right-0 top-[calc(100%+4px)] z-10 w-28 rounded-lg border border-black/10 bg-white p-1 shadow-[0_12px_24px_-18px_rgba(15,15,15,0.45)]"
                                    role="menu"
                                  >
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-text transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                                      onClick={() => handleStartCommentEdit(comment)}
                                      disabled={isEditBusy || isDeleteBusy}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                      onClick={() => handleCommentDelete(comment)}
                                      disabled={isDeleteBusy || isEditBusy}
                                    >
                                      {isDeleteBusy ? "Deleting" : "Delete"}
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <p className="mb-0 text-xs text-muted">No comments yet.</p>
              )}
            </div>

            <div className="border-t border-black/10 bg-white/65 px-2.5 py-2 sm:px-3">
              {isSignedIn ? (
                <form onSubmit={handleCommentSubmit} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="Add a comment"
                    className="min-w-0 flex-1 rounded-full border border-black/10 bg-white/90 px-3 py-1 text-xs text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                    maxLength={500}
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-black/10 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-text transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={commentBusy || !commentDraft.trim()}
                  >
                    {commentBusy ? "Posting" : "Post"}
                  </button>
                </form>
              ) : (
                <p className="mb-0 text-xs text-muted">Sign in to comment.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function AlbumPage() {
  const { releaseId } = useParams();
  const { isSignedIn } = useAuthStatus();
  const [album, setAlbum] = useState(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [albumRefreshKey, setAlbumRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isLogDatesOpen, setIsLogDatesOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [logNotice, setLogNotice] = useState("");
  const [backlogItem, setBacklogItem] = useState(null);
  const [isFavoriteSaving, setIsFavoriteSaving] = useState(false);
  const [reviewLikeBusyId, setReviewLikeBusyId] = useState("");
  const [reviewCommentBusyId, setReviewCommentBusyId] = useState("");
  const [reviewCommentEditBusyId, setReviewCommentEditBusyId] = useState("");
  const [reviewCommentDeleteBusyId, setReviewCommentDeleteBusyId] = useState("");

  useEffect(() => {
    if (!isSignedIn) {
      setCurrentUserId("");
    }
  }, [isSignedIn]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadAlbum() {
      setIsLoading(true);
      setLoadError("");

      try {
        const apiBase = import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE_URL ?? "";
        const username = window.localStorage.getItem("lastfmUsername");
        const authHeaders = await buildApiAuthHeaders();
        const headers = { ...authHeaders };

        const { data } = await supabase.auth.getSession();
        const userId = data?.session?.user?.id;
        if (!cancelled) {
          setCurrentUserId(typeof userId === "string" ? userId : "");
        }
        if (userId) headers["x-user-id"] = userId;
        if (username) headers["x-username"] = username;

        const params = new URLSearchParams({ id: releaseId ?? "" });
        const response = await fetch(`${apiBase}/api/explore/album?${params.toString()}`, {
          headers,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load album details.");
        }

        const payload = await response.json();
        if (!cancelled) {
          setAlbum(payload?.item ?? null);
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        if (!cancelled) {
          setCurrentUserId("");
          setLoadError(error?.message ?? "Unable to load album details.");
          setAlbum(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAlbum();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [releaseId, albumRefreshKey]);

  const safeAlbum = useMemo(() => {
    if (!album) return null;
    return {
      ...album,
      tracks: Array.isArray(album.tracks) ? album.tracks : [],
      reviews: Array.isArray(album.reviews) ? album.reviews : [],
      genres: Array.isArray(album.genres) ? album.genres : ["Unknown"],
    };
  }, [album]);

  useEffect(() => {
    if (!isSignedIn || !safeAlbum?.id) {
      setBacklogItem(null);
      return;
    }

    let cancelled = false;

    async function loadBacklogItem() {
      try {
        const apiBase = import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE_URL ?? "";
        const authHeaders = await buildApiAuthHeaders();
        const params = new URLSearchParams({ albumId: safeAlbum.id });
        const response = await fetch(`${apiBase}/api/backlog?${params.toString()}`, {
          headers: authHeaders,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "Failed to load existing review.");
        }

        if (!cancelled) {
          setBacklogItem(payload?.item ?? null);
        }
      } catch {
        if (!cancelled) {
          setBacklogItem(null);
        }
      }
    }

    loadBacklogItem();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, safeAlbum?.id]);

  const emitBacklogUpdated = () => {
    window.dispatchEvent(new CustomEvent(BACKLOG_UPDATED_EVENT_NAME));
  };

  const handleBacklogSaved = (item, notice, { refreshAlbum = false } = {}) => {
    setBacklogItem(item ?? null);
    if (notice) {
      setLogNotice(notice);
      window.setTimeout(() => setLogNotice(""), 2200);
    }
    if (refreshAlbum) {
      setAlbumRefreshKey((current) => current + 1);
    }
    emitBacklogUpdated();
  };

  const updateReviewInAlbum = (backlogId, updater) => {
    if (!backlogId || typeof updater !== "function") return;
    setAlbum((current) => {
      if (!current) return current;
      const currentReviews = Array.isArray(current.reviews) ? current.reviews : [];
      const nextReviews = currentReviews.map((entry) => {
        if (entry?.backlogId !== backlogId) return entry;
        return updater(entry);
      });
      return {
        ...current,
        reviews: nextReviews,
      };
    });
  };

  const handleFavoriteClick = async () => {
    if (!isSignedIn || !safeAlbum?.id || isFavoriteSaving) return;

    setIsFavoriteSaving(true);
    try {
      const apiBase = import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE_URL ?? "";
      const authHeaders = await buildApiAuthHeaders();
      const nextIsFavorite = !backlogItem?.isFavorite;
      let item = backlogItem;

      if (!item?.id && nextIsFavorite) {
        const createResponse = await fetch(`${apiBase}/api/backlog`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            albumId: safeAlbum.id,
            artistNameRaw: safeAlbum.artist,
            albumTitleRaw: safeAlbum.title,
            status: "listened",
            rating: 5,
            isFavorite: true,
          }),
        });
        const createPayload = await createResponse.json().catch(() => null);
        if (!createResponse.ok) {
          throw new Error(createPayload?.error?.message ?? "Failed to add album to favorites.");
        }
        item = createPayload?.item ?? null;
      }

      if (item?.id && item?.isFavorite !== nextIsFavorite) {
        const favoriteResponse = await fetch(
          `${apiBase}/api/profile/favorites?id=${encodeURIComponent(item.id)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
            body: JSON.stringify({ isFavorite: nextIsFavorite }),
          },
        );
        const favoritePayload = await favoriteResponse.json().catch(() => null);
        if (!favoriteResponse.ok) {
          throw new Error(
            favoritePayload?.error?.message ??
              (nextIsFavorite
                ? "Failed to add album to favorites."
                : "Failed to remove album from favorites."),
          );
        }
      }

      handleBacklogSaved(
        item
          ? {
              ...item,
              isFavorite: nextIsFavorite,
              status: item.status || "listened",
            }
          : null,
        nextIsFavorite ? "Added to favorites" : "Removed from favorites",
      );
    } catch (error) {
      setLogNotice(
        error?.message ??
          (backlogItem?.isFavorite
            ? "Unable to remove album from favorites."
            : "Unable to add album to favorites."),
      );
      window.setTimeout(() => setLogNotice(""), 2400);
    } finally {
      setIsFavoriteSaving(false);
    }
  };

  const handleReviewLikeToggle = async (review) => {
    if (!isSignedIn) {
      setLogNotice("Sign in to like reviews.");
      window.setTimeout(() => setLogNotice(""), 2400);
      return;
    }

    const backlogId = review?.backlogId;
    if (!backlogId || reviewLikeBusyId) return;

    const initialLiked = Boolean(review?.viewerHasLiked);
    const initialLikeCount = Number(review?.likeCount ?? 0) || 0;
    const nextLiked = !initialLiked;
    const optimisticLikeCount = Math.max(0, initialLikeCount + (nextLiked ? 1 : -1));

    setReviewLikeBusyId(backlogId);
    updateReviewInAlbum(backlogId, (entry) => ({
      ...entry,
      viewerHasLiked: nextLiked,
      likeCount: optimisticLikeCount,
    }));

    try {
      const apiBase = import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE_URL ?? "";
      const authHeaders = await buildApiAuthHeaders();
      const response = await fetch(`${apiBase}/api/backlog/reviews-likes`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          backlogId,
          liked: nextLiked,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Failed to update review like.");
      }

      updateReviewInAlbum(backlogId, (entry) => ({
        ...entry,
        likeCount:
          typeof payload?.likeCount === "number"
            ? payload.likeCount
            : Number(entry?.likeCount ?? 0) || 0,
        commentCount:
          typeof payload?.commentCount === "number"
            ? payload.commentCount
            : Number(entry?.commentCount ?? 0) || 0,
        viewerHasLiked:
          typeof payload?.viewerHasLiked === "boolean"
            ? payload.viewerHasLiked
            : Boolean(entry?.viewerHasLiked),
      }));
    } catch (error) {
      updateReviewInAlbum(backlogId, (entry) => ({
        ...entry,
        viewerHasLiked: initialLiked,
        likeCount: initialLikeCount,
      }));
      setLogNotice(error?.message ?? "Unable to update review like.");
      window.setTimeout(() => setLogNotice(""), 2400);
    } finally {
      setReviewLikeBusyId("");
    }
  };

  const handleReviewCommentAdd = async (review, commentText) => {
    if (!isSignedIn) {
      setLogNotice("Sign in to comment on reviews.");
      window.setTimeout(() => setLogNotice(""), 2400);
      return false;
    }

    const backlogId = review?.backlogId;
    if (!backlogId || reviewCommentBusyId) return false;

    setReviewCommentBusyId(backlogId);
    try {
      const apiBase = import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE_URL ?? "";
      const authHeaders = await buildApiAuthHeaders();
      const response = await fetch(`${apiBase}/api/backlog/reviews-comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          backlogId,
          commentText,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Failed to add review comment.");
      }

      updateReviewInAlbum(backlogId, (entry) => {
        const existingComments = Array.isArray(entry?.comments) ? entry.comments : [];
        const nextComment = payload?.comment ?? null;
        const hasComment = nextComment?.id
          ? existingComments.some((comment) => comment?.id === nextComment.id)
          : false;
        const nextComments = nextComment && !hasComment ? [...existingComments, nextComment] : existingComments;

        return {
          ...entry,
          comments: nextComments,
          likeCount:
            typeof payload?.likeCount === "number"
              ? payload.likeCount
              : Number(entry?.likeCount ?? 0) || 0,
          commentCount:
            typeof payload?.commentCount === "number"
              ? payload.commentCount
              : nextComments.length,
          viewerHasLiked:
            typeof payload?.viewerHasLiked === "boolean"
              ? payload.viewerHasLiked
              : Boolean(entry?.viewerHasLiked),
        };
      });

      return true;
    } catch (error) {
      setLogNotice(error?.message ?? "Unable to add review comment.");
      window.setTimeout(() => setLogNotice(""), 2400);
      return false;
    } finally {
      setReviewCommentBusyId("");
    }
  };

  const handleReviewCommentEdit = async (review, comment, commentText) => {
    if (!isSignedIn) {
      setLogNotice("Sign in to edit your comment.");
      window.setTimeout(() => setLogNotice(""), 2400);
      return false;
    }

    const backlogId = review?.backlogId;
    const commentId = comment?.id;
    if (!backlogId || !commentId || reviewCommentEditBusyId) return false;

    setReviewCommentEditBusyId(commentId);
    try {
      const apiBase = import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE_URL ?? "";
      const authHeaders = await buildApiAuthHeaders();
      const response = await fetch(`${apiBase}/api/backlog/reviews-comments`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          commentId,
          commentText,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Failed to edit comment.");
      }

      updateReviewInAlbum(backlogId, (entry) => {
        const existingComments = Array.isArray(entry?.comments) ? entry.comments : [];
        const nextComment = payload?.comment ?? null;
        const nextComments = existingComments.map((entryComment) =>
          entryComment?.id === nextComment?.id ? nextComment : entryComment
        );

        return {
          ...entry,
          comments: nextComments,
          likeCount:
            typeof payload?.likeCount === "number"
              ? payload.likeCount
              : Number(entry?.likeCount ?? 0) || 0,
          commentCount:
            typeof payload?.commentCount === "number"
              ? payload.commentCount
              : nextComments.length,
          viewerHasLiked:
            typeof payload?.viewerHasLiked === "boolean"
              ? payload.viewerHasLiked
              : Boolean(entry?.viewerHasLiked),
        };
      });

      return true;
    } catch (error) {
      setLogNotice(error?.message ?? "Unable to edit comment.");
      window.setTimeout(() => setLogNotice(""), 2400);
      return false;
    } finally {
      setReviewCommentEditBusyId("");
    }
  };

  const handleReviewCommentDelete = async (review, comment) => {
    if (!isSignedIn) {
      setLogNotice("Sign in to delete your comment.");
      window.setTimeout(() => setLogNotice(""), 2400);
      return false;
    }

    const backlogId = review?.backlogId;
    const commentId = comment?.id;
    if (!backlogId || !commentId || reviewCommentDeleteBusyId) return false;

    setReviewCommentDeleteBusyId(commentId);
    try {
      const apiBase = import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE_URL ?? "";
      const authHeaders = await buildApiAuthHeaders();
      const params = new URLSearchParams({ id: commentId });
      const response = await fetch(`${apiBase}/api/backlog/reviews-comments?${params.toString()}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Failed to delete comment.");
      }

      updateReviewInAlbum(backlogId, (entry) => {
        const existingComments = Array.isArray(entry?.comments) ? entry.comments : [];
        const deletedCommentId = payload?.deletedCommentId ?? commentId;
        const nextComments = existingComments.filter((entryComment) => entryComment?.id !== deletedCommentId);

        return {
          ...entry,
          comments: nextComments,
          likeCount:
            typeof payload?.likeCount === "number"
              ? payload.likeCount
              : Number(entry?.likeCount ?? 0) || 0,
          commentCount:
            typeof payload?.commentCount === "number"
              ? payload.commentCount
              : nextComments.length,
          viewerHasLiked:
            typeof payload?.viewerHasLiked === "boolean"
              ? payload.viewerHasLiked
              : Boolean(entry?.viewerHasLiked),
        };
      });

      return true;
    } catch (error) {
      setLogNotice(error?.message ?? "Unable to delete comment.");
      window.setTimeout(() => setLogNotice(""), 2400);
      return false;
    } finally {
      setReviewCommentDeleteBusyId("");
    }
  };

  const isAlbumFavorited = Boolean(backlogItem?.isFavorite);

  if (isLoading) {
    return (
      <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
          {isSignedIn ? (
            <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
          ) : (
            <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
          )}
          <BackButton className="self-start" />
          <section className="card vinyl-texture">
            <p className="mb-0 text-sm text-muted">Loading album details...</p>
          </section>
        </div>
      </div>
    );
  }

  if (!safeAlbum) {
    return (
      <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
          {isSignedIn ? (
            <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
          ) : (
            <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
          )}
          <BackButton className="self-start" />

          <section className="card vinyl-texture">
            <h1 className="mb-2 text-2xl">Album not found</h1>
            <p className="mb-4 text-sm text-muted">
              {loadError || "We could not find that album release. Try browsing the explore page."}
            </p>
            <Link className="btn-primary inline-flex px-4 py-2 text-sm" to="/explore">
              Back to explore
            </Link>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        {isSignedIn ? (
          <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
        ) : (
          <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
        )}
        <BackButton className="self-start" />

        <section className="card vinyl-texture">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_320px] lg:gap-10">
            <div className="min-w-0">
              <CoverImage
                src={safeAlbum.cover || "/album/am.jpg"}
                alt={`${safeAlbum.title} by ${safeAlbum.artist} cover`}
                className="w-full max-w-[220px] shadow-[0_14px_28px_-22px_rgba(15,15,15,0.35)]"
              />

              <div className="mt-4 lg:hidden">
                <LogCard
                  onLogDates={() => setIsLogDatesOpen(true)}
                  onWriteReview={() => setIsReviewOpen(true)}
                  onFavorite={handleFavoriteClick}
                  isFavorited={isAlbumFavorited}
                  favoriteBusy={isFavoriteSaving}
                  ratingValue={backlogItem?.rating ?? 0}
                  disabled={!isSignedIn}
                />
              </div>
            </div>

            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Album
              </p>

              <h1 className="mb-1 text-3xl text-text leading-tight">{safeAlbum.title}</h1>
              <p className="mb-4 text-sm font-semibold text-text">{safeAlbum.artist}</p>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-semibold text-text">
                  {safeAlbum.type}
                </span>
                <span className="rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-semibold text-text">
                  {safeAlbum.format}
                </span>
                <span className="rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-semibold text-text">
                  {safeAlbum.length}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2 text-xs text-muted sm:grid-cols-2">
                <p className="mb-0">
                  <span className="font-semibold text-text">Release date:</span>{" "}
                  {safeAlbum.releaseDate || "Unknown"}
                </p>
                <p className="mb-0">
                  <span className="font-semibold text-text">Label:</span> {safeAlbum.label}
                </p>
                <p className="mb-0">
                  <span className="font-semibold text-text">Catalog:</span>{" "}
                  {safeAlbum.catalogNumber}
                </p>
                <p className="mb-0">
                  <span className="font-semibold text-text">Genres:</span>{" "}
                  {safeAlbum.genres.join(", ")}
                </p>
              </div>
            </div>

            <aside className="hidden min-w-0 lg:block">
              <LogCard
                onLogDates={() => setIsLogDatesOpen(true)}
                onWriteReview={() => setIsReviewOpen(true)}
                onFavorite={handleFavoriteClick}
                isFavorited={isAlbumFavorited}
                favoriteBusy={isFavoriteSaving}
                ratingValue={backlogItem?.rating ?? 0}
                disabled={!isSignedIn}
              />
            </aside>
          </div>
        </section>

        <section className="card vinyl-texture">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Tracklist
              </p>
              <h2 className="mb-0 text-xl text-text">All tracks</h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              {safeAlbum.tracks.length} tracks
            </span>
          </div>

          {safeAlbum.tracks.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 p-4 text-sm text-muted">
              Track details are still syncing.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-black/5">
              {safeAlbum.tracks.map((track) => (
                <li
                  key={`${track.number}-${track.title}`}
                  className="flex items-center gap-4 py-3"
                >
                  <span className="w-6 text-xs font-semibold text-muted">
                    {String(track.number).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-0 truncate text-sm font-semibold text-text">{track.title}</p>
                  </div>
                  <span className="text-xs font-semibold text-muted">{track.length}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card vinyl-texture">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Reviews
              </p>
              <h2 className="mb-0 text-xl text-text">Community reviews</h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              {safeAlbum.reviews.length} review{safeAlbum.reviews.length === 1 ? "" : "s"}
            </span>
          </div>

          {safeAlbum.reviews.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 p-4 text-sm text-muted">
              No reviews yet. Be the first to review this album.
            </div>
          ) : (
            <div className="mt-2 divide-y divide-black/5">
              {safeAlbum.reviews.map((review) => (
                <AlbumReviewCard
                  key={review?.backlogId ?? `${review?.user?.id ?? "user"}-${review?.reviewedAt ?? ""}`}
                  review={review}
                  isSignedIn={isSignedIn}
                  currentUserId={currentUserId}
                  likeBusy={reviewLikeBusyId === review?.backlogId}
                  commentBusy={reviewCommentBusyId === review?.backlogId}
                  editBusyCommentId={reviewCommentEditBusyId}
                  deleteBusyCommentId={reviewCommentDeleteBusyId}
                  onToggleLike={handleReviewLikeToggle}
                  onAddComment={handleReviewCommentAdd}
                  onEditComment={handleReviewCommentEdit}
                  onDeleteComment={handleReviewCommentDelete}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {logNotice ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 rounded-full border border-black/10 bg-white/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-800 shadow-[0_14px_30px_-20px_rgba(15,15,15,0.45)]">
          {logNotice}
        </div>
      ) : null}

      <LogDatesModal
        isOpen={isLogDatesOpen}
        onClose={() => setIsLogDatesOpen(false)}
        albumId={safeAlbum?.id}
        backlogId={backlogItem?.id ?? ""}
        albumTitle={safeAlbum?.title}
        albumArtist={safeAlbum?.artist}
        albumArt={safeAlbum?.cover}
        initialStatus={backlogItem?.status ?? "backloggd"}
        initialRating={backlogItem?.rating ?? 0}
        initialReviewText={backlogItem?.reviewText ?? ""}
        initialListenedOn={backlogItem?.addedAt ?? ""}
        onSaved={(item) => {
          handleBacklogSaved(item, "Log saved", { refreshAlbum: true })
        }}
      />
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        backlogId={backlogItem?.id ?? ''}
        albumTitle={safeAlbum?.title}
        initialReviewText={backlogItem?.reviewText ?? ''}
        onSaved={(item) => {
          handleBacklogSaved(item, "Review updated", { refreshAlbum: true })
        }}
      />
    </div>
  );
}
