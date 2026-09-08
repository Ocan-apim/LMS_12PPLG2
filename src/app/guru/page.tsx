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

      {/* Hero Banner: Buat Kelas Baru matching Image 1 Top-Left */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-600 to-indigo-700 p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-xl space-y-3">
          <h2 className="text-2xl font-bold">Buat Kelas Baru</h2>
          <p className="text-xs text-blue-100 leading-relaxed">
            Mulai pembelajaran semester baru dengan membuat kelas mapel. Siswa dapat bergabung menggunakan kode kelas yang di-generate otomatis oleh sistem.
          </p>
          <div className="pt-2">
            <Link
              href="/guru/classes/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-blue-700 shadow-md hover:bg-blue-50 transition"
            >
              <Plus className="size-4" />
              Kelas Baru
            </Link>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute -right-8 -bottom-16 size-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Main Two Columns matching Image 1 Top-Left */}
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
                <div className="col-span-2 py-8 text-center text-xs text-slate-400">
                  Belum ada kelas mapel. Klik &quot;Kelas Baru&quot; untuk membuat classroom pertama Anda.
                </div>
              ) : (
                activeClasses.slice(0, 4).map((c) => (
                  <Link
                    key={c._id}
                    href={`/guru/classes/${c._id}`}
                    className="group rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-blue-500 hover:bg-white hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-xs">
                        {c.code}
                      </div>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                        {c.grade}
                      </span>
                    </div>

                    <h4 className="mt-3 font-bold text-slate-900 group-hover:text-blue-600 transition">
                      {c.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">Kode Kelas: {c.code}</p>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3.5 text-slate-400" />
                        {c.studentCount} Siswa
                      </span>
                      <span className="font-semibold text-blue-600 group-hover:underline">Buka Kelas →</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Pengiriman Terbaru (Recent Submissions) matching Image 1 Top-Left */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Pengiriman Terbaru</h3>
                <p className="text-xs text-slate-400">Tugas yang baru saja dikumpulkan oleh siswa</p>
              </div>
              <Link
                href="/guru/grades"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Lihat Semua
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="pb-3 px-3">Siswa</th>
                    <th className="pb-3 px-3">Tugas</th>
                    <th className="pb-3 px-3">Dikirim</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        Belum ada pengiriman tugas terbaru.
                      </td>
                    </tr>
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
                            <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              Dinilai ({sub.score})
                            </span>
                          ) : (
                            <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                              Terkirim
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/guru/assignments/${sub.assignmentId?._id}/submissions`}
                            className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
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

        {/* Right 1 Column: Status Penilaian Gauge matching Image 1 Top-Left */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-center">
            <h3 className="font-bold text-slate-900 text-sm text-left mb-6">Status Penilaian</h3>

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
                  className="text-blue-600 transition-all duration-1000 ease-out"
                  strokeDasharray={`${gradingStats.percentage}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold text-slate-900">
                  {gradingStats.percentage}%
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Ternilai
                </span>
              </div>
            </div>

            {/* Numbers breakdown */}
            <div className="mt-8 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] font-semibold uppercase text-slate-400">Dinilai</div>
                <div className="text-xl font-bold text-slate-800">{gradingStats.gradedCount}</div>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <div className="text-[10px] font-semibold uppercase text-amber-700">Sisa / Menunggu</div>
                <div className="text-xl font-bold text-amber-800">{gradingStats.pendingCount}</div>
              </div>
            </div>

            <div className="mt-5">
              <Link
                href="/guru/grades"
                className="block w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-xs"
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
