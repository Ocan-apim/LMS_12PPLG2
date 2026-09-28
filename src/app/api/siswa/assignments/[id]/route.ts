import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Assignment, CourseClass, Submission } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    // 1. Fetch assignment
    const assignment: any = await Assignment.findById(id)
      .populate("teacherId", "name email degree title")
      .populate("subjectId", "name code category")
      .populate("courseClassId", "name code bannerColor studentIds")
      .lean();

    if (!assignment || assignment.isArchived) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan atau telah diarsipkan" },
        { status: 404 }
      );
    }

    // 2. Security Check: Enforce class membership
    const courseClass = assignment.courseClassId as any;
    if (
      !courseClass ||
      !Array.isArray(courseClass.studentIds) ||
      !courseClass.studentIds.map((sid: any) => sid.toString()).includes(session.id)
    ) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda tidak terdaftar di kelas tugas ini" },
        { status: 403 }
      );
    }

    // 3. Fetch student's own submission (strictly isolated by session.id)
    const studentSubmission: any = await Submission.findOne({
      assignmentId: id,
      studentId: session.id,
    }).lean();

    // 4. Calculate submission status
    const now = new Date();
    const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
    let submissionStatus: "assigned" | "turned_in" | "late" | "graded" = "assigned";

    if (studentSubmission) {
      submissionStatus = studentSubmission.status;
    } else if (dueDate && dueDate < now) {
      submissionStatus = "late"; // Overdue/missing
    }

    // 5. Clean comments (sorted by timestamp asc)
    const comments = (assignment.comments || []).sort(
      (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        _id: assignment._id.toString(),
        title: assignment.title,
        description: assignment.description || "",
        instructions: assignment.instructions || "",
        type: assignment.type || "tugas",
        maxScore: assignment.maxScore || 100,
        dueDate: assignment.dueDate,
        bannerUrl: assignment.bannerUrl,
        bannerColor: courseClass.bannerColor || "blue",
        teacher: {
          _id: assignment.teacherId?._id,
          name: assignment.teacherId?.name || "Guru Pengampu",
          email: assignment.teacherId?.email,
          degree: assignment.teacherId?.degree || assignment.teacherId?.title || "",
        },
        courseClass: {
          _id: courseClass._id,
          name: courseClass.name,
          code: courseClass.code,
          bannerColor: courseClass.bannerColor || "blue",
        },
        subject: {
          _id: assignment.subjectId?._id,
          name: assignment.subjectId?.name || courseClass.name,
          category: assignment.subjectId?.category || "Umum",
        },
        attachments: assignment.attachments || [],
        submissionStatus,
        submission: studentSubmission
          ? {
              _id: studentSubmission._id.toString(),
              status: studentSubmission.status,
              score: studentSubmission.score ?? null,
              feedback: studentSubmission.feedback || null,
              content: studentSubmission.content || "",
              fileUrl: studentSubmission.fileUrl || "",
              attachments: studentSubmission.attachments || [],
              submittedAt: studentSubmission.submittedAt,
              gradedAt: studentSubmission.gradedAt || null,
            }
          : null,
        comments,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat detail tugas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
