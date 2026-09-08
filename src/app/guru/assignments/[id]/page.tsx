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
  senderName: string;
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

  // Comments state matching Screenshot 3 Left
  const [comments, setComments] = useState<CommentItem[]>([
    {
      senderName: "Hosanna Serafim",
      message: "Lorem ipsum dolor amet",
      createdAt: "2 jam yang lalu",
    },
    {
      senderName: "Hosanna Serafim",
      message: "Lorem ipsum dolor amet",
      isReply: true,
      createdAt: "1 jam yang lalu",
    },
    {
      senderName: "Hosanna Serafim",
      message: "Lorem ipsum dolor amet",
      createdAt: "30 menit yang lalu",
    },
  ]);
  const [newComment, setNewComment] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);

  useEffect(() => {
    async function loadDetail() {
      try {
        const res = await fetch(`/api/guru/assignments/${id}`);
        const json = await res.json();
        if (json.success) {
          setAssignment(json.data);
        }
      } catch (err) {
        console.error("Gagal memuat tugas:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setComments((prev) => [
      ...prev,
      {
        senderName: "Bu Guru",
        message: newComment.trim(),
        createdAt: "Baru saja",
      },
    ]);
    setNewComment("");
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
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

  const className = assignment.courseClassId?.name || "10 PPLG 1";
  const classId = assignment.courseClassId?._id;
  const attachments =
    assignment.attachments && assignment.attachments.length > 0
      ? assignment.attachments
      : [
          {
            name: "lorem ipsum dolor",
            url: "#",
            type: "lorem dolor",
            size: "2.4 MB",
          },
          {
            name: "lorem ipsum dolor",
            url: "#",
            type: "lorem dolor",
            size: "2.4 MB",
          },
        ];

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

            {/* "Lihat Submisi" Button matching Screenshot 3 Left */}
            <Link href={`/guru/assignments/${id}/submissions`}>
              <button
                type="button"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 transition"
              >
                Lihat Submisi
              </button>
            </Link>
          </div>

          {/* Description text */}
          <div className="text-xs text-slate-700 leading-relaxed">
            {assignment.instructions || "Silahkan di kerjakan dan jangan nyontek!"}
          </div>

          {/* Embedded Quiz Card matching Screenshot 3 Left (Cat image background + overlay) */}
          <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white shadow-md aspect-16/9 sm:aspect-21/9 flex items-center justify-center">
            {/* Background cover image (kitten/cat photo matching screenshot) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=1200&auto=format&fit=crop"
              alt="Kuis Thumbnail"
              className="absolute inset-0 size-full object-cover opacity-65"
            />

            {/* Dark overlay for contrast */}
            <div className="absolute inset-0 bg-black/25" />

            {/* Centered card on top of image */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-3 px-4">
              <h3 className="text-base sm:text-lg font-bold text-white drop-shadow-md">
                {assignment.quizId?.title || assignment.title}
              </h3>
              <p className="text-xs text-white/90 drop-shadow-sm font-medium">
                {assignment.quizId?.questions?.length || 20} soal
              </p>
              <Link href={`/guru/assignments/${id}/edit`}>
                <button
                  type="button"
                  className="rounded-xl bg-blue-600 px-6 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-blue-700 transition"
                >
                  Edit
                </button>
              </Link>
            </div>
          </div>

          {/* File yang dibagi Section matching Screenshot 3 Left */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">File yang dibagi</h3>
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
                        {file.size || "2.4 MB"} • {file.type || "lorem dolor"}
                      </p>
                    </div>
                  </div>

                  <a
                    href={file.url}
                    download
                    className="p-2 text-slate-400 hover:text-blue-600 transition"
                    title="Unduh file"
                  >
                    <Download className="size-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Kolom Komentar matching Screenshot 3 Left */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Kolom Komentar</h3>

            {/* "Tambahkan Komentar" button */}
            <button
              type="button"
              onClick={() => setShowCommentInput((prev) => !prev)}
              className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              <MessageSquare className="size-4" />
              <span>Tambahkan Komentar</span>
            </button>

            {/* Comment Form if expanded */}
            {showCommentInput && (
              <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Tulis komentar..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="rounded-xl bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  <Send className="size-3.5" />
                </button>
              </form>
            )}

            {/* Comments List with nested reply style matching Screenshot 3 Left */}
            <div className="space-y-3 pt-2">
              {comments.map((c, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 text-xs ${
                    c.isReply ? "pl-5" : ""
                  }`}
                >
                  {c.isReply && (
                    <CornerDownRight className="size-3.5 text-slate-400 shrink-0 mt-1" />
                  )}
                  {/* Black circular avatar */}
                  <div className="size-6 shrink-0 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                    {c.senderName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1 leading-snug">
                    <span className="font-bold text-slate-900">{c.senderName}</span>
                    <span className="text-slate-400 mx-1">:</span>
                    <span className="text-slate-600">{c.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button at Bottom Right: Blue Circular Edit/Pencil matching Screenshot 3 Left */}
      <div className="fixed bottom-6 right-8 z-40">
        <Link
          href={`/guru/assignments/${id}/edit`}
          title="Edit Tugas"
          className="flex size-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-700"
        >
          <Pencil className="size-5" />
        </Link>
      </div>
    </div>
  );
}
