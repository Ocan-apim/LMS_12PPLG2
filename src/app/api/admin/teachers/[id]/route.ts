import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User, ClassModel, Subject } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const teacher = await User.findOne({ _id: id, role: "guru" })
      .populate("subjects", "name code category")
      .populate("homeroomClassId", "name grade")
      .select("-password");

    if (!teacher) {
      return NextResponse.json({ success: false, message: "Guru tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: teacher });
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

    const currentTeacher = await User.findOne({ _id: id, role: "guru" });
    if (!currentTeacher) {
      return NextResponse.json({ success: false, message: "Guru tidak ditemukan" }, { status: 404 });
    }

    const {
      name,
      nip,
      email,
      degree,
      lastEducation,
      photoUrl,
      subjects,
      joinDate,
      isHomeroomTeacher,
      homeroomClassId,
      phone,
      isActive,
    } = body;

    // Handle homeroom class updates
    const oldClassId = currentTeacher.homeroomClassId?.toString();
    const newClassId = isHomeroomTeacher && homeroomClassId ? homeroomClassId.toString() : null;

    if (oldClassId && oldClassId !== newClassId) {
      await ClassModel.findByIdAndUpdate(oldClassId, {
        $unset: { homeroomTeacherId: 1 },
      });
    }

    if (newClassId && oldClassId !== newClassId) {
      await ClassModel.findByIdAndUpdate(newClassId, {
        homeroomTeacherId: id,
      });
    }

    const updated = await User.findByIdAndUpdate(
      id,
      {
        name: name ? name.trim() : undefined,
        nip: nip ? nip.trim() : undefined,
        email: email ? email.toLowerCase().trim() : undefined,
        degree: degree ? degree.trim() : undefined,
        lastEducation,
        photoUrl,
        subjects: Array.isArray(subjects) ? subjects : currentTeacher.subjects,
        joinDate: joinDate ? new Date(joinDate) : currentTeacher.joinDate,
        isHomeroomTeacher: Boolean(isHomeroomTeacher),
        homeroomClassId: newClassId || undefined,
        phone,
        isActive: isActive !== undefined ? isActive : true,
      },
      { new: true, runValidators: true }
    )
      .populate("subjects", "name code category")
      .populate("homeroomClassId", "name grade")
      .select("-password");

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui data guru";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const teacher = await User.findOne({ _id: id, role: "guru" });
    if (!teacher) {
      return NextResponse.json({ success: false, message: "Guru tidak ditemukan" }, { status: 404 });
    }

    // Unset from homeroom class
    if (teacher.homeroomClassId) {
      await ClassModel.findByIdAndUpdate(teacher.homeroomClassId, {
        $unset: { homeroomTeacherId: 1 },
      });
    }

    // Unset from subjects
    await Subject.updateMany({ teacherIds: id }, { $pull: { teacherIds: id } });

    await User.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Data guru berhasil dihapus" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus data guru";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
