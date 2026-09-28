import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Submission, Assignment } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin", "siswa"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const submission = await Submission.findById(id)
      .populate("studentId", "name nisn email gender")
      .populate({
        path: "assignmentId",
        populate: [
          { path: "courseClassId", select: "name code bannerColor" },
          { path: "quizId" },
        ],
      })
      .populate("quizId");

    if (!submission) {
      return NextResponse.json(
        { success: false, message: "Pengumpulan tugas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Role check: if siswa, only allow access to their own submission
    if (session.role === "siswa" && submission.studentId._id.toString() !== session.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda hanya dapat melihat tugas Anda sendiri" },
        { status: 403 }
      );
    }

    // Role check: if guru, ensure guru owns the assignment
    if (session.role === "guru") {
      const assignment = submission.assignmentId as any;
      if (assignment && assignment.teacherId?.toString() !== session.id) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda bukan pengampu tugas ini" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ success: true, data: submission });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat pengumpulan tugas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
