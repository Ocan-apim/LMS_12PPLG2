"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LifeBuoy,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  Inbox,
  Send,
  X,
  MessageSquare,
  Lock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Loaders";

export interface StudentTicketItem {
  id: string;
  category: string;
  subject: string;
  status: "WAITING" | "IN_PROGRESS" | "RESOLVED";
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

const CATEGORIES = [
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

export function StudentSupportList() {
  const router = useRouter();
  const [tickets, setTickets] = useState<StudentTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formSubject, setFormSubject] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/siswa/support");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat daftar permintaan bantuan");
      }

      setTickets(json.data?.tickets || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat tiket";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.subject.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.lastMessage && t.lastMessage.toLowerCase().includes(q));

      const matchStatus =
        selectedStatus === "all" || t.status === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [tickets, searchQuery, selectedStatus]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim()) {
      setFormError("Subjek permintaan wajib diisi");
      return;
    }
    if (!formMessage.trim()) {
      setFormError("Pesan kendala wajib diisi");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const res = await fetch("/api/siswa/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formCategory,
          subject: formSubject.trim(),
          message: formMessage.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengirim permintaan bantuan");
      }

      setIsModalOpen(false);
      setFormSubject("");
      setFormMessage("");
      // Redirect to newly created ticket detail
      if (json.data?.ticket?.id) {
        router.push(`/siswa/support/${json.data.ticket.id}`);
      } else {
        fetchTickets();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mengirim permintaan";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Portal Siswa</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-blue-600 font-bold">Bantuan & Dukungan</span>
          </div>
          <h1 className="mt-1 font-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Bantuan & Dukungan
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Hubungi Admin jika mengalami kendala saat menggunakan Learnix.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setIsModalOpen(true);
            }}
            className="inline-flex h-9.5 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition"
          >
            <Plus className="size-4" />
            <span>+ Hubungi Admin</span>
          </button>

          <button
            type="button"
            onClick={fetchTickets}
            disabled={loading}
            aria-label="Segarkan tiket"
            className="grid size-9.5 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
          </button>
        </div>
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

      {/* 3. Search & Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
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
          </div>

          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari subjek kendala..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8.5 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      {/* 4. Ticket List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <div className="flex justify-between pt-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
              <LifeBuoy className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {searchQuery || selectedStatus !== "all"
                ? "Tidak ada permintaan yang sesuai filter"
                : "Belum ada permintaan bantuan."}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              {searchQuery || selectedStatus !== "all"
                ? "Coba ubah kata kunci atau ganti filter status di atas."
                : "Jika Anda mengalami kendala login, lupa password, tugas, atau kelas, silakan hubungi tim Administrator."}
            </p>
            {!searchQuery && selectedStatus === "all" && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition"
              >
                <Plus className="size-3.5" />
                <span>Hubungi Admin</span>
              </button>
            )}
          </div>
        ) : (
          filteredTickets.map((t) => (
            <Link
              key={t.id}
              href={`/siswa/support/${t.id}`}
              className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-sm transition duration-150"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {t.category}
                    </span>
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
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                    {t.subject}
                  </h2>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>Terakhir diperbarui: {formatDateIndo(t.updatedAt)}</span>
                  <ChevronRight className="size-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition" />
                </div>
              </div>

              {t.lastMessage && (
                <p className="mt-2.5 line-clamp-1 text-xs text-slate-500">
                  {t.lastMessage}
                </p>
              )}
            </Link>
          ))
        )}
      </div>

      {/* 5. Create Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-2xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <LifeBuoy className="size-4.5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Kirim Permintaan Bantuan
                  </h2>
                  <p className="text-xs text-slate-500">
                    Jelaskan kendala Anda agar tim Admin dapat memberikan solusi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="grid size-8 place-items-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="size-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="mt-4 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Kendala
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subjek <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Contoh: Saya lupa password dan tidak bisa login"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pesan Lengkap <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  rows={4}
                  placeholder="Tuliskan detail permasalahan atau informasi akun Anda..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 resize-none"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  <Send className="size-3.5" />
                  <span>{submitting ? "Mengirim..." : "Kirim ke Admin"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
