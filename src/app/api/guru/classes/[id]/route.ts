import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, User, Assignment } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin", "kurikulum", "kepsek"]);
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

    // Verify ownership: teacherId must match session.id for guru role
    const teacherIdStr =
      typeof courseClass.teacherId === "object" && courseClass.teacherId !== null
        ? (courseClass.teacherId as any)._id?.toString() || (courseClass.teacherId as any).toString()
        : String(courseClass.teacherId);

    if (session.role === "guru" && teacherIdStr !== session.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda bukan pengampu kelas ini" },
        { status: 403 }
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
        currentUserRole: session.role,
        isReadOnly: ["admin", "kurikulum", "kepsek"].includes(session.role),
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

    const existingClass = await CourseClass.findById(id);
    if (!existingClass) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    if (session.role === "guru" && existingClass.teacherId.toString() !== session.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda bukan pengampu kelas ini" },
        { status: 403 }
      );
    }

    const updated = await CourseClass.findByIdAndUpdate(
      id,
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

    const existingClass = await CourseClass.findById(id);
    if (!existingClass) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    if (session.role === "guru" && existingClass.teacherId.toString() !== session.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda bukan pengampu kelas ini" },
        { status: 403 }
      );
    }

    // Soft-delete / archive to preserve student academic records
    await CourseClass.findByIdAndUpdate(id, { isActive: false });
    await Assignment.updateMany({ courseClassId: id }, { isArchived: true, isPublished: false });

    return NextResponse.json({ success: true, message: "Kelas berhasil diarsipkan" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
