import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { ClassModel, User } from "@/models";

export async function GET(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const grade = searchParams.get("grade");
    const departmentId = searchParams.get("departmentId");
    const search = searchParams.get("search");

    const query: Record<string, unknown> = { isActive: true };

    if (grade && grade !== "all") {
      query.grade = grade;
    }
    if (departmentId && departmentId !== "all") {
      query.departmentId = departmentId;
    }
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const classes = await ClassModel.find(query)
      .populate("homeroomTeacherId", "name email nip degree")
      .populate("departmentId", "name code")
      .sort({ grade: 1, name: 1 })
      .lean();

    const formatted = classes.map((c) => ({
      ...c,
      studentCount: Array.isArray(c.studentIds) ? c.studentIds.length : 0,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();

    const {
      name,
      grade,
      departmentId,
      parallelNumber,
      academicYear,
      homeroomTeacherId,
      maxCapacity,
    } = body;

    if (!name || !grade) {
      return NextResponse.json(
        { success: false, message: "Nama kelas dan tingkat wajib diisi" },
        { status: 400 }
      );
    }

    const existing = await ClassModel.findOne({ name });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Kelas dengan nama "${name}" sudah ada` },
        { status: 400 }
      );
    }

    const cleanTeacherId =
      homeroomTeacherId && typeof homeroomTeacherId === "string" && homeroomTeacherId.trim().length > 0
        ? homeroomTeacherId.trim()
        : null;

    if (cleanTeacherId) {
      const existingWalasClass = await ClassModel.findOne({
        homeroomTeacherId: cleanTeacherId,
        isActive: true,
      });
      if (existingWalasClass) {
        return NextResponse.json(
          {
            success: false,
            message: `Guru tersebut sudah menjadi wali kelas di ${existingWalasClass.name}. Satu guru hanya dapat menjadi wali kelas untuk 1 kelas.`,
          },
          { status: 400 }
        );
      }
    }

    const newClass = await ClassModel.create({
      name,
      grade,
      departmentId: departmentId || undefined,
      parallelNumber: Number(parallelNumber) || 1,
      academicYear: academicYear || "2024/2025 - Genap",
      homeroomTeacherId: cleanTeacherId || undefined,
      maxCapacity: Number(maxCapacity) || 36,
      studentIds: [],
    });

    if (cleanTeacherId) {
      await User.findByIdAndUpdate(cleanTeacherId, {
        isHomeroomTeacher: true,
        homeroomClassId: newClass._id,
      });
    }

    const populated = await ClassModel.findById(newClass._id)
      .populate("homeroomTeacherId", "name email nip degree")
      .populate("departmentId", "name code");

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
