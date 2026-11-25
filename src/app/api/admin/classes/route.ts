/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { ClassModel, User, Department } from "@/models";
import { inspectAndCleanOrphanedClasses } from "@/lib/teacher-class-cleanup";

const ROMAN_BY_GRADE: Record<string, { grade: "10" | "11" | "12"; roman: string }> = {
  "10": { grade: "10", roman: "X" },
  X: { grade: "10", roman: "X" },
  "11": { grade: "11", roman: "XI" },
  XI: { grade: "11", roman: "XI" },
  "12": { grade: "12", roman: "XII" },
  XII: { grade: "12", roman: "XII" },
};

export async function GET(req: Request) {
  const { error } = await requireRole(["admin", "guru", "kurikulum", "kepsek"]);
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

    // TASK 2: Automatically inspect and clean up genuinely empty orphaned Mapel Classes
    // while preserving orphaned classes with meaningful records and separating them from
    // legacy classes that still have a valid assigned Guru.
    const orphanInspection = await inspectAndCleanOrphanedClasses();

    const classes = await ClassModel.find(query)
      .populate("homeroomTeacherId", "name email nip degree")
      .populate("departmentId", "name code")
      .sort({ grade: 1, name: 1 })
      .lean();

    const formatted = classes.map((c) => ({
      ...c,
      studentCount: Array.isArray(c.studentIds) ? c.studentIds.length : 0,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      legacyCourseClasses: orphanInspection.validLegacyUnassignedClasses,
      orphanedCourseClasses: orphanInspection.orphanedClassesWithRecords,
      removedEmptyOrphanClassNames:
        orphanInspection.removedEmptyOrphanClassNames,
    });
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
      grade,
      departmentId,
      jurusan,
      parallelNumber,
      rombel,
      academicYear,
      homeroomTeacherId,
      maxCapacity,
    } = body;

    const rawGrade = String(grade || "").trim().toUpperCase();
    const gradeEntry = ROMAN_BY_GRADE[rawGrade];
    if (!gradeEntry) {
      return NextResponse.json(
        { success: false, message: "Tingkat kelas wajib dipilih (10, 11, atau 12)" },
        { status: 400 }
      );
    }

    // Resolve department from departmentId or jurusan code
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let deptDoc: any = null;
    if (departmentId && mongoose.Types.ObjectId.isValid(String(departmentId))) {
      deptDoc = await Department.findById(departmentId).lean();
    } else if (jurusan || departmentId) {
      const codeQuery = String(jurusan || departmentId).trim().toUpperCase();
      deptDoc = await Department.findOne({
        $or: [{ code: codeQuery }, { name: { $regex: `^${codeQuery}$`, $options: "i" } }],
      }).lean();
    }

    if (!deptDoc) {
      return NextResponse.json(
        { success: false, message: "Jurusan wajib dipilih" },
        { status: 400 }
      );
    }

    const parsedParallel = Number(parallelNumber ?? rombel ?? 1);
    if (!Number.isInteger(parsedParallel) || parsedParallel < 1) {
      return NextResponse.json(
        { success: false, message: "Nomor rombel harus berupa angka bulat positif" },
        { status: 400 }
      );
    }

    // TASK 2: Automatically generate class name from Grade (Roman), Jurusan code, and Rombel number
    const generatedName = `${gradeEntry.roman} ${deptDoc.code} ${parsedParallel}`;

    const existing = await ClassModel.findOne({ name: generatedName });
    if (existing && existing.isActive !== false) {
      return NextResponse.json(
        { success: false, message: `Kelas dengan nama "${generatedName}" sudah ada` },
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
        ...(existing ? { _id: { $ne: existing._id } } : {}),
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

    let savedClassId;
    if (existing && existing.isActive === false) {
      existing.grade = gradeEntry.grade;
      existing.departmentId = deptDoc._id;
      existing.parallelNumber = parsedParallel;
      existing.academicYear = academicYear || "2024/2025 - Genap";
      existing.homeroomTeacherId = cleanTeacherId ? new mongoose.Types.ObjectId(cleanTeacherId) : undefined;
      existing.maxCapacity = Number(maxCapacity) || 36;
      existing.isActive = true;
      await existing.save();
      savedClassId = existing._id;
    } else {
      const newClass = await ClassModel.create({
        name: generatedName,
        grade: gradeEntry.grade,
        departmentId: deptDoc._id,
        parallelNumber: parsedParallel,
        academicYear: academicYear || "2024/2025 - Genap",
        homeroomTeacherId: cleanTeacherId || undefined,
        maxCapacity: Number(maxCapacity) || 36,
        studentIds: [],
      });
      savedClassId = newClass._id;
    }

    if (cleanTeacherId) {
      await User.findByIdAndUpdate(cleanTeacherId, {
        isHomeroomTeacher: true,
        homeroomClassId: savedClassId,
      });
    }

    const populated = await ClassModel.findById(savedClassId)
      .populate("homeroomTeacherId", "name email nip degree")
      .populate("departmentId", "name code");

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
