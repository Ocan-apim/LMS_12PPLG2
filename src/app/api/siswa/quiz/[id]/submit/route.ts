import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Quiz, Assignment, CourseClass, Submission, User } from "@/models";
import { validateContent } from "@/lib/profanity-filter";
import { evaluateQuizSubmission } from "@/lib/quiz-scoring";
import mongoose from "mongoose";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function verifyStudentQuizClassMembership(
  studentId: string,
  courseClass: Record<string, any> | null
): Promise<boolean> {
  if (!courseClass) return false;
  const studentIds = Array.isArray(courseClass.studentIds)
    ? courseClass.studentIds.map((sid: unknown) => String(sid))
    : [];
  if (studentIds.includes(studentId)) return true;

  const studentUser = (await User.findById(studentId)
    .select("classId")
    .lean()) as { classId?: unknown } | null;
  const studentRombelId = studentUser?.classId ? String(studentUser.classId) : null;
  if (!studentRombelId) return false;

  const classRombelStr = courseClass.classRombelId
    ? String(courseClass.classRombelId)
    : null;
  const assignedRombelStrs = Array.isArray(courseClass.assignedRombelIds)
    ? courseClass.assignedRombelIds.map((r: unknown) => String(r))
    : [];

  if (
    studentRombelId === classRombelStr ||
    assignedRombelStrs.includes(studentRombelId)
  ) {
    await CourseClass.findByIdAndUpdate(courseClass._id, {
      $addToSet: { studentIds: studentId },
    });
    return true;
  }

  return false;
}

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
      assignment = await Assignment.findOne({
        quizId: quiz._id,
        isArchived: { $ne: true },
      });
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
    const courseClass: any = await CourseClass.findById(quiz.courseClassId).lean();
    const enrolled = await verifyStudentQuizClassMembership(session.id, courseClass);
    if (!enrolled) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda tidak terdaftar di kelas kuis ini",
        },
        { status: 403 }
      );
    }

    // 3. Check for existing submission by quizId or assignmentId
    const orConds: Record<string, unknown>[] = [
      { quizId: quiz._id, studentId: session.id },
    ];
    if (assignment?._id) {
      orConds.push({ assignmentId: assignment._id, studentId: session.id });
    }

    let submission = await Submission.findOne({ $or: orConds });

    if (submission && ["graded", "turned_in", "late"].includes(submission.status)) {
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

    for (const item of rawAnswers) {
      if (item && typeof item.answer === "string" && item.answer.trim()) {
        const ansValidation = validateContent(item.answer);
        if (!ansValidation.isValid) {
          return NextResponse.json(
            { success: false, message: ansValidation.message },
            { status: 400 }
          );
        }
      }
    }

    // 5. SERVER-SIDE AUTHORITATIVE GRADING & NORMALIZATION (0-100 SCALE)
    const evalResult = evaluateQuizSubmission(quiz.questions || [], rawAnswers, {
      isTeacherGrading: false,
    });

    const now = new Date();

    // 6. Save or Update Submission
    // Notice: When manual essay grading is pending (gradingStatus === "pending_manual"),
    // status is "turned_in" and score/normalizedScore are null so provisional scores
    // are never falsely treated as final grades in reports.
    const finalStatus = evalResult.submissionStatus;
    const finalScore =
      evalResult.gradingStatus === "completed" ? evalResult.normalizedScore : null;

    if (submission) {
      if (!submission.assignmentId) {
        submission.assignmentId = assignment?._id || quiz._id;
      }
      submission.quizId = quiz._id;
      submission.courseClassId = quiz.courseClassId;
      submission.quizAnswers = evalResult.quizAnswers;
      submission.rawScore = evalResult.rawScore;
      submission.maxRawScore = evalResult.maxRawScore;
      submission.objectiveRawScore = evalResult.objectiveRawScore;
      submission.essayRawScore = evalResult.essayRawScore;
      submission.normalizedScore = evalResult.normalizedScore;
      submission.provisionalScore = evalResult.provisionalScore;
      submission.gradingStatus = evalResult.gradingStatus;
      submission.score = finalScore;
      submission.draftScore = evalResult.isPendingManual
        ? evalResult.provisionalScore
        : null;
      submission.status = finalStatus;
      submission.submittedAt = now;
      submission.gradedAt = finalStatus === "graded" ? now : undefined;
      await submission.save();
    } else {
      submission = await Submission.create({
        assignmentId: assignment?._id || quiz._id,
        quizId: quiz._id,
        studentId: session.id,
        courseClassId: quiz.courseClassId,
        quizAnswers: evalResult.quizAnswers,
        rawScore: evalResult.rawScore,
        maxRawScore: evalResult.maxRawScore,
        objectiveRawScore: evalResult.objectiveRawScore,
        essayRawScore: evalResult.essayRawScore,
        normalizedScore: evalResult.normalizedScore,
        provisionalScore: evalResult.provisionalScore,
        gradingStatus: evalResult.gradingStatus,
        score: finalScore,
        draftScore: evalResult.isPendingManual
          ? evalResult.provisionalScore
          : undefined,
        status: finalStatus,
        submittedAt: now,
        gradedAt: finalStatus === "graded" ? now : undefined,
      });
    }

    return NextResponse.json({
      success: true,
      message: evalResult.isPendingManual
        ? "Kuis berhasil dikumpulkan. Menunggu penilaian manual guru untuk soal essay."
        : "Kuis berhasil diselesaikan",
      data: {
        submissionId: submission._id.toString(),
        quizId: quiz._id.toString(),
        assignmentId: assignment?._id ? String(assignment._id) : null,
        rawScore: evalResult.rawScore,
        maxRawScore: evalResult.maxRawScore,
        objectiveRawScore: evalResult.objectiveRawScore,
        essayRawScore: evalResult.essayRawScore,
        objectiveMaxRawScore: evalResult.objectiveMaxRawScore,
        essayMaxRawScore: evalResult.essayMaxRawScore,
        normalizedScore: evalResult.normalizedScore,
        provisionalScore: evalResult.provisionalScore,
        gradingStatus: evalResult.gradingStatus,
        isPendingManual: evalResult.isPendingManual,
        score: finalScore,
        maxScore: 100,
        correctCount: evalResult.correctCount,
        incorrectCount: evalResult.incorrectCount,
        unansweredCount: evalResult.unansweredCount,
        pendingEssayCount: evalResult.pendingEssayCount,
        totalQuestions: evalResult.totalQuestions,
        submittedAt: now,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal mengumpulkan kuis";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
