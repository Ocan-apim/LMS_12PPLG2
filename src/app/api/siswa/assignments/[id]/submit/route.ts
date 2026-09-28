import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Assignment, CourseClass, Submission } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    // 1. Validate Assignment Existence
    const assignment = await Assignment.findById(id);
    if (!assignment || assignment.isArchived) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan atau telah diarsipkan" },
        { status: 404 }
      );
    }

    // 2. Validate Membership in the Class
    if (!assignment.courseClassId) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak terkait dengan kelas manapun" },
        { status: 400 }
      );
    }

    const courseClass = await CourseClass.findById(assignment.courseClassId);
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

    // 3. Parse and Validate Request Body
    const body = await req.json();
    const { attachments, content, fileUrl } = body;

    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    const hasContent = typeof content === "string" && content.trim().length > 0;
    const hasFileUrl = typeof fileUrl === "string" && fileUrl.trim().length > 0;

    if (!hasAttachments && !hasContent && !hasFileUrl) {
      return NextResponse.json(
        { success: false, message: "Harap lampirkan file atau isi catatan tugas sebelum mengumpulkan" },
        { status: 400 }
      );
    }

    // Sanitize attachments format
    const sanitizedAttachments = Array.isArray(attachments)
      ? attachments.map((att: any) => ({
          name: String(att.name || "Attachment").trim(),
          url: String(att.url || "").trim(),
          type: String(att.type || "document").trim(),
          size: String(att.size || "1.0 MB").trim(),
          uploadedAt: att.uploadedAt ? new Date(att.uploadedAt) : new Date(),
        }))
      : [];

    // 4. Calculate Submission Status based on Deadline
    const now = new Date();
    const isLate = assignment.dueDate ? now > new Date(assignment.dueDate) : false;
    const submissionStatus = isLate ? "late" : "turned_in";

    // 5. Look for existing submission by this student (Strict session.id isolation)
    let submission = await Submission.findOne({
      assignmentId: id,
      studentId: session.id,
    });

    if (submission) {
      // Update existing submission
      submission.attachments = sanitizedAttachments;
      if (typeof content === "string") submission.content = content.trim();
      if (typeof fileUrl === "string") submission.fileUrl = fileUrl.trim();
      submission.submittedAt = now;
      
      // If the submission was not already graded, update the status
      if (submission.status !== "graded") {
        submission.status = submissionStatus;
      }
      
      // Explicitly protect teacher fields: DO NOT touch submission.score, feedback, gradedAt
      await submission.save();
    } else {
      // Create new submission
      submission = await Submission.create({
        assignmentId: id,
        studentId: session.id,
        courseClassId: assignment.courseClassId,
        attachments: sanitizedAttachments,
        content: typeof content === "string" ? content.trim() : undefined,
        fileUrl: typeof fileUrl === "string" ? fileUrl.trim() : undefined,
        status: submissionStatus,
        submittedAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      message: isLate ? "Tugas berhasil dikumpulkan (Terlambat)" : "Tugas berhasil dikumpulkan tepat waktu",
      data: {
        _id: submission._id.toString(),
        status: submission.status,
        score: submission.score ?? null,
        feedback: submission.feedback || null,
        attachments: submission.attachments,
        content: submission.content,
        fileUrl: submission.fileUrl,
        submittedAt: submission.submittedAt,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengumpulkan tugas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
