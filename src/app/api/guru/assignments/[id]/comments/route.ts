import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Assignment, CourseClass } from "@/models";
import { validateComment } from "@/lib/profanity-filter";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin", "siswa", "kurikulum", "kepsek"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const assignment = await Assignment.findById(id).select("comments courseClassId teacherId");
    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan" },
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
      const courseClass = await CourseClass.findById(assignment.courseClassId);
      if (
        courseClass &&
        !courseClass.studentIds.map((sid: unknown) => String(sid)).includes(session.id)
      ) {
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
  const { session, error } = await requireRole(["guru", "siswa"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();
    const body = await req.json();

    const { message, parentId } = body;
    const validation = validateComment(message);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, message: validation.message },
        { status: 400 }
      );
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan" },
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
      const courseClass = await CourseClass.findById(assignment.courseClassId);
      if (
        courseClass &&
        !courseClass.studentIds.map((sid: unknown) => String(sid)).includes(session.id)
      ) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda tidak terdaftar di kelas ini" },
          { status: 403 }
        );
      }
    }

    let resolvedParentId = null;
    if (parentId) {
      const parentComment = (assignment.comments || []).find(
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

    const updated = await Assignment.findByIdAndUpdate(
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

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan" },
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

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan" },
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
    if (comment.parentId) {
      assignment.comments.splice(commentIndex, 1);
    } else {
      const hasReplies = assignment.comments.some(
        (c: { parentId?: unknown; isDeleted?: boolean }) =>
          String(c.parentId) === String(commentId) && !c.isDeleted
      );

      if (hasReplies) {
        assignment.comments[commentIndex].isDeleted = true;
        assignment.comments[commentIndex].message = "Komentar ini telah dihapus";
        assignment.comments[commentIndex].deletedAt = new Date();
        assignment.comments[commentIndex].deletedBy = session.id;
      } else {
        assignment.comments.splice(commentIndex, 1);
      }
    }

    await assignment.save();

    return NextResponse.json({
      success: true,
      message: "Komentar berhasil dihapus",
      data: { commentId },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus komentar";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
