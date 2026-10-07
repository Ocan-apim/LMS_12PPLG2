import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, Assignment, Submission, User } from "@/models";

export async function GET() {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();

    const studentUser: any = await User.findById(session.id).select("classId").lean();
    const studentRombelId = studentUser?.classId;

    const classQuery: Record<string, unknown> = {
      isActive: true,
      $or: [
        { studentIds: session.id },
        ...(studentRombelId ? [{ classRombelId: studentRombelId }, { assignedRombelIds: studentRombelId }] : []),
      ],
    };

    const classes = await CourseClass.find(classQuery)
      .populate("teacherId", "name email degree nip")
      .populate("subjectId", "name code category")
      .populate("classRombelId", "name grade")
      .sort({ createdAt: -1 })
      .lean();

    // Self-heal: ensure student is in studentIds for classes matched by rombel
    const classesToEnroll = classes.filter(
      (c: any) =>
        !Array.isArray(c.studentIds) ||
        !c.studentIds.map(String).includes(session.id)
    );
    if (classesToEnroll.length > 0) {
      await CourseClass.updateMany(
        { _id: { $in: classesToEnroll.map((c: any) => c._id) } },
        { $addToSet: { studentIds: session.id } }
      );
    }

    // Enrich each class with assignment counts and student's progress
    const enriched = await Promise.all(
      classes.map(async (c: any) => {
        const totalAssignments = await Assignment.countDocuments({
          courseClassId: c._id,
          isArchived: { $ne: true },
          isPublished: true,
        });

        const completedSubmissions = await Submission.countDocuments({
          courseClassId: c._id,
          studentId: session.id,
          status: { $in: ["turned_in", "late", "graded"] },
        });

        const progress =
          totalAssignments > 0
            ? Math.round((completedSubmissions / totalAssignments) * 100)
            : 0;

        return {
          _id: c._id,
          name: c.name,
          code: c.code,
          bannerColor: c.bannerColor || "blue",
          academicYear: c.academicYear,
          teacher: c.teacherId?.name || "Guru Pengampu",
          teacherDegree: c.teacherId?.degree || "",
          subject: c.subjectId?.name || c.name,
          category: c.subjectId?.category || "Kejuruan",
          rombel: c.classRombelId
            ? `${c.classRombelId.grade} - ${c.classRombelId.name}`
            : undefined,
          studentCount: Array.isArray(c.studentIds) ? c.studentIds.length : 0,
          totalAssignments,
          completedAssignments: completedSubmissions,
          progress,
          createdAt: c.createdAt,
        };
      })
    );

    return NextResponse.json(
      { success: true, data: enriched },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat mata pelajaran";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
