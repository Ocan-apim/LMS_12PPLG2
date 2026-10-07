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
      .populate({
        path: "classId",
        select: "name grade departmentId",
        populate: { path: "departmentId", select: "name code" },
      })
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

    const { teacherId, subjectId, classId, classIds, academicYear } = body;

    const targetClassIds: string[] = Array.isArray(classIds) && classIds.length > 0
      ? classIds
      : classId
      ? [classId]
      : [];

    if (!teacherId || !subjectId || targetClassIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Guru, mata pelajaran, dan minimal satu kelas wajib dipilih" },
        { status: 400 }
      );
    }

    const year = academicYear || "2024/2025 - Genap";

    // Enforce business rule: ONE Guru may teach a maximum of 2 distinct Mata Pelajaran
    const existingSubjectIds = await AcademicAssignment.distinct("subjectId", {
      teacherId,
      academicYear: year,
      isActive: true,
    });
    const distinctSubjectSet = new Set(existingSubjectIds.map(String));
    distinctSubjectSet.add(String(subjectId));
    if (distinctSubjectSet.size > 2) {
      return NextResponse.json(
        { success: false, message: "Guru hanya dapat mengajar maksimal 2 mata pelajaran." },
        { status: 400 }
      );
    }

    const createdAssignments = [];
    const skippedClasses = [];

    for (const cid of targetClassIds) {
      const existing = await AcademicAssignment.findOne({
        teacherId,
        subjectId,
        classId: cid,
        academicYear: year,
      });

      if (existing) {
        skippedClasses.push(cid);
        continue;
      }

      const created = await AcademicAssignment.create({
        teacherId,
        subjectId,
        classId: cid,
        academicYear: year,
      });
      createdAssignments.push(created);
    }

    if (createdAssignments.length === 0 && skippedClasses.length > 0) {
      return NextResponse.json(
        { success: false, message: "Seluruh penugasan untuk kelas yang dipilih sudah terdaftar sebelumnya" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Berhasil menugaskan pengajar ke ${createdAssignments.length} kelas`,
        data: createdAssignments,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menambahkan penugasan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
