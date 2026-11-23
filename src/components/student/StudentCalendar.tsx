"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Calendar as CalendarIcon,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

export interface CalendarEvent {
  id: number | string;
  _id?: string;
  eventId?: string;
  assignmentId?: string;
  quizId?: string | null;
  date: string;
  startDate?: string;
  endDate?: string;
  title: string;
  description?: string;
  subject: string;
  className: string;
  teacherName?: string;
  time: string;
  color: "orange" | "purple" | "blue" | "green" | "red";
  type: "tugas" | "ujian" | "event";
  status: "pending" | "completed" | "late";
  isPersonal?: boolean;
  editable?: boolean;
  href: string;
}

interface CalendarDayCell {
  day: number;
  inMonth: boolean;
  dateStr: string;
}

interface WeekEventSegment {
  event: CalendarEvent;
  startCol: number; // 0..6
  endCol: number;   // 0..6
  span: number;     // 1..7
  isActualStart: boolean;
  isActualEnd: boolean;
  lane: number;
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

function formatLocalYMD(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatReadableDateIndo(ymd?: string): string {
  if (!ymd) return "-";
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return ymd;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDateRangeIndo(startYmd?: string, endYmd?: string): string {
  if (!startYmd) return "-";
  if (!endYmd || startYmd === endYmd) {
    const m = startYmd.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return startYmd;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }
  const m1 = startYmd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const m2 = endYmd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m1 || !m2) return `${startYmd} - ${endYmd}`;
  const d1 = new Date(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3]));
  const d2 = new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));
  const s1 = d1.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const s2 = d2.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return `${s1} – ${s2}`;
}

export function StudentCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [personalEvents, setPersonalEvents] = useState<CalendarEvent[]>([]);
  const [activeTasks, setActiveTasks] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<"all" | "tugas" | "ujian" | "event">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);

  // Delete Confirmation Modal state
  const [deleteTargetEvent, setDeleteTargetEvent] = useState<CalendarEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
        const allEvs: CalendarEvent[] = json.data.events || [];
        const pEvs: CalendarEvent[] =
          json.data.personalEvents ||
          allEvs.filter((e) => e.isPersonal || e.type === "event");
        setEvents(allEvs);
        setPersonalEvents(pEvs);
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
  const todayStr = useMemo(() => formatLocalYMD(new Date()), []);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: CalendarDayCell[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        day: daysInPrevMonth - i,
        inMonth: false,
        dateStr: formatLocalYMD(prevDate),
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const curDate = new Date(year, month, i);
      days.push({
        day: i,
        inMonth: true,
        dateStr: formatLocalYMD(curDate),
      });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        day: i,
        inMonth: false,
        dateStr: formatLocalYMD(nextDate),
      });
    }

    return days;
  }, [year, month]);

  // Split 42 calendar days into 6 week rows of 7 days each
  const calendarWeeks = useMemo(() => {
    const weeks: CalendarDayCell[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    return weeks;
  }, [calendarDays]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  // Academic single-day events (Assignments and Quizzes)
  const filteredAcademicEvents = useMemo(() => {
    const academic = events.filter((e) => !e.isPersonal && e.type !== "event");
    if (filterType === "all") return academic;
    if (filterType === "event") return [];
    return academic.filter((e) => e.type === filterType);
  }, [events, filterType]);

  // Personal multi-day / single-day events
  const visiblePersonalEvents = useMemo(() => {
    if (filterType === "all" || filterType === "event") {
      return personalEvents;
    }
    return [];
  }, [personalEvents, filterType]);

  const academicEventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredAcademicEvents.forEach((event) => {
      const list = map.get(event.date) || [];
      list.push(event);
      map.set(event.date, list);
    });
    return map;
  }, [filteredAcademicEvents]);

  // For each week row (0..5), compute continuous horizontal event bar segments & lane assignments
  const weekSegmentsByWeek = useMemo(() => {
    return calendarWeeks.map((weekDays) => {
      const weekStart = weekDays[0].dateStr;
      const weekEnd = weekDays[6].dateStr;

      // Filter personal events overlapping this week
      const overlapping = visiblePersonalEvents.filter((ev) => {
        const s = ev.startDate || ev.date;
        const e = ev.endDate || ev.date;
        return s <= weekEnd && e >= weekStart;
      });

      // Sort longer/earlier events first for clean horizontal packing
      overlapping.sort((a, b) => {
        const aStart = a.startDate || a.date;
        const bStart = b.startDate || b.date;
        if (aStart !== bStart) return aStart.localeCompare(bStart);
        const aEnd = a.endDate || a.date;
        const bEnd = b.endDate || b.date;
        return bEnd.localeCompare(aEnd);
      });

      // Lane end column tracker: lanes[laneIdx] = last occupied col in this week
      const laneEndCols: number[] = [];
      const segments: WeekEventSegment[] = [];

      for (const ev of overlapping) {
        const evStart = ev.startDate || ev.date;
        const evEnd = ev.endDate || ev.date;

        const segStartStr = evStart > weekStart ? evStart : weekStart;
        const segEndStr = evEnd < weekEnd ? evEnd : weekEnd;

        const startCol = Math.max(0, weekDays.findIndex((d) => d.dateStr === segStartStr));
        const endCol = Math.max(startCol, weekDays.findIndex((d) => d.dateStr === segEndStr));
        const span = endCol - startCol + 1;

        let assignedLane = -1;
        for (let l = 0; l < laneEndCols.length; l++) {
          if (laneEndCols[l] < startCol) {
            assignedLane = l;
            laneEndCols[l] = endCol;
            break;
          }
        }
        if (assignedLane === -1) {
          assignedLane = laneEndCols.length;
          laneEndCols.push(endCol);
        }

        segments.push({
          event: ev,
          startCol,
          endCol,
          span,
          isActualStart: evStart === segStartStr,
          isActualEnd: evEnd === segEndStr,
          lane: assignedLane,
        });
      }

      return {
        segments,
        totalLanes: laneEndCols.length,
      };
    });
  }, [calendarWeeks, visiblePersonalEvents]);

  function openCreateModal() {
    const defaultDate = formatLocalYMD(currentDate);
    setEditingEventId(null);
    setFormTitle("");
    setFormDescription("");
    setFormStartDate(defaultDate);
    setFormEndDate(defaultDate);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(ev: CalendarEvent) {
    if (!ev.isPersonal && ev.type !== "event") return;
    const rawId = String(ev._id || ev.eventId || ev.id).replace(/^personal-/, "");
    setEditingEventId(rawId);
    setFormTitle(ev.title || "");
    setFormDescription(ev.description || "");
    setFormStartDate(ev.startDate || ev.date);
    setFormEndDate(ev.endDate || ev.startDate || ev.date);
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError("Judul event wajib diisi.");
      return;
    }
    if (!formStartDate) {
      setFormError("Tanggal mulai wajib dipilih.");
      return;
    }
    if (!formEndDate) {
      setFormError("Tanggal selesai wajib dipilih.");
      return;
    }
    if (formEndDate < formStartDate) {
      setFormError("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    setSavingEvent(true);
    try {
      const isEditing = Boolean(editingEventId);
      const endpoint = isEditing
        ? `/api/siswa/schedule/${editingEventId}`
        : "/api/siswa/schedule";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim(),
          startDate: formStartDate,
          endDate: formEndDate,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.message || "Gagal menyimpan event kalender.");
        return;
      }

      const savedEv: CalendarEvent = {
        ...json.data,
        subject: "Agenda Pribadi",
        className: "Event Pribadi",
        color: "blue",
        type: "event",
        status: "pending",
        isPersonal: true,
        editable: true,
        href: "#",
      };

      setModalOpen(false);
      setSelectedEvent(savedEv);

      // Navigate calendar month to the event's startDate so the user immediately sees it
      const match = savedEv.startDate?.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        setCurrentDate(new Date(Number(match[1]), Number(match[2]) - 1, 1));
      }

      await fetchSchedule();
    } catch {
      setFormError("Terjadi kesalahan jaringan saat menyimpan event.");
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTargetEvent || deletingEvent) return;
    const rawId = String(
      deleteTargetEvent._id || deleteTargetEvent.eventId || deleteTargetEvent.id
    ).replace(/^personal-/, "");

    setDeletingEvent(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/siswa/schedule/${encodeURIComponent(rawId)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setDeleteError(json.message || "Gagal menghapus event.");
        return;
      }

      if (
        selectedEvent &&
        String(selectedEvent._id || selectedEvent.eventId || selectedEvent.id).replace(
          /^personal-/,
          ""
        ) === rawId
      ) {
        setSelectedEvent(null);
      }
      setDeleteTargetEvent(null);
      await fetchSchedule();
    } catch {
      setDeleteError("Terjadi kesalahan koneksi saat menghapus event.");
    } finally {
      setDeletingEvent(false);
    }
  }

  return (
    <div className="animate-fade-up px-2 pb-12">
      {/* Header */}
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.03em] text-slate-900">
            Jadwal & Kalender Akademik
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Pantau tenggat waktu tugas, jadwal kuis, dan kelola agenda belajar pribadi Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm border border-slate-200">
            {(["all", "tugas", "ujian", "event"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`rounded-lg px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                  filterType === type
                    ? "bg-[#f4edff] text-[#674ce7]"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {type === "all"
                  ? "Semua"
                  : type === "ujian"
                    ? "Kuis / Ujian"
                    : type === "tugas"
                      ? "Tugas"
                      : "Event Pribadi"}
              </button>
            ))}
          </div>

          {/* Tambah Event Button */}
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#674ce7] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#563cd6] cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Tambah Event</span>
          </button>
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
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Calendar Grid Section */}
          <section className="overflow-hidden rounded-2xl border border-[#d9deeb] bg-white shadow-sm">
            {/* Calendar Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7ef] p-5">
              <div className="flex items-center gap-3">
                <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-slate-900">
                  {monthNames[month]} {year}
                </h2>
                <button
                  type="button"
                  onClick={today}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hari Ini
                </button>
              </div>

              {/* Legend & Month Navigation */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="hidden sm:flex items-center gap-3 text-[11px] font-bold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-[#674ce7]" />
                    Tugas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-emerald-500" />
                    Kuis
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-blue-600" />
                    Event Pribadi
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={prevMonth}
                    aria-label="Bulan Sebelumnya"
                    className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    aria-label="Bulan Berikutnya"
                    className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Weekdays Header */}
            <div className="grid grid-cols-7 border-b border-[#e5e7ef] bg-[#fbf8ff] text-center text-xs font-extrabold uppercase text-slate-500">
              {weekdays.map((w) => (
                <div key={w} className="py-3">
                  {w}
                </div>
              ))}
            </div>

            {/* Week-by-Week Grid with Continuous Multi-Day Spanning Bars */}
            <div className="divide-y divide-[#e5e7ef]">
              {calendarWeeks.map((weekDays, weekIdx) => {
                const { segments, totalLanes } = weekSegmentsByWeek[weekIdx];
                const lanesSpacePx = totalLanes > 0 ? totalLanes * 26 + 4 : 0;

                return (
                  <div key={weekIdx} className="relative">
                    {/* 7 Day Cells in the Week */}
                    <div className="grid grid-cols-7">
                      {weekDays.map((item, dayIdx) => {
                        const dayAcademicEvents = academicEventMap.get(item.dateStr) || [];
                        const isToday = todayStr === item.dateStr;

                        return (
                          <div
                            key={item.dateStr}
                            className={`min-h-[115px] border-r border-[#e5e7ef] last:border-r-0 p-2 transition ${
                              !item.inMonth ? "bg-slate-50/50 text-slate-400" : "bg-white"
                            } ${isToday ? "bg-purple-50/30" : ""}`}
                          >
                            {/* Day Number Header */}
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
                              {dayAcademicEvents.length > 0 && (
                                <span className="size-2 rounded-full bg-[#674ce7]" />
                              )}
                            </div>

                            {/* Academic Deadlines (positioned below multi-day event lanes) */}
                            <div
                              className="mt-1 space-y-1"
                              style={{
                                marginTop: lanesSpacePx > 0 ? `${lanesSpacePx + 4}px` : undefined,
                              }}
                            >
                              {dayAcademicEvents.slice(0, 2).map((ev) => (
                                <div
                                  key={`${ev.id}-${dayIdx}`}
                                  onClick={() => setSelectedEvent(ev)}
                                  className={`cursor-pointer truncate rounded px-1.5 py-0.5 text-[10px] font-bold transition ${
                                    ev.type === "ujian"
                                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                      : ev.status === "late"
                                        ? "bg-red-100 text-red-800 hover:bg-red-200"
                                        : "bg-[#f4edff] text-[#674ce7] hover:bg-[#e9dcff]"
                                  }`}
                                  title={`${ev.title} (${ev.subject})`}
                                >
                                  {ev.title}
                                </div>
                              ))}
                              {dayAcademicEvents.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedEvent(dayAcademicEvents[2])}
                                  className="text-[9px] font-bold text-slate-400 hover:text-[#674ce7] pl-1 block"
                                >
                                  +{dayAcademicEvents.length - 2} agenda lainnya
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Multi-Day Personal Event Continuous Spanning Layer */}
                    {segments.length > 0 && (
                      <div
                        className="pointer-events-none absolute inset-x-0 top-[34px] grid grid-cols-7 gap-y-1 px-0.5"
                        style={{
                          gridTemplateRows: `repeat(${totalLanes}, 22px)`,
                        }}
                      >
                        {segments.map((seg) => {
                          const evId = String(seg.event._id || seg.event.eventId || seg.event.id);
                          const isSelected =
                            selectedEvent &&
                            String(selectedEvent._id || selectedEvent.eventId || selectedEvent.id) ===
                              evId;

                          const roundedClass =
                            seg.isActualStart && seg.isActualEnd
                              ? "rounded-md mx-1"
                              : seg.isActualStart
                                ? "rounded-l-md rounded-r-none ml-1 mr-0"
                                : seg.isActualEnd
                                  ? "rounded-r-md rounded-l-none mr-1 ml-0"
                                  : "rounded-none mx-0";

                          return (
                            <div
                              key={`${evId}-w${weekIdx}`}
                              style={{
                                gridColumn: `${seg.startCol + 1} / span ${seg.span}`,
                                gridRow: seg.lane + 1,
                              }}
                              onClick={() => setSelectedEvent(seg.event)}
                              title={`${seg.event.title} (${formatShortDateRangeIndo(
                                seg.event.startDate,
                                seg.event.endDate
                              )})`}
                              className={`pointer-events-auto cursor-pointer flex items-center justify-between gap-1.5 px-2 text-[10px] font-extrabold text-white shadow-2xs transition ${roundedClass} ${
                                isSelected
                                  ? "bg-blue-700 ring-2 ring-blue-300"
                                  : "bg-blue-600 hover:bg-blue-700"
                              }`}
                            >
                              <div className="flex items-center gap-1 min-w-0 truncate">
                                {!seg.isActualStart && (
                                  <span className="text-[9px] opacity-80 shrink-0">&larr;</span>
                                )}
                                <span className="truncate">{seg.event.title}</span>
                              </div>
                              {!seg.isActualEnd && (
                                <span className="text-[9px] opacity-80 shrink-0">&rarr;</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right Sidebar: Selected Event Details, Personal Events, & Active Academic Deadlines */}
          <div className="space-y-6">
            {/* Selected Event Detail Card */}
            {selectedEvent && (
              <div
                className={`rounded-2xl border p-5 shadow-sm animate-in fade-in ${
                  selectedEvent.isPersonal || selectedEvent.type === "event"
                    ? "border-blue-200 bg-blue-50/50"
                    : "border-purple-200 bg-[#fbf8ff]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                      selectedEvent.isPersonal || selectedEvent.type === "event"
                        ? "bg-blue-600 text-white"
                        : selectedEvent.type === "ujian"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-[#eee9ff] text-[#674ce7]"
                    }`}
                  >
                    {selectedEvent.isPersonal || selectedEvent.type === "event"
                      ? "Event Pribadi"
                      : selectedEvent.type === "ujian"
                        ? "Kuis / Ujian"
                        : "Tugas Akademik"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>

                <h4 className="mt-2.5 text-sm font-extrabold text-slate-900">
                  {selectedEvent.title}
                </h4>

                {selectedEvent.isPersonal || selectedEvent.type === "event" ? (
                  <>
                    <p className="mt-1.5 text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                      {selectedEvent.description || "Tidak ada deskripsi tambahan."}
                    </p>

                    <div className="mt-3 space-y-1.5 rounded-xl border border-blue-100 bg-white p-3 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-500">Mulai:</span>
                        <span className="font-bold text-slate-800 text-right">
                          {formatReadableDateIndo(selectedEvent.startDate || selectedEvent.date)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-500">Selesai:</span>
                        <span className="font-bold text-slate-800 text-right">
                          {formatReadableDateIndo(
                            selectedEvent.endDate || selectedEvent.startDate || selectedEvent.date
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 pt-3 border-t border-blue-100">
                      <button
                        type="button"
                        onClick={() => openEditModal(selectedEvent)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                      >
                        <Pencil className="size-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTargetEvent(selectedEvent);
                          setDeleteError(null);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 transition cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-slate-600">
                      {selectedEvent.subject} &bull; {selectedEvent.className}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <Clock className="size-3.5 text-slate-400" />
                      <span>
                        {formatReadableDateIndo(selectedEvent.date)} ({selectedEvent.time})
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
                  </>
                )}
              </div>
            )}

            {/* Student Personal Events List */}
            <div className="rounded-2xl border border-[#d9deeb] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-sm font-extrabold text-slate-900">
                  <CalendarIcon className="size-4 text-blue-600" />
                  Event Pribadi Saya ({personalEvents.length})
                </h3>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="text-xs font-bold text-[#674ce7] hover:underline cursor-pointer"
                >
                  + Tambah
                </button>
              </div>

              {personalEvents.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-slate-400 italic">
                    Belum ada event pribadi yang dibuat.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <CalendarPlus className="size-3.5 text-[#674ce7]" />
                    <span>Buat Event Baru</span>
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {personalEvents.map((ev) => {
                    const evId = String(ev._id || ev.eventId || ev.id);
                    return (
                      <div
                        key={evId}
                        onClick={() => {
                          setSelectedEvent(ev);
                          const m = (ev.startDate || ev.date).match(/^(\d{4})-(\d{2})/);
                          if (m) {
                            setCurrentDate(new Date(Number(m[1]), Number(m[2]) - 1, 1));
                          }
                        }}
                        className="group cursor-pointer rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:border-blue-200 hover:bg-blue-50/40 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-extrabold text-slate-900 truncate">
                              {ev.title}
                            </p>
                            {ev.description && (
                              <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                                {ev.description}
                              </p>
                            )}
                            <p className="mt-1 text-[10px] font-bold text-blue-600">
                              {formatShortDateRangeIndo(ev.startDate, ev.endDate)}
                            </p>
                          </div>
                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => openEditModal(ev)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-blue-600 transition cursor-pointer"
                              title="Edit Event"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTargetEvent(ev);
                                setDeleteError(null);
                              }}
                              className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-red-600 transition cursor-pointer"
                              title="Hapus Event"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Upcoming Academic Tasks */}
            <div className="rounded-2xl border border-[#d9deeb] bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-sm font-extrabold text-slate-900">
                <Clock className="size-4 text-[#674ce7]" />
                Tenggat Akademik ({activeTasks.length})
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
          </div>
        </div>
      )}

      {/* Create / Edit Personal Event Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={savingEvent}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#f4edff] text-[#674ce7]">
                <CalendarPlus className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {editingEventId ? "Edit Event Kalender" : "Tambah Event Kalender"}
                </h2>
                <p className="text-xs text-slate-500">
                  {editingEventId
                    ? "Perbarui jadwal atau agenda belajar pribadi Anda"
                    : "Jadwalkan agenda belajar atau persiapan ujian Anda"}
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                <AlertCircle className="size-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Judul Event <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Persiapan Ujian"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-[#674ce7] focus:outline-none focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Tanggal Mulai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormStartDate(val);
                      if (formEndDate && val && formEndDate < val) {
                        setFormEndDate(val);
                      }
                    }}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800 focus:border-[#674ce7] focus:outline-none focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Tanggal Selesai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    min={formStartDate || undefined}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800 focus:border-[#674ce7] focus:outline-none focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Deskripsi <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Contoh: Belajar dan mengulang materi untuk ujian akhir"
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#674ce7] focus:outline-none focus:ring-2 focus:ring-purple-100 resize-none"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={savingEvent}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#674ce7] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#563cd6] transition disabled:opacity-50 cursor-pointer"
                >
                  {savingEvent && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{savingEvent ? "Menyimpan..." : editingEventId ? "Simpan Perubahan" : "Simpan Event"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Hapus Event Pribadi</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus event{" "}
              <strong className="text-slate-900">&ldquo;{deleteTargetEvent.title}&rdquo;</strong> (
              {formatShortDateRangeIndo(deleteTargetEvent.startDate, deleteTargetEvent.endDate)})?
            </p>

            {deleteError && (
              <div className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-600">
                <AlertCircle className="size-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                disabled={deletingEvent}
                onClick={() => {
                  setDeleteTargetEvent(null);
                  setDeleteError(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingEvent}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {deletingEvent ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                <span>Hapus Event</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
