import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Submission, User } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();
    const body = await req.json();

    const {
      score,
      draftScore,
      feedback,
      privateComment,
      assignmentId,
      studentId,
      status,
    } = body;

    let sub;
    if (id !== "new") {
      sub = await Submission.findById(id);
    } else if (assignmentId && studentId) {
      sub = await Submission.findOne({ assignmentId, studentId });
      if (!sub) {
        sub = new Submission({
          assignmentId,
          studentId,
          status: "assigned",
        });
      }
    }

    if (!sub) {
      return NextResponse.json(
        { success: false, message: "Submisi tidak ditemukan" },
        { status: 404 }
      );
    }

    if (score !== undefined) {
      sub.score = Number(score);
      sub.status = "graded";
      sub.gradedAt = new Date();
    }
    if (draftScore !== undefined) {
      sub.draftScore = Number(draftScore);
    }
    if (feedback !== undefined) {
      sub.feedback = feedback.trim();
    }
    if (status) {
      sub.status = status;
    }

    if (privateComment && privateComment.trim()) {
      sub.privateComments.push({
        senderId: session.id,
        senderName: session.name,
        senderRole: "guru",
        message: privateComment.trim(),
        createdAt: new Date(),
      });
    }

    await sub.save();

    return NextResponse.json({
      success: true,
      message: "Nilai berhasil disimpan",
      data: sub,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan nilai";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
