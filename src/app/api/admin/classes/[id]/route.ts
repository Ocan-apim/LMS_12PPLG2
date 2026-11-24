import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { ClassModel, User, Assignment, CourseClass, Quiz } from "@/models";
import {
  getActiveStudentsForRombelDetailed,
  calculateCourseEnrollmentCompleteness,
} from "@/lib/rombel-enrollment";

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

    // TASK 2.3 & 2.6: Pure read-only enrollment completeness calculation for this Rombel
    // Never mutate student enrollments during monitoring GET requests.
    const activeRombelStudents = await getActiveStudentsForRombelDetailed(id, cls.name);

    // Also fetch associated active CourseClasses (Mapel Classes) linked to this rombel
    const [courseClasses, legacyUnassignedClasses] = await Promise.all([
      CourseClass.find({
        $or: [{ classRombelId: id }, { assignedRombelIds: id }],
        isActive: true,
      })
        .populate("teacherId", "name email nip degree")
        .populate("subjectId", "name code category")
        .sort({ createdAt: -1 })
        .lean(),
      // TASK 3: Surface any existing/legacy Mapel Classes that currently have no assigned rombel
      CourseClass.find({
        isActive: true,
        $or: [
          { classRombelId: null },
          { classRombelId: { $exists: false } },
        ],
      })
        .populate("teacherId", "name email nip degree")
        .populate("subjectId", "name code category")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

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

        const teacherName = cc.teacherId
          ? `${cc.teacherId.name}${cc.teacherId.degree ? `, ${cc.teacherId.degree}` : ""}`
          : "Guru Pengampu";

        return {
          _id: String(cc._id),
          name: cc.name,
          code: cc.code,
          enrollmentMethod: cc.enrollmentMethod || "rombel",
          teacherId: cc.teacherId,
          teacherName,
          rombelId: String(cls._id),
          rombelName: cls.name,
          category: cc.subjectId?.category || "Kejuruan",
          assignmentCount,
          quizCount,
          studentCount: Array.isArray(cc.studentIds) ? cc.studentIds.length : 0,
          bannerColor: cc.bannerColor || "blue",
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

    const formattedLegacyClasses = legacyUnassignedClasses.map((lc: any) => ({
      _id: String(lc._id),
      name: lc.name,
      code: lc.code || "-",
      teacherName: lc.teacherId
        ? `${lc.teacherId.name}${lc.teacherId.degree ? `, ${lc.teacherId.degree}` : ""}`
        : "Guru Pengampu",
      category: lc.subjectId?.category || "Kejuruan",
      studentCount: Array.isArray(lc.studentIds) ? lc.studentIds.length : 0,
      academicYear: lc.academicYear || "-",
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...cls,
        activeStudentCount: activeRombelStudents.length,
        activeRombelStudents,
        courseClasses: enrichedCourseClasses,
        legacyCourseClasses: formattedLegacyClasses,
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
      name,
      grade,
      departmentId,
      parallelNumber,
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

    // Check duplicate name
    if (name && name.trim() !== existingClass.name) {
      const duplicate = await ClassModel.findOne({
        name: name.trim(),
        _id: { $ne: id },
        isActive: true,
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: `Kelas dengan nama "${name}" sudah terdaftar` },
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

    // Update fields
    if (name) existingClass.name = name.trim();
    if (grade) existingClass.grade = grade;
    if (departmentId) existingClass.departmentId = departmentId;
    if (parallelNumber !== undefined) existingClass.parallelNumber = Number(parallelNumber);
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
