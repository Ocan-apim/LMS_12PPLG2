"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  AlertCircle,
  MoreHorizontal,
  GraduationCap,
} from "lucide-react";
import { Button, Badge } from "@/components/ui";

interface AssignmentItem {
  _id: string;
  title: string;
  type: string;
  courseClassId?: {
    _id: string;
    name: string;
    code: string;
  };
  classId?: {
    _id: string;
    name: string;
    grade: string;
  };
  dueDate?: string;
  maxScore: number;
  submittedCount: number;
  gradedCount: number;
  createdAt: string;
}

interface TeacherClass {
  _id: string;
  name: string;
  code: string;
}

export default function GuruAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<AssignmentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [assignRes, classRes] = await Promise.all([
          fetch("/api/guru/assignments"),
          fetch("/api/guru/classes"),
        ]);

        const assignJson = await assignRes.json();
        const classJson = await classRes.json();

        if (assignJson.success) setAssignments(assignJson.data);
        if (classJson.success) setClasses(classJson.data);
      } catch (err) {
        console.error("Gagal memuat tugas guru:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/guru/assignments/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setAssignments((prev) => prev.filter((a) => a._id !== deleteTarget._id));
        setDeleteTarget(null);
      } else {
        alert(json.message || "Gagal menghapus tugas");
      }
    } catch {
      alert("Terjadi kesalahan saat menghapus tugas");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = assignments.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchClass =
      selectedClassId === "all" ||
      a.courseClassId?._id === selectedClassId ||
      a.classId?._id === selectedClassId;
    const matchType = selectedType === "all" || a.type === selectedType;
    return matchSearch && matchClass && matchType;
  });

  return (
    <div className="space-y-6">
      {/* Top Header matching Image 3 Top */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              Manajemen Tugas
            </span>
            <span className="text-xs text-muted-foreground">Semester Genap 2026</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Tugas & Evaluasi Siswa
          </h1>
          <p className="text-sm text-muted-foreground">
            Pantau pengumpulan tugas, kuis, evaluasi dan beri nilai dengan tampilan Google Classroom.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/guru/assignments/new">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
              leftIcon={<Plus className="size-4" />}
            >
              Buat Tugas Baru
            </Button>
          </Link>
          <Link href="/guru/quizzes/new">
            <Button
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50 font-semibold text-xs dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/40"
              leftIcon={<Sparkles className="size-4" />}
            >
              Mulai Kuis
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari judul tugas atau evaluasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">Kelas:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">Tipe:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Semua Tipe</option>
              <option value="tugas">Tugas</option>
              <option value="kuis">Kuis</option>
              <option value="projek">Projek</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-card/60 border border-border animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/40 p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <FileText className="size-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">
            {search ? "Tugas tidak ditemukan" : "Belum ada tugas atau kuis"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {search
              ? `Tidak ada tugas yang cocok dengan filter pencarian.`
              : "Buat tugas atau kuis pertama Anda untuk mulai memberikan materi latihan dan evaluasi kepada siswa."}
          </p>
          {!search && (
            <div className="mt-4 flex gap-2">
              <Link href="/guru/assignments/new">
                <Button size="sm" className="bg-blue-600 text-white font-medium text-xs">
                  Buat Tugas Sekarang
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Assignment List matching Image 3 Top */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((item) => {
            const className = item.courseClassId?.name || item.classId?.name || "Kelas";
            const isQuiz = item.type === "kuis";
            const isProject = item.type === "projek";

            const dueDateFormatted = item.dueDate
              ? new Date(item.dueDate).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Tanpa batas waktu";

            return (
              <div
                key={item._id}
                className="group flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:shadow-sm hover:border-blue-400/40"
              >
                {/* Title & Info */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl font-bold text-white ${
                      isQuiz
                        ? "bg-purple-600"
                        : isProject
                        ? "bg-emerald-600"
                        : "bg-blue-600"
                    }`}
                  >
                    {isQuiz ? (
                      <Sparkles className="size-5" />
                    ) : (
                      <FileText className="size-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/guru/assignments/${item._id}`}
                        className="font-bold text-sm text-foreground hover:text-blue-600 transition-colors"
                      >
                        {item.title}
                      </Link>
                      <Badge
                        variant={isQuiz ? "purple" : isProject ? "green" : "blue"}
                        className="text-[10px] uppercase font-bold"
                      >
                        {item.type}
                      </Badge>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {className}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5 text-muted-foreground" />
                        Deadline: {dueDateFormatted}
                      </span>
                      <span>•</span>
                      <span>Maks: {item.maxScore} Poin</span>
                      <span>•</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {item.submittedCount} Siswa Mengumpulkan
                      </span>
                      {item.gradedCount > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          ({item.gradedCount} Dinilai)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Big Primary Button: "Lihat Submisi" -> Google Classroom Grading */}
                  <Link href={`/guru/assignments/${item._id}/submissions`}>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
                      leftIcon={<Users className="size-3.5" />}
                    >
                      Lihat Submisi
                    </Button>
                  </Link>

                  <Link href={`/guru/assignments/${item._id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs hover:bg-muted"
                      title="Detail Tugas"
                    >
                      <Eye className="size-3.5" />
                    </Button>
                  </Link>

                  <Link href={`/guru/assignments/${item._id}/edit`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs hover:bg-muted"
                      title="Edit Tugas"
                    >
                      <Edit className="size-3.5" />
                    </Button>
                  </Link>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(item)}
                    className="text-xs text-muted-foreground hover:text-red-600 p-2"
                    title="Hapus Tugas"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/40">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Hapus Tugas Ini?</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {deleteTarget.title}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Tindakan ini akan menghapus tugas beserta data riwayat pengumpulan siswa terkait. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Batal
              </Button>
              <Button
                size="sm"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
