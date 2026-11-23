import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import {
  Assignment,
  Submission,
  CourseClass,
  ClassModel,
  User,
  Quiz,
} from "@/models";
import {
  calculateQuizMaxRawScore,
  resolveSubmissionScoring,
} from "@/lib/quiz-scoring";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "ID tugas atau kuis tidak valid" },
        { status: 400 }
      );
    }

    // Resolve either Assignment or standalone Quiz
    let assignment: any = await Assignment.findById(id)
      .populate("courseClassId", "name code studentIds classRombelId")
      .populate("classId", "name grade studentIds")
      .populate("quizId");

    let quizDoc: any = assignment?.quizId || null;

    if (!assignment) {
      quizDoc = await Quiz.findById(id).populate(
        "courseClassId",
        "name code studentIds classRombelId"
      );
      if (quizDoc) {
        const linkedAssignment = await Assignment.findOne({
          quizId: quizDoc._id,
          isArchived: { $ne: true },
        })
          .populate("courseClassId", "name code studentIds classRombelId")
          .populate("classId", "name grade studentIds")
          .populate("quizId");

        if (linkedAssignment) {
          assignment = linkedAssignment;
          quizDoc = linkedAssignment.quizId || quizDoc;
        } else {
          // Synthesize virtual assignment wrapper for standalone Quiz
          assignment = {
            _id: quizDoc._id,
            title: quizDoc.title,
            type: "kuis",
            instructions: quizDoc.description || "",
            maxScore: 100,
            dueDate: quizDoc.dueDate,
            attachments: [],
            teacherId: quizDoc.teacherId,
            courseClassId: quizDoc.courseClassId,
            classId: null,
            quizId: quizDoc,
          };
        }
      }
    }

    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas atau kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    if (
      session.role === "guru" &&
      String(assignment.teacherId) !== String(session.id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda bukan pemilik tugas atau kuis ini",
        },
        { status: 403 }
      );
    }

    // Fetch existing submissions matching either assignmentId or quizId
    const subOrConds: Record<string, unknown>[] = [{ assignmentId: assignment._id }];
    if (quizDoc?._id) {
      subOrConds.push({ quizId: quizDoc._id });
    }

    const submissions = await Submission.find({ $or: subOrConds })
      .populate("studentId", "name email nisn")
      .lean();

    // Determine all students in this class
    const studentIdSet = new Set<string>();

    if (
      assignment.courseClassId &&
      Array.isArray(assignment.courseClassId.studentIds)
    ) {
      assignment.courseClassId.studentIds.forEach((s: unknown) => {
        if (s) studentIdSet.add(String((s as any)._id || s));
      });
    }

    if (assignment.classId && Array.isArray(assignment.classId.studentIds)) {
      assignment.classId.studentIds.forEach((s: unknown) => {
        if (s) studentIdSet.add(String((s as any)._id || s));
      });
    }

    // Include students from rombel
    const rombelId =
      assignment.courseClassId?.classRombelId || assignment.classId;
    if (rombelId) {
      const rombelDoc: any = await ClassModel.findById(rombelId).lean();
      if (rombelDoc && Array.isArray(rombelDoc.studentIds)) {
        rombelDoc.studentIds.forEach((s: unknown) => {
          if (s) studentIdSet.add(String((s as any)._id || s));
        });
      }
      const usersInRombel = await User.find({ classId: rombelId, role: "siswa" })
        .select("_id")
        .lean();
      usersInRombel.forEach((u) => studentIdSet.add(String(u._id)));
    }

    // Include any student who has submitted
    submissions.forEach((sub) => {
      const sid = String((sub.studentId as any)?._id || sub.studentId || "");
      if (sid) studentIdSet.add(sid);
    });

    const studentIds = Array.from(studentIdSet);
    const students: any[] = await User.find({
      _id: { $in: studentIds },
      role: "siswa",
    })
      .select("name email nisn")
      .sort({ name: 1 })
      .lean();

    const submissionMap = new Map(
      submissions.map((sub) => [
        String((sub.studentId as any)?._id || sub.studentId),
        sub,
      ])
    );

    const isQuizAssignment =
      assignment.type === "kuis" || Boolean(quizDoc);
    const quizMaxSummary = quizDoc?.questions
      ? calculateQuizMaxRawScore(quizDoc.questions)
      : null;

    const matchedStudentIds = new Set<string>();

    const formatSubmissionItem = (st: any, sub: any) => {
      if (!sub) {
        return {
          submissionId: null,
          student: st,
          hasSubmitted: false,
          status: "assigned",
          gradingStatus: "not_started",
          isPendingManual: false,
          score: null,
          rawScore: null,
          maxRawScore: quizMaxSummary?.maxRawScore ?? (assignment.maxScore || 100),
          normalizedScore: null,
          provisionalScore: null,
          objectiveRawScore: null,
          essayRawScore: null,
          draftScore: null,
          feedback: "",
          privateComments: [],
          attachments: [],
          content: "",
          quizAnswers: [],
          submittedAt: null,
          gradedAt: null,
        };
      }

      const resolved = resolveSubmissionScoring(sub, quizDoc, assignment);

      return {
        submissionId: sub._id,
        student: st,
        hasSubmitted: true,
        status: sub.status,
        gradingStatus: resolved.gradingStatus,
        isPendingManual: resolved.isPendingManual,
        score: resolved.isPendingManual
          ? null
          : (resolved.normalizedScore ?? sub.score ?? null),
        rawScore: resolved.rawScore,
        maxRawScore: resolved.maxRawScore,
        normalizedScore: resolved.normalizedScore,
        provisionalScore: resolved.provisionalScore,
        objectiveRawScore: resolved.objectiveRawScore,
        essayRawScore: resolved.essayRawScore,
        draftScore: sub.draftScore ?? resolved.provisionalScore ?? null,
        feedback: sub.feedback,
        privateComments: sub.privateComments || [],
        attachments:
          sub.attachments ||
          (sub.fileUrl
            ? [
                {
                  name: "Lampiran Siswa",
                  url: sub.fileUrl,
                  type: "file",
                  size: "1.0 MB",
                },
              ]
            : []),
        content: sub.content,
        quizAnswers: sub.quizAnswers || [],
        submittedAt: sub.submittedAt,
        gradedAt: sub.gradedAt,
      };
    };

    const items: any[] = students.map((st) => {
      matchedStudentIds.add(String(st._id));
      const sub = submissionMap.get(String(st._id));
      return formatSubmissionItem(st, sub);
    });

    submissions.forEach((sub) => {
      const sid = String((sub.studentId as any)?._id || sub.studentId || "");
      if (sid && !matchedStudentIds.has(sid) && sub.studentId) {
        items.push(
          formatSubmissionItem(
            {
              _id: (sub.studentId as any)._id || sub.studentId,
              name: (sub.studentId as any).name || "Siswa",
              email: (sub.studentId as any).email || "-",
              nisn: (sub.studentId as any).nisn || "-",
            },
            sub
          )
        );
      }
    });

    const turnedInCount = items.filter(
      (i) => i.status === "turned_in" || i.status === "late"
    ).length;
    const gradedCount = items.filter((i) => i.status === "graded").length;
    const assignedCount = items.filter((i) => i.status === "assigned").length;
    const pendingManualCount = items.filter((i) => i.isPendingManual).length;

    return NextResponse.json(
      {
        success: true,
        data: {
          assignment: {
            _id: assignment._id,
            title: assignment.title,
            type: isQuizAssignment ? "kuis" : assignment.type || "tugas",
            instructions: assignment.instructions,
            maxScore: isQuizAssignment ? 100 : assignment.maxScore || 100,
            maxRawScore:
              quizMaxSummary?.maxRawScore ?? (assignment.maxScore || 100),
            dueDate: assignment.dueDate,
            attachments: assignment.attachments || [],
            className:
              assignment.courseClassId?.name ||
              assignment.classId?.name ||
              "Kelas",
            quiz: quizDoc
              ? {
                  _id: quizDoc._id,
                  title: quizDoc.title,
                  durationSeconds: quizDoc.durationSeconds,
                  totalPoints:
                    quizMaxSummary?.maxRawScore ?? quizDoc.totalPoints ?? 100,
                  maxRawScore:
                    quizMaxSummary?.maxRawScore ?? quizDoc.totalPoints ?? 100,
                  objectiveMaxRawScore:
                    quizMaxSummary?.objectiveMaxRawScore ?? 0,
                  essayMaxRawScore: quizMaxSummary?.essayMaxRawScore ?? 0,
                  hasEssayQuestions: quizMaxSummary?.hasEssayQuestions ?? false,
                  questions: quizDoc.questions || [],
                }
              : null,
          },
          stats: {
            totalStudents: items.length,
            turnedInCount,
            gradedCount,
            assignedCount,
            pendingManualCount,
          },
          items,
        },
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memuat submisi";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
