import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { AcademicAssignment } from "@/models";

export async function GET(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const teacherId = searchParams.get("teacherId");
    const subjectId = searchParams.get("subjectId");

    const query: Record<string, unknown> = { isActive: true };
    if (classId) query.classId = classId;
    if (teacherId) query.teacherId = teacherId;
    if (subjectId) query.subjectId = subjectId;

    const assignments = await AcademicAssignment.find(query)
      .populate("teacherId", "name nip email degree")
      .populate("subjectId", "name code category")
      .populate("classId", "name grade")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: assignments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat penugasan akademik";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();

    const { teacherId, subjectId, classId, academicYear } = body;

    if (!teacherId || !subjectId || !classId) {
      return NextResponse.json(
        { success: false, message: "Guru, mata pelajaran, dan kelas wajib dipilih" },
        { status: 400 }
      );
    }

    const existing = await AcademicAssignment.findOne({
      teacherId,
      subjectId,
      classId,
      academicYear: academicYear || "2024/2025 - Genap",
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Penugasan guru ini untuk kelas dan mapel tersebut sudah ada" },
        { status: 400 }
      );
    }

    const assignment = await AcademicAssignment.create({
      teacherId,
      subjectId,
      classId,
      academicYear: academicYear || "2024/2025 - Genap",
    });

    const populated = await AcademicAssignment.findById(assignment._id)
      .populate("teacherId", "name nip email degree")
      .populate("subjectId", "name code category")
      .populate("classId", "name grade");

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menambahkan penugasan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
