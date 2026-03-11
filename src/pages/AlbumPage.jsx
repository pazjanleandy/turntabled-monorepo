import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarPlus, ChatCircle, Heart, MusicNotes, NotePencil, Star, UserCircle } from "phosphor-react";
import Navbar from "../components/Navbar.jsx";
import NavbarGuest from "../components/NavbarGuest.jsx";
import BackButton from "../components/BackButton.jsx";
import CoverImage from "../components/CoverImage.jsx";
import StarRating from "../components/StarRating.jsx";
import LogDatesModal from "../components/album/LogDatesModal.jsx";
import ReviewModal from "../components/album/ReviewModal.jsx";
import HomeMobileSidebar from "../components/home/HomeMobileSidebar.jsx";
import useAuthStatus from "../hooks/useAuthStatus.js";
import { buildApiAuthHeaders } from "../lib/apiAuth.js";
import {
  PROFILE_EVENT_NAME,
  emitProfileUpdated,
  fetchCurrentProfile,
  readCachedProfile,
} from "../lib/profileClient.js";
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

function MobileAlbumHeader({ isSignedIn, navUser, onOpenMenu }) {
  const username = navUser?.username || "";
  const avatarUrl = navUser?.avatarUrl || "";
  const initials = (username || "U").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/82 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex h-11 max-w-5xl items-center justify-between px-4 sm:px-5">
        {isSignedIn ? (
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={onOpenMenu}
            className="inline-flex h-8 w-8 items-center justify-center border-0 bg-transparent p-0 text-slate-700 shadow-none transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            <svg
              aria-hidden="true"
              width="16"
              height="12"
              viewBox="0 0 16 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M1 1H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M1 6H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M1 11H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <span className="inline-flex h-8 w-8" aria-hidden="true" />
        )}

        <Link
          to={isSignedIn ? "/home" : "/"}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-text transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-accent">
            <MusicNotes size={13} weight="bold" />
          </span>
          Turntabled
        </Link>

        {isSignedIn ? (
          <Link
            to="/profile"
            aria-label="Open profile"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-black/10 bg-white/70 p-0 text-text transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${username || "User"} avatar`}
                className="h-6 w-6 rounded-md object-cover"
              />
            ) : username ? (
              <span className="text-[10px] font-bold uppercase text-accent">{initials}</span>
            ) : (
              <UserCircle size={16} weight="duotone" />
            )}
          </Link>
        ) : (
          <Link
            to="/"
            className="inline-flex h-8 items-center rounded-full border border-black/10 bg-white/70 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text transition hover:bg-white"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

function MobileBackRow({ onBack }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-text shadow-none transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      aria-label="Go back"
    >
      <ArrowLeft size={13} weight="bold" />
      Back
    </button>
  );
}

function MobileActionPanel({
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
    <div className="rounded-2xl border border-black/10 bg-white/68 p-3.5 shadow-[0_16px_30px_-24px_rgba(15,15,15,0.4)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
            Your log
          </p>
          <p className="mb-0 text-sm font-semibold text-text">Rate this album</p>
        </div>
        <button
          type="button"
          className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
            isFavorited
              ? "border-orange-500/40 bg-accent/15 text-accent"
              : "border-black/10 bg-white/75 text-text hover:text-accent"
          } disabled:cursor-not-allowed disabled:opacity-55`}
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
          <Heart size={12} weight={isFavorited ? "fill" : "bold"} />
          {favoriteBusy ? "Saving..." : isFavorited ? "Favorited" : "Favorite"}
        </button>
      </div>

      <div className="mt-2">
        <StarRating value={safeRating} readOnly size={17} />
      </div>
      <p className="mb-0 mt-1 text-[11px] text-muted">
        Adjust rating from your log entry.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white/72 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-text transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
          onClick={onWriteReview}
          disabled={disabled}
          title={disabled ? "Login required" : "Write a review"}
        >
          <NotePencil size={13} weight="bold" />
          Review
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-orange-500/40 bg-accent px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1f130c] transition hover:bg-[#ef6b2f] disabled:cursor-not-allowed disabled:opacity-55"
          onClick={onLogDates}
          disabled={disabled}
          title={disabled ? "Login required" : "Log album"}
        >
          <CalendarPlus size={13} weight="bold" />
          Log album
        </button>
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
    <article className="flex items-start gap-3 py-3.5 md:py-4">
      <div className="mt-0.5">
        {review?.user?.avatarUrl ? (
          <img
            src={review.user.avatarUrl}
            alt={`${username} avatar`}
            className="h-9 w-9 rounded-full border border-black/10 object-cover md:h-10 md:w-10"
          />
        ) : (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-accent/15 text-[10px] font-semibold uppercase text-accent md:h-10 md:w-10 md:text-xs">
            {getReviewerInitials(username)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="mb-0 text-[12px] text-muted md:text-sm">Review by</p>
          {profilePath ? (
            <Link
              to={profilePath}
              className="text-[13px] font-semibold text-text transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 md:text-sm"
            >
              @{username.replace(/^@/, "")}
            </Link>
          ) : (
            <p className="mb-0 text-[13px] font-semibold text-text md:text-sm">@{username.replace(/^@/, "")}</p>
          )}
          <StarRating value={ratingValue} readOnly size={13} />
          <span className="text-xs font-semibold text-muted">{ratingValue}/5</span>
          <span className="text-xs text-muted">{formatReviewDate(review?.reviewedAt ?? review?.addedAt)}</span>
        </div>
        <p className="mb-0 mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700 md:mt-2 md:text-sm">{review?.reviewText}</p>

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
          <div className="mt-2.5 rounded-lg border border-black/10 bg-[#f8f6f4]/85 md:rounded-xl">
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
  const navigate = useNavigate();
  const { releaseId } = useParams();
  const { isSignedIn, signOut } = useAuthStatus();
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [navUser, setNavUser] = useState(() => {
    const cached = readCachedProfile();
    return {
      username: cached?.username || "",
      avatarUrl: cached?.avatarUrl || "",
    };
  });

  useEffect(() => {
    if (!isSignedIn) {
      setCurrentUserId("");
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) {
      setNavUser({ username: "", avatarUrl: "" });
      setIsSidebarOpen(false);
      return;
    }

    let cancelled = false;

    async function loadNavUser() {
      try {
        const profile = await fetchCurrentProfile();
        if (!cancelled) {
          emitProfileUpdated(profile);
          setNavUser({ username: profile.username || "", avatarUrl: profile.avatarUrl || "" });
        }
      } catch {
        // Keep cached profile on fetch failure.
      }
    }

    const handleProfileUpdate = (event) => {
      const profile = event?.detail;
      if (!profile) return;
      setNavUser({
        username: profile.username || "",
        avatarUrl: profile.avatarUrl || "",
      });
    };

    window.addEventListener(PROFILE_EVENT_NAME, handleProfileUpdate);
    loadNavUser();

    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_EVENT_NAME, handleProfileUpdate);
    };
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSidebarOpen]);

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
  const openSidebar = () => setIsSidebarOpen(true);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleMobileSignOut = () => {
    signOut();
    setNavUser({ username: "", avatarUrl: "" });
    closeSidebar();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <MobileAlbumHeader isSignedIn={isSignedIn} navUser={navUser} onOpenMenu={openSidebar} />
        {isSignedIn ? (
          <div className="md:hidden">
            <HomeMobileSidebar
              isOpen={isSidebarOpen}
              navUser={navUser}
              isSignedIn={isSignedIn}
              onClose={closeSidebar}
              onSignOut={handleMobileSignOut}
            />
          </div>
        ) : null}

        <div className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-5 md:px-10 lg:px-16">
          <div className="space-y-6 md:space-y-10">
            <div className="hidden md:block">
              {isSignedIn ? (
                <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
              ) : (
                <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
              )}
            </div>

            <div className="pt-3 md:hidden">
              <MobileBackRow onBack={() => navigate(-1)} />
            </div>
            <div className="hidden md:block">
              <BackButton className="self-start" />
            </div>

            <section className="card vinyl-texture">
              <p className="mb-0 text-sm text-muted">Loading album details...</p>
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (!safeAlbum) {
    return (
      <div className="min-h-screen">
        <MobileAlbumHeader isSignedIn={isSignedIn} navUser={navUser} onOpenMenu={openSidebar} />
        {isSignedIn ? (
          <div className="md:hidden">
            <HomeMobileSidebar
              isOpen={isSidebarOpen}
              navUser={navUser}
              isSignedIn={isSignedIn}
              onClose={closeSidebar}
              onSignOut={handleMobileSignOut}
            />
          </div>
        ) : null}

        <div className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-5 md:px-10 lg:px-16">
          <div className="space-y-6 md:space-y-10">
            <div className="hidden md:block">
              {isSignedIn ? (
                <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
              ) : (
                <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
              )}
            </div>

            <div className="pt-3 md:hidden">
              <MobileBackRow onBack={() => navigate(-1)} />
            </div>
            <div className="hidden md:block">
              <BackButton className="self-start" />
            </div>

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
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <MobileAlbumHeader isSignedIn={isSignedIn} navUser={navUser} onOpenMenu={openSidebar} />
      {isSignedIn ? (
        <div className="md:hidden">
          <HomeMobileSidebar
            isOpen={isSidebarOpen}
            navUser={navUser}
            isSignedIn={isSignedIn}
            onClose={closeSidebar}
            onSignOut={handleMobileSignOut}
          />
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-5 md:px-10 lg:px-16">
        <div className="space-y-6 md:space-y-10">
          <div className="hidden md:block">
            {isSignedIn ? (
              <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
            ) : (
              <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
            )}
          </div>
          <div className="pt-3 md:hidden">
            <MobileBackRow onBack={() => navigate(-1)} />
          </div>
          <div className="hidden md:block">
            <BackButton className="self-start" />
          </div>

          <section className="md:hidden">
            <div className="flex items-start gap-3.5">
              <div className="w-[42%] max-w-[170px] shrink-0">
                <CoverImage
                  src={safeAlbum.cover || "/album/am.jpg"}
                  alt={`${safeAlbum.title} by ${safeAlbum.artist} cover`}
                  className="w-full shadow-[0_16px_30px_-20px_rgba(15,15,15,0.45)]"
                />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Album
                </p>
                <h1 className="mb-1 text-[1.72rem] leading-[1.02] text-text">{safeAlbum.title}</h1>
                <p className="mb-3 text-[14px] font-semibold text-text">{safeAlbum.artist}</p>

                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-black/8 bg-white/65 px-2.5 py-1 text-[10px] font-semibold text-text">
                    {safeAlbum.type}
                  </span>
                  <span className="rounded-full border border-black/8 bg-white/65 px-2.5 py-1 text-[10px] font-semibold text-text">
                    {safeAlbum.format}
                  </span>
                  <span className="rounded-full border border-black/8 bg-white/65 px-2.5 py-1 text-[10px] font-semibold text-text">
                    {safeAlbum.length}
                  </span>
                </div>
              </div>
            </div>

            <dl className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-black/10 pt-3.5 text-[11px]">
              <div>
                <dt className="text-muted">Release</dt>
                <dd className="mb-0 mt-0.5 font-semibold text-text">{safeAlbum.releaseDate || "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-muted">Label</dt>
                <dd className="mb-0 mt-0.5 truncate font-semibold text-text">{safeAlbum.label}</dd>
              </div>
              <div>
                <dt className="text-muted">Catalog</dt>
                <dd className="mb-0 mt-0.5 truncate font-semibold text-text">{safeAlbum.catalogNumber}</dd>
              </div>
              <div>
                <dt className="text-muted">Genres</dt>
                <dd className="mb-0 mt-0.5 font-semibold leading-snug text-text">{safeAlbum.genres.join(", ")}</dd>
              </div>
            </dl>

            <div className="mt-4">
              <MobileActionPanel
                onLogDates={() => setIsLogDatesOpen(true)}
                onWriteReview={() => setIsReviewOpen(true)}
                onFavorite={handleFavoriteClick}
                isFavorited={isAlbumFavorited}
                favoriteBusy={isFavoriteSaving}
                ratingValue={backlogItem?.rating ?? 0}
                disabled={!isSignedIn}
              />
            </div>
          </section>

          <section className="hidden md:block card vinyl-texture">
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

          <section className="border-t border-black/10 pt-5 md:hidden">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Tracklist
                </p>
                <h2 className="mb-0 text-[1.25rem] leading-tight text-text">All tracks</h2>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {safeAlbum.tracks.length} tracks
              </span>
            </div>

            {safeAlbum.tracks.length === 0 ? (
              <div className="mt-3 rounded-xl border border-black/10 bg-white/55 px-3.5 py-3 text-[13px] text-muted">
                Track details are still syncing.
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white/52 px-3">
                {safeAlbum.tracks.map((track) => (
                  <li
                    key={`${track.number}-${track.title}`}
                    className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-2 py-2.5"
                  >
                    <span className="pt-0.5 text-[11px] font-semibold text-muted">
                      {String(track.number).padStart(2, "0")}
                    </span>
                    <p className="mb-0 text-[13px] font-semibold leading-snug text-text">{track.title}</p>
                    <span className="whitespace-nowrap pl-2 text-[11px] font-semibold text-muted">{track.length}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="hidden md:block card vinyl-texture">
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

          <div id="album-community-reviews" className="scroll-mt-20 md:scroll-mt-24" />

          <section className="border-t border-black/10 pt-5 md:hidden">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Reviews
                </p>
                <h2 className="mb-0 text-[1.25rem] leading-tight text-text">Community reviews</h2>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {safeAlbum.reviews.length} review{safeAlbum.reviews.length === 1 ? "" : "s"}
              </span>
            </div>

            {safeAlbum.reviews.length === 0 ? (
              <div className="mt-3 rounded-xl border border-black/10 bg-white/55 px-3.5 py-3 text-[13px] text-muted">
                No reviews yet. Be the first to review this album.
              </div>
            ) : (
              <div className="mt-2 divide-y divide-black/10">
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

          <section className="hidden md:block card vinyl-texture">
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
      </div>

      {logNotice ? (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-black/10 bg-white/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-800 shadow-[0_14px_30px_-20px_rgba(15,15,15,0.45)] md:left-auto md:right-4 md:translate-x-0">
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
