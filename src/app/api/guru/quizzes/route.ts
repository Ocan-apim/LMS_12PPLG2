import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Quiz, Assignment, CourseClass, ClassPost } from "@/models";

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
      publishAsAssignment,
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

    const quiz = await Quiz.create({
      title: title.trim(),
      teacherId: session.id,
      courseClassId,
      durationSeconds: Number(durationSeconds) || 60,
      questions: Array.isArray(questions) ? questions : [],
      totalPoints: Number(totalPoints) || 100,
      isPublished: true,
    });

    // Optionally publish as assignment in this class
    if (publishAsAssignment !== false) {
      const newAssignment = await Assignment.create({
        title: `Kuis: ${title.trim()}`,
        instructions: `Kerjakan kuis dengan cermat. Durasi: ${durationSeconds || 60} detik per soal.`,
        type: "kuis",
        courseClassId,
        teacherId: session.id,
        quizId: quiz._id,
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 3600 * 1000),
        maxScore: Number(totalPoints) || 100,
        isPublished: true,
      });

      // Post in class stream
      await ClassPost.create({
        courseClassId,
        teacherId: session.id,
        type: "quiz",
        title: `Anda memulai Quiz: ${title.trim()}!`,
        content: `${questions?.length || 0} Soal • Poin Total: ${totalPoints || 100}`,
        refId: newAssignment._id,
        comments: [],
      });
    }

    return NextResponse.json({ success: true, data: quiz }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat kuis";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
