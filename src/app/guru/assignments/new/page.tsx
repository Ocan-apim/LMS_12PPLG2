"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Trash2,
  Star,
  HelpCircle,
  UploadCloud,
  FileText,
  Bold,
  Italic,
  Underline,
  List,
  Quote,
  Link2,
  Image as ImageIcon,
  ChevronRight,
} from "lucide-react";

interface TeacherClass {
  _id: string;
  name: string;
  code: string;
  classRombelId?: {
    name: string;
  };
}

interface AttachedFile {
  name: string;
  url: string;
  type: string;
  size: string;
}

interface TeacherQuiz {
  _id: string;
  title: string;
  totalPoints: number;
  questions?: unknown[];
}

function BuatTugasForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get("classId") || "";

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("2026-07-27");
  const [dueTime, setDueTime] = useState("23:59");
  const [maxScore, setMaxScore] = useState(100);

  // Attached files
  const [attachments, setAttachments] = useState<AttachedFile[]>([
    {
      name: "Materi_Dasar_Unity_Bab1.pdf",
      url: "#",
      type: "PDF Document",
      size: "2.4 MB",
    },
    {
      name: "Video_Tutorial_Setup_Project.mp4",
      url: "#",
      type: "MP4 Video",
      size: "15.8 MB",
    },
  ]);

  // Quizzes
  const [quizzes, setQuizzes] = useState<TeacherQuiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [selectedQuizTitle, setSelectedQuizTitle] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [classesRes, quizzesRes] = await Promise.all([
          fetch("/api/guru/classes"),
          fetch("/api/guru/quizzes"),
        ]);
        const classesJson = await classesRes.json();
        const quizzesJson = await quizzesRes.json();

        if (classesJson.success && Array.isArray(classesJson.data)) {
          setClasses(classesJson.data);
          if (!selectedClassId && classesJson.data.length > 0) {
            setSelectedClassId(classesJson.data[0]._id);
          }
        }
        if (quizzesJson.success && Array.isArray(quizzesJson.data)) {
          setQuizzes(quizzesJson.data);
          if (quizzesJson.data.length > 0) {
            setSelectedQuizId(quizzesJson.data[0]._id);
            setSelectedQuizTitle(quizzesJson.data[0].title);
          }
        }
      } catch (err) {
        console.error("Gagal memuat data kelas dan kuis:", err);
      }
    }
    loadData();
  }, [selectedClassId]);

  const currentClass = classes.find((c) => c._id === selectedClassId);
  const className = currentClass?.name || "10 PPLG 1";

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: AttachedFile[] = Array.from(files).map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
      type: f.type || "Dokumen",
      size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
    }));

    setAttachments((prev) => [...prev, ...newFiles]);
  }

  function handleRemoveAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Judul tugas wajib diisi");
      return;
    }
    if (!selectedClassId) {
      setError("Pilih kelas untuk tugas ini");
      return;
    }

    setSubmitting(true);
    try {
      const combinedDueDate = dueDate
        ? new Date(`${dueDate}T${dueTime || "23:59"}:00`)
        : undefined;

      const res = await fetch("/api/guru/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          instructions: instructions.trim(),
          type: selectedQuizId ? "kuis" : "tugas",
          courseClassId: selectedClassId,
          dueDate: combinedDueDate,
          maxScore: Number(maxScore) || 100,
          attachments,
          quizId: selectedQuizId || undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Gagal membuat tugas");
      } else {
        router.push(`/guru/classes/${selectedClassId}`);
      }
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Breadcrumb matching Screenshot 3 Right */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <Link
          href={selectedClassId ? `/guru/classes/${selectedClassId}` : "/guru/classes"}
          className="hover:text-blue-600 transition"
        >
          {className}
        </Link>
        <ChevronRight className="size-3 text-slate-300" />
        <span className="text-slate-600 truncate max-w-xs">{title || "Tugas Baru"}</span>
        <ChevronRight className="size-3 text-slate-300" />
        <span className="text-blue-600 font-semibold">Tambah Tugas</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Tambah Tugas: {title || "Tugas Baru"}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Buat dan bagikan tugas baru untuk kelas {className}.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Main 2-Column Form matching Screenshot 3 Right */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column (8 cols): Judul, Deskripsi/Instruksi, File yang Dibagikan */}
          <div className="lg:col-span-8 space-y-6">
            {/* Box: Judul Tugas */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Judul Tugas
              </label>
              <input
                type="text"
                placeholder="Contoh: Dasar Pemrograman Unity"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition"
              />
            </div>

            {/* Box: Deskripsi / Instruksi */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Deskripsi / Instruksi
              </label>

              {/* Formatting Toolbar matching Screenshot 3 Right */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden">
                <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-100/70 px-3 py-1.5 text-slate-600">
                  <button type="button" className="p-1 rounded hover:bg-slate-200/80 transition" title="Bold">
                    <Bold className="size-3.5" />
                  </button>
                  <button type="button" className="p-1 rounded hover:bg-slate-200/80 transition" title="Italic">
                    <Italic className="size-3.5" />
                  </button>
                  <button type="button" className="p-1 rounded hover:bg-slate-200/80 transition" title="Underline">
                    <Underline className="size-3.5" />
                  </button>
                  <div className="h-4 w-px bg-slate-300 mx-1" />
                  <button type="button" className="p-1 rounded hover:bg-slate-200/80 transition" title="List">
                    <List className="size-3.5" />
                  </button>
                  <button type="button" className="p-1 rounded hover:bg-slate-200/80 transition" title="Quote">
                    <Quote className="size-3.5" />
                  </button>
                  <button type="button" className="p-1 rounded hover:bg-slate-200/80 transition" title="Link">
                    <Link2 className="size-3.5" />
                  </button>
                  <button type="button" className="p-1 rounded hover:bg-slate-200/80 transition" title="Image">
                    <ImageIcon className="size-3.5" />
                  </button>
                </div>

                <textarea
                  rows={6}
                  placeholder="Silahkan dikerjakan dan jangan nyontek! Pelajari materi modul 2 sebelum memulai."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full resize-y bg-white p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Box: File yang Dibagikan */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <label className="block text-xs font-bold text-slate-700">
                File yang Dibagikan
              </label>

              {/* Uploaded Files List matching Screenshot 3 Right */}
              <div className="space-y-2.5">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-200/70 text-slate-600">
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {file.size} • {file.type}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition"
                      title="Hapus file"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Dropzone matching Screenshot 3 Right */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/20 p-8 text-center cursor-pointer hover:bg-blue-50/50 hover:border-blue-400 transition"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-2">
                  <UploadCloud className="size-5" />
                </div>
                <p className="text-xs font-semibold text-blue-600">
                  Klik untuk unggah file baru
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  atau seret dan lepas file ke area ini (Maks. 50MB)
                </p>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): Tenggat Waktu, Kuis Tersemat, Penilaian */}
          <div className="lg:col-span-4 space-y-6">
            {/* Box 1: Tenggat Waktu */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Calendar className="size-4 text-blue-600" />
                <span>Tenggat Waktu</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Tanggal Berakhir
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Waktu Berakhir
                  </label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Box 2: Kuis Tersemat matching Screenshot 3 Right & User Request */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <HelpCircle className="size-4 text-blue-600" />
                <span>Kuis Tersemat</span>
              </div>

              {selectedQuizId ? (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-slate-800">
                    {selectedQuizTitle || "Kuis Matematika Dasar - Bab 1"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/guru/quizzes/new?classId=${selectedClassId}`}
                      target="_blank"
                      className="flex-1"
                    >
                      <button
                        type="button"
                        className="w-full rounded-xl border border-blue-200 bg-blue-50/50 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100/70 transition"
                      >
                        Edit Kuis
                      </button>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedQuizId("");
                        setSelectedQuizTitle("");
                      }}
                      className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:border-red-200 transition"
                      title="Lepas Kuis"
                    >
                      Lepas
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedQuizId}
                    onChange={(e) => {
                      const qId = e.target.value;
                      setSelectedQuizId(qId);
                      const q = quizzes.find((item) => item._id === qId);
                      setSelectedQuizTitle(q ? q.title : "");
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Pilih Kuis yang Ada --</option>
                    {quizzes.map((q) => (
                      <option key={q._id} value={q._id}>
                        {q.title} ({q.totalPoints} Poin)
                      </option>
                    ))}
                  </select>

                  <Link
                    href={`/guru/quizzes/new?classId=${selectedClassId}`}
                    className="block text-center rounded-xl border border-dashed border-blue-300 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50/60 transition"
                  >
                    + Buat Kuis Baru
                  </Link>
                </div>
              )}
            </div>

            {/* Box 3: Penilaian matching Screenshot 3 Right */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Star className="size-4 text-blue-600" />
                <span>Penilaian</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Poin Maksimal
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={maxScore}
                  onChange={(e) => setMaxScore(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Buttons: "Batal" & "Upload" matching Screenshot 3 Right & User Request */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href={selectedClassId ? `/guru/classes/${selectedClassId}` : "/guru/classes"}>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Batal
            </button>
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-blue-600 px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            {submitting ? "Mengunggah..." : "Upload"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function BuatTugasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat formulir tugas...</div>}>
      <BuatTugasForm />
    </Suspense>
  );
}
