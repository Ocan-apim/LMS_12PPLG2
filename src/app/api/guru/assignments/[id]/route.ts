import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Assignment, Submission, ClassPost, Quiz, CourseClass } from "@/models";
import { calculateQuizMaxRawScore } from "@/lib/quiz-scoring";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function ensureCommentIdsOnCollection(
  collection: mongoose.Collection,
  docId: string
) {
  if (!mongoose.Types.ObjectId.isValid(docId)) return;
  const rawDoc = await collection.findOne(
    { _id: new mongoose.Types.ObjectId(docId) },
    { projection: { comments: 1 } }
  );
  if (rawDoc && Array.isArray(rawDoc.comments)) {
    let needsIdFix = false;
    const fixedComments = rawDoc.comments.map((c: Record<string, unknown>) => {
      if (!c._id) {
        needsIdFix = true;
        return { ...c, _id: new mongoose.Types.ObjectId() };
      }
      return c;
    });
    if (needsIdFix) {
      await collection.updateOne(
        { _id: new mongoose.Types.ObjectId(docId) },
        { $set: { comments: fixedComments } }
      );
    }
  }
}

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole([
    "guru",
    "admin",
    "kepsek",
  ]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Tugas atau kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    await connectDB();
    await ensureCommentIdsOnCollection(Assignment.collection, id);

    let assignment: any = await Assignment.findById(id)
      .populate("courseClassId", "name code bannerColor studentIds teacherId classRombelId")
      .populate("classId", "name grade")
      .populate("teacherId", "name email degree")
      .populate("quizId");

    let standaloneQuiz: any = null;

    if (!assignment) {
      await ensureCommentIdsOnCollection(Quiz.collection, id);
      standaloneQuiz = await Quiz.findById(id)
        .populate("courseClassId", "name code bannerColor studentIds teacherId classRombelId")
        .populate("teacherId", "name email degree");

      if (standaloneQuiz) {
        const linkedAssignment = await Assignment.findOne({
          quizId: standaloneQuiz._id,
          isArchived: { $ne: true },
        })
          .populate("courseClassId", "name code bannerColor studentIds teacherId classRombelId")
          .populate("classId", "name grade")
          .populate("teacherId", "name email degree")
          .populate("quizId");

        if (linkedAssignment) {
          assignment = linkedAssignment;
        }
      }
    }

    if (!assignment && !standaloneQuiz) {
      return NextResponse.json(
        { success: false, message: "Tugas atau kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    const targetDoc = assignment || standaloneQuiz;
    const teacherIdStr =
      typeof targetDoc.teacherId === "object" && targetDoc.teacherId !== null
        ? (targetDoc.teacherId as any)._id?.toString() ||
          (targetDoc.teacherId as any).toString()
        : String(targetDoc.teacherId || "");

    const classTeacherIdStr =
      targetDoc.courseClassId &&
      typeof targetDoc.courseClassId === "object" &&
      (targetDoc.courseClassId as any).teacherId
        ? String((targetDoc.courseClassId as any).teacherId)
        : "";

    if (
      session.role === "guru" &&
      teacherIdStr !== session.id &&
      classTeacherIdStr !== session.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda bukan pemilik tugas atau kuis ini",
        },
        { status: 403 }
      );
    }

    const quizDoc: any = assignment?.quizId || standaloneQuiz || null;
    const quizMaxSummary =
      quizDoc && Array.isArray(quizDoc.questions)
        ? calculateQuizMaxRawScore(quizDoc.questions)
        : null;

    const subOrConds: Record<string, unknown>[] = [];
    if (assignment?._id) {
      subOrConds.push({ assignmentId: assignment._id });
    }
    if (quizDoc?._id) {
      subOrConds.push({ quizId: quizDoc._id });
    }

    const [turnedInCount, gradedCount] =
      subOrConds.length > 0
        ? await Promise.all([
            Submission.countDocuments({
              $or: subOrConds,
              status: { $in: ["turned_in", "late", "graded"] },
            }),
            Submission.countDocuments({
              $or: subOrConds,
              status: "graded",
            }),
          ])
        : [0, 0];

    if (assignment) {
      const assignmentObj = assignment.toObject();
      const isQuiz = assignmentObj.type === "kuis" || Boolean(quizDoc);

      // Merge comments from both Assignment and linked Quiz if both exist
      const rawAssignComments = Array.isArray(assignmentObj.comments)
        ? assignmentObj.comments
        : [];
      const rawQuizComments =
        quizDoc && Array.isArray(quizDoc.comments) ? quizDoc.comments : [];
      const seenCommentIds = new Set<string>();
      const mergedComments = [...rawAssignComments, ...rawQuizComments]
        .filter((c: any) => {
          const cid = c?._id ? String(c._id) : `${c?.userId}-${c?.createdAt}-${c?.message}`;
          if (seenCommentIds.has(cid)) return false;
          seenCommentIds.add(cid);
          return true;
        })
        .sort(
          (a: any, b: any) =>
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
        );

      return NextResponse.json({
        success: true,
        data: {
          ...assignmentObj,
          comments: mergedComments,
          type: isQuiz ? "kuis" : assignmentObj.type || "tugas",
          maxScore: isQuiz ? 100 : assignmentObj.maxScore || 100,
          maxRawScore:
            quizMaxSummary?.maxRawScore ?? (assignmentObj.maxScore || 100),
          quizId: quizDoc
            ? {
                ...(typeof quizDoc.toObject === "function"
                  ? quizDoc.toObject()
                  : quizDoc),
                maxRawScore:
                  quizMaxSummary?.maxRawScore ?? quizDoc.totalPoints ?? 100,
              }
            : null,
          turnedInCount,
          gradedCount,
          currentUserRole: session.role,
          currentUserId: session.id,
        },
      });
    }

    // Standalone Quiz response shaped consistently for Guru Assignment/Quiz Detail UI
    const quizObj = standaloneQuiz.toObject();
    return NextResponse.json({
      success: true,
      data: {
        _id: quizObj._id,
        title: quizObj.title,
        instructions: quizObj.description || "",
        description: quizObj.description || "",
        type: "kuis",
        dueDate: quizObj.dueDate || null,
        maxScore: 100,
        maxRawScore: quizMaxSummary?.maxRawScore ?? quizObj.totalPoints ?? 100,
        courseClassId: quizObj.courseClassId,
        teacherId: quizObj.teacherId,
        quizId: {
          ...quizObj,
          maxRawScore: quizMaxSummary?.maxRawScore ?? quizObj.totalPoints ?? 100,
        },
        attachments: [],
        comments: quizObj.comments || [],
        isPublished: quizObj.isPublished !== false,
        createdAt: quizObj.createdAt,
        updatedAt: quizObj.updatedAt,
        turnedInCount,
        gradedCount,
        currentUserRole: session.role,
        currentUserId: session.id,
      },
    });
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
        { success: false, message: "Tugas atau kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    await connectDB();
    const body = await req.json();

    const {
      title,
      instructions,
      description,
      dueDate,
      maxScore,
      attachments,
      bannerUrl,
      quizId,
      isPublished,
      durationSeconds,
      questions,
    } = body;

    if (title !== undefined && !String(title).trim()) {
      return NextResponse.json(
        { success: false, message: "Judul tidak boleh kosong" },
        { status: 400 }
      );
    }

    const existingAssignment = await Assignment.findById(id);

    if (existingAssignment) {
      if (
        session.role === "guru" &&
        existingAssignment.teacherId.toString() !== session.id
      ) {
        const courseClass = existingAssignment.courseClassId
          ? await CourseClass.findById(existingAssignment.courseClassId)
              .select("teacherId")
              .lean()
          : null;
        if (!courseClass || String((courseClass as any).teacherId) !== session.id) {
          return NextResponse.json(
            { success: false, message: "Akses ditolak: Anda bukan pemilik tugas ini" },
            { status: 403 }
          );
        }
      }

      // If this assignment wraps a quiz and quiz fields are provided, update the linked quiz too
      const targetQuizId = existingAssignment.quizId || quizId;
      if (targetQuizId && (questions !== undefined || durationSeconds !== undefined || title !== undefined || instructions !== undefined || description !== undefined || dueDate !== undefined || isPublished !== undefined)) {
        const quizUpdate: Record<string, unknown> = {};
        if (title !== undefined) quizUpdate.title = String(title).trim();
        if (description !== undefined || instructions !== undefined) {
          quizUpdate.description = String(description ?? instructions ?? "").trim();
        }
        if (durationSeconds !== undefined) {
          quizUpdate.durationSeconds = Number(durationSeconds) || 60;
        }
        if (dueDate !== undefined) {
          quizUpdate.dueDate = dueDate ? new Date(dueDate) : undefined;
        }
        if (isPublished !== undefined) {
          quizUpdate.isPublished = Boolean(isPublished);
        }
        if (Array.isArray(questions)) {
          const sanitizedQuestions = questions.map(
            (q: Record<string, unknown>, idx: number) => {
              const qText = String(
                q?.question || q?.prompt || `Pertanyaan ${idx + 1}`
              ).trim();
              const rawPts =
                q?.points !== undefined && q?.points !== null ? Number(q.points) : 10;
              const rawPtsFalse =
                q?.pointsFalse !== undefined && q?.pointsFalse !== null
                  ? Number(q.pointsFalse)
                  : 0;
              return {
                id: String(q?.id || `q-${idx + 1}-${Date.now()}`),
                question: qText || `Pertanyaan ${idx + 1}`,
                type:
                  q?.type === "essay"
                    ? ("essay" as const)
                    : ("pilihan_ganda" as const),
                imageUrl: q?.imageUrl ? String(q.imageUrl) : undefined,
                options: Array.isArray(q?.options)
                  ? q.options.map((o: unknown) => String(o || "").trim())
                  : [],
                correctAnswer:
                  q?.correctAnswer !== undefined && q?.correctAnswer !== ""
                    ? q.correctAnswer
                    : 0,
                points: Number.isFinite(rawPts) ? rawPts : 10,
                pointsFalse: Number.isFinite(rawPtsFalse) ? rawPtsFalse : 0,
              };
            }
          );
          const computedMaxRaw =
            calculateQuizMaxRawScore(sanitizedQuestions).maxRawScore;
          quizUpdate.questions = sanitizedQuestions;
          quizUpdate.totalPoints = computedMaxRaw;
          quizUpdate.maxRawPoints = computedMaxRaw;
        }
        await Quiz.findByIdAndUpdate(targetQuizId, quizUpdate);
      }

      const updated = await Assignment.findByIdAndUpdate(
        id,
        {
          title: title ? String(title).trim() : undefined,
          instructions,
          description: description ?? instructions,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          maxScore: maxScore !== undefined ? Number(maxScore) : undefined,
          attachments: Array.isArray(attachments) ? attachments : undefined,
          bannerUrl,
          quizId,
          isPublished:
            isPublished !== undefined ? Boolean(isPublished) : undefined,
        },
        { new: true }
      )
        .populate("courseClassId", "name code")
        .populate("classId", "name grade")
        .populate("quizId");

      return NextResponse.json({ success: true, data: updated });
    }

    // Fallback: standalone Quiz update via /api/guru/assignments/[id]
    const existingQuiz = await Quiz.findById(id);
    if (!existingQuiz) {
      return NextResponse.json(
        { success: false, message: "Tugas atau kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    if (session.role === "guru" && String(existingQuiz.teacherId) !== session.id) {
      const courseClass = existingQuiz.courseClassId
        ? await CourseClass.findById(existingQuiz.courseClassId)
            .select("teacherId")
            .lean()
        : null;
      if (!courseClass || String((courseClass as any).teacherId) !== session.id) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda bukan pemilik kuis ini" },
          { status: 403 }
        );
      }
    }

    const quizUpdate: Record<string, unknown> = {};
    if (title !== undefined) quizUpdate.title = String(title).trim();
    if (description !== undefined || instructions !== undefined) {
      quizUpdate.description = String(description ?? instructions ?? "").trim();
    }
    if (durationSeconds !== undefined) {
      quizUpdate.durationSeconds = Number(durationSeconds) || 60;
    }
    if (dueDate !== undefined) {
      quizUpdate.dueDate = dueDate ? new Date(dueDate) : undefined;
    }
    if (isPublished !== undefined) {
      quizUpdate.isPublished = Boolean(isPublished);
    }
    if (Array.isArray(questions)) {
      const sanitizedQuestions = questions.map(
        (q: Record<string, unknown>, idx: number) => {
          const qText = String(
            q?.question || q?.prompt || `Pertanyaan ${idx + 1}`
          ).trim();
          const rawPts =
            q?.points !== undefined && q?.points !== null ? Number(q.points) : 10;
          const rawPtsFalse =
            q?.pointsFalse !== undefined && q?.pointsFalse !== null
              ? Number(q.pointsFalse)
              : 0;
          return {
            id: String(q?.id || `q-${idx + 1}-${Date.now()}`),
            question: qText || `Pertanyaan ${idx + 1}`,
            type:
              q?.type === "essay"
                ? ("essay" as const)
                : ("pilihan_ganda" as const),
            imageUrl: q?.imageUrl ? String(q.imageUrl) : undefined,
            options: Array.isArray(q?.options)
              ? q.options.map((o: unknown) => String(o || "").trim())
              : [],
            correctAnswer:
              q?.correctAnswer !== undefined && q?.correctAnswer !== ""
                ? q.correctAnswer
                : 0,
            points: Number.isFinite(rawPts) ? rawPts : 10,
            pointsFalse: Number.isFinite(rawPtsFalse) ? rawPtsFalse : 0,
          };
        }
      );
      const computedMaxRaw =
        calculateQuizMaxRawScore(sanitizedQuestions).maxRawScore;
      quizUpdate.questions = sanitizedQuestions;
      quizUpdate.totalPoints = computedMaxRaw;
      quizUpdate.maxRawPoints = computedMaxRaw;
    }

    const updatedQuiz = await Quiz.findByIdAndUpdate(id, quizUpdate, {
      new: true,
    }).populate("courseClassId", "name code");

    if (title !== undefined && String(title).trim()) {
      await ClassPost.updateMany(
        { refId: existingQuiz._id, type: "quiz" },
        { $set: { title: `Anda memulai Quiz: ${String(title).trim()}` } }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: updatedQuiz._id,
        title: updatedQuiz.title,
        instructions: updatedQuiz.description || "",
        description: updatedQuiz.description || "",
        type: "kuis",
        dueDate: updatedQuiz.dueDate || null,
        maxScore: 100,
        courseClassId: updatedQuiz.courseClassId,
        quizId: updatedQuiz,
        isPublished: updatedQuiz.isPublished,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memperbarui tugas atau kuis";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Tugas atau kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    await connectDB();

    const existing = await Assignment.findById(id);
    if (existing) {
      if (session.role === "guru" && existing.teacherId.toString() !== session.id) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda bukan pemilik tugas ini" },
          { status: 403 }
        );
      }

      // Soft-delete / archive to preserve academic data and student submissions
      await Assignment.findByIdAndUpdate(id, {
        isArchived: true,
        isPublished: false,
      });

      if (existing.quizId) {
        await Quiz.findByIdAndUpdate(existing.quizId, { isPublished: false });
        await ClassPost.deleteMany({
          refId: { $in: [existing._id, existing.quizId] },
        });
      } else {
        await ClassPost.deleteMany({ refId: id });
      }

      return NextResponse.json(
        {
          success: true,
          message: "Tugas berhasil dihapus",
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
    }

    // Fallback: standalone Quiz deletion
    const existingQuiz = await Quiz.findById(id);
    if (!existingQuiz) {
      return NextResponse.json(
        { success: false, message: "Tugas atau kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    if (session.role === "guru" && String(existingQuiz.teacherId) !== session.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda bukan pemilik kuis ini" },
        { status: 403 }
      );
    }

    await Quiz.findByIdAndUpdate(id, { isPublished: false });
    await ClassPost.deleteMany({ refId: id });

    return NextResponse.json(
      {
        success: true,
        message: "Kuis berhasil dihapus",
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
      err instanceof Error ? err.message : "Gagal menghapus tugas atau kuis";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
