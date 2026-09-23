import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { AcademicAssignment } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();
    const body = await req.json();
    const { teacherId, subjectId, classId, academicYear } = body;

    if (!teacherId || !subjectId || !classId) {
      return NextResponse.json(
        { success: false, message: "Guru, mata pelajaran, dan kelas wajib dipilih" },
        { status: 400 }
      );
    }

    const year = academicYear || "2024/2025 - Genap";
    const existing = await AcademicAssignment.findOne({
      _id: { $ne: id },
      teacherId,
      subjectId,
      classId,
      academicYear: year,
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Penugasan guru ini untuk kelas dan mapel tersebut sudah ada" },
        { status: 400 }
      );
    }

    const updated = await AcademicAssignment.findByIdAndUpdate(
      id,
      {
        teacherId,
        subjectId,
        classId,
        academicYear: year,
      },
      { new: true }
    )
      .populate("teacherId", "name nip email degree")
      .populate("subjectId", "name code category")
      .populate("classId", "name grade");

    if (!updated) {
      return NextResponse.json({ success: false, message: "Penugasan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui penugasan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  return PUT(req, context);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const deleted = await AcademicAssignment.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Penugasan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Penugasan berhasil dihapus" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus penugasan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
