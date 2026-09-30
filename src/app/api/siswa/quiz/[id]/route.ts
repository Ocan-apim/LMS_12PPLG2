import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Quiz, Assignment, CourseClass, Submission } from "@/models";
import mongoose from "mongoose";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["siswa", "guru", "admin", "kurikulum", "kepsek"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "ID Kuis tidak valid" },
        { status: 404 }
      );
    }

    // 1. Resolve Quiz
    let quiz: any = await Quiz.findById(id).lean();
    if (!quiz) {
      // Check if id is an Assignment that has quizId
      const assignment: any = await Assignment.findById(id).lean();
      if (assignment && assignment.quizId) {
        quiz = await Quiz.findById(assignment.quizId).lean();
      }
    }

    if (!quiz || quiz.isPublished === false) {
      return NextResponse.json(
        { success: false, message: "Kuis tidak ditemukan atau belum diterbitkan" },
        { status: 404 }
      );
    }

    // 2. Class Membership Check
    const courseClass: any = await CourseClass.findById(quiz.courseClassId).lean();
    const isStudent = session.role === "siswa";
    const isStaff = ["guru", "admin", "kurikulum", "kepsek"].includes(session.role);

    if (isStudent) {
      if (
        !courseClass ||
        !Array.isArray(courseClass.studentIds) ||
        !courseClass.studentIds.map((sid: any) => sid.toString()).includes(session.id)
      ) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda tidak terdaftar di kelas kuis ini" },
          { status: 403 }
        );
      }
    }

    // 3. Check student's submission (STRICTLY for this quizId)
    let studentSubmission: any = null;
    if (isStudent) {
      studentSubmission = await Submission.findOne({
        quizId: quiz._id,
        studentId: session.id,
      })
        .sort({ submittedAt: -1 })
        .lean();
    }

    const isCompleted = Boolean(
      studentSubmission && ["graded", "turned_in"].includes(studentSubmission.status)
    );

    // Calculate sanitized questions
    const sanitizedQuestions = (quiz.questions || []).map((q: any) => ({
      id: q.id,
      type: q.type || "pilihan_ganda",
      question: q.question,
      imageUrl: q.imageUrl || undefined,
      options: q.options || [],
      points: q.points || 10,
    }));

    // If student has an active taking session
    let remainingSeconds = quiz.durationSeconds || 60;
    let isStarted = false;

    if (studentSubmission && studentSubmission.startedAt && !isCompleted) {
      isStarted = true;
      const elapsed = Math.floor(
        (Date.now() - new Date(studentSubmission.startedAt).getTime()) / 1000
      );
      remainingSeconds = Math.max(0, (quiz.durationSeconds || 60) - elapsed);
    }

    // Calculate real result if completed
    let result = null;
    if (isCompleted && studentSubmission) {
      const correctCount = (studentSubmission.quizAnswers || []).filter((a: any) => a.isCorrect).length;
      const totalQuestions = sanitizedQuestions.length;
      const incorrectCount = Math.max(0, totalQuestions - correctCount);

      result = {
        score: studentSubmission.score ?? 0,
        maxScore: quiz.totalPoints || 100,
        correctCount,
        incorrectCount,
        totalQuestions,
        submittedAt: studentSubmission.submittedAt,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: quiz._id.toString(),
        title: quiz.title,
        description: quiz.description || "Kerjakan kuis dengan cermat dan teliti sebelum waktu berakhir.",
        durationSeconds: quiz.durationSeconds || 60,
        totalPoints: quiz.totalPoints || 100,
        totalQuestions: sanitizedQuestions.length,
        courseClass: {
          _id: courseClass?._id?.toString() || quiz.courseClassId.toString(),
          name: courseClass?.name || "Mata Pelajaran",
          bannerColor: courseClass?.bannerColor || "blue",
        },
        isStaffView: isStaff,
        currentUserRole: session.role,
        isStarted,
        startedAt: studentSubmission?.startedAt || null,
        remainingSeconds,
        isCompleted,
        result,
        questions: sanitizedQuestions,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat kuis";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
