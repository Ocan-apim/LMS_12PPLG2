"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Download,
  MessageSquare,
  CornerDownRight,
  Send,
  Pencil,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Spinner } from "@/components/ui";

interface AssignmentAttachment {
  name: string;
  url: string;
  type: string;
  size?: string;
}

interface CommentItem {
  _id?: string;
  userId?: string;
  userName?: string;
  senderName?: string;
  userRole?: string;
  message: string;
  isReply?: boolean;
  createdAt: string;
}

interface AssignmentDetail {
  _id: string;
  title: string;
  instructions?: string;
  description?: string;
  type: string;
  dueDate?: string;
  maxScore: number;
  turnedInCount: number;
  gradedCount: number;
  courseClassId?: {
    _id: string;
    name: string;
    code: string;
  };
  quizId?: {
    _id: string;
    title: string;
    questions?: unknown[];
  };
  attachments?: AssignmentAttachment[];
  isPublished?: boolean;
  currentUserRole?: string;
  createdAt: string;
}

export default function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real comments state
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    async function loadDetail() {
      try {
        setError(null);
        const res = await fetch(`/api/guru/assignments/${id}`);
        const json = await res.json();
        if (json.success) {
          setAssignment(json.data);
          if (json.data.comments && Array.isArray(json.data.comments)) {
            setComments(json.data.comments);
          }
        } else {
          setError(json.message || "Gagal memuat detail tugas");
        }
      } catch (err: unknown) {
        console.error("Gagal memuat tugas:", err);
        setError("Terjadi kesalahan jaringan saat memuat tugas");
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/guru/assignments/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newComment.trim() }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setComments((prev) => [...prev, json.data]);
        setNewComment("");
        setShowCommentInput(false);
      } else {
        alert(json.message || "Gagal menambahkan komentar");
      }
    } catch (err) {
      console.error("Gagal menambahkan komentar:", err);
      alert("Gagal menambahkan komentar");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleToggleStatus() {
    if (!assignment) return;
    const newStatus = assignment.isPublished === false ? true : false;
    try {
      const res = await fetch(`/api/guru/assignments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setAssignment((prev) => (prev ? { ...prev, isPublished: newStatus } : null));
      }
    } catch (err) {
      console.error("Gagal mengubah status tugas:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center max-w-lg mx-auto">
        <h2 className="text-base font-bold text-red-900">Gagal Memuat Tugas</h2>
        <p className="mt-2 text-xs text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">Tugas tidak ditemukan</h2>
        <p className="mt-2 text-xs text-slate-500">
          Tugas ini mungkin telah dihapus atau Anda tidak memiliki akses.
        </p>
        <Link href="/guru/assignments" className="mt-4 inline-block">
          <button className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Kembali ke Daftar Tugas
          </button>
        </Link>
      </div>
    );
  }

  const className = assignment.courseClassId?.name || "Kelas";
  const classId = assignment.courseClassId?._id;
  const attachments = assignment.attachments || [];

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* Breadcrumb matching Screenshot 3 Left */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <Link
          href={classId ? `/guru/classes/${classId}` : "/guru/classes"}
          className="hover:text-blue-600 transition"
        >
          {className}
        </Link>
        <ChevronRight className="size-3 text-slate-300" />
        <span className="text-blue-600 font-semibold truncate max-w-md">
          {assignment.title}
        </span>
      </div>

      {/* Main Grid: Content on Left (8 cols), Kolom Komentar on Right (4 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Card matching Screenshot 3 Left */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <FileText className="size-6" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                  {assignment.title}
                </h1>
                <p className="text-xs text-slate-400">20 - 21 July 2026</p>
                <p className="text-xs font-bold text-slate-900 pt-1">
                  {assignment.maxScore || 100} Poin
                </p>
              </div>
            </div>

            {/* Status toggle & "Lihat Submisi" Button matching Screenshot 3 Left */}
            <div className="flex items-center gap-2">
              {["admin", "kurikulum", "kepsek"].includes(assignment.currentUserRole || "") ? (
                <span className="rounded-xl px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Mode Pratinjau (Read-Only)
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  title="Klik untuk mengubah status publikasi tugas"
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
                    assignment.isPublished !== false
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  {assignment.isPublished !== false ? "● AKTIF" : "○ DRAFT"}
                </button>
              )}

              {!["admin", "kurikulum", "kepsek"].includes(assignment.currentUserRole || "") && (
                <Link href={`/guru/assignments/${id}/submissions`}>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 transition"
                  >
                    Lihat Submisi
                  </button>
                </Link>
              )}
            </div>
          </div>

          {/* Description text */}
          <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
            {assignment.instructions || "Silahkan di kerjakan dan jangan nyontek!"}
          </div>

          {/* File yang dibagi Section matching Screenshot 3 Left */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">File yang dibagi</h3>
            {attachments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada file yang dibagikan.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <FileText className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {file.size || "-"} • {file.type || "file"}
                        </p>
                      </div>
                    </div>

                    <a
                      href={`/api/files/download?url=${encodeURIComponent(file.url)}&name=${encodeURIComponent(file.name)}`}
                      download
                      className="p-2 text-slate-400 hover:text-blue-600 transition"
                      title="Unduh file"
                    >
                      <Download className="size-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Kolom Komentar matching Screenshot 3 Left */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Kolom Komentar</h3>

            {/* "Tambahkan Komentar" button (hidden in read-only mode) */}
            {!["admin", "kurikulum", "kepsek"].includes(assignment.currentUserRole || "") && (
              <button
                type="button"
                onClick={() => setShowCommentInput((prev) => !prev)}
                className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
              >
                <MessageSquare className="size-4" />
                <span>Tambahkan Komentar</span>
              </button>
            )}

            {/* Comment Form if expanded */}
            {showCommentInput && !["admin", "kurikulum", "kepsek"].includes(assignment.currentUserRole || "") && (
              <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Tulis komentar..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={submittingComment}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  className="rounded-xl bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  <Send className="size-3.5" />
                </button>
              </form>
            )}

            {/* Comments List */}
            <div className="space-y-3 pt-2">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada komentar.</p>
              ) : (
                comments.map((c, i) => {
                  const author = c.userName || c.senderName || "Pengguna";
                  return (
                    <div
                      key={c._id || i}
                      className={`flex items-start gap-2.5 text-xs ${
                        c.isReply ? "pl-5" : ""
                      }`}
                    >
                      {c.isReply && (
                        <CornerDownRight className="size-3.5 text-slate-400 shrink-0 mt-1" />
                      )}
                      {/* Black circular avatar */}
                      <div className="size-6 shrink-0 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                        {author.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 leading-snug">
                        <span className="font-bold text-slate-900">{author}</span>
                        <span className="text-slate-400 mx-1">:</span>
                        <span className="text-slate-600">{c.message}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button at Bottom Right: Blue Circular Edit/Pencil matching Screenshot 3 Left (only for teacher owner) */}
      {!["admin", "kurikulum", "kepsek"].includes(assignment.currentUserRole || "") && (
        <div className="fixed bottom-6 right-8 z-40">
          <Link
            href={`/guru/assignments/${id}/edit`}
            title="Edit Tugas"
            className="flex size-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-700"
          >
            <Pencil className="size-5" />
          </Link>
        </div>
      )}
    </div>
  );
}
