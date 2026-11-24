import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { syncRombelStudents } from "@/lib/rombel-enrollment";
import { requireRole } from "@/lib/session";
import { CourseClass, Assignment, ClassPost } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole([
    "guru",
    "admin",
    "kurikulum",
    "kepsek",
  ]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const initialCheck = (await CourseClass.findById(id)
      .select("teacherId classRombelId enrollmentMethod")
      .lean()) as {
      teacherId?: unknown;
      classRombelId?: unknown;
      enrollmentMethod?: string;
    } | null;

    if (!initialCheck) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    if (
      session.role === "guru" &&
      String(initialCheck.teacherId) !== session.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda bukan pengampu kelas ini",
        },
        { status: 403 }
      );
    }

    if (initialCheck.classRombelId) {
      await syncRombelStudents(String(initialCheck.classRombelId));
    }

    const courseClass = await CourseClass.findById(id)
      .populate("classRombelId", "name grade academicYear")
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

    const classObj = courseClass.toObject() as unknown as Record<
      string,
      unknown
    >;
    const isRombelMethod = courseClass.enrollmentMethod === "rombel";
    classObj.enrollmentMethod = isRombelMethod ? "rombel" : "invitation";

    if (isRombelMethod) {
      delete classObj.password;
      classObj.code = "";
    }

    return NextResponse.json({
      success: true,
      data: {
        ...classObj,
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

    if (
      session.role === "guru" &&
      existingClass.teacherId.toString() !== session.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda bukan pengampu kelas ini",
        },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name.trim();
    if (password && existingClass.enrollmentMethod !== "rombel") {
      updateData.password = password.trim();
    }
    if (bannerColor !== undefined) updateData.bannerColor = bannerColor;
    if (sharedFiles !== undefined) updateData.sharedFiles = sharedFiles;

    const updated = await CourseClass.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("classRombelId", "name grade academicYear")
      .populate("studentIds", "name nisn email");

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memperbarui kelas";
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

    if (
      session.role === "guru" &&
      existingClass.teacherId.toString() !== session.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda bukan pengampu kelas ini",
        },
        { status: 403 }
      );
    }

    // Soft-delete / archive to preserve student academic records
    await CourseClass.findByIdAndUpdate(id, { isActive: false });
    await Assignment.updateMany(
      { courseClassId: id },
      { isArchived: true, isPublished: false }
    );
    await ClassPost.deleteMany({ courseClassId: id });

    return NextResponse.json({
      success: true,
      message: "Kelas berhasil dihapus",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal menghapus kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
