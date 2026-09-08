import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, User, Assignment } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const courseClass = await CourseClass.findById(id)
      .populate("classRombelId", "name grade")
      .populate("studentIds", "name nisn email gender")
      .populate("teacherId", "name email degree nip");

    if (!courseClass) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    const assignments = await Assignment.find({ courseClassId: id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        ...courseClass.toObject(),
        assignments,
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

    const { name, password, bannerColor, sharedFiles } = body;

    const updated = await CourseClass.findOneAndUpdate(
      { _id: id, teacherId: session.id },
      {
        name: name ? name.trim() : undefined,
        password: password ? password.trim() : undefined,
        bannerColor,
        sharedFiles,
      },
      { new: true }
    )
      .populate("classRombelId", "name grade")
      .populate("studentIds", "name nisn email");

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan atau Anda tidak berhak mengubahnya" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const deleted = await CourseClass.findOneAndDelete({
      _id: id,
      teacherId: session.id,
    });

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Delete associated assignments
    await Assignment.deleteMany({ courseClassId: id });

    return NextResponse.json({ success: true, message: "Kelas berhasil dihapus" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
