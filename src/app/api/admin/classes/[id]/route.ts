/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { ClassModel, User, Assignment, CourseClass, Quiz, Department } from "@/models";

const ROMAN_BY_GRADE: Record<string, { grade: "10" | "11" | "12"; roman: string }> = {
  "10": { grade: "10", roman: "X" },
  X: { grade: "10", roman: "X" },
  "11": { grade: "11", roman: "XI" },
  XI: { grade: "11", roman: "XI" },
  "12": { grade: "12", roman: "XII" },
  XII: { grade: "12", roman: "XII" },
};
import {
  getActiveStudentsForRombelDetailed,
  calculateCourseEnrollmentCompleteness,
} from "@/lib/rombel-enrollment";
import { inspectAndCleanOrphanedClasses } from "@/lib/teacher-class-cleanup";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { error } = await requireRole(["admin", "kurikulum", "kepsek", "guru"]);
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cls: any = await ClassModel.findById(id)
      .populate("departmentId", "name code")
      .populate("homeroomTeacherId", "name email nip degree")
      .populate("studentIds", "name email nis nisn gender")
      .lean();

    if (!cls) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // TASK 2: Inspect and clean up genuinely empty orphaned classes before building rombel view
    const orphanInspection = await inspectAndCleanOrphanedClasses();

    // TASK 2.3 & 2.6: Pure read-only enrollment completeness calculation for this Rombel
    // Never mutate student enrollments during monitoring GET requests.
    const activeRombelStudents = await getActiveStudentsForRombelDetailed(id, cls.name);

    // Also fetch associated active CourseClasses (Mapel Classes) linked to this rombel
    const courseClasses = await CourseClass.find({
      $or: [{ classRombelId: id }, { assignedRombelIds: id }],
      isActive: true,
    })
      .populate("teacherId", "name email nip degree")
      .populate("subjectId", "name code category")
      .sort({ createdAt: -1 })
      .lean();

    const enrichedCourseClasses = await Promise.all(
      courseClasses.map(async (cc: any) => {
        const [assignmentCount, quizCount] = await Promise.all([
          Assignment.countDocuments({
            courseClassId: cc._id,
            isArchived: { $ne: true },
            isPublished: true,
          }),
          Quiz.countDocuments({
            courseClassId: cc._id,
            isPublished: true,
          }),
        ]);

        const completeness = calculateCourseEnrollmentCompleteness(
          cc,
          activeRombelStudents,
          cls.name
        );

        const hasValidTeacher = Boolean(cc.teacherId && cc.teacherId._id);
        const teacherName = hasValidTeacher
          ? `${cc.teacherId.name}${cc.teacherId.degree ? `, ${cc.teacherId.degree}` : ""}`
          : "Tanpa Guru Pengampu (Orphan — Perlu Tinjauan Admin)";

        return {
          _id: String(cc._id),
          name: cc.name,
          code: cc.code,
          enrollmentMethod: cc.enrollmentMethod || "rombel",
          teacherId: cc.teacherId,
          teacher: cc.teacherId || null,
          teacherName,
          isOrphaned: !hasValidTeacher,
          rombelId: String(cls._id),
          rombelName: cls.name,
          subject: cc.subjectId || null,
          category: cc.subjectId?.category || "Kejuruan",
          assignmentCount,
          quizCount,
          studentCount: Array.isArray(cc.studentIds) ? cc.studentIds.length : 0,
          bannerColor: cc.bannerColor || "blue",
          enrollmentMonitoring: completeness,
          // TASK 2.2 - 2.5 Enrollment Completeness Fields
          totalActiveRombelStudents: completeness.totalActiveRombelStudents,
          enrolledCount: completeness.enrolledCount,
          missingCount: completeness.missingCount,
          completionPercentage: completeness.completionPercentage,
          enrollmentStatus: completeness.enrollmentStatus,
          enrolledStudents: completeness.enrolledStudents,
          missingStudents: completeness.missingStudents,
        };
      })
    );

    const studentsList =
      activeRombelStudents.length > 0
        ? activeRombelStudents
        : Array.isArray(cls.studentIds)
        ? cls.studentIds
        : [];

    return NextResponse.json({
      success: true,
      data: {
        ...cls,
        department: cls.departmentId || null,
        homeroomTeacher: cls.homeroomTeacherId || null,
        students: studentsList,
        studentCount: activeRombelStudents.length,
        activeStudentCount: activeRombelStudents.length,
        activeRombelStudents,
        courseClassCount: enrichedCourseClasses.length,
        courseClasses: enrichedCourseClasses,
        legacyCourseClasses: orphanInspection.validLegacyUnassignedClasses,
        orphanedCourseClasses: orphanInspection.orphanedClassesWithRecords,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat detail kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: Request, context: RouteContext) {
  const { error } = await requireRole(["admin"]);
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const body = await req.json();
    const {
      grade,
      departmentId,
      jurusan,
      parallelNumber,
      rombel,
      homeroomTeacherId,
      maxCapacity,
      academicYear,
    } = body;

    const existingClass = await ClassModel.findById(id);
    if (!existingClass) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    const rawGrade = String(grade || existingClass.grade || "10")
      .trim()
      .toUpperCase();
    const gradeEntry = ROMAN_BY_GRADE[rawGrade];
    if (!gradeEntry) {
      return NextResponse.json(
        { success: false, message: "Tingkat kelas tidak valid (pilih 10, 11, atau 12)" },
        { status: 400 }
      );
    }

    const targetDeptId = departmentId || existingClass.departmentId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let deptDoc: any = null;
    if (targetDeptId && mongoose.Types.ObjectId.isValid(String(targetDeptId))) {
      deptDoc = await Department.findById(targetDeptId).lean();
    } else if (jurusan || targetDeptId) {
      const codeQuery = String(jurusan || targetDeptId).trim().toUpperCase();
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

    const parsedParallel = Number(
      parallelNumber ?? rombel ?? existingClass.parallelNumber ?? 1
    );
    if (!Number.isInteger(parsedParallel) || parsedParallel < 1) {
      return NextResponse.json(
        { success: false, message: "Nomor rombel harus berupa angka bulat positif" },
        { status: 400 }
      );
    }

    const generatedName = `${gradeEntry.roman} ${deptDoc.code} ${parsedParallel}`;

    // Check duplicate name
    if (generatedName !== existingClass.name) {
      const duplicate = await ClassModel.findOne({
        name: generatedName,
        _id: { $ne: id },
        isActive: true,
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: `Kelas dengan nama "${generatedName}" sudah terdaftar` },
          { status: 400 }
        );
      }
    }

    // Check if new homeroomTeacherId is already assigned to another class
    if (
      homeroomTeacherId &&
      String(homeroomTeacherId) !== String(existingClass.homeroomTeacherId || "")
    ) {
      const conflictClass = await ClassModel.findOne({
        homeroomTeacherId,
        _id: { $ne: id },
        isActive: true,
      });
      if (conflictClass) {
        return NextResponse.json(
          {
            success: false,
            message: `Guru tersebut sudah menjadi Wali Kelas di ${conflictClass.name}`,
          },
          { status: 400 }
        );
      }
    }

    // Unset previous homeroom teacher if changed
    if (
      existingClass.homeroomTeacherId &&
      String(existingClass.homeroomTeacherId) !== String(homeroomTeacherId || "")
    ) {
      await User.findByIdAndUpdate(existingClass.homeroomTeacherId, {
        isHomeroomTeacher: false,
        $unset: { homeroomClassId: 1 },
      });
    }

    // Update fields using automatically generated name
    existingClass.name = generatedName;
    existingClass.grade = gradeEntry.grade;
    existingClass.departmentId = deptDoc._id;
    existingClass.parallelNumber = parsedParallel;
    if (maxCapacity !== undefined) existingClass.maxCapacity = Number(maxCapacity);
    if (academicYear) existingClass.academicYear = academicYear;
    existingClass.homeroomTeacherId = homeroomTeacherId || undefined;

    await existingClass.save();

    if (homeroomTeacherId) {
      await User.findByIdAndUpdate(homeroomTeacherId, {
        isHomeroomTeacher: true,
        homeroomClassId: existingClass._id,
      });
    }

    const updated = await ClassModel.findById(id)
      .populate("departmentId", "name code")
      .populate("homeroomTeacherId", "name email nip degree")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Data kelas berhasil diperbarui",
      data: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireRole(["admin"]);
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const existingClass = await ClassModel.findById(id);
    if (!existingClass) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Soft-delete or deactivate
    await ClassModel.findByIdAndUpdate(id, { isActive: false });

    if (existingClass.homeroomTeacherId) {
      await User.findByIdAndUpdate(existingClass.homeroomTeacherId, {
        isHomeroomTeacher: false,
        $unset: { homeroomClassId: 1 },
      });
    }

    // Also archive related assignments
    await Assignment.updateMany({ classId: id }, { isArchived: true });

    return NextResponse.json({
      success: true,
      message: "Kelas berhasil dihapus",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
