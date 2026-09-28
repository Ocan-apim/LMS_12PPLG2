import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, Assignment, Submission, ClassPost, Material } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const courseClass: any = await CourseClass.findById(id)
      .populate("teacherId", "name email degree nip")
      .populate("subjectId", "name code category")
      .populate("classRombelId", "name grade")
      .lean();

    if (!courseClass || courseClass.isActive === false) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Verify membership: session.id must be in studentIds
    const studentIds = Array.isArray(courseClass.studentIds)
      ? courseClass.studentIds.map((s: unknown) => String(s))
      : [];

    if (!studentIds.includes(session.id)) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda belum terdaftar di kelas ini" },
        { status: 403 }
      );
    }

    // Upcoming assignments in this class
    const assignments = await Assignment.find({
      courseClassId: id,
      isArchived: { $ne: true },
      isPublished: true,
    })
      .select("_id title type dueDate maxScore quizId createdAt")
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    // Map student's submission status for each assignment
    const assignmentIds = assignments.map((a: any) => a._id);
    const submissions = await Submission.find({
      assignmentId: { $in: assignmentIds },
      studentId: session.id,
    })
      .select("assignmentId status score submittedAt")
      .lean();

    const subMap = new Map(
      submissions.map((s: any) => [String(s.assignmentId), s])
    );

    const enrichedAssignments = assignments.map((a: any) => {
      const sub = subMap.get(String(a._id));
      const isLate = !sub && a.dueDate && new Date(a.dueDate).getTime() < Date.now();
      return {
        ...a,
        submissionStatus: sub ? sub.status : isLate ? "late" : "assigned",
        score: sub ? sub.score : null,
        submittedAt: sub ? sub.submittedAt : null,
      };
    });

    // Activity stream / Class Posts
    const posts = await ClassPost.find({ courseClassId: id })
      .populate("teacherId", "name degree")
      .sort({ createdAt: -1 })
      .lean();

    // Published Materials
    const materials = await Material.find({
      courseClassId: id,
      isPublished: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Shared Files
    const sharedFiles = courseClass.sharedFiles || [];

    return NextResponse.json({
      success: true,
      data: {
        _id: courseClass._id,
        name: courseClass.name,
        code: courseClass.code,
        bannerColor: courseClass.bannerColor || "blue",
        academicYear: courseClass.academicYear,
        teacher: courseClass.teacherId,
        subject: courseClass.subjectId,
        rombel: courseClass.classRombelId,
        studentCount: studentIds.length,
        assignments: enrichedAssignments,
        posts,
        materials,
        sharedFiles,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat detail kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
