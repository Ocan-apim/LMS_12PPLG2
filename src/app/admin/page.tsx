"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  Layers,
  BookOpen,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Building,
} from "lucide-react";
import {
  DashboardHero,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Spinner,
} from "@/components/ui";

interface AdminStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalDepartments: number;
  totalSubjects: number;
  homeroomTeachersCount: number;
  recentStudents: Array<{
    _id: string;
    name: string;
    nisn: string;
    createdAt: string;
    classId?: { name: string };
  }>;
  departments: Array<{
    _id: string;
    name: string;
    code: string;
    capacity: number;
    maxClasses: number;
  }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/admin/stats");
        const json = await res.json();
        if (json.success) {
          setStats(json.data);
        }
      } catch (err) {
        console.error("Gagal mengambil statistik:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Halo, Administrator Learnix"
        subtitle="Kelola data kelas, siswa, guru, jurusan SMK, dan pengaturan sistem sekolah secara terpusat."
        meta="SMK Negeri 1 Learnix • Tahun Ajaran 2024/2025 Genap"
      />

      {/* Primary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total Kelas Rombel</span>
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <GraduationCap className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-800">
              {stats?.totalClasses ?? 0}
            </span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="size-3" /> {stats?.homeroomTeachersCount ?? 0} Wali Kelas
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Kelas 10, 11, dan 12 SMK</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Siswa Aktif</span>
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-800">
              {stats?.totalStudents ?? 0}
            </span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <UserCheck className="size-3" /> Terdaftar
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Terdata dengan NISN resmi</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Guru Pengajar</span>
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <BookOpen className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-800">
              {stats?.totalTeachers ?? 0}
            </span>
            <span className="text-xs font-medium text-purple-600">
              {stats?.totalSubjects ?? 0} Mapel
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Tenaga pendidik terverifikasi</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Jurusan Kejuruan</span>
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Layers className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-800">
              {stats?.totalDepartments ?? 0}
            </span>
            <span className="text-xs font-semibold text-amber-700">6 Konsentrasi</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">DKV, BDR, MPLB, Perhotelan, PPLG, TJKT</p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/classes"
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-500 hover:shadow-md"
        >
          <div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <GraduationCap className="size-5" />
            </div>
            <h3 className="mt-3 font-semibold text-slate-800 group-hover:text-blue-600">
              Manajemen Kelas
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Atur rombel, wali kelas, kapasitas siswa, dan penamaan kelas.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-blue-600">
            Buka Modul <ArrowRight className="ml-1 size-3 transition group-hover:translate-x-1" />
          </div>
        </Link>

        <Link
          href="/admin/students"
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition hover:border-emerald-500 hover:shadow-md"
        >
          <div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Users className="size-5" />
            </div>
            <h3 className="mt-3 font-semibold text-slate-800 group-hover:text-emerald-600">
              Manajemen Siswa
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Kelola data profil siswa, NISN, mutasi kelas, dan impor massal.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600">
            Buka Modul <ArrowRight className="ml-1 size-3 transition group-hover:translate-x-1" />
          </div>
        </Link>

        <Link
          href="/admin/teachers"
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition hover:border-purple-500 hover:shadow-md"
        >
          <div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <BookOpen className="size-5" />
            </div>
            <h3 className="mt-3 font-semibold text-slate-800 group-hover:text-purple-600">
              Manajemen Guru
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Data pendidik, NIP, kualifikasi ijazah, dan penugasan wali kelas.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-purple-600">
            Buka Modul <ArrowRight className="ml-1 size-3 transition group-hover:translate-x-1" />
          </div>
        </Link>

        <Link
          href="/admin/departments"
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition hover:border-amber-500 hover:shadow-md"
        >
          <div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Layers className="size-5" />
            </div>
            <h3 className="mt-3 font-semibold text-slate-800 group-hover:text-amber-600">
              Manajemen Jurusan
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Kelola 6 jurusan SMK, kuota paralel kelas, dan kepala program keahlian.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-amber-600">
            Buka Modul <ArrowRight className="ml-1 size-3 transition group-hover:translate-x-1" />
          </div>
        </Link>
      </div>

      {/* Two columns: Jurusan Summary & Recent Students */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl border border-slate-200 shadow-xs">
          <CardHeader
            title="Program Keahlian SMK"
            description="Status daya tampung dan kapasitas tiap jurusan"
          />
          <CardBody>
            <div className="space-y-4">
              {stats?.departments && stats.departments.length > 0 ? (
                stats.departments.map((dept) => (
                  <div
                    key={dept._id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
                        {dept.code}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-800">{dept.name}</div>
                        <div className="text-xs text-slate-500">Maks. {dept.maxClasses} Kelas Paralel</div>
                      </div>
                    </div>
                    <Badge variant="blue">{dept.capacity} Kuota</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Belum ada data jurusan.</p>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="rounded-xl border border-slate-200 shadow-xs">
          <CardHeader
            title="Siswa Terdaftar Terbaru"
            description="Aktivitas penambahan siswa terbaru di sistem"
          />
          <CardBody>
            <div className="divide-y divide-slate-100">
              {stats?.recentStudents && stats.recentStudents.length > 0 ? (
                stats.recentStudents.map((st) => (
                  <div key={st._id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {st.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-800">{st.name}</div>
                        <div className="text-xs text-slate-500">NISN: {st.nisn}</div>
                      </div>
                    </div>
                    <Badge variant="purple">{st.classId?.name ?? "Belum ada kelas"}</Badge>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-slate-500">Belum ada siswa terdaftar.</p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
