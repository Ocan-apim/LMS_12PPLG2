"use client";

import { useMemo, useState } from "react";
import {
  AlarmClock,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  Plus,
} from "lucide-react";
import { FooterBar } from "@/components/student/StudentDashboardComponents";

type CalendarEvent = {
  id: number;
  date: string;
  title: string;
  subject: string;
  time: string;
  color: "orange" | "purple" | "blue" | "green" | "red";
  type: "tugas" | "ujian" | "event";
};

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

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const activeTasks = [
  {
    title: "Konten KIK minggu 1",
    subject: "KIK",
    date: "2026-07-01",
    time: "09:00 AM",
    type: "tugas" as const,
  },
  {
    title: "Quiz: PBO Bab 1-2",
    subject: "PPLG",
    date: "2026-07-02",
    time: "11:30 AM",
    type: "ujian" as const,
  },
  {
    title: "Surat lamaran pekerjaan",
    subject: "Bahasa Indonesia",
    date: "2026-07-04",
    time: "11:59 PM",
    type: "tugas" as const,
  },
  {
    title: "Ujian Algoritma",
    subject: "PWPB",
    date: "2026-07-08",
    time: "10:00 AM",
    type: "ujian" as const,
  },
];

const initialEvents: CalendarEvent[] = [
  {
    id: 1,
    date: "2026-07-01",
    title: "Konten KIK minggu 1",
    subject: "KIK",
    time: "09:00 AM",
    color: "purple",
    type: "tugas",
  },
  {
    id: 2,
    date: "2026-07-02",
    title: "Quiz: PBO Bab 1-2",
    subject: "PPLG",
    time: "11:30 AM",
    color: "green",
    type: "ujian",
  },
  {
    id: 3,
    date: "2026-07-04",
    title: "Surat lamaran pekerjaan",
    subject: "Bahasa Indonesia",
    time: "11:59 PM",
    color: "red",
    type: "tugas",
  },
  {
    id: 4,
    date: "2026-07-08",
    title: "Ujian Algoritma",
    subject: "PWPB",
    time: "10:00 AM",
    color: "orange",
    type: "ujian",
  },
];

const colorClass: Record<CalendarEvent["color"], string> = {
  orange: "bg-[#ffe8a8] text-[#9a5a00]",
  purple: "bg-[#ded8ff] text-[#4f35d6]",
  blue: "bg-[#cfe7ff] text-[#075ab5]",
  green: "bg-[#d8f4d8] text-[#087a35]",
  red: "bg-[#ffe0e0] text-[#c41f1f]",
};

function formatKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function StudentCalendar() {
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(new Date(2026, 6, 1));
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [selectedColor, setSelectedColor] =
    useState<CalendarEvent["color"]>("orange");
  const [time, setTime] = useState("14:00");

  const cells = useMemo(() => {
    if (view === "month") return buildMonthCells(cursor.getFullYear(), cursor.getMonth());

    const weekStart = new Date(cursor);
    weekStart.setDate(cursor.getDate() - cursor.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });
  }, [cursor, view]);

  const todayEvents = events
    .filter((event) => ["2026-07-01", "2026-07-02", "2026-07-04"].includes(event.date))
    .slice(0, 5);

  function move(step: number) {
    const next = new Date(cursor);
    if (view === "month") {
      next.setMonth(cursor.getMonth() + step);
    } else {
      next.setDate(cursor.getDate() + step * 7);
    }
    setCursor(next);
  }

  function openDate(date: Date) {
    setSelectedDate(formatKey(date));
    setSelectedTask("");
    setTitle("");
    setSelectedColor("orange");
  }

  function addEvent() {
    if (!selectedDate) return;

    const task = activeTasks.find((item) => item.title === selectedTask);
    const isExam = task?.type === "ujian" || /ujian/i.test(title);
    const nextEvent: CalendarEvent = {
      id: Date.now(),
      date: task?.date ?? selectedDate,
      title: task?.title ?? (title || "Tugas baru"),
      subject: task?.subject ?? "Catatan pribadi",
      time: task?.time ?? time,
      color: isExam ? "orange" : selectedColor,
      type: isExam ? "ujian" : task?.type ?? "event",
    };

    setEvents((current) => [...current, nextEvent]);
    setSelectedDate(null);
  }

  return (
    <div className="animate-fade-up">
      <div className="grid min-h-[calc(100vh-92px)] gap-0 lg:grid-cols-[300px_1fr]">
        <aside className="border-r border-[#e5e7ef] bg-white px-7 py-7">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
            Jadwal Hari Ini
          </h1>
          <div className="mt-5 space-y-5">
            {todayEvents.map((event) => (
              <article
                key={event.id}
                className={`rounded-xl p-5 ${colorClass[event.color]} transition duration-300 hover:-translate-y-1`}
              >
                <div className="flex justify-end text-xs font-semibold">{event.time}</div>
                {event.type === "ujian" ? (
                  <span className="mt-1 inline-flex rounded bg-red-600 px-3 py-1 text-[10px] font-extrabold uppercase text-white">
                    Ujian
                  </span>
                ) : null}
                <h2 className="mt-4 text-base font-medium text-[#20232d]">{event.title}</h2>
                <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="size-3.5" />
                  {event.subject}
                </p>
              </article>
            ))}
          </div>
        </aside>

        <section className="min-w-0 bg-[#fff8ff]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7ef] bg-white/60 px-6 py-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => move(-1)}
                className="grid size-10 place-items-center rounded-md bg-[#f6f2ff] transition hover:bg-[#eee9ff]"
              >
                <ChevronLeft className="size-5" />
              </button>
              <h2 className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-[-0.04em]">
                {monthNames[cursor.getMonth()]} {cursor.getFullYear()}
              </h2>
              <button
                onClick={() => move(1)}
                className="grid size-10 place-items-center rounded-md bg-[#f6f2ff] transition hover:bg-[#eee9ff]"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-md bg-white p-1 shadow-sm">
                {(["month", "week"] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => setView(item)}
                    className={`rounded px-5 py-2 text-xs font-bold transition ${
                      view === item ? "bg-[#f3edff] text-[#674ce7]" : "text-slate-500"
                    }`}
                  >
                    {item === "month" ? "Month" : "Week"}
                  </button>
                ))}
              </div>
              <button className="inline-flex items-center gap-2 rounded-md border border-[#d9deeb] bg-white px-4 py-2 text-sm font-semibold">
                <Filter className="size-4" />
                Filter
              </button>
            </div>
          </header>

          <div className={`grid border-b border-l border-[#e5e7ef] ${view === "month" ? "grid-cols-7" : "grid-cols-7"}`}>
            {weekdays.map((day) => (
              <div key={day} className="border-r border-[#e5e7ef] bg-white py-3 text-center text-xs font-bold text-slate-500">
                {day}
              </div>
            ))}
            {cells.map((date) => {
              const key = formatKey(date);
              const dateEvents = events.filter((event) => event.date === key);
              const muted = date.getMonth() !== cursor.getMonth();

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => openDate(date)}
                  className={`relative min-h-[112px] border-r border-t border-[#e5e7ef] p-3 text-left transition hover:bg-white ${
                    view === "week" ? "min-h-[510px]" : ""
                  }`}
                >
                  <span className={`text-sm font-bold ${muted ? "text-slate-300" : "text-[#20232d]"}`}>
                    {date.getDate()}
                  </span>
                  <div className="mt-3 space-y-1">
                    {dateEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`truncate rounded px-2 py-1 text-[10px] font-bold ${colorClass[event.color]}`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dateEvents.length > 3 ? (
                      <p className="text-[10px] font-bold text-slate-500">+{dateEvents.length - 3} lainnya</p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <FooterBar />
        </section>
      </div>

      {selectedDate ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/10 px-4 pt-28">
          <div className="w-full max-w-md rounded-3xl border border-slate-400 bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
                Tambahkan ke Kalender
              </h2>
              <button
                onClick={() => setSelectedDate(null)}
                className="grid size-8 place-items-center rounded-full bg-slate-100"
              >
                x
              </button>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <button className="grid size-8 place-items-center rounded-full border border-slate-400">
                <Plus className="size-4" />
              </button>
              {(["orange", "purple", "blue", "green"] as CalendarEvent["color"][]).map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`size-7 rounded-full ring-offset-2 transition ${
                    selectedColor === color ? "ring-2 ring-slate-700" : ""
                  } ${color === "orange" ? "bg-[#f9a825]" : color === "purple" ? "bg-[#674ce7]" : color === "blue" ? "bg-[var(--primary)]" : "bg-[#00796f]"}`}
                />
              ))}
              <select
                value={selectedTask}
                onChange={(event) => {
                  const task = activeTasks.find((item) => item.title === event.target.value);
                  setSelectedTask(event.target.value);
                  setTitle(task?.title ?? "");
                }}
                className="ml-auto h-9 rounded-full border border-slate-400 bg-white px-3 text-xs outline-none"
              >
                <option value="">Mata Pelajaran</option>
                {activeTasks.map((task) => (
                  <option key={task.title} value={task.title}>
                    {task.subject} - {task.title}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Nama event atau tugas"
              className="mt-3 h-10 w-full rounded-md border border-slate-400 px-3 text-sm outline-none focus:ring-2 focus:ring-[#eee9ff]"
            />
            <div className="mt-6 flex items-center gap-3 font-bold">
              <AlarmClock className="size-5" />
              Tambahkan Pengingat
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <Clock className="size-4" />
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <button
              onClick={addEvent}
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#674ce7] px-5 py-3 text-sm font-extrabold text-white transition hover:-translate-y-1"
            >
              <CalendarPlus className="size-4" />
              Simpan Event
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
