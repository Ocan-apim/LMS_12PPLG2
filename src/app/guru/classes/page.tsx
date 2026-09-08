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

export default function GuruClassesPage() {
  const [classes, setClasses] = useState<CourseClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetch("/api/guru/classes");
        const json = await res.json();
        if (json.success) {
          setClasses(json.data);
        }
      } catch (err) {
        console.error("Gagal memuat daftar kelas:", err);
      } finally {
        setLoading(false);
      }
    }
    loadClasses();
  }, []);

  // If no classes returned yet, provide realistic mock data matching Screenshot 1 Left
  const displayClasses =
    classes.length > 0
      ? classes
      : [
          {
            _id: "mock-1",
            name: "10 PPLG 1",
            code: "67G#2",
            studentCount: 34,
            assignmentCount: 4,
            classRombelId: { _id: "r1", name: "10 PPLG 1", grade: "10" },
          },
          {
            _id: "mock-2",
            name: "10 PPLG +",
            code: "PPLG+",
            studentCount: 42,
            assignmentCount: 3,
            classRombelId: { _id: "r2", name: "10 PPLG +", grade: "10" },
          },
          {
            _id: "mock-3",
            name: "10 PPLG 2",
            code: "PPLG2",
            studentCount: 36,
            assignmentCount: 2,
            classRombelId: { _id: "r3", name: "10 PPLG 2", grade: "10" },
          },
        ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
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
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <ArrowUpDown className="size-3.5 text-slate-500" />
            <span>Urutkan</span>
          </button>
        </div>
      </div>

      {/* Class Cards Grid matching Screenshot 1 Left */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {displayClasses.map((item) => (
          <div
            key={item._id}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-blue-300 hover:shadow-md"
          >
            {/* Top Blue Header Banner with 3-dots menu */}
            <div className="relative h-28 bg-blue-600 p-3">
              <button
                type="button"
                className="absolute right-3 top-3 text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition"
              >
                <MoreVertical className="size-4" />
              </button>
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
                <p className="text-xs text-slate-500 mt-0.5">
                  Gedung D • (Nama walas)
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
                    +{item.studentCount || 42}
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
        ))}
      </div>

      {/* Bottom Widgets Row matching Screenshot 1 Left */}
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
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 transition">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-xs font-bold text-slate-600">
                  R
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">ROSANNA</p>
                  <p className="text-[11px] text-slate-400">
                    Mengirimkan: UX Case Study Final
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-slate-200/80 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                Kiriman Baru
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 transition">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-xs font-bold text-slate-600">
                  S
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Nama Siswa</p>
                  <p className="text-[11px] text-slate-400">
                    Mengirimkan: LATSOL TKA 20 soal
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-slate-200/80 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                Kiriman Baru
              </span>
            </div>
          </div>
        </div>

        {/* Right Widget (4 cols): Performa Kelas matching Screenshot 1 Left */}
        <div className="lg:col-span-4 rounded-2xl bg-blue-600 p-6 text-white shadow-md flex flex-col justify-between space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Performa Kelas</h3>
            <p className="text-xs text-blue-100 leading-relaxed">
              Rata-rata nilai di semua kelas Learnix minggu ini.
            </p>
          </div>

          <div className="space-y-1">
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              86.4%
            </div>
            <div className="flex items-center gap-1 text-xs text-blue-100">
              <TrendingUp className="size-3.5" />
              <span>+4.2% dari bulan lalu</span>
            </div>
          </div>

          <button
            type="button"
            className="w-full rounded-xl bg-white py-2.5 text-xs font-bold text-blue-600 hover:bg-blue-50 transition shadow-xs"
          >
            Unduh Laporan Lengkap
          </button>
        </div>
      </div>
    </div>
  );
}
