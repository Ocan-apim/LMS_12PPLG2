"use client";

import { use, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Copy,
  Check,
  FileText,
  HelpCircle,
  MessageSquare,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  ChevronDown,
  Download,
  Trash2,
  Send,
  Upload,
} from "lucide-react";
import { Button, Spinner } from "@/components/ui";

interface EnrolledStudent {
  _id: string;
  name: string;
  nisn?: string;
  email: string;
}

interface ClassAssignment {
  _id: string;
  title: string;
  type: string;
  dueDate?: string;
  maxScore: number;
}

interface SharedFile {
  name: string;
  url: string;
  type?: string;
  size?: string;
}

interface CourseClassDetail {
  _id: string;
  name: string;
  code: string;
  password?: string;
  bannerColor?: string;
  classRombelId?: {
    _id: string;
    name: string;
    grade: string;
  };
  studentIds: EnrolledStudent[];
  sharedFiles?: SharedFile[];
  assignments: ClassAssignment[];
  isReadOnly?: boolean;
  currentUserRole?: string;
}

interface ClassPostItem {
  _id: string;
  type: "announcement" | "assignment" | "quiz";
  title?: string;
  content: string;
  refId?: string;
  attachments?: SharedFile[];
  comments?: Array<{
    senderName: string;
    senderRole: string;
    message: string;
    createdAt: string;
  }>;
  createdAt: string;
}

export default function GuruClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [courseClass, setCourseClass] = useState<CourseClassDetail | null>(null);
  const [posts, setPosts] = useState<ClassPostItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Student dropdown toggle
  const [studentsDropdownOpen, setStudentsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Add file modal
  const [addFileModalOpen, setAddFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileUrl, setNewFileUrl] = useState("");
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Post comments state
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [postCommentInput, setPostCommentInput] = useState<{ [postId: string]: string }>({});
  const [submittingCommentId, setSubmittingCommentId] = useState<string | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [classRes, postsRes] = await Promise.all([
          fetch(`/api/guru/classes/${id}`),
          fetch(`/api/guru/classes/${id}/posts`),
        ]);

        const classJson = await classRes.json();
        const postsJson = await postsRes.json();

        if (classJson.success) {
          setCourseClass(classJson.data);
        }
        if (postsJson.success) {
          setPosts(postsJson.data);
        }
      } catch (err) {
        console.error("Gagal memuat detail kelas:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  // Click outside to close student dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setStudentsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleCopyCode() {
    if (!courseClass) return;
    navigator.clipboard.writeText(courseClass.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  async function handleAddSharedFile(e: React.FormEvent) {
    e.preventDefault();
    if (!courseClass) return;

    setUploadingFile(true);
    try {
      let fileData: SharedFile;

      if (selectedUploadFile) {
        const formData = new FormData();
        formData.append("file", selectedUploadFile);
        formData.append("entityType", "classes");
        formData.append("entityId", id);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadJson.success) {
          alert(uploadJson.message || "Gagal mengunggah file");
          setUploadingFile(false);
          return;
        }

        fileData = {
          name: uploadJson.data.name,
          url: uploadJson.data.url,
          type: uploadJson.data.type,
          size: uploadJson.data.size,
        };
      } else if (newFileName.trim() && newFileUrl.trim()) {
        fileData = {
          name: newFileName.trim(),
          url: newFileUrl.trim(),
          type: "link",
          size: "Link Dokumen",
        };
      } else {
        alert("Pilih file untuk diunggah atau masukkan URL dokumen");
        setUploadingFile(false);
        return;
      }

      const newFiles = [...(courseClass.sharedFiles || []), fileData];

      const res = await fetch(`/api/guru/classes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharedFiles: newFiles }),
      });
      const json = await res.json();
      if (json.success) {
        setCourseClass((prev) => (prev ? { ...prev, sharedFiles: newFiles } : prev));
        setAddFileModalOpen(false);
        setSelectedUploadFile(null);
        setNewFileName("");
        setNewFileUrl("");
      }
    } catch (err) {
      console.error("Gagal menambahkan file:", err);
      alert("Terjadi kesalahan saat menambahkan file");
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleDeleteSharedFile(idx: number) {
    if (!courseClass || !window.confirm("Hapus file yang dibagikan ini?")) return;
    const currentFiles = courseClass.sharedFiles || [];
    const newFiles = currentFiles.filter((_, i) => i !== idx);

    try {
      const res = await fetch(`/api/guru/classes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharedFiles: newFiles }),
      });
      const json = await res.json();
      if (json.success) {
        setCourseClass((prev) => (prev ? { ...prev, sharedFiles: newFiles } : prev));
      }
    } catch (err) {
      console.error("Gagal menghapus file:", err);
    }
  }

  async function handleAddPostComment(postId: string) {
    const message = postCommentInput[postId]?.trim();
    if (!message) return;

    setSubmittingCommentId(postId);
    try {
      const res = await fetch(`/api/guru/classes/${id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "comment",
          postId,
          message,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPosts((prev) =>
          prev.map((p) => (p._id === postId ? json.data : p))
        );
        setPostCommentInput((prev) => ({ ...prev, [postId]: "" }));
      }
    } catch (err) {
      console.error("Gagal mengirim komentar:", err);
    } finally {
      setSubmittingCommentId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!courseClass) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">Kelas tidak ditemukan</h2>
        <p className="mt-2 text-xs text-slate-500">
          Kelas ini mungkin telah dihapus atau Anda tidak memiliki akses.
        </p>
        <Link href="/guru/classes" className="mt-4 inline-block">
          <Button variant="outline" size="sm">Kembali ke Kelas Saya</Button>
        </Link>
      </div>
    );
  }

  const studentsList = courseClass.studentIds || [];
  const sharedFiles = courseClass.sharedFiles || [];

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header matching Screenshot 1 Right */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelas Aktif</h1>
          <p className="text-xs text-slate-500">
            Kelola jadwal Learnix dan daftar siswa Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs hover:bg-slate-50 transition"
          >
            <SlidersHorizontal className="size-3.5 text-slate-400" />
            <span>Filter</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs hover:bg-slate-50 transition"
          >
            <ArrowUpDown className="size-3.5 text-slate-400" />
            <span>Urutkan</span>
          </button>
        </div>
      </div>

      {courseClass.isReadOnly && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-xs font-bold text-amber-800">
            Mode Pratinjau Staf ({courseClass.currentUserRole?.toUpperCase()})
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Tampilan kelas ini bersifat baca-saja. Anda dapat memantau aktivitas kelas, namun tidak dapat membuat tugas/kuis, mengunggah berkas, atau memposting komentar.
          </p>
        </div>
      )}

      {/* Hero Blue Banner matching Screenshot 1 Right */}
      <div className="relative overflow-visible rounded-3xl bg-blue-600 p-8 sm:p-10 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {courseClass.name}
            </h2>
            {courseClass.classRombelId?.name && (
              <p className="mt-1 text-xs text-blue-100 font-medium">
                {courseClass.classRombelId.name} • Tahun Ajaran 2026/2027
              </p>
            )}
          </div>

          {/* Student Count Button with Dropdown matching User Request */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setStudentsDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 text-sm font-semibold text-white transition shadow-xs"
            >
              <Users className="size-4" />
              <span>{studentsList.length} Siswa</span>
              <ChevronDown className={`size-3.5 transition-transform duration-200 ${studentsDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown list of enrolled students */}
            {studentsDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50 text-slate-800 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
                  <span className="text-xs font-bold text-slate-900">
                    Daftar Siswa ({studentsList.length})
                  </span>
                  <span className="text-[10px] text-slate-400">Kelas {courseClass.name}</span>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 pr-1 mt-1">
                  {studentsList.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400">
                      Belum ada siswa yang terdaftar di kelas ini.
                    </p>
                  ) : (
                    studentsList.map((st, i) => (
                      <div
                        key={st._id || i}
                        className="flex items-center gap-2.5 py-2 px-1.5 hover:bg-slate-50 rounded-lg transition"
                      >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-xs">
                          {st.name ? st.name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {st.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {st.nisn ? `NISN: ${st.nisn}` : st.email}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Feed on Left, Shared Files on Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Stream/Feed */}
        <div className="lg:col-span-8 space-y-4">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 shadow-xs">
              <div className="mx-auto size-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
                <FileText className="size-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">
                Belum ada postingan atau aktivitas di kelas ini.
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Mulai pembelajaran dengan membuat tugas atau kuis untuk siswa di kelas ini.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Link
                  href={`/guru/assignments/new?classId=${courseClass._id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
                >
                  <Plus className="size-3.5" /> Buat Tugas
                </Link>
                <Link
                  href={`/guru/quizzes/new?classId=${courseClass._id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 transition"
                >
                  <HelpCircle className="size-3.5" /> Buat Kuis
                </Link>
              </div>
            </div>
          ) : (
            posts.map((post) => {
              const isQuiz = post.type === "quiz";
              const targetUrl = post.refId
                ? isQuiz
                  ? `/siswa/quiz/${post.refId}`
                  : `/guru/assignments/${post.refId}`
                : `/guru/assignments/new?classId=${courseClass._id}`;
              const isExpanded = expandedPostId === post._id;
              const commentsCount = post.comments?.length || 0;

              return (
                <div
                  key={post._id}
                  className={`rounded-2xl border p-5 shadow-xs transition space-y-3 ${
                    isQuiz
                      ? "bg-[#2563eb] border-blue-600 text-white hover:bg-[#1d4ed8]"
                      : "bg-white border-slate-200 text-slate-900 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      onClick={() => router.push(targetUrl)}
                      className="flex items-start gap-4 cursor-pointer flex-1"
                    >
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                          isQuiz
                            ? "bg-white/20 text-white backdrop-blur-xs"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {isQuiz ? (
                          <HelpCircle className="size-5" />
                        ) : (
                          <FileText className="size-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                              isQuiz
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {isQuiz ? "Ulangan Harian / Kuis" : "Tugas"}
                          </span>
                        </div>
                        <h3
                          className={`mt-1 text-sm font-bold transition ${
                            isQuiz
                              ? "text-white hover:underline"
                              : "text-slate-900 hover:text-blue-600"
                          }`}
                        >
                          {post.title || (isQuiz ? "Ulangan Harian" : "Tugas Baru")}
                        </h3>
                        <p
                          className={`text-xs mt-0.5 ${
                            isQuiz ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {new Date(post.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        {post.content && (
                          <p
                            className={`text-xs mt-2 line-clamp-2 rounded-xl p-2.5 ${
                              isQuiz
                                ? "bg-blue-700/50 text-blue-50"
                                : "bg-slate-50 text-slate-600 border border-slate-100"
                            }`}
                          >
                            {post.content}
                          </p>
                        )}
                      </div>
                    </div>

                    <Link
                      href={targetUrl}
                      className={`shrink-0 text-xs font-semibold rounded-lg px-3 py-1.5 transition ${
                        isQuiz
                          ? "bg-white/20 text-white hover:bg-white/30 backdrop-blur-xs"
                          : "text-blue-600 hover:underline"
                      }`}
                    >
                      Buka
                    </Link>
                  </div>

                  {/* Toggle Comments Button */}
                  <div
                    className={`border-t pt-2.5 flex items-center justify-between ${
                      isQuiz ? "border-blue-500/50" : "border-slate-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedPostId(isExpanded ? null : post._id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold transition ${
                        isQuiz
                          ? "text-blue-100 hover:text-white"
                          : "text-blue-600 hover:text-blue-700"
                      }`}
                    >
                      <MessageSquare className="size-3.5" />
                      <span>
                        {commentsCount > 0
                          ? `${commentsCount} Komentar Kelas`
                          : "Tulis Komentar Kelas"}
                      </span>
                    </button>
                  </div>

                  {/* Expanded Comments List & Form */}
                  {isExpanded && (
                    <div
                      className={`space-y-3 pt-2 border-t ${
                        isQuiz ? "border-blue-500/50" : "border-slate-100"
                      }`}
                    >
                      {post.comments && post.comments.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {post.comments.map((c, cIdx) => (
                            <div
                              key={cIdx}
                              className={`rounded-xl p-2.5 text-xs space-y-1 ${
                                isQuiz
                                  ? "bg-white/10 text-white"
                                  : "bg-slate-50 text-slate-900"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold">
                                  {c.senderName || "Pengguna"}
                                </span>
                                <span
                                  className={`text-[10px] ${
                                    isQuiz ? "text-blue-200" : "text-slate-400"
                                  }`}
                                >
                                  {new Date(c.createdAt).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p
                                className={`leading-relaxed ${
                                  isQuiz ? "text-blue-50" : "text-slate-600"
                                }`}
                              >
                                {c.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {!courseClass.isReadOnly ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleAddPostComment(post._id);
                          }}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="text"
                            placeholder="Tambahkan komentar kelas..."
                            value={postCommentInput[post._id] || ""}
                            onChange={(e) =>
                              setPostCommentInput((prev) => ({
                                ...prev,
                                [post._id]: e.target.value,
                              }))
                            }
                            className={`flex-1 rounded-xl px-3 py-1.5 text-xs focus:outline-none ${
                              isQuiz
                                ? "bg-white/20 text-white placeholder-blue-200 border border-white/20 focus:border-white"
                                : "border border-slate-200 focus:border-blue-500"
                            }`}
                          />
                          <button
                            type="submit"
                            disabled={
                              submittingCommentId === post._id ||
                              !postCommentInput[post._id]?.trim()
                            }
                            className={`rounded-xl p-2 transition ${
                              isQuiz
                                ? "bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                                : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                            }`}
                          >
                            <Send className="size-3.5" />
                          </button>
                        </form>
                      ) : (
                        <p
                          className={`text-[11px] italic ${
                            isQuiz ? "text-blue-200" : "text-slate-400"
                          }`}
                        >
                          Komentar hanya dapat ditulis oleh Pengampu Kelas dan Siswa.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: File yang dibagi matching Screenshot 1 Right */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">File yang dibagi</h3>
              {!courseClass.isReadOnly && (
                <button
                  type="button"
                  onClick={() => setAddFileModalOpen(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                >
                  + Tambah
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {sharedFiles.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  Belum ada file yang dibagikan.
                </div>
              ) : (
                sharedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-slate-100/80 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <FileText className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {file.size || "1.2 MB"} • {file.type || "Dokumen"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`/api/files/download?path=${encodeURIComponent(file.url)}&name=${encodeURIComponent(file.name)}`}
                        download={file.name}
                        title="Unduh File"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                      >
                        <Download className="size-4" />
                      </a>
                      {!courseClass.isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSharedFile(idx)}
                          title="Hapus File"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom-Right Action Widget matching Screenshot 1 Right & User Request */}
      <div className="fixed bottom-6 right-8 z-40 flex items-center gap-3">
        {/* Class Code & Password Card */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-md">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-800">
                Kode Kelas: <strong className="font-mono">{courseClass.code}</strong>
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                title="Salin Kode Kelas"
                className="text-slate-400 hover:text-slate-700 transition"
              >
                {copiedCode ? (
                  <Check className="size-3.5 text-green-600" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              Password: {courseClass.password || "12WkucIs20"}
            </p>
          </div>
        </div>

        {/* Speed-dial floating action menu for learning content */}
        {!courseClass.isReadOnly && (
          <div className="relative">
            {plusMenuOpen && (
              <div className="absolute right-0 bottom-16 flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 min-w-52 animate-in slide-in-from-bottom-2 fade-in">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Tambah Konten
                </div>
                <Link
                  href={`/guru/assignments/new?classId=${courseClass._id}`}
                  onClick={() => setPlusMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 shrink-0">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">Buat Tugas</p>
                    <p className="text-[10px] text-slate-400 font-normal">Penugasan materi / latihan</p>
                  </div>
                </Link>

                <Link
                  href={`/guru/quizzes/new?classId=${courseClass._id}`}
                  onClick={() => setPlusMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
                >
                  <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
                    <HelpCircle className="size-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">Buat Kuis</p>
                    <p className="text-[10px] text-slate-400 font-normal">Pilihan ganda & evaluasi</p>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setPlusMenuOpen(false);
                    setAddFileModalOpen(true);
                  }}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition text-left"
                >
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                    <Plus className="size-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">Upload File / Materi</p>
                    <p className="text-[10px] text-slate-400 font-normal">Bagikan dokumen ke kelas</p>
                  </div>
                </button>
              </div>
            )}

            {/* Circular Blue "+" Button */}
            <button
              type="button"
              onClick={() => setPlusMenuOpen((prev) => !prev)}
              title="Tambah Konten Pembelajaran"
              className="flex size-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-700 active:scale-95"
            >
              <Plus className={`size-6 transition-transform duration-200 ${plusMenuOpen ? "rotate-45" : ""}`} />
            </button>
          </div>
        )}
      </div>

      {/* Modal: Tambah File */}
      {addFileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Tambah File yang Dibagi</h3>
              <button
                onClick={() => setAddFileModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleAddSharedFile} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih File dari Komputer
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSelectedUploadFile(f);
                      if (!newFileName.trim()) setNewFileName(f.name);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-none file:mr-2 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Tampilan File
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Modul Dasar Unity.pdf"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              {!selectedUploadFile && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Atau Masukkan URL Dokumen / Drive Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={newFileUrl}
                    onChange={(e) => setNewFileUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAddFileModalOpen(false);
                    setSelectedUploadFile(null);
                  }}
                  disabled={uploadingFile}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={uploadingFile}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {uploadingFile ? "Mengunggah..." : "Simpan File"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
