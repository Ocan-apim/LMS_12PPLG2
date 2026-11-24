import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Assignment, CourseClass, User, Quiz } from "@/models";
import { validateComment } from "@/lib/profanity-filter";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Ensures any legacy or seeded comment without an `_id` in MongoDB receives a persistent ObjectId.
 */
async function ensureAssignmentCommentIds(assignmentId: string) {
  if (!mongoose.Types.ObjectId.isValid(assignmentId)) return;
  for (const col of [Assignment.collection, Quiz.collection]) {
    const rawDoc = await col.findOne(
      { _id: new mongoose.Types.ObjectId(assignmentId) },
      { projection: { comments: 1 } }
    );
    if (!rawDoc || !Array.isArray(rawDoc.comments)) continue;

    let needsUpdate = false;
    const fixedComments = rawDoc.comments.map((c: Record<string, unknown>) => {
      if (!c._id) {
        needsUpdate = true;
        return { ...c, _id: new mongoose.Types.ObjectId() };
      }
      return c;
    });

    if (needsUpdate) {
      await col.updateOne(
        { _id: new mongoose.Types.ObjectId(assignmentId) },
        { $set: { comments: fixedComments } }
      );
    }
  }
}

async function findAssignmentOrQuizById(id: string, selectFields?: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const assignQuery = Assignment.findById(id);
  if (selectFields) assignQuery.select(selectFields);
  const assignment = await assignQuery;
  if (assignment) return assignment;

  const quizQuery = Quiz.findById(id);
  if (selectFields) quizQuery.select(selectFields);
  const quiz = await quizQuery;
  if (quiz) {
    // If a linked Assignment exists for this Quiz, return the linked Assignment if it holds comments, or sync
    const linkedAssignment = await Assignment.findOne({
      quizId: quiz._id,
      isArchived: { $ne: true },
    });
    if (linkedAssignment) {
      // Merge any comments that were saved directly on Quiz into linkedAssignment so both stay unified
      if (Array.isArray(quiz.comments) && quiz.comments.length > 0) {
        const existingIds = new Set(
          (linkedAssignment.comments || []).map((c: { _id?: unknown }) =>
            String(c._id)
          )
        );
        let addedAny = false;
        for (const qc of quiz.comments) {
          if (qc._id && !existingIds.has(String(qc._id))) {
            linkedAssignment.comments.push(qc);
            addedAny = true;
          }
        }
        if (addedAny) {
          await linkedAssignment.save();
        }
      }
      return linkedAssignment;
    }
  }
  return quiz;
}

async function isStudentEnrolledInAssignmentClass(studentId: string, courseClassId: unknown): Promise<boolean> {
  if (!courseClassId) return true;
  const courseClass = (await CourseClass.findById(courseClassId).lean()) as Record<string, unknown> | null;
  if (!courseClass) return false;

  const enrolledIds = Array.isArray(courseClass.studentIds)
    ? courseClass.studentIds.map((sid: unknown) => String(sid))
    : [];
  if (enrolledIds.includes(studentId)) return true;

  const studentUser = (await User.findById(studentId).select("classId").lean()) as { classId?: unknown } | null;
  const studentRombelId = studentUser?.classId ? String(studentUser.classId) : null;
  if (!studentRombelId) return false;

  const classRombelIdStr = courseClass.classRombelId ? String(courseClass.classRombelId) : null;
  const assignedRombelStrs = Array.isArray(courseClass.assignedRombelIds)
    ? courseClass.assignedRombelIds.map((r: unknown) => String(r))
    : [];

  if (studentRombelId === classRombelIdStr || assignedRombelStrs.includes(studentRombelId)) {
    await CourseClass.findByIdAndUpdate(courseClass._id, {
      $addToSet: { studentIds: studentId },
    });
    return true;
  }

  return false;
}

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin", "siswa", "kurikulum", "kepsek"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();
    await ensureAssignmentCommentIds(id);

    const assignment = await findAssignmentOrQuizById(id, "comments courseClassId teacherId");
    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas atau kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    // Role check: if guru, ensure ownership or class teacher
    if (session.role === "guru" && assignment.teacherId.toString() !== session.id) {
      const courseClass = await CourseClass.findById(assignment.courseClassId);
      if (courseClass && courseClass.teacherId.toString() !== session.id) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda bukan pengampu tugas ini" },
          { status: 403 }
        );
      }
    }

    // Role check: if siswa, ensure enrolled in class
    if (session.role === "siswa" && assignment.courseClassId) {
      const enrolled = await isStudentEnrolledInAssignmentClass(session.id, assignment.courseClassId);
      if (!enrolled) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda tidak terdaftar di kelas ini" },
          { status: 403 }
        );
      }
    }

    const comments = (assignment.comments || []).sort(
      (a: { createdAt: Date }, b: { createdAt: Date }) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return NextResponse.json({ success: true, data: comments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat komentar tugas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "siswa", "admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();
    await ensureAssignmentCommentIds(id);
    const body = await req.json();

    const { message, parentId } = body;
    const validation = validateComment(message);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, message: validation.message },
        { status: 400 }
      );
    }

    const assignment = await findAssignmentOrQuizById(id);
    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas atau kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    // Role check for guru
    if (session.role === "guru" && assignment.teacherId.toString() !== session.id) {
      const courseClass = await CourseClass.findById(assignment.courseClassId);
      if (courseClass && courseClass.teacherId.toString() !== session.id) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda bukan pengampu tugas ini" },
          { status: 403 }
        );
      }
    }

    // Role check for student
    if (session.role === "siswa" && assignment.courseClassId) {
      const enrolled = await isStudentEnrolledInAssignmentClass(session.id, assignment.courseClassId);
      if (!enrolled) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda tidak terdaftar di kelas ini" },
          { status: 403 }
        );
      }
    }

    let resolvedParentId: mongoose.Types.ObjectId | null = null;
    if (parentId) {
      const allComments = assignment.comments || [];
      const topComments = allComments.filter((c: { parentId?: unknown }) => !c.parentId);
      let parentComment = allComments.find(
        (c: { _id?: unknown }) => String(c._id) === String(parentId)
      );
      if (!parentComment && String(parentId).startsWith("top-")) {
        const topIdx = Number(String(parentId).replace("top-", ""));
        if (!Number.isNaN(topIdx) && topComments[topIdx]) {
          parentComment = topComments[topIdx];
        }
      }
      if (parentComment && parentComment._id) {
        // Single-level threading: If replying to a reply, attach to root parent
        const targetId = parentComment.parentId ? parentComment.parentId : parentComment._id;
        resolvedParentId = new mongoose.Types.ObjectId(String(targetId));
      }
    }

    const newComment = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(session.id),
      userName: session.name,
      userRole: session.role,
      message: message.trim(),
      parentId: resolvedParentId,
      isDeleted: false,
      createdAt: new Date(),
    };

    assignment.comments.push(newComment);
    await assignment.save();

    const addedComment =
      assignment.comments?.[assignment.comments.length - 1] || newComment;

    return NextResponse.json(
      {
        success: true,
        message: "Komentar berhasil ditambahkan",
        data: addedComment,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengirim komentar tugas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "siswa", "admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();
    await ensureAssignmentCommentIds(id);
    const body = await req.json();

    const { commentId, message } = body;
    if (!commentId) {
      return NextResponse.json(
        { success: false, message: "ID komentar wajib diisi" },
        { status: 400 }
      );
    }

    const validation = validateComment(message);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, message: validation.message },
        { status: 400 }
      );
    }

    const assignment = await findAssignmentOrQuizById(id);
    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas atau kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    const commentIndex = (assignment.comments || []).findIndex(
      (c: { _id?: unknown }) => String(c._id) === String(commentId)
    );

    if (commentIndex === -1) {
      return NextResponse.json(
        { success: false, message: "Komentar tidak ditemukan" },
        { status: 404 }
      );
    }

    const existingComment = assignment.comments[commentIndex];
    const isOwner = String(existingComment.userId) === session.id;
    const isTeacher = session.role === "guru" && String(assignment.teacherId) === session.id;
    const isAdmin = session.role === "admin";

    if (!isOwner && !isTeacher && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda tidak memiliki izin mengedit komentar ini" },
        { status: 403 }
      );
    }

    assignment.comments[commentIndex].message = message.trim();
    await assignment.save();

    return NextResponse.json({
      success: true,
      message: "Komentar berhasil diperbarui",
      data: assignment.comments[commentIndex],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui komentar";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export const PATCH = PUT;

export async function DELETE(req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "siswa", "admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();
    await ensureAssignmentCommentIds(id);

    const url = new URL(req.url);
    let commentId = url.searchParams.get("commentId");
    if (!commentId) {
      try {
        const body = await req.json();
        commentId = body?.commentId;
      } catch {}
    }

    if (!commentId) {
      return NextResponse.json(
        { success: false, message: "ID komentar wajib diisi" },
        { status: 400 }
      );
    }

    const assignment = await findAssignmentOrQuizById(id);
    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas atau kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    const commentIndex = (assignment.comments || []).findIndex(
      (c: { _id?: unknown }) => String(c._id) === String(commentId)
    );

    if (commentIndex === -1) {
      return NextResponse.json(
        { success: false, message: "Komentar tidak ditemukan" },
        { status: 404 }
      );
    }

    const comment = assignment.comments[commentIndex];

    // Authorization checks:
    // Siswa: only their own comments/replies
    // Guru: any comment if they teach this course/assignment
    // Admin: any comment across system
    // Kurikulum & Kepsek: blocked with 403 by requireRole
    const isOwner = String(comment.userId) === session.id;
    let isAuthorized = false;

    if (session.role === "admin") {
      isAuthorized = true;
    } else if (session.role === "guru") {
      if (String(assignment.teacherId) === session.id) {
        isAuthorized = true;
      } else if (assignment.courseClassId) {
        const courseClass = await CourseClass.findById(assignment.courseClassId);
        if (courseClass && String(courseClass.teacherId) === session.id) {
          isAuthorized = true;
        }
      }
    } else if (session.role === "siswa") {
      isAuthorized = isOwner;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda tidak memiliki izin menghapus komentar ini" },
        { status: 403 }
      );
    }

    // Parent comment deletion behavior:
    // If reply (has parentId): remove reply directly
    // If top-level parent (no parentId):
    //   If active replies exist -> preserve thread using placeholder "Komentar ini telah dihapus"
    //   If no active replies exist -> remove comment completely
    let usedPlaceholder = false;
    if (comment.parentId) {
      assignment.comments.splice(commentIndex, 1);
    } else {
      const hasReplies = assignment.comments.some(
        (c: { parentId?: unknown; isDeleted?: boolean }) =>
          String(c.parentId) === String(commentId) && !c.isDeleted
      );

      if (hasReplies) {
        usedPlaceholder = true;
        assignment.comments[commentIndex].isDeleted = true;
        assignment.comments[commentIndex].message = "Komentar ini telah dihapus";
        assignment.comments[commentIndex].deletedAt = new Date();
        assignment.comments[commentIndex].deletedBy = new mongoose.Types.ObjectId(session.id);
      } else {
        assignment.comments.splice(commentIndex, 1);
      }
    }

    await assignment.save();

    return NextResponse.json({
      success: true,
      message: "Komentar berhasil dihapus",
      action: usedPlaceholder ? "placeholder" : "removed",
      isDeleted: usedPlaceholder,
      commentId,
      data: { commentId },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus komentar";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
