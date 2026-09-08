import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Department, ClassModel, User } from "@/models";

export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();

    const departments = await Department.find()
      .populate("headOfDepartmentId", "name email")
      .sort({ name: 1 })
      .lean();

    // Enrich with class count and student count
    const enriched = await Promise.all(
      departments.map(async (dept) => {
        const [classCount, studentCount] = await Promise.all([
          ClassModel.countDocuments({ departmentId: dept._id, isActive: true }),
          User.countDocuments({ departmentId: dept._id, role: "siswa", isActive: true }),
        ]);

        return {
          ...dept,
          classCount,
          studentCount,
        };
      })
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat data jurusan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();

    const { name, code, headOfDepartmentId, maxClasses, capacity, description } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, message: "Nama dan kode jurusan wajib diisi" },
        { status: 400 }
      );
    }

    const existing = await Department.findOne({ code: code.toUpperCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Kode jurusan ${code.toUpperCase()} sudah digunakan` },
        { status: 400 }
      );
    }

    const dept = await Department.create({
      name,
      code: code.toUpperCase(),
      headOfDepartmentId: headOfDepartmentId || undefined,
      maxClasses: Number(maxClasses) || 2,
      capacity: Number(capacity) || (Number(maxClasses) || 2) * 36,
      description,
    });

    return NextResponse.json({ success: true, data: dept }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menambahkan jurusan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
