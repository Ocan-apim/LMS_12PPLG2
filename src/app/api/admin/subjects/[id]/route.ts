import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Subject, User } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const subject = await Subject.findById(id)
      .populate("departmentId", "name code")
      .populate("teacherIds", "name email nip degree");

    if (!subject) {
      return NextResponse.json({ success: false, message: "Mata pelajaran tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: subject });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();
    const body = await req.json();

    const { name, code, category, departmentId, grade, teacherIds, description, isActive } = body;

    const updated = await Subject.findByIdAndUpdate(
      id,
      {
        name: name ? name.trim() : undefined,
        code: code ? code.toUpperCase().trim() : undefined,
        category,
        departmentId: category === "Kejuruan" && departmentId ? departmentId : undefined,
        grade,
        teacherIds: Array.isArray(teacherIds) ? teacherIds : undefined,
        description,
        isActive: isActive !== undefined ? isActive : true,
      },
      { new: true, runValidators: true }
    )
      .populate("departmentId", "name code")
      .populate("teacherIds", "name email nip degree");

    if (!updated) {
      return NextResponse.json({ success: false, message: "Mata pelajaran tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui mata pelajaran";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    // Pull from teachers
    await User.updateMany({ subjects: id }, { $pull: { subjects: id } });
    await Subject.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Mata pelajaran berhasil dihapus" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus mata pelajaran";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
