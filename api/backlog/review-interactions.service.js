import { UnauthorizedError, ValidationError } from "../_lib/errors.js";

function assertString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`Field '${fieldName}' is required and must be a non-empty string.`);
  }
  return value.trim();
}

function assertUuidLike(value, fieldName) {
  const normalized = assertString(value, fieldName);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(normalized)) {
    throw new ValidationError(`Field '${fieldName}' must be a valid UUID.`);
  }
  return normalized;
}

function assertBoolean(value, fieldName) {
  if (typeof value !== "boolean") {
    throw new ValidationError(`Field '${fieldName}' must be a boolean.`);
  }
  return value;
}

function assertCommentText(value) {
  if (typeof value !== "string") {
    throw new ValidationError("Field 'commentText' is required and must be a string.");
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError("Field 'commentText' cannot be empty or whitespace only.");
  }
  if (trimmed.length > 500) {
    throw new ValidationError("Field 'commentText' must be 500 characters or fewer.");
  }
  return trimmed;
}

function buildAvatarUrl(avatarPath, supabaseUrl) {
  if (typeof avatarPath !== "string" || !avatarPath.trim()) return null;
  const normalized = avatarPath.trim();
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }
  const base = typeof supabaseUrl === "string" ? supabaseUrl.replace(/\/+$/, "") : "";
  if (!base) return null;
  return `${base}/storage/v1/object/public/avatars/${normalized}`;
}

function resolvePublicAvatarUrl(userAvatarUrl, profileAvatarPath, supabaseUrl) {
  const fromProfilePath = buildAvatarUrl(profileAvatarPath, supabaseUrl);
  if (fromProfilePath) return fromProfilePath;
  if (typeof userAvatarUrl === "string" && userAvatarUrl.trim()) {
    return userAvatarUrl.trim();
  }
  return null;
}

function mapComment(row, user, media, supabaseUrl) {
  const username =
    typeof user?.username === "string" && user.username.trim() ? user.username.trim() : "unknown-user";
  return {
    id: row?.id ?? null,
    backlogId: row?.backlog_id ?? null,
    commentText: row?.comment_text ?? "",
    createdAt: row?.created_at ?? null,
    updatedAt: row?.updated_at ?? null,
    user: {
      id: row?.user_id ?? null,
      username,
      avatarUrl: resolvePublicAvatarUrl(user?.avatar_url, media?.avatar_path, supabaseUrl),
    },
  };
}

export class ReviewInteractionsService {
  constructor({ reviewInteractionsRepository, supabaseUrl = "" }) {
    this.reviewInteractionsRepository = reviewInteractionsRepository;
    this.supabaseUrl = supabaseUrl;
  }

  async assertReviewExists(backlogId) {
    const reviewRow = await this.reviewInteractionsRepository.findReviewBacklogById(backlogId);
    if (!reviewRow?.id) {
      throw new ValidationError("Review not found.");
    }
    if (typeof reviewRow.review_text !== "string" || !reviewRow.review_text.trim()) {
      throw new ValidationError("Review not found.");
    }
    return reviewRow;
  }

  async buildSummary(backlogId, userId) {
    const [likeCount, commentCount, viewerHasLiked] = await Promise.all([
      this.reviewInteractionsRepository.countLikes(backlogId),
      this.reviewInteractionsRepository.countComments(backlogId),
      this.reviewInteractionsRepository.hasUserLiked(backlogId, userId),
    ]);

    return {
      backlogId,
      likeCount,
      commentCount,
      viewerHasLiked,
    };
  }

  async setLikeForReview(userId, input) {
    const backlogId = assertUuidLike(input?.backlogId, "backlogId");
    const liked = assertBoolean(input?.liked, "liked");
    await this.assertReviewExists(backlogId);

    if (liked) {
      await this.reviewInteractionsRepository.upsertLike(backlogId, userId);
    } else {
      await this.reviewInteractionsRepository.removeLike(backlogId, userId);
    }

    return this.buildSummary(backlogId, userId);
  }

  async addCommentToReview(userId, input) {
    const backlogId = assertUuidLike(input?.backlogId, "backlogId");
    const commentText = assertCommentText(input?.commentText);
    await this.assertReviewExists(backlogId);

    const createdComment = await this.reviewInteractionsRepository.createComment(
      backlogId,
      userId,
      commentText
    );

    const [summary, users, profileMediaRows] = await Promise.all([
      this.buildSummary(backlogId, userId),
      this.reviewInteractionsRepository.findUsersByIds([userId]),
      this.reviewInteractionsRepository.listProfileMediaByUserIds([userId]),
    ]);
    const user = Array.isArray(users) ? users[0] : null;
    const media = Array.isArray(profileMediaRows) ? profileMediaRows[0] : null;

    return {
      ...summary,
      comment: mapComment(createdComment, user, media, this.supabaseUrl),
    };
  }

  async assertCommentOwnedByUser(commentId, userId) {
    const commentRow = await this.reviewInteractionsRepository.findCommentById(commentId);
    if (!commentRow?.id) {
      throw new ValidationError("Comment not found.");
    }
    if (commentRow.user_id !== userId) {
      throw new UnauthorizedError("You can only modify your own comment.");
    }
    return commentRow;
  }

  async updateCommentForReview(userId, input) {
    const commentId = assertUuidLike(input?.commentId, "commentId");
    const commentText = assertCommentText(input?.commentText);
    const existingComment = await this.assertCommentOwnedByUser(commentId, userId);

    const updatedComment = await this.reviewInteractionsRepository.updateCommentById(
      commentId,
      commentText
    );

    const [summary, users, profileMediaRows] = await Promise.all([
      this.buildSummary(existingComment.backlog_id, userId),
      this.reviewInteractionsRepository.findUsersByIds([userId]),
      this.reviewInteractionsRepository.listProfileMediaByUserIds([userId]),
    ]);
    const user = Array.isArray(users) ? users[0] : null;
    const media = Array.isArray(profileMediaRows) ? profileMediaRows[0] : null;

    return {
      ...summary,
      comment: mapComment(updatedComment, user, media, this.supabaseUrl),
    };
  }

  async removeCommentFromReview(userId, input) {
    const commentId = assertUuidLike(input?.commentId, "commentId");
    const existingComment = await this.assertCommentOwnedByUser(commentId, userId);

    await this.reviewInteractionsRepository.removeCommentById(commentId);
    const summary = await this.buildSummary(existingComment.backlog_id, userId);

    return {
      ...summary,
      deletedCommentId: commentId,
    };
  }
}
