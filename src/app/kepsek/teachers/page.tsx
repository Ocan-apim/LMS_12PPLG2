"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Users,
  BookOpen,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Calendar,
} from "lucide-react";
import {
  Badge,
  Spinner,
  WorkspaceHeader,
} from "@/components/ui";

interface TeacherActivity {
  _id: string;
  title: string;
  activityType: "tugas" | "kuis";
  className: string;
  classId: string;
  dueDate?: string;
  createdAt: string;
}

interface TeacherMonitorItem {
  _id: string;
  name: string;
  nip: string;
  email: string;
  subjects: string[];
  classes: Array<{
    _id: string;
    name: string;
    rombelName: string;
  }>;
  activities: TeacherActivity[];
  isActive: boolean;
}

export default function KepsekTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherMonitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/kepsek/teachers?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.success) {
        setTeachers(json.data);
      }
    } catch (err) {
      console.error("Gagal memuat monitoring guru:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [search]);

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Kepala Sekolah"
        title="Monitor Kinerja Guru"
        description="Pantau beban mengajar serta detail penugasan dan kuis yang diterbitkan oleh masing-masing guru."
      />

      {/* Search Input */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <Search className="size-4 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Cari guru berdasarkan nama atau NIP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Teachers List / Table */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : teachers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-xs">
          <Users className="mx-auto size-10 text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-700">Tidak ada data guru yang ditemukan.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teachers.map((teacher) => {
            const isExpanded = expandedTeacherId === teacher._id;
            const tugasCount = teacher.activities.filter((a) => a.activityType === "tugas").length;
            const kuisCount = teacher.activities.filter((a) => a.activityType === "kuis").length;

            return (
              <div
                key={teacher._id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-slate-300"
              >
                {/* Teacher Row Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-extrabold text-sm">
                      {teacher.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{teacher.name}</h3>
                        <Badge variant={teacher.isActive ? "green" : "gray"}>
                          {teacher.isActive ? "Aktif" : "Non-aktif"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        NIP: {teacher.nip} &bull; {teacher.email}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {teacher.subjects.map((sub, sIdx) => (
                          <span
                            key={sIdx}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Summary Badges & Toggle */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                        {teacher.classes.length} Kelas
                      </span>
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                        {tugasCount} Tugas
                      </span>
                      <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                        {kuisCount} Kuis
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedTeacherId(isExpanded ? null : teacher._id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
                    >
                      <span>{isExpanded ? "Tutup" : "Lihat Aktivitas"}</span>
                      {isExpanded ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Activities List */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Daftar Tugas & Ulangan Harian ({teacher.activities.length})
                    </h4>

                    {teacher.activities.length === 0 ? (
                      <p className="py-4 text-center text-xs text-slate-400">
                        Guru ini belum membuat tugas atau kuis.
                      </p>
                    ) : (
                      <div className="grid gap-2.5">
                        {teacher.activities.map((act) => {
                          const isQuiz = act.activityType === "kuis";
                          // Detail button routes directly to assignment detail or quiz detail in read-only mode
                          const detailUrl = isQuiz
                            ? `/siswa/quiz/${act._id}`
                            : `/guru/assignments/${act._id}`;

                          return (
                            <div
                              key={act._id}
                              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl p-3.5 border transition shadow-xs ${
                                isQuiz
                                  ? "bg-[#2563eb] text-white border-blue-600 hover:bg-[#1d4ed8]"
                                  : "bg-white text-slate-900 border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                                    isQuiz ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
                                  }`}
                                >
                                  {isQuiz ? (
                                    <HelpCircle className="size-4" />
                                  ) : (
                                    <FileText className="size-4" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`rounded px-1.5 py-0.2 text-[9px] font-extrabold uppercase ${
                                        isQuiz ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {isQuiz ? "Ulangan Harian" : "Tugas"}
                                    </span>
                                    <span
                                      className={`text-[11px] ${
                                        isQuiz ? "text-blue-100" : "text-slate-400"
                                      }`}
                                    >
                                      Kelas: {act.className}
                                    </span>
                                  </div>
                                  <p
                                    className={`mt-1 text-xs font-bold leading-snug ${
                                      isQuiz ? "text-white" : "text-slate-900"
                                    }`}
                                  >
                                    {act.title}
                                  </p>
                                  {act.dueDate && (
                                    <p
                                      className={`mt-1 text-[11px] flex items-center gap-1 ${
                                        isQuiz ? "text-blue-100" : "text-slate-400"
                                      }`}
                                    >
                                      <Calendar className="size-3" />
                                      Deadline:{" "}
                                      {new Date(act.dueDate).toLocaleDateString("id-ID", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Detail Button: Opens relevant assignment or quiz detail instead of teacher profile */}
                              <div className="shrink-0 flex justify-end">
                                <Link
                                  href={detailUrl}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-xs ${
                                    isQuiz
                                      ? "bg-white text-blue-700 hover:bg-blue-50"
                                      : "bg-blue-600 text-white hover:bg-blue-700"
                                  }`}
                                >
                                  <span>Detail</span>
                                  <ExternalLink className="size-3" />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
