/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Submission, Assignment, Quiz } from "@/models";
import { validateComment, validateContent } from "@/lib/profanity-filter";
import {
  evaluateQuizSubmission,
  normalizeRawScore,
  roundScore,
} from "@/lib/quiz-scoring";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru"]);
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
      quizId,
      studentId,
      status,
      quizAnswers,
      essayScores,
      asDraft,
    } = body;

    let sub: any = null;
    if (id !== "new") {
      sub = await Submission.findById(id);
    } else if ((assignmentId || quizId) && studentId) {
      const orConds: Record<string, unknown>[] = [];
      if (assignmentId) orConds.push({ assignmentId, studentId });
      if (quizId) orConds.push({ quizId, studentId });
      sub = await Submission.findOne({ $or: orConds });
      if (!sub) {
        sub = new Submission({
          assignmentId: assignmentId || undefined,
          quizId: quizId || undefined,
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

    // Resolve associated Assignment and/or Quiz
    let assignment: any = sub.assignmentId
      ? await Assignment.findById(sub.assignmentId)
      : assignmentId
        ? await Assignment.findById(assignmentId)
        : null;

    let quiz: any = sub.quizId
      ? await Quiz.findById(sub.quizId)
      : quizId
        ? await Quiz.findById(quizId)
        : null;

    if (!assignment && !quiz && sub.assignmentId) {
      // Check if sub.assignmentId was actually a Quiz ID
      quiz = await Quiz.findById(sub.assignmentId);
    }

    if (assignment && assignment.quizId && !quiz) {
      quiz = await Quiz.findById(assignment.quizId);
    }
    if (quiz && !assignment) {
      assignment = await Assignment.findOne({
        quizId: quiz._id,
        isArchived: { $ne: true },
      });
    }

    if (!assignment && !quiz) {
      return NextResponse.json(
        { success: false, message: "Tugas atau kuis terkait tidak ditemukan" },
        { status: 404 }
      );
    }

    const ownerTeacherId =
      assignment?.teacherId?.toString() || quiz?.teacherId?.toString();

    if (session.role === "guru" && ownerTeacherId !== session.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda bukan pemilik penugasan ini",
        },
        { status: 403 }
      );
    }

    // Validate feedback if present
    if (feedback !== undefined) {
      if (feedback.trim()) {
        const feedbackValidation = validateContent(feedback);
        if (!feedbackValidation.isValid) {
          return NextResponse.json(
            { success: false, message: feedbackValidation.message },
            { status: 400 }
          );
        }
      }
      sub.feedback = feedback.trim();
    }

    // Validate private comment if present
    if (privateComment && privateComment.trim()) {
      const commentValidation = validateComment(privateComment);
      if (!commentValidation.isValid) {
        return NextResponse.json(
          { success: false, message: commentValidation.message },
          { status: 400 }
        );
      }
      sub.privateComments.push({
        senderId: session.id,
        senderName: session.name,
        senderRole: "guru",
        message: privateComment.trim(),
        createdAt: new Date(),
      });
    }

    // Handle Quiz Submission Scoring & Manual Essay Grading Recalculation
    if (quiz && Array.isArray(quiz.questions) && quiz.questions.length > 0) {
      // Build essayScores lookup map from body.essayScores or body.quizAnswers
      const essayScoreMap: Record<string, number | null | undefined> = {};

      if (essayScores && typeof essayScores === "object") {
        if (Array.isArray(essayScores)) {
          for (const item of essayScores) {
            if (item && item.questionId != null) {
              const val =
                item.scoreAwarded !== undefined ? item.scoreAwarded : item.score;
              essayScoreMap[String(item.questionId)] =
                val !== null && val !== undefined && val !== ""
                  ? Number(val)
                  : null;
            }
          }
        } else {
          for (const [k, v] of Object.entries(essayScores)) {
            essayScoreMap[String(k)] =
              v !== null && v !== undefined && v !== "" ? Number(v) : null;
          }
        }
      }

      // Merge existing sub.quizAnswers with incoming body.quizAnswers
      const existingAnsList: Array<Record<string, unknown>> = Array.isArray(
        sub.quizAnswers
      )
        ? sub.quizAnswers.map((a: any) =>
            typeof a.toObject === "function" ? a.toObject() : { ...a }
          )
        : [];

      const mergedByQId = new Map<string, Record<string, unknown>>();
      for (const item of existingAnsList) {
        if (item && item.questionId != null) {
          mergedByQId.set(String(item.questionId), { ...item });
        }
      }

      if (Array.isArray(quizAnswers)) {
        for (const incoming of quizAnswers) {
          if (incoming && incoming.questionId != null) {
            const qId = String(incoming.questionId);
            const prev = mergedByQId.get(qId) || { questionId: qId };
            mergedByQId.set(qId, {
              ...prev,
              ...incoming,
              answer:
                incoming.answer !== undefined && incoming.answer !== ""
                  ? incoming.answer
                  : prev.answer ?? "",
            });
          }
        }
      }

      const evalResult = evaluateQuizSubmission(
        quiz.questions,
        Array.from(mergedByQId.values()),
        {
          isTeacherGrading: true,
          essayScores: essayScoreMap,
        }
      );

      sub.quizId = quiz._id;
      if (!sub.assignmentId) {
        sub.assignmentId = assignment?._id || quiz._id;
      }
      if (!sub.courseClassId && quiz.courseClassId) {
        sub.courseClassId = quiz.courseClassId;
      }

      sub.quizAnswers = evalResult.quizAnswers;
      sub.rawScore = evalResult.rawScore;
      sub.maxRawScore = evalResult.maxRawScore;
      sub.objectiveRawScore = evalResult.objectiveRawScore;
      sub.essayRawScore = evalResult.essayRawScore;
      sub.provisionalScore = evalResult.provisionalScore;
      sub.gradingStatus = evalResult.gradingStatus;

      const isSavingAsDraft = Boolean(asDraft) || (draftScore !== undefined && score === undefined);

      if (evalResult.gradingStatus === "completed" && !isSavingAsDraft) {
        sub.normalizedScore = evalResult.normalizedScore;
        sub.score = evalResult.normalizedScore;
        sub.draftScore = null;
        sub.status = "graded";
        sub.gradedAt = new Date();
      } else {
        // Still pending manual essay grading or saved as draft
        sub.normalizedScore =
          evalResult.gradingStatus === "completed"
            ? evalResult.normalizedScore
            : null;
        sub.score =
          evalResult.gradingStatus === "completed" && !isSavingAsDraft
            ? evalResult.normalizedScore
            : null;
        sub.draftScore = evalResult.provisionalScore;
        if (evalResult.gradingStatus === "pending_manual") {
          sub.status = "turned_in";
        } else if (status) {
          sub.status = status;
        }
      }
    } else {
      // Ordinary Assignment (Tugas) grading
      const maxPossible = Number(assignment?.maxScore) || 100;
      if (score !== undefined && score !== null && score !== "") {
        const numScore = roundScore(Number(score));
        const normScore = normalizeRawScore(numScore, maxPossible) ?? numScore;
        sub.rawScore = numScore;
        sub.maxRawScore = maxPossible;
        sub.normalizedScore = normScore;
        sub.provisionalScore = normScore;
        sub.gradingStatus = "completed";
        sub.score = normScore;
        sub.status = "graded";
        sub.gradedAt = new Date();
      }
      if (draftScore !== undefined) {
        sub.draftScore = draftScore !== null ? roundScore(Number(draftScore)) : null;
      }
      if (status) {
        sub.status = status;
      }
      if (quizAnswers && Array.isArray(quizAnswers)) {
        sub.quizAnswers = quizAnswers;
      }
    }

    await sub.save();

    return NextResponse.json({
      success: true,
      message:
        sub.gradingStatus === "pending_manual"
          ? "Nilai sementara disimpan. Masih ada soal essay yang belum dinilai."
          : "Nilai berhasil disimpan",
      data: sub,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan nilai";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export const PUT = POST;
