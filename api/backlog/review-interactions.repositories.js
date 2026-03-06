import { InfrastructureError } from "../_lib/errors.js";

function handleDbError(error, context) {
  if (!error) return;
  throw new InfrastructureError(`Database error while ${context}.`, {
    message: error.message,
    code: error.code,
    details: error.details,
  });
}

export class ReviewInteractionsRepository {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async findReviewBacklogById(backlogId) {
    const { data, error } = await this.supabase
      .from("backlog")
      .select("id,user_id,review_text")
      .eq("id", backlogId)
      .maybeSingle();

    handleDbError(error, "fetching review backlog item");
    return data ?? null;
  }

  async upsertLike(backlogId, userId) {
    const { error } = await this.supabase
      .from("review_likes")
      .upsert(
        {
          backlog_id: backlogId,
          user_id: userId,
        },
        { onConflict: "backlog_id,user_id" }
      );

    handleDbError(error, "upserting review like");
  }

  async removeLike(backlogId, userId) {
    const { error } = await this.supabase
      .from("review_likes")
      .delete()
      .eq("backlog_id", backlogId)
      .eq("user_id", userId);

    handleDbError(error, "removing review like");
  }

  async hasUserLiked(backlogId, userId) {
    const { data, error } = await this.supabase
      .from("review_likes")
      .select("id")
      .eq("backlog_id", backlogId)
      .eq("user_id", userId)
      .maybeSingle();

    handleDbError(error, "checking review like");
    return Boolean(data?.id);
  }

  async countLikes(backlogId) {
    const { count, error } = await this.supabase
      .from("review_likes")
      .select("id", { count: "exact", head: true })
      .eq("backlog_id", backlogId);

    handleDbError(error, "counting review likes");
    return Number.isInteger(count) ? count : 0;
  }

  async countComments(backlogId) {
    const { count, error } = await this.supabase
      .from("review_comments")
      .select("id", { count: "exact", head: true })
      .eq("backlog_id", backlogId);

    handleDbError(error, "counting review comments");
    return Number.isInteger(count) ? count : 0;
  }

  async createComment(backlogId, userId, commentText) {
    const { data, error } = await this.supabase
      .from("review_comments")
      .insert({
        backlog_id: backlogId,
        user_id: userId,
        comment_text: commentText,
      })
      .select("id,backlog_id,user_id,comment_text,created_at,updated_at")
      .single();

    handleDbError(error, "creating review comment");
    return data;
  }

  async findCommentById(commentId) {
    const { data, error } = await this.supabase
      .from("review_comments")
      .select("id,backlog_id,user_id,comment_text,created_at,updated_at")
      .eq("id", commentId)
      .maybeSingle();

    handleDbError(error, "fetching review comment");
    return data ?? null;
  }

  async updateCommentById(commentId, commentText) {
    const { data, error } = await this.supabase
      .from("review_comments")
      .update({
        comment_text: commentText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .select("id,backlog_id,user_id,comment_text,created_at,updated_at")
      .single();

    handleDbError(error, "updating review comment");
    return data;
  }

  async removeCommentById(commentId) {
    const { error } = await this.supabase
      .from("review_comments")
      .delete()
      .eq("id", commentId);

    handleDbError(error, "deleting review comment");
  }

  async findUsersByIds(userIds) {
    const ids = Array.isArray(userIds)
      ? userIds.filter((value) => typeof value === "string" && value.trim())
      : [];
    if (ids.length === 0) return [];

    const { data, error } = await this.supabase
      .from("users")
      .select("id,username,avatar_url")
      .in("id", ids);

    handleDbError(error, "fetching users by ids");
    return data ?? [];
  }

  async listProfileMediaByUserIds(userIds) {
    const ids = Array.isArray(userIds)
      ? userIds.filter((value) => typeof value === "string" && value.trim())
      : [];
    if (ids.length === 0) return [];

    const { data, error } = await this.supabase
      .from("profiles")
      .select("id,avatar_path")
      .in("id", ids);

    handleDbError(error, "fetching profile media by user ids");
    return data ?? [];
  }
}
