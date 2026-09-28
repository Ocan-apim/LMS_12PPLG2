import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Submission, Assignment, CourseClass, User } from "@/models";

export async function GET(req: Request) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const courseClassId = searchParams.get("courseClassId") || searchParams.get("classId");
    const assignmentId = searchParams.get("assignmentId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Get assignments owned by this guru
    const assignmentQuery: Record<string, unknown> = { teacherId: session.id };
    if (courseClassId && courseClassId !== "all") {
      assignmentQuery.courseClassId = courseClassId;
    }
    if (assignmentId && assignmentId !== "all") {
      assignmentQuery._id = assignmentId;
    }

    const teacherAssignments = await Assignment.find(assignmentQuery).select("_id").lean();
    const teacherAssignIds = teacherAssignments.map((a) => a._id);

    const submissionQuery: Record<string, unknown> = {
      assignmentId: { $in: teacherAssignIds },
    };

    if (status && status !== "all") {
      if (status === "needs_review") {
        submissionQuery.status = { $in: ["turned_in", "late"] };
      } else {
        submissionQuery.status = status;
      }
    }

    let submissions = await Submission.find(submissionQuery)
      .populate("studentId", "name nisn email")
      .populate({
        path: "assignmentId",
        select: "title maxScore type dueDate courseClassId",
        populate: { path: "courseClassId", select: "name code" },
      })
      .sort({ submittedAt: -1 })
      .lean();

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      submissions = submissions.filter((s: any) => {
        const studentName = s.studentId?.name?.toLowerCase() || "";
        const assignTitle = s.assignmentId?.title?.toLowerCase() || "";
        return studentName.includes(q) || assignTitle.includes(q);
      });
    }

    const pendingCount = await Submission.countDocuments({
      assignmentId: { $in: teacherAssignIds },
      status: { $in: ["turned_in", "late"] },
    });

    return NextResponse.json({
      success: true,
      data: submissions,
      total: submissions.length,
      pendingCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat daftar pengumpulan tugas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
