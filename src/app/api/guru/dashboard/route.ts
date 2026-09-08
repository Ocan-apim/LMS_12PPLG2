import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, Assignment, Submission, User } from "@/models";

export async function GET() {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    await connectDB();

    // 1. Classes created by teacher
    const classes = await CourseClass.find({
      teacherId: session.id,
      isActive: true,
    })
      .populate("classRombelId", "name grade")
      .select("_id name code studentIds classRombelId bannerColor")
      .lean();

    const activeClasses = classes.map((c) => ({
      _id: c._id,
      name: c.name,
      code: c.code,
      grade: c.classRombelId?.name || "10 PPLG 1",
      studentCount: Array.isArray(c.studentIds) ? c.studentIds.length : 0,
      bannerColor: c.bannerColor,
    }));

    // 2. Assignments
    const assignments = await Assignment.find({ teacherId: session.id }).select("_id");
    const assignmentIds = assignments.map((a) => a._id);

    // 3. Submissions statistics
    const [totalTurnedIn, totalGraded, recentSubmissions] = await Promise.all([
      Submission.countDocuments({
        assignmentId: { $in: assignmentIds },
        status: { $in: ["turned_in", "late", "graded"] },
      }),
      Submission.countDocuments({
        assignmentId: { $in: assignmentIds },
        status: "graded",
      }),
      Submission.find({ assignmentId: { $in: assignmentIds } })
        .populate("studentId", "name nisn")
        .populate("assignmentId", "title courseClassId")
        .sort({ submittedAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const pendingCount = Math.max(0, totalTurnedIn - totalGraded);
    const gradingPercentage = totalTurnedIn > 0 ? Math.round((totalGraded / totalTurnedIn) * 100) : 100;

    return NextResponse.json({
      success: true,
      data: {
        teacherName: session.name,
        activeClasses,
        totalClasses: activeClasses.length,
        totalAssignments: assignmentIds.length,
        gradingStats: {
          percentage: gradingPercentage,
          gradedCount: totalGraded,
          pendingCount,
        },
        recentSubmissions,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat dashboard guru";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
