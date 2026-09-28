"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import {
  GraduationCap,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  RefreshCw,
  KeyRound,
  Copy,
  Check,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

type TicketData = {
  id: string;
  category: string;
  subject: string;
  status: "WAITING" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  resolvedAt: string | null;
  lastMessageAt: string;
  user: {
    name: string;
    role: string;
    identifier: string;
    className: string;
  };
};

type MessageData = {
  id: string;
  message: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    role: string;
    isAdmin: boolean;
    isSelf: boolean;
  };
};

export default function PreLoginTicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function fetchTicketData(silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/forgot-password/ticket/${token}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 410) {
          setIsExpired(true);
        }
        setError(data.message || "Tiket bantuan tidak ditemukan");
        return;
      }

      setTicket(data.data.ticket);
      setMessages(data.data.messages || []);
    } catch {
      setError("Gagal memuat tiket bantuan. Periksa koneksi internet Anda.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchTicketData();
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    setSendError(null);

    try {
      const res = await fetch(`/api/auth/forgot-password/ticket/${token}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSendError(data.message || "Gagal mengirim pesan");
        return;
      }

      setNewMessage("");
      // Refresh conversation
      await fetchTicketData(true);
    } catch {
      setSendError("Terjadi kesalahan jaringan saat mengirim pesan.");
    } finally {
      setSending(false);
    }
  }

  // Extract temporary password if present in admin messages
  function extractTemporaryPassword(text: string): string | null {
    const match = text.match(/🔑 Kata Sandi Sementara:\s*([^\s\n]+)/);
    return match ? match[1] : null;
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2500);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="size-8 animate-spin text-[var(--primary)]" />
          <p className="text-sm font-medium">Memuat percakapan tiket bantuan...</p>
        </div>
      </main>
    );
  }

  if (error || !ticket) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            {isExpired ? "Akses Tiket Kedaluwarsa" : "Tiket Tidak Ditemukan"}
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {error || "Tautan atau token akses tiket bantuan ini tidak valid atau telah usang."}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/forgot-password"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--primary-hover)] transition"
            >
              Ajukan Permohonan Baru
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Kembali ke Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Look for any temporary password provided in messages
  let discoveredPassword: string | null = null;
  for (const m of messages) {
    const pw = extractTemporaryPassword(m.message);
    if (pw) discoveredPassword = pw;
  }

  const isResolved = ticket.status === "RESOLVED";

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-[var(--primary)] text-white">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-none">Learnix Helpdesk</h1>
              <span className="text-[11px] text-slate-500">Layanan Bantuan Akun Mandiri</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchTicketData(true)}
              title="Perbarui percakapan"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <RefreshCw className="size-3.5 text-slate-500" />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--primary-hover)] transition"
            >
              <ArrowLeft className="size-3.5" />
              <span>Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-4 sm:p-6 gap-6">
        {/* Ticket Header & Status Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-slate-400">
                  #{ticket.id.slice(-6).toUpperCase()}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    ticket.status === "RESOLVED"
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                      : ticket.status === "IN_PROGRESS"
                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20"
                      : "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
                  }`}
                >
                  {ticket.status === "RESOLVED" ? (
                    <>
                      <CheckCircle2 className="size-3 text-emerald-600" />
                      Selesai
                    </>
                  ) : ticket.status === "IN_PROGRESS" ? (
                    <>
                      <Clock className="size-3 text-blue-600" />
                      Sedang Diproses
                    </>
                  ) : (
                    <>
                      <Clock className="size-3 text-amber-600" />
                      Menunggu Respon
                    </>
                  )}
                </span>
              </div>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Permintaan Bantuan Password
              </h2>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                <span className="text-slate-400">Pemohon: </span>
                <span className="font-semibold text-slate-700">{ticket.user.name}</span>
                <span className="mx-1.5 text-slate-300">•</span>
                <span className="text-slate-600 uppercase font-medium">{ticket.user.role}</span>
                <span className="mx-1.5 text-slate-300">•</span>
                <span className="text-slate-600">{ticket.user.identifier}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Highlighted Temporary Password Card if Resolved / Provided */}
        {discoveredPassword && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-emerald-600 text-white shrink-0">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    Kata Sandi Baru Diterima
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Admin telah memberikan kata sandi sementara. Silakan gunakan untuk login ke akun Anda.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 font-mono text-sm font-bold text-emerald-900 shadow-xs">
                  <span>{discoveredPassword}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(discoveredPassword!)}
                    className="ml-2 text-slate-400 hover:text-emerald-700 transition"
                    title="Salin password"
                  >
                    {copiedPass ? (
                      <Check className="size-4 text-emerald-600" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                </div>
                <Link
                  href="/login"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition"
                >
                  Kembali ke Login
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Conversation Stream */}
        <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden min-h-[420px]">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 text-xs font-semibold text-slate-600">
            Riwayat Percakapan
          </div>

          <div className="flex-1 space-y-4 p-4 sm:p-6 overflow-y-auto max-h-[500px]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <p className="text-sm">Belum ada percakapan</p>
              </div>
            ) : (
              messages.map((m) => {
                const isAdmin = m.sender.isAdmin;
                const isSelf = m.sender.isSelf;

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      {isAdmin ? (
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-700">
                            {m.sender.name}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <UserRound className="size-3.5 text-slate-500" />
                          <span className="text-xs font-medium text-slate-600">
                            {ticket.user.name}
                          </span>
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {new Date(m.createdAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        isSelf
                          ? "bg-[var(--primary)] text-white rounded-tr-xs"
                          : "bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200"
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Action / Input Footer */}
          {isResolved ? (
            <div className="border-t border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs font-medium text-slate-600 mb-3">
                Tiket ini telah diselesaikan oleh Admin. Jika Anda masih membutuhkan bantuan lainnya, silakan ajukan permohonan baru.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--primary-hover)] transition"
              >
                <ArrowLeft className="size-4" />
                Kembali ke Halaman Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="border-t border-slate-200 p-4 bg-white">
              {sendError && (
                <div className="mb-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                  {sendError}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Tulis pesan tambahan untuk Admin..."
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
                <Button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  loading={sending}
                  rightIcon={<Send className="size-4" />}
                  className="px-4 py-2.5 text-sm"
                >
                  Kirim
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
