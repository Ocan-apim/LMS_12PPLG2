import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Quiz, CourseClass } from "@/models";
import { validateComment } from "@/lib/profanity-filter";
import mongoose from "mongoose";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole([
    "guru",
    "siswa",
    "admin",
    "kurikulum",
    "kepsek",
  ]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const quiz = await Quiz.findById(id).select("comments courseClassId");
    if (!quiz) {
      return NextResponse.json(
        { success: false, message: "Kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: quiz.comments || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat komentar kuis";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "siswa", "admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { message, parentId } = body;

    // Validate comment with centralized profanity filter
    const validation = validateComment(message);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message:
            validation.message ||
            "Komentar tidak dapat dikirim karena mengandung kata atau ungkapan yang tidak pantas. Silakan gunakan bahasa yang lebih sopan.",
        },
        { status: 400 }
      );
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return NextResponse.json(
        { success: false, message: "Kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    // Role membership verification
    if (session.role === "siswa") {
      const courseClass = await CourseClass.findById(quiz.courseClassId);
      const isEnrolled =
        courseClass &&
        Array.isArray(courseClass.studentIds) &&
        courseClass.studentIds.map((sid: unknown) => String(sid)).includes(session.id);

      if (!isEnrolled) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda tidak terdaftar di kelas kuis ini" },
          { status: 403 }
        );
      }
    }

    let resolvedParentId = null;
    if (parentId) {
      const parentComment = (quiz.comments || []).find(
        (c: { _id?: unknown }) => String(c._id) === String(parentId)
      );
      if (parentComment) {
        // Single-level threading: If replying to a reply, attach to root parent
        resolvedParentId = parentComment.parentId ? parentComment.parentId : parentComment._id;
      }
    }

    const newComment = {
      userId: session.id,
      userName: session.name,
      userRole: session.role,
      message: message.trim(),
      parentId: resolvedParentId,
      isDeleted: false,
      createdAt: new Date(),
    };

    const updated = await Quiz.findByIdAndUpdate(
      id,
      { $push: { comments: newComment } },
      { new: true }
    ).select("comments");

    const addedComment = updated?.comments?.[updated.comments.length - 1] || newComment;

    return NextResponse.json(
      {
        success: true,
        message: "Komentar berhasil ditambahkan",
        data: addedComment,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengirim komentar kuis";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "siswa", "admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { commentId, message } = body;

    if (!commentId) {
      return NextResponse.json(
        { success: false, message: "ID komentar wajib diisi" },
        { status: 400 }
      );
    }

    // Profanity validation
    const validation = validateComment(message);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message:
            validation.message ||
            "Komentar tidak dapat diedit karena mengandung kata atau ungkapan yang tidak pantas.",
        },
        { status: 400 }
      );
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return NextResponse.json(
        { success: false, message: "Kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    const commentIndex = (quiz.comments || []).findIndex(
      (c: { _id?: unknown }) => String(c._id) === String(commentId)
    );

    if (commentIndex === -1) {
      return NextResponse.json(
        { success: false, message: "Komentar tidak ditemukan" },
        { status: 404 }
      );
    }

    const existingComment = quiz.comments[commentIndex];
    const isOwner = String(existingComment.userId) === session.id;
    const isTeacher = session.role === "guru" && String(quiz.teacherId) === session.id;
    const isAdmin = session.role === "admin";

    if (!isOwner && !isTeacher && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda tidak memiliki izin mengedit komentar ini" },
        { status: 403 }
      );
    }

    quiz.comments[commentIndex].message = message.trim();
    await quiz.save();

    return NextResponse.json({
      success: true,
      message: "Komentar berhasil diperbarui",
      data: quiz.comments[commentIndex],
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

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return NextResponse.json(
        { success: false, message: "Kuis tidak ditemukan" },
        { status: 404 }
      );
    }

    const commentIndex = (quiz.comments || []).findIndex(
      (c: { _id?: unknown }) => String(c._id) === String(commentId)
    );

    if (commentIndex === -1) {
      return NextResponse.json(
        { success: false, message: "Komentar tidak ditemukan" },
        { status: 404 }
      );
    }

    const targetComment = quiz.comments[commentIndex];

    // Authorization checks
    const isOwner = String(targetComment.userId) === session.id;
    const isTeacher = session.role === "guru" && String(quiz.teacherId) === session.id;
    const isAdmin = session.role === "admin";

    if (session.role === "siswa" && !isOwner) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Siswa hanya dapat menghapus komentar miliknya sendiri" },
        { status: 403 }
      );
    }

    if (!isOwner && !isTeacher && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda tidak memiliki izin menghapus komentar ini" },
        { status: 403 }
      );
    }

    // Check if this comment is a parent with active replies
    const hasReplies = quiz.comments.some(
      (c: { parentId?: unknown; isDeleted?: boolean }) =>
        String(c.parentId) === String(targetComment._id) && !c.isDeleted
    );

    if (hasReplies) {
      // Preserve thread structure using placeholder
      quiz.comments[commentIndex].isDeleted = true;
      quiz.comments[commentIndex].message = "Komentar ini telah dihapus";
      quiz.comments[commentIndex].deletedAt = new Date();
      quiz.comments[commentIndex].deletedBy = new mongoose.Types.ObjectId(session.id);
      await quiz.save();

      return NextResponse.json({
        success: true,
        message: "Komentar ditandai telah dihapus karena memiliki balasan",
        action: "placeholder",
        isDeleted: true,
        commentId,
      });
    }

    // Otherwise completely remove the comment
    quiz.comments.splice(commentIndex, 1);
    await quiz.save();

    return NextResponse.json({
      success: true,
      message: "Komentar berhasil dihapus",
      action: "removed",
      commentId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus komentar";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
