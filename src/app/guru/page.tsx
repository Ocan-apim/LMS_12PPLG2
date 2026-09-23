"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { Button, Spinner, Badge } from "@/components/ui";

interface DashboardData {
  teacherName: string;
  activeClasses: Array<{
    _id: string;
    name: string;
    code: string;
    grade: string;
    walasName?: string;
    location?: string;
    studentCount: number;
    bannerColor: string;
  }>;
  totalClasses: number;
  totalAssignments: number;
  gradingStats: {
    percentage: number;
    gradedCount: number;
    pendingCount: number;
  };
  recentSubmissions: Array<{
    _id: string;
    studentId?: { _id: string; name: string; nisn: string };
    assignmentId?: { _id: string; title: string };
    status: string;
    submittedAt: string;
    score?: number;
  }>;
}

export default function GuruDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch("/api/guru/dashboard");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Gagal memuat dashboard guru:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const { teacherName, activeClasses, gradingStats, recentSubmissions } = data || {
    teacherName: "Guru",
    activeClasses: [],
    gradingStats: { percentage: 75, gradedCount: 142, pendingCount: 48 },
    recentSubmissions: [],
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Greeting Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Selamat Pagi, {teacherName}
          </h1>
          <p className="text-xs text-slate-500">
            Inilah yang terjadi di Learnix hari ini. Pantau aktivitas belajar dan submisi siswa.
          </p>
        </div>
      </div>

      {/* Hero Banner: Buat Kelas Baru matching Figma Page 1 Top */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0066FF] p-8 text-white shadow-md">
        <div className="relative z-10 max-w-xl space-y-3">
          <h2 className="text-2xl font-bold">Buat Kelas Baru</h2>
          <p className="text-xs text-blue-100 leading-relaxed">
            Mulai pembelajaran semester baru dengan membuat kelas mapel. Siswa dapat bergabung menggunakan kode kelas yang di-generate otomatis oleh sistem.
          </p>
          <div className="pt-2">
            <Link
              href="/guru/classes/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-[#0066FF] shadow-sm hover:bg-blue-50 transition"
            >
              <Plus className="size-4 text-[#0066FF]" />
              Kelas Baru
            </Link>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute -right-8 -bottom-16 size-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Main Two Columns matching Figma Page 1 Top */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Kelas Aktif & Pengiriman Terbaru */}
        <div className="lg:col-span-2 space-y-6">
          {/* Kelas Aktif */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">Kelas Aktif</h3>
              <Link
                href="/guru/classes"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Lihat Semua <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {activeClasses.length === 0 ? (
                /* Figma Page 1 Top representation */
                <>
                  <Link
                    href="/guru/classes"
                    className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-500 hover:shadow-sm"
                  >
                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
                      10 PPLG 1
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">Gedung D • (nama walas)</p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
                      <Users className="size-3.5 text-slate-400" />
                      <span>32 Siswa</span>
                    </div>
                  </Link>

                  <Link
                    href="/guru/classes"
                    className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-500 hover:shadow-sm"
                  >
                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
                      12 PPLG 2
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">Gedung E • Ibu Alvisya</p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
                      <Users className="size-3.5 text-slate-400" />
                      <span>28 Siswa</span>
                    </div>
                  </Link>
                </>
              ) : (
                activeClasses.slice(0, 4).map((c) => (
                  <Link
                    key={c._id}
                    href={`/guru/classes/${c._id}`}
                    className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-500 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
                        {c.name || c.grade}
                      </h4>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        {c.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Gedung D • {c.walasName || c.grade}
                    </p>

                    <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
                      <Users className="size-3.5 text-slate-400" />
                      <span>{c.studentCount} Siswa</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Pengiriman Terbaru (Recent Submissions) with red badge "12 Tertunda" */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Pengiriman Terbaru</h3>
                <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 border border-rose-200">
                  {gradingStats.pendingCount || 12} Tertunda
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                    <th className="pb-3 px-3 font-medium">Siswa</th>
                    <th className="pb-3 px-3 font-medium">Tugas</th>
                    <th className="pb-3 px-3 font-medium">Dikirim</th>
                    <th className="pb-3 px-3 font-medium">Status</th>
                    <th className="pb-3 px-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSubmissions.length === 0 ? (
                    /* Mock rows from Figma Page 1 Top if empty */
                    <>
                      <tr className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="size-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                              LC
                            </div>
                            <span className="font-medium text-slate-800">Liam Carter</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">Lorem ipsum dolor</td>
                        <td className="py-3 px-3 text-slate-400">2j lalu</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            Menunggu
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href="/guru/grades"
                            className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                          >
                            Nilai
                          </Link>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="size-7 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 text-xs">
                              MS
                            </div>
                            <span className="font-medium text-slate-800">Maya Singh</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">Lorem ipsum dolor</td>
                        <td className="py-3 px-3 text-slate-400">2j lalu</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            Tertunda
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href="/guru/grades"
                            className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                          >
                            Nilai
                          </Link>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="size-7 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-xs">
                              EH
                            </div>
                            <span className="font-medium text-slate-800">Ethan Hall</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">Lorem ipsum dolor</td>
                        <td className="py-3 px-3 text-slate-400">4j lalu</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            Tertunda
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href="/guru/grades"
                            className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                          >
                            Nilai
                          </Link>
                        </td>
                      </tr>
                    </>
                  ) : (
                    recentSubmissions.map((sub) => (
                      <tr key={sub._id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-7 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-[10px]">
                              {sub.studentId?.name.substring(0, 2).toUpperCase() || "SW"}
                            </div>
                            <span className="font-medium text-slate-800">
                              {sub.studentId?.name || "Siswa"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                          {sub.assignmentId?.title || "Tugas"}
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {new Date(sub.submittedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-3">
                          {sub.status === "graded" ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                              Dinilai ({sub.score})
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              Tertunda
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/guru/assignments/${sub.assignmentId?._id}/submissions`}
                            className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                          >
                            Nilai
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Status Penilaian Gauge matching Figma Page 1 Top */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-center">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 text-sm">Status Penilaian</h3>
              <span className="text-slate-400 hover:text-slate-600 cursor-pointer">•••</span>
            </div>

            {/* Circular Gauge */}
            <div className="relative mx-auto flex size-40 items-center justify-center">
              <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#0066FF] transition-all duration-1000 ease-out"
                  strokeDasharray={`${gradingStats.percentage || 75}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold text-slate-900">
                  {gradingStats.percentage || 75}%
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  SELESAI
                </span>
              </div>
            </div>

            {/* Numbers breakdown */}
            <div className="mt-8 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
              <div className="rounded-xl bg-slate-50/80 p-3 text-center border border-slate-100">
                <div className="text-[10px] font-semibold text-slate-400">Dinilai</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{gradingStats.gradedCount || 142}</div>
              </div>
              <div className="rounded-xl bg-slate-50/80 p-3 text-center border border-slate-100">
                <div className="text-[10px] font-semibold text-slate-400">Sisa</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{gradingStats.pendingCount || 48}</div>
              </div>
            </div>

            <div className="mt-5">
              <Link
                href="/guru/grades"
                className="block w-full rounded-xl bg-slate-900 py-3 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-xs text-center"
              >
                Buka Menu Penilaian
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
