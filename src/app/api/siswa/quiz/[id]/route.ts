import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Quiz, Assignment, CourseClass, Submission, User } from "@/models";
import mongoose from "mongoose";
import {
  calculateQuizMaxRawScore,
  getQuestionPointsTrue,
  getQuestionPointsFalse,
  resolveSubmissionScoring,
} from "@/lib/quiz-scoring";

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

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole([
    "siswa",
    "guru",
    "admin",
    "kurikulum",
    "kepsek",
  ]);
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
    if (!quiz) {
      assignment = await Assignment.findById(id).lean();
      if (assignment && assignment.quizId) {
        quiz = await Quiz.findById(assignment.quizId).lean();
      }
    } else {
      assignment = await Assignment.findOne({
        quizId: quiz._id,
        isArchived: { $ne: true },
      }).lean();
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
    }

    // 3. Check student's submission
    let studentSubmission: any = null;
    if (isStudent) {
      const orConds: Record<string, unknown>[] = [
        { quizId: quiz._id, studentId: session.id },
      ];
      if (assignment?._id) {
        orConds.push({ assignmentId: assignment._id, studentId: session.id });
      }
      studentSubmission = await Submission.findOne({ $or: orConds })
        .sort({ submittedAt: -1 })
        .lean();
    }

    const isCompleted = Boolean(
      studentSubmission &&
        ["graded", "turned_in", "late"].includes(studentSubmission.status)
    );

    const maxScoreSummary = calculateQuizMaxRawScore(quiz.questions || []);

    // Sanitized questions (do not expose correctAnswer to students)
    const sanitizedQuestions = (quiz.questions || []).map((q: any) => ({
      id: q.id,
      type: q.type || "pilihan_ganda",
      question: q.question,
      imageUrl: q.imageUrl || undefined,
      options: q.options || [],
      points: getQuestionPointsTrue(q),
      pointsFalse: getQuestionPointsFalse(q),
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
      const resolved = resolveSubmissionScoring(studentSubmission, quiz, assignment);
      const qAnswers = Array.isArray(studentSubmission.quizAnswers)
        ? studentSubmission.quizAnswers
        : [];
      const correctCount = qAnswers.filter((a: any) => a.isCorrect).length;
      const pendingEssayCount = qAnswers.filter(
        (a: any) =>
          a.questionType === "essay" &&
          (a.scoreAwarded === null || a.scoreAwarded === undefined || a.isGraded === false)
      ).length;
      const totalQuestions = sanitizedQuestions.length;
      const incorrectCount = Math.max(
        0,
        totalQuestions - correctCount - pendingEssayCount
      );

      result = {
        rawScore: resolved.rawScore ?? 0,
        maxRawScore: resolved.maxRawScore,
        normalizedScore: resolved.normalizedScore,
        provisionalScore: resolved.provisionalScore,
        objectiveRawScore: resolved.objectiveRawScore,
        essayRawScore: resolved.essayRawScore,
        gradingStatus: resolved.gradingStatus,
        isPendingManual: resolved.isPendingManual,
        score: resolved.isPendingManual
          ? null
          : (resolved.normalizedScore ?? studentSubmission.score ?? 0),
        maxScore: 100,
        correctCount,
        incorrectCount,
        pendingEssayCount,
        totalQuestions,
        submittedAt: studentSubmission.submittedAt,
        gradedAt: studentSubmission.gradedAt || null,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: quiz._id.toString(),
        assignmentId: assignment?._id ? String(assignment._id) : null,
        title: quiz.title,
        description:
          quiz.description ||
          "Kerjakan kuis dengan cermat dan teliti sebelum waktu berakhir.",
        durationSeconds: quiz.durationSeconds || 60,
        totalPoints: maxScoreSummary.maxRawScore || quiz.totalPoints || 100,
        maxRawScore: maxScoreSummary.maxRawScore,
        objectiveMaxRawScore: maxScoreSummary.objectiveMaxRawScore,
        essayMaxRawScore: maxScoreSummary.essayMaxRawScore,
        hasEssayQuestions: maxScoreSummary.hasEssayQuestions,
        normalizedMaxScore: 100,
        totalQuestions: sanitizedQuestions.length,
        courseClass: {
          _id: courseClass?._id?.toString() || quiz.courseClassId.toString(),
          name: courseClass?.name || "Mata Pelajaran",
          bannerColor: courseClass?.bannerColor || "blue",
        },
        isStaffView: isStaff,
        currentUserRole: session.role,
        currentUserId: session.id,
        comments: quiz.comments || [],
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
