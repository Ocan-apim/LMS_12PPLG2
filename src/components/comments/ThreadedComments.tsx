"use client";

import { useState, useMemo } from "react";
import {
  MessageSquare,
  CornerDownRight,
  Send,
  Reply,
  Trash2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { validateComment } from "@/lib/profanity-filter";

export interface CommentItem {
  _id?: string;
  userId?: string;
  userName?: string;
  senderName?: string;
  userRole?: string;
  message: string;
  parentId?: string | null;
  isDeleted?: boolean;
  createdAt: string;
}

export interface ThreadedCommentsProps {
  comments: CommentItem[];
  currentUserId?: string;
  currentUserRole?: string;
  apiEndpoint: string;
  onCommentsUpdated: (updatedComments: CommentItem[]) => void;
  canComment?: boolean;
  title?: string;
}

export function ThreadedComments({
  comments = [],
  currentUserId,
  currentUserRole,
  apiEndpoint,
  onCommentsUpdated,
  canComment = true,
  title = "Komentar",
}: ThreadedCommentsProps) {
  // Top-level comment state
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Inline Reply state
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    parentId: string;
    authorName: string;
  } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Independent Expand/Collapse per thread
  // By default, threads with replies are expanded (tracked via collapsedThreads so async-loaded comments default to expanded)
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(
    () => new Set()
  );

  // Delete modal state
  const [deleteTargetComment, setDeleteTargetComment] = useState<{
    id: string;
  } | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isReadOnly =
    !canComment || ["kurikulum", "kepsek"].includes(currentUserRole || "");

  // Organize comments into single-level thread hierarchy
  const { topLevelComments, repliesByParentId } = useMemo(() => {
    const top: CommentItem[] = [];
    const repliesMap = new Map<string, CommentItem[]>();

    for (const c of comments) {
      if (!c.parentId) {
        top.push(c);
      } else {
        const pId = String(c.parentId);
        const existing = repliesMap.get(pId) || [];
        existing.push(c);
        repliesMap.set(pId, existing);
      }
    }

    return { topLevelComments: top, repliesByParentId: repliesMap };
  }, [comments]);

  // Permission check for deleting comments
  const canDelete = (c: CommentItem) => {
    if (isReadOnly || c.isDeleted) return false;
    if (currentUserRole === "admin") return true;
    if (currentUserRole === "guru") return true;
    if (
      currentUserRole === "siswa" &&
      currentUserId &&
      String(c.userId) === String(currentUserId)
    ) {
      return true;
    }
    return false;
  };

  const toggleThreadExpand = (threadId: string) => {
    setCollapsedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  // Submit a top-level comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment || isReadOnly) return;
    setCommentError(null);

    // Client-side profanity check
    const clientValidation = validateComment(commentText);
    if (!clientValidation.isValid) {
      setCommentError(
        clientValidation.message ||
          "Komentar tidak dapat dikirim karena mengandung kata atau ungkapan yang tidak pantas. Silakan gunakan bahasa yang lebih sopan."
      );
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commentText.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        onCommentsUpdated([...comments, json.data]);
        setCommentText("");
        setCommentError(null);
      } else {
        setCommentError(json.message || "Gagal menambahkan komentar");
      }
    } catch (err) {
      console.error("Gagal menambahkan komentar:", err);
      setCommentError("Terjadi kesalahan koneksi saat mengirim komentar");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Submit an inline reply attached to the root parent thread
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTo || !replyText.trim() || submittingReply || isReadOnly) return;
    setReplyError(null);

    // Client-side profanity check
    const clientValidation = validateComment(replyText);
    if (!clientValidation.isValid) {
      setReplyError(
        clientValidation.message ||
          "Komentar tidak dapat dikirim karena mengandung kata atau ungkapan yang tidak pantas. Silakan gunakan bahasa yang lebih sopan."
      );
      return;
    }

    setSubmittingReply(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: replyText.trim(),
          parentId: replyingTo.parentId,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const activeThreadId = replyingTo.id;
        onCommentsUpdated([...comments, json.data]);
        setReplyText("");
        setReplyingTo(null);
        setReplyError(null);
        // Ensure the active thread is expanded
        setCollapsedThreads((prev) => {
          const next = new Set(prev);
          next.delete(activeThreadId);
          return next;
        });
      } else {
        setReplyError(json.message || "Gagal mengirim balasan");
      }
    } catch (err) {
      console.error("Gagal mengirim balasan:", err);
      setReplyError("Terjadi kesalahan koneksi saat mengirim balasan");
    } finally {
      setSubmittingReply(false);
    }
  };

  // Delete a comment or reply with server validation
  const handleDeleteComment = async () => {
    if (!deleteTargetComment || deletingComment) return;
    setDeletingComment(true);
    setDeleteError(null);

    try {
      const res = await fetch(
        `${apiEndpoint}?commentId=${encodeURIComponent(deleteTargetComment.id)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        // Update local comment list based on server outcome
        const updated = comments
          .map((c) => {
            if (String(c._id) === deleteTargetComment.id) {
              // If server preserved thread placeholder:
              if (json.action === "placeholder" || json.isDeleted) {
                return { ...c, isDeleted: true, message: "Komentar ini telah dihapus" };
              }
              return null;
            }
            return c;
          })
          .filter(Boolean) as CommentItem[];

        onCommentsUpdated(updated);
        setDeleteTargetComment(null);
      } else {
        setDeleteError(json.message || "Gagal menghapus komentar");
      }
    } catch (err) {
      console.error("Gagal menghapus komentar:", err);
      setDeleteError("Terjadi kesalahan koneksi saat menghapus komentar");
    } finally {
      setDeletingComment(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-[family-name:var(--font-display)] text-base font-extrabold text-slate-900 flex items-center gap-2">
          <MessageSquare className="size-4 text-blue-600" />
          <span>{title}</span>
        </h3>
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
          {comments.length}
        </span>
      </div>

      {/* Top-Level Comment Input */}
      {!isReadOnly ? (
        <form onSubmit={handleAddComment} className="pt-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Tulis komentar..."
              value={commentText}
              onChange={(e) => {
                setCommentText(e.target.value);
                if (commentError) setCommentError(null);
              }}
              disabled={submittingComment}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition ${
                commentError
                  ? "border-red-400 bg-red-50/40 text-red-900 focus:border-red-500"
                  : "border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white"
              }`}
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submittingComment}
              className="rounded-xl bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50 transition shrink-0"
              title="Kirim Komentar"
            >
              {submittingComment ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </div>
          {commentError && (
            <p className="mt-1.5 flex items-start gap-1 text-[11px] font-medium text-red-600 animate-in fade-in">
              <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-red-500" />
              <span>{commentError}</span>
            </p>
          )}
        </form>
      ) : (
        <div className="rounded-xl bg-slate-50 p-2.5 text-center border border-slate-100">
          <p className="text-[11px] text-slate-500 italic">
            Mode pratinjau staf: Pengiriman komentar dinonaktifkan.
          </p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-3 pt-2">
        {topLevelComments.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-6">
            Belum ada komentar.
          </p>
        ) : (
          topLevelComments.map((c, i) => {
            const author = c.userName || c.senderName || "Pengguna";
            const threadId = String(c._id || `top-${i}`);
            const replies =
              (c._id ? repliesByParentId.get(String(c._id)) : null) ||
              repliesByParentId.get(threadId) ||
              [];
            const isThreadExpanded = !collapsedThreads.has(threadId);

            return (
              <div
                key={threadId}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs hover:border-slate-200 transition space-y-2"
              >
                {/* Top-Level Comment Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="size-6 shrink-0 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                      {author.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900">{author}</span>
                        {c.userRole && (
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                              c.userRole === "guru"
                                ? "bg-purple-100 text-purple-700"
                                : c.userRole === "admin"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {c.userRole}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions for Top-Level Comment */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!isReadOnly && !c.isDeleted && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo({
                            id: threadId,
                            parentId: c._id ? String(c._id) : threadId,
                            authorName: author,
                          });
                          setReplyText("");
                          setReplyError(null);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition"
                        title="Balas Komentar"
                      >
                        <Reply className="size-3" />
                        <span>Balas</span>
                      </button>
                    )}
                    {canDelete(c) && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTargetComment({ id: c._id || "" });
                          setDeleteError(null);
                        }}
                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition"
                        title="Hapus Komentar"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment Body */}
                {c.isDeleted ? (
                  <p className="text-slate-400 text-xs italic">
                    Komentar ini telah dihapus
                  </p>
                ) : (
                  <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap pl-8">
                    {c.message}
                  </p>
                )}

                {/* Replies Thread Toggle if replies exist */}
                {replies.length > 0 && (
                  <div className="pl-8 pt-1">
                    <button
                      type="button"
                      onClick={() => toggleThreadExpand(threadId)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-blue-600 transition"
                    >
                      {isThreadExpanded ? (
                        <>
                          <ChevronUp className="size-3.5" />
                          <span>Sembunyikan balasan ({replies.length})</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-3.5" />
                          <span>Lihat {replies.length} balasan</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Indented Replies List */}
                {replies.length > 0 && isThreadExpanded && (
                  <div className="ml-8 pl-3 border-l-2 border-slate-200 space-y-2 pt-1 animate-in fade-in">
                    {replies.map((reply, rIdx) => {
                      const replyAuthor =
                        reply.userName || reply.senderName || "Pengguna";
                      const replyId = String(reply._id || `reply-${rIdx}`);

                      return (
                        <div
                          key={replyId}
                          className="rounded-lg bg-white p-2.5 border border-slate-100 space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="size-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                                {replyAuthor.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-900 text-[11px]">
                                {replyAuthor}
                              </span>
                              {reply.userRole && (
                                <span className="rounded bg-blue-50 px-1 py-0.2 text-[8px] font-semibold text-blue-600 capitalize">
                                  {reply.userRole}
                                </span>
                              )}
                              <span className="text-[9px] text-slate-400">
                                {new Date(reply.createdAt).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {!isReadOnly && !reply.isDeleted && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingTo({
                                      id: threadId,
                                      parentId: c._id ? String(c._id) : threadId,
                                      authorName: replyAuthor,
                                    });
                                    setReplyText("");
                                    setReplyError(null);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 p-0.5 rounded transition"
                                  title="Balas"
                                >
                                  <Reply className="size-2.5" />
                                  <span>Balas</span>
                                </button>
                              )}
                              {canDelete(reply) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteTargetComment({ id: reply._id || "" });
                                    setDeleteError(null);
                                  }}
                                  className="text-slate-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 transition"
                                  title="Hapus Balasan"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {reply.isDeleted ? (
                            <p className="text-slate-400 text-[11px] italic pl-6">
                              Komentar ini telah dihapus
                            </p>
                          ) : (
                            <p className="text-slate-700 text-[11px] leading-relaxed whitespace-pre-wrap pl-6">
                              {reply.message}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Inline Reply Input directly underneath active thread */}
                {replyingTo?.id === threadId && !isReadOnly && (
                  <div className="mt-2 ml-8 pl-3 border-l-2 border-blue-500 space-y-2 pt-1 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <CornerDownRight className="size-3 text-blue-600" />
                        Membalas @{replyingTo?.authorName || "Komentar"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyText("");
                          setReplyError(null);
                        }}
                        className="text-slate-400 hover:text-slate-600 text-[10px]"
                      >
                        Batal
                      </button>
                    </div>

                    <form onSubmit={handleSendReply} className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder={`Balas @${replyingTo?.authorName || "Komentar"}...`}
                          value={replyText}
                          onChange={(e) => {
                            setReplyText(e.target.value);
                            if (replyError) setReplyError(null);
                          }}
                          disabled={submittingReply}
                          className={`flex-1 rounded-lg border px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition ${
                            replyError
                              ? "border-red-400 bg-red-50/40 text-red-900 focus:border-red-500"
                              : "border-slate-200 bg-white focus:border-blue-500"
                          }`}
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={submittingReply || !replyText.trim()}
                          className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700 disabled:opacity-50 transition shrink-0"
                          title="Kirim Balasan"
                        >
                          {submittingReply ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Send className="size-3" />
                          )}
                        </button>
                      </div>
                      {replyError && (
                        <p className="flex items-start gap-1 text-[10px] font-medium text-red-600 animate-in fade-in">
                          <AlertCircle className="size-3 shrink-0 mt-0.5 text-red-500" />
                          <span>{replyError}</span>
                        </p>
                      )}
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-red-100 text-red-600 shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hapus Komentar</h3>
                <p className="text-xs text-slate-500">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Yakin ingin menghapus komentar ini?
            </p>

            {deleteError && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1.5 bg-red-50 p-2.5 rounded-xl border border-red-200">
                <AlertCircle className="size-4 shrink-0" />
                <span>{deleteError}</span>
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deletingComment}
                onClick={() => {
                  setDeleteTargetComment(null);
                  setDeleteError(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingComment}
                onClick={handleDeleteComment}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {deletingComment ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
