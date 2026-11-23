import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, Assignment, Quiz, Submission, StudentEvent, User } from "@/models";

/**
 * Validates and normalizes a date input into a timezone-safe "YYYY-MM-DD" calendar string.
 * Rejects malformed strings and non-existent calendar dates (e.g. 2026-02-30).
 */
export function normalizeCalendarDate(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1970 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateToYMD(d: Date): string {
  // Format date in Asia/Jakarta (or local server calendar date) without UTC previous-day shift
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    if (y && m && day) return `${y}-${m}-${day}`;
  } catch {
    // Fallback
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(_req: Request) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();

    const studentUser: any = await User.findById(session.id).select("classId").lean();
    const studentRombelId = studentUser?.classId;

    // 1. Fetch active joined classes
    const joinedClasses: any[] = await CourseClass.find({
      isActive: true,
      $or: [
        { studentIds: session.id },
        ...(studentRombelId
          ? [{ classRombelId: studentRombelId }, { assignedRombelIds: studentRombelId }]
          : []),
      ],
    })
      .select("_id name bannerColor subjectId teacherId")
      .populate("subjectId", "name code")
      .populate("teacherId", "name")
      .lean();

    const joinedClassIds = joinedClasses.map((c) => c._id);

    // 2. Fetch student-created personal calendar events (strictly isolated by session.id)
    const rawPersonalEvents: any[] = await StudentEvent.find({
      studentId: session.id,
    })
      .sort({ startDate: 1, endDate: 1, createdAt: 1 })
      .lean();

    const personalEvents = rawPersonalEvents.map((ev, idx) => ({
      _id: String(ev._id),
      id: `personal-${ev._id}`,
      eventId: String(ev._id),
      studentId: String(ev.studentId),
      title: ev.title,
      description: ev.description || "",
      startDate: ev.startDate,
      endDate: ev.endDate,
      date: ev.startDate,
      time: "Sepanjang Hari",
      subject: "Agenda Pribadi",
      className: "Event Pribadi",
      color: "blue" as const,
      type: "event" as const,
      status: "pending" as const,
      isPersonal: true,
      editable: true,
      href: "#",
      createdAt: ev.createdAt,
      updatedAt: ev.updatedAt,
      orderIndex: idx + 1,
    }));

    if (joinedClassIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          events: personalEvents,
          academicEvents: [],
          personalEvents,
          activeTasks: [],
        },
      });
    }

    // 3. Fetch assignments with deadlines from these active classes
    const assignments: any[] = await Assignment.find({
      courseClassId: { $in: joinedClassIds },
      isArchived: { $ne: true },
      isPublished: true,
      dueDate: { $exists: true, $ne: null },
      title: { $not: /forum[\s_-]*diskusi/i },
    })
      .populate("courseClassId", "name bannerColor")
      .populate("subjectId", "name code")
      .populate("teacherId", "name")
      .sort({ dueDate: 1 })
      .lean();

    // 4. Fetch standalone quizzes with deadlines (deduplicated against Assignment.quizId)
    const linkedQuizIds = new Set(
      assignments
        .map((a) => (a.quizId ? String(a.quizId) : null))
        .filter(Boolean) as string[]
    );

    const standaloneQuizzes: any[] = await Quiz.find({
      courseClassId: { $in: joinedClassIds },
      isPublished: true,
      dueDate: { $exists: true, $ne: null },
    })
      .populate("courseClassId", "name bannerColor")
      .populate("teacherId", "name")
      .sort({ dueDate: 1 })
      .lean();

    const unlinkedQuizzes = standaloneQuizzes.filter(
      (q) => !linkedQuizIds.has(String(q._id))
    );

    // 5. Fetch student submissions to calculate completion status
    const assignmentIds = assignments.map((a) => a._id);
    const allQuizIds = [
      ...Array.from(linkedQuizIds).map((id) => new mongoose.Types.ObjectId(id)),
      ...unlinkedQuizzes.map((q) => q._id),
    ];

    const submissions: any[] = await Submission.find({
      studentId: session.id,
      $or: [
        ...(assignmentIds.length > 0 ? [{ assignmentId: { $in: assignmentIds } }] : []),
        ...(allQuizIds.length > 0 ? [{ quizId: { $in: allQuizIds } }] : []),
      ],
    }).lean();

    const subByAssignment = new Map<string, any>();
    const subByQuiz = new Map<string, any>();
    submissions.forEach((s) => {
      if (s.assignmentId) subByAssignment.set(String(s.assignmentId), s);
      if (s.quizId) subByQuiz.set(String(s.quizId), s);
    });

    const now = new Date();

    // 6. Map academic events (Assignments & Quizzes)
    const academicEvents = assignments.map((a: any, idx: number) => {
      const sub =
        subByAssignment.get(String(a._id)) ||
        (a.quizId ? subByQuiz.get(String(a.quizId)) : null);
      const dueDate = new Date(a.dueDate);

      let status: "completed" | "pending" | "late" = "pending";
      if (sub && ["turned_in", "late", "graded"].includes(sub.status)) {
        status = "completed";
      } else if (dueDate < now) {
        status = "late";
      }

      const isQuiz = a.type === "kuis" || Boolean(a.quizId) || a.title.toLowerCase().includes("kuis");
      const eventType: "tugas" | "ujian" = isQuiz ? "ujian" : "tugas";

      let color: "orange" | "purple" | "blue" | "green" | "red" = "purple";
      if (isQuiz) {
        color = "green";
      } else if (status === "late") {
        color = "red";
      } else if (status === "completed") {
        color = "blue";
      } else {
        color = "purple";
      }

      const dateStr = formatDateToYMD(dueDate);
      const timeStr = dueDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      return {
        id: idx + 1,
        _id: String(a._id),
        assignmentId: a._id.toString(),
        quizId: a.quizId ? a.quizId.toString() : null,
        title: a.title,
        description: a.description || a.instructions || "",
        subject: a.subjectId?.name || a.courseClassId?.name || "Mata Pelajaran",
        className: a.courseClassId?.name || "",
        teacherName: a.teacherId?.name || "Guru",
        date: dateStr,
        startDate: dateStr,
        endDate: dateStr,
        time: timeStr,
        rawDueDate: a.dueDate,
        color,
        type: eventType,
        status,
        isPersonal: false,
        editable: false,
        href: isQuiz && a.quizId ? `/siswa/quiz/${a.quizId}` : isQuiz ? `/siswa/quiz/${a._id}` : `/siswa/assignments/${a._id}`,
      };
    });

    // Append unlinked standalone quizzes with dueDate
    unlinkedQuizzes.forEach((q: any, qIdx: number) => {
      const sub = subByQuiz.get(String(q._id));
      const dueDate = new Date(q.dueDate);

      let status: "completed" | "pending" | "late" = "pending";
      if (sub && ["turned_in", "late", "graded"].includes(sub.status)) {
        status = "completed";
      } else if (dueDate < now) {
        status = "late";
      }

      const dateStr = formatDateToYMD(dueDate);
      const timeStr = dueDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      academicEvents.push({
        id: assignments.length + qIdx + 1,
        _id: String(q._id),
        assignmentId: String(q._id),
        quizId: String(q._id),
        title: q.title,
        description: q.description || "",
        subject: q.courseClassId?.name || "Mata Pelajaran",
        className: q.courseClassId?.name || "",
        teacherName: q.teacherId?.name || "Guru",
        date: dateStr,
        startDate: dateStr,
        endDate: dateStr,
        time: timeStr,
        rawDueDate: q.dueDate,
        color: "green",
        type: "ujian",
        status,
        isPersonal: false,
        editable: false,
        href: `/siswa/quiz/${q._id}`,
      });
    });

    // Active upcoming academic tasks (tasks that are not completed)
    const activeTasks = academicEvents
      .filter((e) => e.status !== "completed")
      .slice(0, 6);

    const combinedEvents = [...academicEvents, ...personalEvents];

    return NextResponse.json({
      success: true,
      data: {
        events: combinedEvents,
        academicEvents,
        personalEvents,
        activeTasks,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat jadwal akademik";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Format permintaan tidak valid" },
        { status: 400 }
      );
    }

    const { title, description, startDate, endDate } = body as Record<string, unknown>;

    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "Judul event wajib diisi" },
        { status: 400 }
      );
    }

    if (startDate === undefined || startDate === null || String(startDate).trim() === "") {
      return NextResponse.json(
        { success: false, message: "Tanggal mulai wajib diisi" },
        { status: 400 }
      );
    }

    if (endDate === undefined || endDate === null || String(endDate).trim() === "") {
      return NextResponse.json(
        { success: false, message: "Tanggal selesai wajib diisi" },
        { status: 400 }
      );
    }

    const normalizedStart = normalizeCalendarDate(startDate);
    if (!normalizedStart) {
      return NextResponse.json(
        { success: false, message: "Format tanggal mulai tidak valid (gunakan YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const normalizedEnd = normalizeCalendarDate(endDate);
    if (!normalizedEnd) {
      return NextResponse.json(
        { success: false, message: "Format tanggal selesai tidak valid (gunakan YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    if (normalizedEnd < normalizedStart) {
      return NextResponse.json(
        {
          success: false,
          message: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai",
        },
        { status: 400 }
      );
    }

    // Security: studentId strictly comes from session.id, never from body.studentId
    const created = await StudentEvent.create({
      studentId: new mongoose.Types.ObjectId(session.id),
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : "",
      startDate: normalizedStart,
      endDate: normalizedEnd,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Event berhasil ditambahkan ke kalender",
        data: {
          _id: String(created._id),
          id: `personal-${created._id}`,
          eventId: String(created._id),
          studentId: String(created.studentId),
          title: created.title,
          description: created.description || "",
          startDate: created.startDate,
          endDate: created.endDate,
          date: created.startDate,
          time: "Sepanjang Hari",
          type: "event",
          isPersonal: true,
          editable: true,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat event kalender";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const url = new URL(req.url);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Format permintaan tidak valid" },
        { status: 400 }
      );
    }

    const rawId =
      (body as any).id ||
      (body as any).eventId ||
      (body as any)._id ||
      url.searchParams.get("id") ||
      url.searchParams.get("eventId");

    if (!rawId || typeof rawId !== "string") {
      return NextResponse.json(
        { success: false, message: "ID event wajib disertakan" },
        { status: 400 }
      );
    }

    const cleanId = rawId.replace(/^personal-/, "");
    if (!mongoose.Types.ObjectId.isValid(cleanId)) {
      return NextResponse.json(
        { success: false, message: "ID event tidak valid" },
        { status: 400 }
      );
    }

    const existing = await StudentEvent.findById(cleanId);
    if (!existing) {
      // Check if student attempted to modify an academic Assignment or Quiz event
      const [isAssign, isQuiz] = await Promise.all([
        Assignment.exists({ _id: cleanId }),
        Quiz.exists({ _id: cleanId }),
      ]);
      if (isAssign || isQuiz) {
        return NextResponse.json(
          {
            success: false,
            message: "Akses ditolak: Event akademik otomatis (tugas atau kuis) tidak dapat diubah oleh siswa",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { success: false, message: "Event tidak ditemukan" },
        { status: 404 }
      );
    }

    // Strict ownership check
    if (String(existing.studentId) !== String(session.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda tidak memiliki izin untuk mengubah event milik siswa lain",
        },
        { status: 403 }
      );
    }

    const nextTitle =
      (body as any).title !== undefined ? String((body as any).title).trim() : existing.title;
    if (!nextTitle) {
      return NextResponse.json(
        { success: false, message: "Judul event tidak boleh kosong" },
        { status: 400 }
      );
    }

    const nextStart =
      (body as any).startDate !== undefined
        ? normalizeCalendarDate((body as any).startDate)
        : existing.startDate;
    if (!nextStart) {
      return NextResponse.json(
        { success: false, message: "Format tanggal mulai tidak valid" },
        { status: 400 }
      );
    }

    const nextEnd =
      (body as any).endDate !== undefined
        ? normalizeCalendarDate((body as any).endDate)
        : existing.endDate;
    if (!nextEnd) {
      return NextResponse.json(
        { success: false, message: "Format tanggal selesai tidak valid" },
        { status: 400 }
      );
    }

    if (nextEnd < nextStart) {
      return NextResponse.json(
        {
          success: false,
          message: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai",
        },
        { status: 400 }
      );
    }

    const nextDesc =
      (body as any).description !== undefined
        ? String((body as any).description ?? "").trim()
        : existing.description || "";

    existing.title = nextTitle;
    existing.description = nextDesc;
    existing.startDate = nextStart;
    existing.endDate = nextEnd;
    await existing.save();

    return NextResponse.json({
      success: true,
      message: "Event berhasil diperbarui",
      data: {
        _id: String(existing._id),
        id: `personal-${existing._id}`,
        eventId: String(existing._id),
        studentId: String(existing.studentId),
        title: existing.title,
        description: existing.description || "",
        startDate: existing.startDate,
        endDate: existing.endDate,
        date: existing.startDate,
        time: "Sepanjang Hari",
        type: "event",
        isPersonal: true,
        editable: true,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui event kalender";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export const PUT = PATCH;

export async function DELETE(req: Request) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const url = new URL(req.url);
    let rawId = url.searchParams.get("id") || url.searchParams.get("eventId");

    if (!rawId) {
      try {
        const body = await req.json();
        rawId = body?.id || body?.eventId || body?._id;
      } catch {
        // ignore body parse error if query param used
      }
    }

    if (!rawId || typeof rawId !== "string") {
      return NextResponse.json(
        { success: false, message: "ID event wajib disertakan" },
        { status: 400 }
      );
    }

    const cleanId = rawId.replace(/^personal-/, "");
    if (!mongoose.Types.ObjectId.isValid(cleanId)) {
      return NextResponse.json(
        { success: false, message: "ID event tidak valid" },
        { status: 400 }
      );
    }

    const existing = await StudentEvent.findById(cleanId);
    if (!existing) {
      const [isAssign, isQuiz] = await Promise.all([
        Assignment.exists({ _id: cleanId }),
        Quiz.exists({ _id: cleanId }),
      ]);
      if (isAssign || isQuiz) {
        return NextResponse.json(
          {
            success: false,
            message: "Akses ditolak: Event akademik otomatis (tugas atau kuis) tidak dapat dihapus oleh siswa",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { success: false, message: "Event tidak ditemukan" },
        { status: 404 }
      );
    }

    if (String(existing.studentId) !== String(session.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda tidak memiliki izin untuk menghapus event milik siswa lain",
        },
        { status: 403 }
      );
    }

    await StudentEvent.findByIdAndDelete(cleanId);

    return NextResponse.json({
      success: true,
      message: "Event berhasil dihapus",
      data: { _id: cleanId, eventId: cleanId },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus event kalender";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
