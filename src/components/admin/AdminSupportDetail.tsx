"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  LifeBuoy,
  Send,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  ShieldCheck,
  User,
  Key,
  Lock,
  Phone,
  Mail,
  GraduationCap,
  Calendar,
  X,
  AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Loaders";

export interface AdminTicketMessage {
  id: string;
  message: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    role: string;
    isAdmin: boolean;
  };
}

export interface AdminTicketDetail {
  id: string;
  category: string;
  subject: string;
  status: "WAITING" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  student: {
    id: string | null;
    name: string;
    email: string;
    nis: string;
    phone: string;
    grade: string;
    className: string;
    joinedAt: string | null;
  };
}

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

export function AdminSupportDetail() {
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<AdminTicketDetail | null>(null);
  const [messages, setMessages] = useState<AdminTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Send message
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Status updating
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Reset password modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccessData, setResetSuccessData] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchDetail = async () => {
    if (!ticketId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/support/${ticketId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat detail tiket");
      }

      setTicket(json.data.ticket);
      setMessages(json.data.messages || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [ticketId]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom();
    }
  }, [loading, messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sending) return;

    try {
      setSending(true);
      setSendError(null);

      const res = await fetch(`/api/admin/support/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengirim balasan");
      }

      setReplyText("");
      setMessages((prev) => [...prev, json.data.message]);
      if (ticket && ticket.status === "WAITING") {
        setTicket({ ...ticket, status: "IN_PROGRESS" });
      }
      scrollToBottom();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mengirim balasan";
      setSendError(message);
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: "WAITING" | "IN_PROGRESS" | "RESOLVED") => {
    if (!ticket || statusUpdating || ticket.status === newStatus) return;

    try {
      setStatusUpdating(true);
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memperbarui status");
      }

      setTicket({
        ...ticket,
        status: newStatus,
        resolvedAt: json.data.ticket.resolvedAt,
      });
    } catch (err) {
      console.error("Gagal update status tiket:", err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setResetting(true);
      const res = await fetch(`/api/admin/support/${ticketId}/reset-password`, {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mereset kata sandi");
      }

      setResetSuccessData(json.data.tempPassword);
      if (json.data.message) {
        setMessages((prev) => [
          ...prev,
          {
            ...json.data.message,
            sender: {
              id: "admin",
              name: "Admin Learnix",
              role: "admin",
              isAdmin: true,
            },
          },
        ]);
      }
      if (ticket) {
        setTicket({ ...ticket, status: "RESOLVED" });
      }
      scrollToBottom();
    } catch (err) {
      console.error("Gagal reset password:", err);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/support"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-1.5"
          >
            <ArrowLeft className="size-3.5" />
            <span>Kembali ke Daftar Tiket</span>
          </Link>
          <h1 className="font-sans text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            {loading ? <Skeleton className="h-7 w-64" /> : ticket?.subject}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Changer */}
          {ticket && (
            <select
              value={ticket.status}
              onChange={(e) =>
                handleUpdateStatus(e.target.value as "WAITING" | "IN_PROGRESS" | "RESOLVED")
              }
              disabled={statusUpdating}
              aria-label="Ubah Status Tiket"
              className="h-9.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
            >
              <option value="WAITING">Status: Menunggu</option>
              <option value="IN_PROGRESS">Status: Diproses</option>
              <option value="RESOLVED">Status: Selesai</option>
            </select>
          )}

          {/* Quick Action: Reset Password */}
          {ticket && (
            <button
              type="button"
              onClick={() => {
                setResetSuccessData(null);
                setIsResetModalOpen(true);
              }}
              className="inline-flex h-9.5 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition shadow-2xs"
            >
              <Key className="size-3.5 text-amber-700" />
              <span>Reset Password Siswa</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchDetail}
            disabled={loading}
            aria-label="Segarkan percakapan"
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
            <h2 className="font-semibold text-red-900">Tiket tidak dapat dimuat</h2>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchDetail}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 3. Ticket and Student Info Card */}
      {ticket && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Student Info Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
              <User className="size-4 text-blue-600" />
              <span>Informasi Siswa</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <p className="font-bold text-slate-900 text-sm">{ticket.student.name}</p>
              <p className="text-slate-500 font-mono text-[11px]">
                NIS/NISN: {ticket.student.nis}
              </p>
              <p className="text-slate-500">Kelas: {ticket.student.className}</p>
              <p className="text-slate-500 truncate">Email: {ticket.student.email}</p>
              {ticket.student.phone && ticket.student.phone !== "-" && (
                <p className="text-slate-500">Telp: {ticket.student.phone}</p>
              )}
            </div>
          </div>

          {/* Ticket Metadata Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
              <LifeBuoy className="size-4 text-purple-600" />
              <span>Detail Permintaan</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Kategori:</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                  {ticket.category}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status:</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                    ticket.status === "WAITING"
                      ? "bg-amber-50 text-amber-700 border-amber-200/80"
                      : ticket.status === "IN_PROGRESS"
                      ? "bg-blue-50 text-blue-700 border-blue-200/80"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                  }`}
                >
                  {ticket.status === "WAITING"
                    ? "Menunggu"
                    : ticket.status === "IN_PROGRESS"
                    ? "Diproses"
                    : "Selesai"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Dibuat:</span>
                <span className="text-slate-600">{formatDateIndo(ticket.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* SLA / Support Guidance */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4.5 shadow-xs text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <ShieldCheck className="size-4 text-blue-600" />
              <span>Panduan Penanganan</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Jawab pertanyaan siswa secara jelas dan profesional. Untuk kendala lupa password, gunakan tombol <strong>Reset Password Siswa</strong> di atas untuk membuat kata sandi sementara yang aman.
            </p>
          </div>
        </div>
      )}

      {/* 4. Conversation Box */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col min-h-[460px]">
        {/* Messages Thread */}
        <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[520px] bg-slate-50/40">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`flex gap-3 max-w-lg ${i % 2 === 1 ? "ml-auto flex-row-reverse" : ""}`}
              >
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div className="space-y-1.5 w-64">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-16 w-full rounded-2xl" />
                </div>
              </div>
            ))
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Belum ada pesan dalam percakapan ini.
            </div>
          ) : (
            messages.map((m) => {
              const isAdmin = m.sender.isAdmin;
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 max-w-[85%] sm:max-w-[75%] ${
                    isAdmin ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      isAdmin
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {isAdmin ? (
                      <ShieldCheck className="size-4.5" />
                    ) : (
                      <User className="size-4.5" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`space-y-1 ${isAdmin ? "text-right" : "text-left"}`}>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="font-bold text-slate-700">
                        {isAdmin ? "Admin Learnix" : m.sender.name}
                      </span>
                      {isAdmin && (
                        <span className="rounded bg-blue-100 px-1 py-0.2 text-[9px] font-bold text-blue-700">
                          Admin
                        </span>
                      )}
                      <span>•</span>
                      <span>{formatDateIndo(m.createdAt)}</span>
                    </div>

                    <div
                      className={`rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                        isAdmin
                          ? "bg-blue-600 text-white rounded-tr-xs"
                          : "bg-white border border-slate-200 text-slate-800 shadow-2xs rounded-tl-xs"
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200/90">
          <form onSubmit={handleSendMessage} className="space-y-2">
            {sendError && (
              <p className="text-xs text-red-600 font-medium">{sendError}</p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                rows={2}
                placeholder="Tulis balasan Admin kepada siswa... (Tekan Enter untuk mengirim)"
                disabled={loading || sending}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 resize-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || sending || !replyText.trim()}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 disabled:opacity-40 transition shrink-0"
              >
                <Send className="size-3.5" />
                <span className="hidden sm:inline">
                  {sending ? "Mengirim..." : "Balas"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 5. Reset Password Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-2xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <Key className="size-4.5" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Reset Password Siswa
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="grid size-8 place-items-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {resetSuccessData ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>Password Berhasil Direset!</span>
                  </div>
                  <p>
                    Kata sandi akun siswa <strong>{ticket?.student.name}</strong> telah diganti dengan kata sandi sementara berikut:
                  </p>
                  <div className="rounded-xl bg-white border border-emerald-300 p-2.5 text-center font-mono font-bold text-sm text-slate-900 select-all">
                    {resetSuccessData}
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Pesan otomatis telah diposting pada percakapan tiket ini agar dapat langsung dilihat oleh siswa.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-800 flex items-start gap-2.5">
                  <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
                  <p className="leading-relaxed">
                    Tindakan ini akan mengenerate kata sandi sementara baru dan mengganti kata sandi lama siswa <strong>{ticket?.student.name}</strong> di database. Kata sandi lama tidak dapat digunakan kembali.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    disabled={resetting}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resetting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-amber-700 disabled:opacity-50 transition"
                  >
                    <Key className="size-3.5" />
                    <span>{resetting ? "Mereset..." : "Ya, Reset Password"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
