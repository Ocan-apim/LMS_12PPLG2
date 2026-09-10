import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Department, ClassModel, User } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const dept = await Department.findById(id).populate("headOfDepartmentId", "name email");
    if (!dept) {
      return NextResponse.json({ success: false, message: "Jurusan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: dept });
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

    const { name, code, headOfDepartmentId, maxClasses, capacity, description, isActive } = body;

    if (headOfDepartmentId) {
      const existingKajur = await Department.findOne({
        headOfDepartmentId,
        _id: { $ne: id },
        isActive: true,
      });
      if (existingKajur) {
        return NextResponse.json(
          {
            success: false,
            message: `Guru tersebut sudah menjadi Kepala Jurusan di ${existingKajur.name}`,
          },
          { status: 400 }
        );
      }
    }

    const dept = await Department.findByIdAndUpdate(
      id,
      {
        name,
        code: code ? code.toUpperCase() : undefined,
        headOfDepartmentId: headOfDepartmentId || null,
        maxClasses: maxClasses !== undefined ? Number(maxClasses) : undefined,
        capacity: capacity !== undefined ? Number(capacity) : undefined,
        description,
        isActive,
      },
      { new: true, runValidators: true }
    );

    if (!dept) {
      return NextResponse.json({ success: false, message: "Jurusan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: dept });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui jurusan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    // Check if classes or students are still linked to this department
    const [classCount, studentCount] = await Promise.all([
      ClassModel.countDocuments({ departmentId: id, isActive: true }),
      User.countDocuments({ departmentId: id, role: "siswa", isActive: true }),
    ]);

    if (classCount > 0 || studentCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Tidak dapat menghapus jurusan. Masih terdapat ${classCount} kelas dan ${studentCount} siswa aktif di jurusan ini.`,
        },
        { status: 400 }
      );
    }

    const dept = await Department.findByIdAndDelete(id);
    if (!dept) {
      return NextResponse.json({ success: false, message: "Jurusan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Jurusan berhasil dihapus" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus jurusan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
