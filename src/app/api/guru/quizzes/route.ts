import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Quiz, CourseClass, ClassPost } from "@/models";
import { calculateQuizMaxRawScore } from "@/lib/quiz-scoring";

export async function GET(req: Request) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const courseClassId = searchParams.get("classId") || searchParams.get("courseClassId");

    const query: Record<string, unknown> = {
      teacherId: session.id,
    };
    if (courseClassId) {
      query.courseClassId = courseClassId;
    }

    const quizzes = await Quiz.find(query)
      .populate("courseClassId", "name code")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: quizzes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat kuis";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const body = await req.json();

    const {
      title,
      courseClassId,
      durationSeconds,
      questions,
      totalPoints,
      dueDate,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "Judul kuis wajib diisi" },
        { status: 400 }
      );
    }

    if (!courseClassId) {
      return NextResponse.json(
        { success: false, message: "Pilih kelas untuk kuis ini" },
        { status: 400 }
      );
    }

    const courseClass = await CourseClass.findById(courseClassId);
    if (!courseClass) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    if (session.role !== "guru") {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Hanya guru yang dapat membuat kuis" },
        { status: 403 }
      );
    }

    const sanitizedQuestions = (Array.isArray(questions) ? questions : []).map((q: Record<string, unknown>, idx: number) => {
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

    if (sanitizedQuestions.length === 0) {
      return NextResponse.json(
        { success: false, message: "Kuis wajib memiliki minimal 1 pertanyaan" },
        { status: 400 }
      );
    }

    const maxScoreSummary = calculateQuizMaxRawScore(sanitizedQuestions);
    const computedMaxRawPoints = maxScoreSummary.maxRawScore;
    const rawTotalPoints =
      computedMaxRawPoints > 0
        ? computedMaxRawPoints
        : Number.isFinite(Number(totalPoints))
          ? Number(totalPoints)
          : 0;

    const quiz = await Quiz.create({
      title: title.trim(),
      description: body.description ? String(body.description).trim() : undefined,
      teacherId: session.id,
      courseClassId,
      durationSeconds: Number(durationSeconds) || 60,
      questions: sanitizedQuestions,
      totalPoints: rawTotalPoints,
      maxRawPoints: computedMaxRawPoints,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      isPublished: true,
    });

    // Post to class stream directly referencing the Quiz
    await ClassPost.create({
      courseClassId,
      teacherId: session.id,
      type: "quiz",
      title: `Ulangan Harian: ${title.trim()}`,
      content: `${sanitizedQuestions.length} Soal • Poin Mentah Maksimal: ${rawTotalPoints} (Skala Nilai Akhir: 100)`,
      refId: quiz._id,
      comments: [],
    });

    return NextResponse.json({ success: true, data: quiz }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat kuis";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
