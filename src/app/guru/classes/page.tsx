"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  ArrowUpDown,
  MoreVertical,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Spinner } from "@/components/ui";

interface CourseClassItem {
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
  studentCount: number;
  assignmentCount: number;
}

interface RecentSubItem {
  _id: string;
  studentId?: { _id: string; name: string };
  assignmentId?: { _id: string; title: string };
  submittedAt: string;
  status: string;
}

export default function GuruClassesPage() {
  const [classes, setClasses] = useState<CourseClassItem[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [classRes, subRes] = await Promise.all([
        fetch("/api/guru/classes"),
        fetch("/api/guru/submissions"),
      ]);
      const classJson = await classRes.json();
      const subJson = await subRes.json();

      if (classJson.success) {
        setClasses(classJson.data);
      } else {
        setError(classJson.message || "Gagal memuat kelas");
      }

      if (subJson.success) {
        setRecentSubmissions(subJson.data.slice(0, 3));
      }
    } catch {
      setError("Terjadi kesalahan jaringan saat memuat kelas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "students" | "assignments">("name-asc");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [cardMenuOpenId, setCardMenuOpenId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Sorting
  const sortedClasses = [...classes].sort((a, b) => {
    if (sortBy === "name-asc") return a.name.localeCompare(b.name);
    if (sortBy === "name-desc") return b.name.localeCompare(a.name);
    if (sortBy === "students") return (b.studentCount || 0) - (a.studentCount || 0);
    if (sortBy === "assignments") return (b.assignmentCount || 0) - (a.assignmentCount || 0);
    return 0;
  });

  function handleCopyClassCode(cId: string, code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(cId);
    setTimeout(() => setCopiedCodeId(null), 2000);
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
      <div className="mx-auto max-w-xl p-8 text-center bg-white rounded-2xl border border-rose-200 shadow-xs my-12">
        <h3 className="text-base font-bold text-slate-900">Gagal Memuat Kelas</h3>
        <p className="text-xs text-rose-600 mt-1">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Top Header matching Screenshot 1 Left */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelas Aktif</h1>
          <p className="text-xs text-slate-500">
            Kelola jadwal Learnix dan daftar siswa Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/guru/classes/new">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              <Plus className="size-3.5 text-slate-500" />
              <span>Buat Baru</span>
            </button>
          </Link>

          {/* Interactive Sort Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              <ArrowUpDown className="size-3.5 text-slate-500" />
              <span>Urutkan</span>
            </button>

            {sortDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSortBy("name-asc");
                    setSortDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl transition ${
                    sortBy === "name-asc"
                      ? "bg-blue-50 font-bold text-blue-600"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Nama (A - Z)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy("name-desc");
                    setSortDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl transition ${
                    sortBy === "name-desc"
                      ? "bg-blue-50 font-bold text-blue-600"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Nama (Z - A)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy("students");
                    setSortDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl transition ${
                    sortBy === "students"
                      ? "bg-blue-50 font-bold text-blue-600"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Siswa Terbanyak
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy("assignments");
                    setSortDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl transition ${
                    sortBy === "assignments"
                      ? "bg-blue-50 font-bold text-blue-600"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Tugas Terbanyak
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Class Cards Grid matching Figma Page 2 Top (3-column responsive) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sortedClasses.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200 p-8 shadow-xs">
            <h4 className="text-base font-semibold text-slate-800">Belum ada kelas.</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Anda belum membuat kelas pembelajaran. Buat kelas baru untuk memulai pembelajaran.
            </p>
            <Link
              href="/guru/classes/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
            >
              <Plus className="size-3.5" /> Buat Kelas Baru
            </Link>
          </div>
        ) : (
          sortedClasses.map((item) => (
            <div
              key={item._id}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-blue-400 hover:shadow-md"
            >
              {/* Top Blue Header Banner with 3-dots menu */}
              <div className="relative h-28 bg-[#0066FF] p-3">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setCardMenuOpenId((prev) => (prev === item._id ? null : item._id))
                    }
                    className="absolute right-0 top-0 text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition"
                  >
                    <MoreVertical className="size-4" />
                  </button>

                  {cardMenuOpenId === item._id && (
                    <div className="absolute right-0 top-6 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 text-xs text-slate-800 animate-in fade-in">
                      <Link
                        href={`/guru/classes/${item._id}`}
                        className="block px-3 py-1.5 rounded-lg hover:bg-slate-50 font-medium text-slate-700"
                      >
                        Buka Kelas
                      </Link>
                      <Link
                        href={`/guru/assignments/new?classId=${item._id}`}
                        className="block px-3 py-1.5 rounded-lg hover:bg-slate-50 font-medium text-slate-700"
                      >
                        Buat Tugas
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleCopyClassCode(item._id, item.code)}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 font-medium text-slate-700"
                      >
                        {copiedCodeId === item._id ? "Kode Tersalin!" : "Salin Kode Kelas"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Card Content */}
              <div className="p-5 space-y-4">
                <div>
                  <Link
                    href={`/guru/classes/${item._id}`}
                    className="text-base font-bold text-slate-900 hover:text-blue-600 transition"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Gedung D • {item.classRombelId?.name ? `Wali Kelas ${item.classRombelId.name}` : "(Nama walas)"}
                  </p>
                </div>

                {/* Bottom row: Avatar stack on left, "Lihat Daftar Siswa ->" on right */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center -space-x-2">
                    <div className="size-7 rounded-full border-2 border-white bg-amber-400 flex items-center justify-center text-[10px] font-bold text-amber-900">
                      S1
                    </div>
                    <div className="size-7 rounded-full border-2 border-white bg-purple-400 flex items-center justify-center text-[10px] font-bold text-white">
                      S2
                    </div>
                    <div className="size-7 rounded-full border-2 border-white bg-blue-400 flex items-center justify-center text-[10px] font-bold text-white">
                      S3
                    </div>
                    <div className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[9px] font-bold text-slate-600">
                      +{item.studentCount || 0}
                    </div>
                  </div>

                  <Link
                    href={`/guru/classes/${item._id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                  >
                    <span>Lihat Daftar Siswa</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Widgets Row matching Figma Page 2 Top */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Widget (8 cols): Pengiriman Siswa Terbaru */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Pengiriman Siswa Terbaru
            </h3>
            <Link
              href="/guru/grades"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
            >
              Lihat Semua
            </Link>
          </div>

          <div className="space-y-3">
            {recentSubmissions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Belum ada pengumpulan tugas.
              </div>
            ) : (
              recentSubmissions.map((sub) => (
                <div
                  key={sub._id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                      {sub.studentId?.name?.charAt(0) || "S"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {sub.studentId?.name || "Siswa"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Mengirimkan: {sub.assignmentId?.title || "Tugas"}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/guru/grades"
                    className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition"
                  >
                    Kirimkan Nilai
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Widget (4 cols): Performa Kelas matching Figma Page 2 Top */}
        <div className="lg:col-span-4 rounded-2xl bg-[#0066FF] p-6 text-white shadow-md flex flex-col justify-between space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Performa Kelas</h3>
            <p className="text-xs text-blue-100 leading-relaxed">
              Rata-rata nilai di semua kelas Learnix minggu ini:
            </p>
          </div>

          <div className="space-y-1">
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              86.4%
            </div>
            <div className="flex items-center gap-1 text-xs text-blue-100">
              <TrendingUp className="size-3.5" />
              <span>+4.2% dari minggu lalu</span>
            </div>
          </div>

          <Link
            href="/guru/grades"
            className="w-full text-center rounded-xl bg-white/20 border border-white/30 py-2.5 text-xs font-bold text-white hover:bg-white/30 transition shadow-xs"
          >
            Unduh Laporan Lengkap
          </Link>
        </div>
      </div>

      {/* Footer matching Figma Page 2 */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 pt-6 text-[11px] text-slate-400 gap-2">
        <p>© 2026 Learnix LMS. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <span className="hover:text-slate-600 cursor-pointer">Privacy Policy</span>
          <span className="hover:text-slate-600 cursor-pointer">Terms of Service</span>
          <span className="hover:text-slate-600 cursor-pointer">Contact Support</span>
        </div>
      </div>
    </div>
  );
}
