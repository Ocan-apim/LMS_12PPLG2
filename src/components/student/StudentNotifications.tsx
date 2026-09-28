"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ClipboardList,
  HelpCircle,
  Award,
  BookOpen,
  ArrowRight,
  Check,
  CheckCircle,
  FolderOpen,
  Clock,
} from "lucide-react";
import { Button, Spinner, Badge } from "@/components/ui";

interface NotificationItem {
  _id: string;
  type: "assignment" | "quiz" | "grade" | "material" | "general";
  title: string;
  message: string;
  link?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  read: boolean;
  createdAt: string;
}

export function StudentNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadNotifications() {
    try {
      setLoading(true);
      const res = await fetch("/api/siswa/notifications");
      const json = await res.json();
      if (json.success && json.data) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Gagal memuat notifikasi:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markAllAsRead() {
    if (unreadCount === 0) return;
    try {
      setActionLoading("all");
      const res = await fetch("/api/siswa/notifications/read-all", {
        method: "PATCH",
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Gagal menandai semua notifikasi:", err);
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleReadStatus(id: string, currentRead: boolean) {
    try {
      setActionLoading(id);
      const res = await fetch(`/api/siswa/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: !currentRead }),
      });
      const json = await res.json();
      if (json.success) {
        const nextRead = !currentRead;
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, read: nextRead } : n))
        );
        setUnreadCount((prev) => (nextRead ? Math.max(0, prev - 1) : prev + 1));
      }
    } catch (err) {
      console.error("Gagal memperbarui status notifikasi:", err);
    } finally {
      setActionLoading(null);
    }
  }

  function formatTime(dateStr: string) {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Baru saja";
      if (diffMins < 60) return `${diffMins} menit lalu`;
      if (diffHours < 24) return `${diffHours} jam lalu`;
      if (diffDays === 1) return "Kemarin";
      if (diffDays < 7) return `${diffDays} hari lalu`;

      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    } catch {
      return "";
    }
  }

  const filteredNotifications = notifications.filter((n) =>
    filter === "unread" ? !n.read : true
  );

  function getIcon(type: string) {
    switch (type) {
      case "quiz":
        return <HelpCircle className="size-4.5 text-purple-600" />;
      case "grade":
        return <Award className="size-4.5 text-amber-600" />;
      case "material":
        return <BookOpen className="size-4.5 text-emerald-600" />;
      case "assignment":
      default:
        return <ClipboardList className="size-4.5 text-blue-600" />;
    }
  }

  function getBgColor(type: string) {
    switch (type) {
      case "quiz":
        return "bg-purple-50 border-purple-100";
      case "grade":
        return "bg-amber-50 border-amber-100";
      case "material":
        return "bg-emerald-50 border-emerald-100";
      case "assignment":
      default:
        return "bg-blue-50 border-blue-100";
    }
  }

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Notifikasi Siswa
            </h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
                {unreadCount} baru
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemberitahuan tugas baru, kuis, penilaian guru, dan aktivitas akademik Anda.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={markAllAsRead}
            disabled={actionLoading === "all"}
            className="text-xs font-semibold shrink-0"
            leftIcon={<CheckCheck className="size-3.5 text-blue-600" />}
          >
            {actionLoading === "all" ? "Memproses..." : "Tandai Semua Dibaca"}
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
            filter === "all"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Semua ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
            filter === "unread"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Belum Dibaca ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
            <Bell className="size-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {filter === "unread" ? "Tidak Ada Notifikasi Baru" : "Belum Ada Notifikasi"}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {filter === "unread"
              ? "Semua pemberitahuan sudah Anda baca. Anda akan menerima notifikasi saat ada tugas atau penilaian baru."
              : "Pemberitahuan aktivitas kelas, tugas, dan kuis akan muncul di halaman ini."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const timeAgo = formatTime(notif.createdAt);

            return (
              <div
                key={notif._id}
                className={`group relative flex items-start gap-4 rounded-2xl border p-4 transition-all duration-200 ${
                  notif.read
                    ? "border-slate-200/80 bg-white hover:border-slate-300"
                    : "border-blue-200 bg-blue-50/20 hover:border-blue-300 shadow-xs"
                }`}
              >
                {/* Type Icon */}
                <div
                  className={`grid size-10 place-items-center rounded-xl border shrink-0 mt-0.5 ${getBgColor(
                    notif.type
                  )}`}
                >
                  {getIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-xs font-bold leading-tight ${
                        notif.read ? "text-slate-800" : "text-slate-900"
                      }`}
                    >
                      {notif.title}
                    </h4>
                    {!notif.read && (
                      <span className="size-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="flex items-center gap-4 mt-2.5 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {timeAgo}
                    </span>

                    {notif.link && (
                      <Link
                        href={notif.link}
                        onClick={() => {
                          if (!notif.read) {
                            toggleReadStatus(notif._id, false);
                          }
                        }}
                        className="flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 transition"
                      >
                        <span>Buka Halaman</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Toggle Read/Unread Button */}
                <button
                  type="button"
                  title={notif.read ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
                  disabled={actionLoading === notif._id}
                  onClick={() => toggleReadStatus(notif._id, notif.read)}
                  className={`absolute right-3.5 top-4 rounded-lg p-1.5 transition text-slate-400 hover:text-slate-700 hover:bg-slate-100 ${
                    actionLoading === notif._id ? "opacity-50" : ""
                  }`}
                >
                  {notif.read ? (
                    <CheckCheck className="size-4 text-emerald-600" />
                  ) : (
                    <Check className="size-4 text-slate-400 hover:text-blue-600" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
