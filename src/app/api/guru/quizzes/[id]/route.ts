import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Quiz } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin", "siswa"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const quiz = await Quiz.findById(id).populate("courseClassId", "name code");
    if (!quiz) {
      return NextResponse.json({ success: false, message: "Kuis tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: quiz });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();
    const body = await req.json();

    const { title, description, durationSeconds, questions, totalPoints, dueDate } = body;

    if (title !== undefined && !String(title).trim()) {
      return NextResponse.json(
        { success: false, message: "Judul kuis tidak boleh kosong" },
        { status: 400 }
      );
    }

    const updated = await Quiz.findOneAndUpdate(
      { _id: id, ...(session.role === "guru" ? { teacherId: session.id } : {}) },
      {
        title: title ? title.trim() : undefined,
        description: description !== undefined ? String(description).trim() : undefined,
        durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
        questions,
        totalPoints: totalPoints ? Number(totalPoints) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui kuis";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
