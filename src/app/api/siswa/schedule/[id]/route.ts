import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { StudentEvent, Assignment, Quiz } from "@/models";
import { normalizeCalendarDate } from "../route";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const cleanId = id.replace(/^personal-/, "");
    if (!mongoose.Types.ObjectId.isValid(cleanId)) {
      return NextResponse.json(
        { success: false, message: "ID event tidak valid" },
        { status: 400 }
      );
    }

    const event = (await StudentEvent.findById(cleanId).lean()) as Record<string, unknown> | null;
    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event tidak ditemukan" },
        { status: 404 }
      );
    }

    if (String(event.studentId) !== String(session.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda tidak dapat mengakses event milik siswa lain",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: String(event._id),
        id: `personal-${event._id}`,
        eventId: String(event._id),
        studentId: String(event.studentId),
        title: event.title,
        description: event.description || "",
        startDate: event.startDate,
        endDate: event.endDate,
        date: event.startDate,
        type: "event",
        isPersonal: true,
        editable: true,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat detail event";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const cleanId = id.replace(/^personal-/, "");
    if (!mongoose.Types.ObjectId.isValid(cleanId)) {
      return NextResponse.json(
        { success: false, message: "ID event tidak valid" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Format permintaan tidak valid" },
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

export async function DELETE(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const cleanId = id.replace(/^personal-/, "");
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
