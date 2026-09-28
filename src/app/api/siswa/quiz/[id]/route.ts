import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Quiz, Assignment, CourseClass, Submission } from "@/models";
import mongoose from "mongoose";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["siswa"]);
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

    // 1. Resolve Quiz & Associated Assignment
    let quiz: any = await Quiz.findById(id).lean();
    let assignment: any = null;

    if (quiz) {
      assignment = await Assignment.findOne({ quizId: quiz._id, isArchived: { $ne: true } }).lean();
    } else {
      // Maybe id is the Assignment ID
      assignment = await Assignment.findById(id).lean();
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

    // 2. Security Check: Enforce class membership
    const courseClass: any = await CourseClass.findById(quiz.courseClassId).lean();
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

    // 3. Check student's submission / attempt
    const queryCond: any[] = [{ quizId: quiz._id, studentId: session.id }];
    if (assignment) {
      queryCond.push({ assignmentId: assignment._id, studentId: session.id });
    }

    const studentSubmission: any = await Submission.findOne({
      $or: queryCond,
    }).lean();

    const isCompleted = Boolean(
      studentSubmission && ["graded", "turned_in", "late"].includes(studentSubmission.status)
    );

    // If completed, return result summary
    if (isCompleted) {
      const correctCount = (studentSubmission.quizAnswers || []).filter((a: any) => a.isCorrect).length;
      const totalQuestions = quiz.questions.length;
      const incorrectCount = totalQuestions - correctCount;

      return NextResponse.json({
        success: true,
        data: {
          _id: quiz._id.toString(),
          assignmentId: assignment?._id?.toString() || null,
          title: quiz.title,
          durationSeconds: quiz.durationSeconds || 60,
          totalPoints: quiz.totalPoints || 100,
          totalQuestions,
          courseClass: {
            _id: courseClass._id,
            name: courseClass.name,
            bannerColor: courseClass.bannerColor || "blue",
          },
          isCompleted: true,
          result: {
            score: studentSubmission.score ?? 0,
            maxScore: quiz.totalPoints || 100,
            correctCount,
            incorrectCount,
            totalQuestions,
            submittedAt: studentSubmission.submittedAt,
          },
        },
      });
    }

    // 4. CRITICAL SECURITY: Sanitize questions - DO NOT SEND correctAnswer or isCorrect
    const sanitizedQuestions = (quiz.questions || []).map((q: any) => ({
      id: q.id,
      type: q.type || "pilihan_ganda",
      question: q.question,
      imageUrl: q.imageUrl || undefined,
      options: q.options || [],
      points: q.points || 10,
    }));

    // Calculate remaining seconds if attempt is active
    let remainingSeconds = quiz.durationSeconds || 60;
    let isStarted = false;

    if (studentSubmission && studentSubmission.startedAt) {
      isStarted = true;
      const elapsed = Math.floor(
        (Date.now() - new Date(studentSubmission.startedAt).getTime()) / 1000
      );
      remainingSeconds = Math.max(0, (quiz.durationSeconds || 60) - elapsed);
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: quiz._id.toString(),
        assignmentId: assignment?._id?.toString() || null,
        title: quiz.title,
        description: assignment?.instructions || assignment?.description || "Kerjakan kuis dengan teliti.",
        durationSeconds: quiz.durationSeconds || 60,
        totalPoints: quiz.totalPoints || 100,
        totalQuestions: sanitizedQuestions.length,
        courseClass: {
          _id: courseClass._id,
          name: courseClass.name,
          bannerColor: courseClass.bannerColor || "blue",
        },
        isStarted,
        startedAt: studentSubmission?.startedAt || null,
        remainingSeconds,
        isCompleted: false,
        questions: sanitizedQuestions,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat kuis";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
