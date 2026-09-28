"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  Lock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Loaders";

export interface TicketMessage {
  id: string;
  message: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    role: string;
    isSelf: boolean;
  };
}

export interface TicketDetail {
  id: string;
  category: string;
  subject: string;
  status: "WAITING" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
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

export function StudentSupportDetail() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Send message
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchDetail = async () => {
    if (!ticketId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/siswa/support/${ticketId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat percakapan tiket");
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

      const res = await fetch(`/api/siswa/support/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengirim pesan");
      }

      setReplyText("");
      // Append new message
      setMessages((prev) => [...prev, json.data.message]);
      scrollToBottom();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mengirim balasan";
      setSendError(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/siswa/support"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-1.5"
          >
            <ArrowLeft className="size-3.5" />
            <span>Kembali ke Daftar Bantuan</span>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-sans text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
              {loading ? <Skeleton className="h-7 w-64" /> : ticket?.subject}
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchDetail}
          disabled={loading}
          aria-label="Segarkan percakapan"
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

      {/* 3. Ticket Info Card */}
      {ticket && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Kategori
              </span>
              <span className="inline-block mt-0.5 rounded-md bg-slate-100 px-2.5 py-1 font-bold text-slate-700">
                {ticket.category}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Status
              </span>
              <span
                className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold border ${
                  ticket.status === "WAITING"
                    ? "bg-amber-50 text-amber-700 border-amber-200/80"
                    : ticket.status === "IN_PROGRESS"
                    ? "bg-blue-50 text-blue-700 border-blue-200/80"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                }`}
              >
                {ticket.status === "WAITING" ? (
                  <>
                    <Clock className="size-3" /> Menunggu Respon
                  </>
                ) : ticket.status === "IN_PROGRESS" ? (
                  <>
                    <RefreshCw className="size-3" /> Sedang Diproses Admin
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3" /> Permintaan Selesai
                  </>
                )}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Dibuat Pada
              </span>
              <span className="text-slate-600 font-medium">
                {formatDateIndo(ticket.createdAt)}
              </span>
            </div>
          </div>

          {ticket.status === "RESOLVED" && ticket.resolvedAt && (
            <div className="text-right text-[11px] text-emerald-700 font-semibold">
              Diselesaikan pada: {formatDateIndo(ticket.resolvedAt)}
            </div>
          )}
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
              const isSelf = m.sender.isSelf;
              const isAdmin = m.sender.role === "admin";
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 max-w-[85%] sm:max-w-[75%] ${
                    isSelf ? "ml-auto flex-row-reverse" : "mr-auto"
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
                  <div className={`space-y-1 ${isSelf ? "text-right" : "text-left"}`}>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="font-bold text-slate-700">
                        {isSelf ? "Anda" : m.sender.name}
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
                        isSelf
                          ? "bg-blue-600 text-white rounded-tr-xs"
                          : isAdmin
                          ? "bg-white border border-blue-200/80 text-slate-800 shadow-2xs rounded-tl-xs"
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
          {ticket?.status === "RESOLVED" ? (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>
                  Tiket bantuan ini telah ditandai Selesai. Jika Anda masih mengalami kendala, Anda dapat membuat tiket baru.
                </span>
              </div>
              <Link
                href="/siswa/support"
                className="shrink-0 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700 transition"
              >
                Buat Tiket Baru
              </Link>
            </div>
          ) : (
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
                  placeholder="Tulis pesan balasan ke Admin... (Tekan Enter untuk mengirim)"
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
                    {sending ? "Mengirim..." : "Kirim"}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
