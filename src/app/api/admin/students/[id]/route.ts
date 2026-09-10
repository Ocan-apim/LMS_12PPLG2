import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User, ClassModel } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const student = await User.findOne({ _id: id, role: "siswa" })
      .populate("classId", "name grade")
      .populate("departmentId", "name code")
      .select("-password");

    if (!student) {
      return NextResponse.json({ success: false, message: "Siswa tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: student });
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

    const currentStudent = await User.findOne({ _id: id, role: "siswa" });
    if (!currentStudent) {
      return NextResponse.json({ success: false, message: "Siswa tidak ditemukan" }, { status: 404 });
    }

    const {
      name,
      nisn,
      gender,
      birthPlace,
      birthDate,
      grade,
      departmentId,
      classId,
      academicYear,
      email,
      isActive,
    } = body;

    // Check if class changed
    const oldClassId = currentStudent.classId?.toString();
    const newClassId = classId ? classId.toString() : null;

    if (oldClassId && oldClassId !== newClassId) {
      await ClassModel.findByIdAndUpdate(oldClassId, {
        $pull: { studentIds: id },
      });
    }

    if (newClassId && oldClassId !== newClassId) {
      await ClassModel.findByIdAndUpdate(newClassId, {
        $addToSet: { studentIds: id },
      });
    }

    const updated = await User.findByIdAndUpdate(
      id,
      {
        name,
        nis: body.nis || nisn || undefined,
        nisn: nisn || body.nis || undefined,
        gender,
        birthPlace,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        grade,
        departmentId: departmentId || undefined,
        classId: newClassId || undefined,
        academicYear,
        email: email?.trim().toLowerCase(),
        isActive: isActive !== undefined ? isActive : true,
      },
      { new: true, runValidators: true }
    )
      .populate("classId", "name grade")
      .populate("departmentId", "name code")
      .select("-password");

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui data siswa";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const student = await User.findOne({ _id: id, role: "siswa" });
    if (!student) {
      return NextResponse.json({ success: false, message: "Siswa tidak ditemukan" }, { status: 404 });
    }

    // Remove from class
    if (student.classId) {
      await ClassModel.findByIdAndUpdate(student.classId, {
        $pull: { studentIds: id },
      });
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Siswa berhasil dihapus" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus siswa";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
