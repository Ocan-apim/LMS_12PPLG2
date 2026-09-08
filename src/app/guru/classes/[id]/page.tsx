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

  const [copiedCode, setCopiedCode] = useState(false);

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
    if (!newFileName.trim() || !newFileUrl.trim() || !courseClass) return;

    const newFiles = [
      ...(courseClass.sharedFiles || []),
      {
        name: newFileName.trim(),
        url: newFileUrl.trim(),
        type: "link",
        size: "2.4 MB",
      },
    ];

    try {
      const res = await fetch(`/api/guru/classes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharedFiles: newFiles }),
      });
      const json = await res.json();
      if (json.success) {
        setCourseClass((prev) => (prev ? { ...prev, sharedFiles: newFiles } : prev));
        setAddFileModalOpen(false);
        setNewFileName("");
        setNewFileUrl("");
      }
    } catch (err) {
      console.error("Gagal menambahkan file:", err);
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
  const sharedFiles = courseClass.sharedFiles || [
    { name: "Lorem Ipsum Dolor", url: "#", size: "2.4 MB", type: "Tugas" },
    { name: "Lorem Ipsum Dolor", url: "#", size: "1.2 MB", type: "Tugas" },
    { name: "Lorem Ipsum Dolor", url: "#", size: "3.5 MB", type: "Tugas" },
  ];

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
            <div className="space-y-4">
              {/* Default Mock feed matching Screenshot 1 Right if no real posts yet */}
              <div
                onClick={() => router.push(`/guru/assignments/new?classId=${courseClass._id}`)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-sm transition"
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <FileText className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Anda memposting tugas baru
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">25 July 2026</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => router.push(`/guru/quizzes/new?classId=${courseClass._id}`)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-sm transition space-y-3"
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <HelpCircle className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Anda memulai Quiz!
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">20 - 21 July 2026</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 pl-14">
                  <MessageSquare className="size-3.5" />
                  <span>3 Komentar Kelas</span>
                </div>
              </div>

              <div
                onClick={() => router.push(`/guru/assignments/new?classId=${courseClass._id}`)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-sm transition"
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <FileText className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Anda memposting tugas baru
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">17 July 2026</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => router.push(`/guru/assignments/new?classId=${courseClass._id}`)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-sm transition"
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <FileText className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Anda memposting tugas baru
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">17 July 2026</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            posts.map((post) => {
              const isQuiz = post.type === "quiz";
              const targetUrl = post.refId
                ? `/guru/assignments/${post.refId}`
                : `/guru/assignments/new?classId=${courseClass._id}`;

              return (
                <div
                  key={post._id}
                  onClick={() => router.push(targetUrl)}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-sm transition space-y-2.5"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                        isQuiz
                          ? "bg-indigo-50 text-indigo-600"
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
                      <h3 className="text-sm font-bold text-slate-900">
                        {post.title || (isQuiz ? "Anda memulai Quiz!" : "Anda memposting tugas baru")}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(post.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {post.comments && post.comments.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 pl-14">
                      <MessageSquare className="size-3.5" />
                      <span>{post.comments.length} Komentar Kelas</span>
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
              <button
                type="button"
                onClick={() => setAddFileModalOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                + Tambah
              </button>
            </div>

            <div className="space-y-2.5">
              {sharedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-slate-100/80 transition"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-200/70 text-slate-500">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {file.type || "Tugas"}
                    </p>
                  </div>
                </div>
              ))}
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

        {/* Circular Blue "+" Button to add assignment */}
        <Link
          href={`/guru/assignments/new?classId=${courseClass._id}`}
          title="Tambah Tugas Baru"
          className="flex size-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-700"
        >
          <Plus className="size-6" />
        </Link>
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
                  Nama File
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Dokumen / Link Drive
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={newFileUrl}
                  onChange={(e) => setNewFileUrl(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddFileModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Simpan File
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
