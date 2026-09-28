"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  AlarmClock,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  Plus,
  Loader2,
  RefreshCw,
  FolderOpen,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { FooterBar } from "@/components/student/StudentDashboardComponents";

interface CalendarEvent {
  id: number;
  assignmentId: string;
  quizId?: string | null;
  date: string;
  title: string;
  subject: string;
  className: string;
  teacherName?: string;
  time: string;
  color: "orange" | "purple" | "blue" | "green" | "red";
  type: "tugas" | "ujian" | "event";
  status: "pending" | "completed" | "late";
  href: string;
}

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const weekdays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function StudentCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeTasks, setActiveTasks] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<"all" | "tugas" | "ujian">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/siswa/schedule");
      if (!res.ok) {
        throw new Error("Gagal mengambil data jadwal akademik.");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setEvents(json.data.events || []);
        setActiveTasks(json.data.activeTasks || []);
      } else {
        throw new Error(json.message || "Data jadwal tidak valid.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat jadwal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { day: number; inMonth: boolean; dateStr: string }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        day: daysInPrevMonth - i,
        inMonth: false,
        dateStr: prevDate.toISOString().split("T")[0],
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const curDate = new Date(year, month, i);
      // Format local YYYY-MM-DD
      const yyyy = curDate.getFullYear();
      const mm = String(curDate.getMonth() + 1).padStart(2, "0");
      const dd = String(i).padStart(2, "0");
      days.push({
        day: i,
        inMonth: true,
        dateStr: `${yyyy}-${mm}-${dd}`,
      });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        day: i,
        inMonth: false,
        dateStr: nextDate.toISOString().split("T")[0],
      });
    }

    return days;
  }, [year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  const filteredEvents = useMemo(() => {
    if (filterType === "all") return events;
    return events.filter((e) => e.type === filterType);
  }, [events, filterType]);

  const eventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((event) => {
      const list = map.get(event.date) || [];
      list.push(event);
      map.set(event.date, list);
    });
    return map;
  }, [filteredEvents]);

  return (
    <div className="animate-fade-up px-2 pb-12">
      {/* Header */}
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.03em] text-slate-900">
            Jadwal & Kalender Akademik
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Pantau tenggat waktu tugas, jadwal kuis, dan agenda belajar Anda.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm border border-slate-200">
          {(["all", "tugas", "ujian"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-lg px-4 py-2 text-xs font-bold capitalize transition ${
                filterType === type
                  ? "bg-[#f4edff] text-[#674ce7]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {type === "all" ? "Semua" : type === "ujian" ? "Kuis / Ujian" : "Tugas"}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex min-h-[350px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8">
          <Loader2 className="size-8 animate-spin text-[#674ce7]" />
          <p className="text-sm font-semibold text-slate-600">Memuat kalender...</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center">
          <AlertCircle className="size-8 text-red-500" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            onClick={fetchSchedule}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#674ce7] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#563cd6]"
          >
            <RefreshCw className="size-3.5" />
            Coba Lagi
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Calendar Grid Section */}
          <section className="overflow-hidden rounded-2xl border border-[#d9deeb] bg-white shadow-sm">
            {/* Calendar Controls */}
            <div className="flex flex-wrap items-center justify-between border-b border-[#e5e7ef] p-5">
              <div className="flex items-center gap-3">
                <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-slate-900">
                  {monthNames[month]} {year}
                </h2>
                <button
                  onClick={today}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hari Ini
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 border-b border-[#e5e7ef] bg-[#fbf8ff] text-center text-xs font-extrabold uppercase text-slate-500">
              {weekdays.map((w) => (
                <div key={w} className="py-3">
                  {w}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((item, idx) => {
                const dayEvents = eventMap.get(item.dateStr) || [];
                const isToday =
                  new Date().toISOString().split("T")[0] === item.dateStr;

                return (
                  <div
                    key={idx}
                    className={`min-h-[105px] border-b border-r border-[#e5e7ef] p-2 transition ${
                      !item.inMonth ? "bg-slate-50/50 text-slate-400" : "bg-white"
                    } ${isToday ? "bg-purple-50/30" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`grid size-6 place-items-center rounded-full text-xs font-bold ${
                          isToday
                            ? "bg-[#674ce7] text-white"
                            : item.inMonth
                              ? "text-slate-800"
                              : "text-slate-400"
                        }`}
                      >
                        {item.day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="size-2 rounded-full bg-[#674ce7]" />
                      )}
                    </div>

                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className={`cursor-pointer truncate rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            ev.type === "ujian"
                              ? "bg-emerald-100 text-emerald-800"
                              : ev.status === "late"
                                ? "bg-red-100 text-red-800"
                                : "bg-[#f4edff] text-[#674ce7]"
                          }`}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <p className="text-[9px] font-bold text-slate-400 pl-1">
                          +{dayEvents.length - 2} agenda lainnya
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right Sidebar: Active Tasks & Event Details */}
          <div className="space-y-6">
            {/* Active Upcoming Tasks */}
            <div className="rounded-2xl border border-[#d9deeb] bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-sm font-extrabold text-slate-900">
                <Clock className="size-4 text-[#674ce7]" />
                Tenggat Mendatang ({activeTasks.length})
              </h3>

              {activeTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  Tidak ada tenggat waktu aktif dalam waktu dekat.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {activeTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={task.href}
                      className="block rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#674ce7] border border-slate-200">
                          {task.subject}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {task.time}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-bold text-slate-900 line-clamp-1">
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Batas: {task.date}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Event Popover Card */}
            {selectedEvent && (
              <div className="rounded-2xl border border-purple-200 bg-[#fbf8ff] p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#674ce7]">
                    Detail Agenda
                  </span>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Tutup
                  </button>
                </div>
                <h4 className="mt-2 text-sm font-bold text-slate-900">
                  {selectedEvent.title}
                </h4>
                <p className="mt-1 text-xs text-slate-600">
                  {selectedEvent.subject} &bull; {selectedEvent.className}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Clock className="size-3.5 text-slate-400" />
                  <span>
                    {selectedEvent.date} ({selectedEvent.time})
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-purple-100">
                  <Link
                    href={selectedEvent.href}
                    className="inline-flex w-full justify-center rounded-xl bg-[#674ce7] py-2 text-xs font-bold text-white hover:bg-[#563cd6]"
                  >
                    Buka Halaman Tugas / Kuis
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <FooterBar />
    </div>
  );
}
