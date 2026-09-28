import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Quiz, Assignment, CourseClass, Submission } from "@/models";
import mongoose from "mongoose";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, context: RouteContext) {
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
    let quiz: any = await Quiz.findById(id);
    let assignment: any = null;

    if (quiz) {
      assignment = await Assignment.findOne({ quizId: quiz._id, isArchived: { $ne: true } });
    } else {
      assignment = await Assignment.findById(id);
      if (assignment && assignment.quizId) {
        quiz = await Quiz.findById(assignment.quizId);
      }
    }

    if (!quiz || quiz.isPublished === false) {
      return NextResponse.json(
        { success: false, message: "Kuis tidak ditemukan atau belum diterbitkan" },
        { status: 404 }
      );
    }

    // 2. Security Check: Enforce class membership
    const courseClass = await CourseClass.findById(quiz.courseClassId);
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

    // 3. Check for existing completed submission (cegah duplicate attempt)
    const queryCond: any[] = [{ quizId: quiz._id, studentId: session.id }];
    if (assignment) {
      queryCond.push({ assignmentId: assignment._id, studentId: session.id });
    }

    let submission = await Submission.findOne({ $or: queryCond });

    if (submission && ["graded", "turned_in"].includes(submission.status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Kuis sudah pernah dikumpulkan dan tidak dapat dikerjakan ulang.",
        },
        { status: 400 }
      );
    }

    // 4. Parse request body & strip any client-tampered grading fields
    const body = await req.json();
    const rawAnswers = Array.isArray(body.answers) ? body.answers : [];

    // Map student answers by questionId
    const studentAnswerMap = new Map<string, any>();
    for (const item of rawAnswers) {
      if (item && item.questionId != null) {
        studentAnswerMap.set(String(item.questionId), item.answer);
      }
    }

    // 5. SERVER-SIDE AUTHORITATIVE GRADING
    let totalEarnedPoints = 0;
    let totalPossibleQuestionPoints = 0;
    let correctCount = 0;
    let incorrectCount = 0;

    const enrichedAnswers = (quiz.questions || []).map((q: any) => {
      const qPoints = Number(q.points) || 10;
      totalPossibleQuestionPoints += qPoints;

      const studentAns = studentAnswerMap.get(String(q.id));
      let isCorrect = false;

      if (studentAns !== undefined && studentAns !== null) {
        if (typeof q.correctAnswer === "number") {
          isCorrect = Number(studentAns) === Number(q.correctAnswer);
        } else {
          isCorrect =
            String(studentAns).trim().toLowerCase() ===
            String(q.correctAnswer).trim().toLowerCase();
        }
      }

      if (isCorrect) {
        totalEarnedPoints += qPoints;
        correctCount++;
      } else {
        incorrectCount++;
      }

      return {
        questionId: String(q.id),
        answer: studentAns !== undefined ? studentAns : null,
        isCorrect,
        scoreAwarded: isCorrect ? qPoints : 0,
      };
    });

    // Scale final score to quiz.totalPoints (default 100)
    const targetMaxPoints = Number(quiz.totalPoints) || 100;
    let finalScore = 0;
    if (totalPossibleQuestionPoints > 0) {
      finalScore = Math.round((totalEarnedPoints / totalPossibleQuestionPoints) * targetMaxPoints);
    } else {
      finalScore = totalEarnedPoints;
    }

    // Cap between 0 and targetMaxPoints
    finalScore = Math.max(0, Math.min(targetMaxPoints, finalScore));

    const now = new Date();

    // 6. Save or Update Submission
    if (submission) {
      submission.quizAnswers = enrichedAnswers;
      submission.score = finalScore;
      submission.status = "graded";
      submission.submittedAt = now;
      submission.gradedAt = now;
      await submission.save();
    } else {
      const targetAssignmentId = assignment?._id || new mongoose.Types.ObjectId();
      submission = await Submission.create({
        assignmentId: targetAssignmentId,
        quizId: quiz._id,
        studentId: session.id,
        courseClassId: quiz.courseClassId,
        quizAnswers: enrichedAnswers,
        score: finalScore,
        status: "graded",
        submittedAt: now,
        gradedAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Kuis berhasil diselesaikan",
      data: {
        quizId: quiz._id.toString(),
        score: finalScore,
        maxScore: targetMaxPoints,
        correctCount,
        incorrectCount,
        totalQuestions: quiz.questions.length,
        submittedAt: now,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengumpulkan kuis";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
