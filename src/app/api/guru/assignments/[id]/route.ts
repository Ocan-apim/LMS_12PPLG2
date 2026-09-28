import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Assignment, Submission, ClassPost } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin", "siswa"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const assignment = await Assignment.findById(id)
      .populate("courseClassId", "name code bannerColor studentIds")
      .populate("classId", "name grade")
      .populate("teacherId", "name email degree")
      .populate("quizId");

    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan" },
        { status: 404 }
      );
    }

    const teacherIdStr =
      typeof assignment.teacherId === "object" && assignment.teacherId !== null
        ? (assignment.teacherId as any)._id?.toString() || (assignment.teacherId as any).toString()
        : String(assignment.teacherId);

    if (session.role === "guru" && teacherIdStr !== session.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda bukan pemilik tugas ini" },
        { status: 403 }
      );
    }

    // Counts
    const [turnedInCount, gradedCount] = await Promise.all([
      Submission.countDocuments({
        assignmentId: id,
        status: { $in: ["turned_in", "late", "graded"] },
      }),
      Submission.countDocuments({
        assignmentId: id,
        status: "graded",
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...assignment.toObject(),
        turnedInCount,
        gradedCount,
      },
    });
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

    const existing = await Assignment.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan" },
        { status: 404 }
      );
    }

    if (session.role === "guru" && existing.teacherId.toString() !== session.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda bukan pemilik tugas ini" },
        { status: 403 }
      );
    }

    const {
      title,
      instructions,
      description,
      dueDate,
      maxScore,
      attachments,
      bannerUrl,
      quizId,
      isPublished,
    } = body;

    const updated = await Assignment.findByIdAndUpdate(
      id,
      {
        title: title ? title.trim() : undefined,
        instructions,
        description: description || instructions,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        maxScore: maxScore !== undefined ? Number(maxScore) : undefined,
        attachments: Array.isArray(attachments) ? attachments : undefined,
        bannerUrl,
        quizId,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : undefined,
      },
      { new: true }
    )
      .populate("courseClassId", "name code")
      .populate("classId", "name grade");

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui tugas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const existing = await Assignment.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan" },
        { status: 404 }
      );
    }

    if (session.role === "guru" && existing.teacherId.toString() !== session.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda bukan pemilik tugas ini" },
        { status: 403 }
      );
    }

    // Soft-delete / archive to preserve academic data and student submissions
    await Assignment.findByIdAndUpdate(id, {
      isArchived: true,
      isPublished: false,
    });

    return NextResponse.json({
      success: true,
      message: "Tugas berhasil diarsipkan",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus tugas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
