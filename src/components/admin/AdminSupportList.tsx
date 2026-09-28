"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  Filter,
  ChevronRight,
  Inbox,
  User,
  GraduationCap,
  MessageSquare,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Loaders";

export interface AdminTicketItem {
  id: string;
  category: string;
  subject: string;
  status: "WAITING" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  resolvedAt: string | null;
  student: {
    id: string | null;
    name: string;
    email: string;
    nis: string;
    className: string;
  };
}

export interface SupportSummary {
  total: number;
  waiting: number;
  inProgress: number;
  resolved: number;
}

const CATEGORIES = [
  "Semua Kategori",
  "Lupa Password",
  "Kendala Login",
  "Kendala Akun",
  "Kendala Kelas",
  "Kendala Tugas/Kuis",
  "Kendala Teknis",
  "Lainnya",
];

function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getInitials(name: string): string {
  if (!name) return "S";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function AdminSupportList() {
  const [tickets, setTickets] = useState<AdminTicketItem[]>([]);
  const [summary, setSummary] = useState<SupportSummary>({
    total: 0,
    waiting: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua Kategori");

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (selectedCategory !== "Semua Kategori") params.set("category", selectedCategory);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/support?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat daftar tiket bantuan");
      }

      setTickets(json.data.tickets || []);
      if (json.data.summary) {
        setSummary(json.data.summary);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat tiket";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [selectedStatus, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Portal Administrator</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-blue-600 font-bold">Bantuan Siswa</span>
          </div>
          <h1 className="mt-1 font-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Pusat Bantuan & Tiket Siswa
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Kelola pengaduan kendala login, reset password, kendala kelas, dan pertanyaan teknis siswa.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTickets}
          disabled={loading}
          aria-label="Segarkan daftar tiket"
          className="inline-flex h-9.5 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* 2. Error State */}
      {error && !loading && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <h2 className="font-semibold text-red-900">Gagal memuat bantuan</h2>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchTickets}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 3. Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Permintaan
            </span>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              {loading ? <Skeleton className="h-7 w-12" /> : summary.total}
            </p>
            <p className="text-[11px] text-slate-400">Seluruh tiket masuk</p>
          </div>
          <div className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-600">
            <LifeBuoy className="size-5.5" />
          </div>
        </div>

        {/* Menunggu */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              Menunggu Respon
            </span>
            <p className="mt-1 text-2xl font-extrabold text-amber-700">
              {loading ? <Skeleton className="h-7 w-12" /> : summary.waiting}
            </p>
            <p className="text-[11px] text-slate-400">Memerlukan balasan</p>
          </div>
          <div className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Clock className="size-5.5" />
          </div>
        </div>

        {/* Diproses */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Sedang Diproses
            </span>
            <p className="mt-1 text-2xl font-extrabold text-blue-700">
              {loading ? <Skeleton className="h-7 w-12" /> : summary.inProgress}
            </p>
            <p className="text-[11px] text-slate-400">Dalam tindak lanjut</p>
          </div>
          <div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <RefreshCw className="size-5.5" />
          </div>
        </div>

        {/* Selesai */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Telah Selesai
            </span>
            <p className="mt-1 text-2xl font-extrabold text-emerald-700">
              {loading ? <Skeleton className="h-7 w-12" /> : summary.resolved}
            </p>
            <p className="text-[11px] text-slate-400">Solusi terselesaikan</p>
          </div>
          <div className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-5.5" />
          </div>
        </div>
      </div>

      {/* 4. Toolbar: Search & Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter Status"
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Semua Status</option>
              <option value="WAITING">Menunggu</option>
              <option value="IN_PROGRESS">Diproses</option>
              <option value="RESOLVED">Selesai</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter Kategori"
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {(selectedStatus !== "all" || selectedCategory !== "Semua Kategori" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus("all");
                  setSelectedCategory("Semua Kategori");
                  setSearchQuery("");
                }}
                className="inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition"
              >
                <Filter className="size-3 text-slate-400" />
                Reset
              </button>
            )}
          </div>

          <div className="relative min-w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa, NIS, atau subjek..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8.5 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </form>
      </div>

      {/* 5. Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/90 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Daftar Permintaan Bantuan
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {tickets.length} Tiket
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Siswa
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Kategori
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Subjek Kendala
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6 text-center">
                  Status
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Terakhir Update
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6 text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="size-7 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-16 mt-1" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <Skeleton className="h-5 w-24 rounded-md" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6 text-center">
                      <Skeleton className="h-5 w-18 rounded-full mx-auto" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6 text-right">
                      <Skeleton className="h-7 w-20 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                      <Inbox className="size-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {searchQuery || selectedStatus !== "all" || selectedCategory !== "Semua Kategori"
                        ? "Tidak ada tiket yang sesuai filter"
                        : "Belum ada permintaan bantuan."}
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                      Permintaan bantuan dari siswa yang mengalami kendala akan tampil secara otomatis di sini.
                    </p>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/70 transition-colors duration-150"
                  >
                    {/* Siswa */}
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 border border-blue-200">
                          {getInitials(t.student.name)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {t.student.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {t.student.className !== "-" ? t.student.className : t.student.nis}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Kategori */}
                    <td className="px-4 py-3.5 sm:px-6">
                      <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                        {t.category}
                      </span>
                    </td>

                    {/* Subjek */}
                    <td className="px-4 py-3.5 sm:px-6 font-bold text-slate-900 max-w-xs truncate">
                      {t.subject}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 sm:px-6 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          t.status === "WAITING"
                            ? "bg-amber-50 text-amber-700 border-amber-200/80"
                            : t.status === "IN_PROGRESS"
                            ? "bg-blue-50 text-blue-700 border-blue-200/80"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                        }`}
                      >
                        {t.status === "WAITING" ? (
                          <>
                            <Clock className="size-2.5" /> Menunggu
                          </>
                        ) : t.status === "IN_PROGRESS" ? (
                          <>
                            <RefreshCw className="size-2.5" /> Diproses
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-2.5" /> Selesai
                          </>
                        )}
                      </span>
                    </td>

                    {/* Terakhir Update */}
                    <td className="px-4 py-3.5 sm:px-6 text-slate-500">
                      {formatDateIndo(t.lastMessageAt || t.updatedAt)}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 sm:px-6 text-right">
                      <Link
                        href={`/admin/support/${t.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
                      >
                        <span>Buka Tiket</span>
                        <ChevronRight className="size-3 text-slate-400" />
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
  );
}
