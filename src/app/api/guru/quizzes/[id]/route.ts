import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Quiz, CourseClass } from "@/models";
import { calculateQuizMaxRawScore } from "@/lib/quiz-scoring";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin", "siswa"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    await connectDB();

    const quiz = await Quiz.findById(id).populate("courseClassId", "name code teacherId studentIds");
    if (!quiz) {
      return NextResponse.json(
        { success: false, message: "Kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    if (session.role === "guru") {
      const quizTeacherId = String(quiz.teacherId || "");
      const classTeacherId =
        quiz.courseClassId && typeof quiz.courseClassId === "object"
          ? String((quiz.courseClassId as any).teacherId || "")
          : "";
      if (quizTeacherId !== session.id && classTeacherId !== session.id) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda bukan pemilik kuis ini" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ success: true, data: quiz });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    await connectDB();
    const existingQuiz = await Quiz.findById(id);
    if (!existingQuiz) {
      return NextResponse.json(
        { success: false, message: "Kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    if (session.role === "guru" && String(existingQuiz.teacherId) !== session.id) {
      const courseClass = existingQuiz.courseClassId
        ? await CourseClass.findById(existingQuiz.courseClassId).select("teacherId").lean()
        : null;
      if (!courseClass || String((courseClass as any).teacherId) !== session.id) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda bukan pemilik kuis ini" },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { title, description, durationSeconds, questions, totalPoints, dueDate, isPublished } = body;

    if (title !== undefined && !String(title).trim()) {
      return NextResponse.json(
        { success: false, message: "Judul kuis tidak boleh kosong" },
        { status: 400 }
      );
    }

    let sanitizedQuestions = undefined;
    let computedMaxRawPoints = undefined;
    if (Array.isArray(questions)) {
      sanitizedQuestions = questions.map((q: Record<string, unknown>, idx: number) => {
        const qText = String(q?.question || q?.prompt || `Pertanyaan ${idx + 1}`).trim();
        const rawPts = q?.points !== undefined && q?.points !== null ? Number(q.points) : 10;
        const rawPtsFalse =
          q?.pointsFalse !== undefined && q?.pointsFalse !== null ? Number(q.pointsFalse) : 0;

        return {
          id: String(q?.id || `q-${idx + 1}-${Date.now()}`),
          question: qText || `Pertanyaan ${idx + 1}`,
          type: q?.type === "essay" ? ("essay" as const) : ("pilihan_ganda" as const),
          imageUrl: q?.imageUrl ? String(q.imageUrl) : undefined,
          options: Array.isArray(q?.options) ? q.options.map((o: unknown) => String(o || "").trim()) : [],
          correctAnswer: q?.correctAnswer !== undefined && q?.correctAnswer !== "" ? q.correctAnswer : 0,
          points: Number.isFinite(rawPts) ? rawPts : 10,
          pointsFalse: Number.isFinite(rawPtsFalse) ? rawPtsFalse : 0,
        };
      });
      computedMaxRawPoints = calculateQuizMaxRawScore(sanitizedQuestions).maxRawScore;
    }

    const updateFields: Record<string, unknown> = {};
    if (title !== undefined) updateFields.title = String(title).trim();
    if (description !== undefined) updateFields.description = String(description).trim();
    if (durationSeconds !== undefined) updateFields.durationSeconds = Number(durationSeconds) || 60;
    if (sanitizedQuestions !== undefined) updateFields.questions = sanitizedQuestions;
    if (computedMaxRawPoints !== undefined) {
      updateFields.totalPoints = computedMaxRawPoints;
      updateFields.maxRawPoints = computedMaxRawPoints;
    } else if (totalPoints !== undefined) {
      updateFields.totalPoints = Number(totalPoints);
    }
    if (dueDate !== undefined) updateFields.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (isPublished !== undefined) updateFields.isPublished = Boolean(isPublished);

    const updated = await Quiz.findByIdAndUpdate(id, updateFields, { new: true }).populate(
      "courseClassId",
      "name code"
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui kuis";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
