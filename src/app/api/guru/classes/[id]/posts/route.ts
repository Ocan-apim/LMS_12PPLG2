import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { ClassPost, CourseClass } from "@/models";
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

    const courseClass = await CourseClass.findById(id);
    if (!courseClass) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    if (session.role === "guru" && courseClass.teacherId.toString() !== session.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda bukan pengampu kelas ini" },
        { status: 403 }
      );
    }

    if (session.role === "siswa") {
      const studentIds = Array.isArray(courseClass.studentIds)
        ? courseClass.studentIds.map((s: unknown) => String(s))
        : [];
      if (!studentIds.includes(session.id)) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda belum terdaftar di kelas ini" },
          { status: 403 }
        );
      }
    }

    const posts = await ClassPost.find({ courseClassId: id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: posts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat postingan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "siswa"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const courseClass = await CourseClass.findById(id);
    if (!courseClass) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    if (session.role === "guru" && courseClass.teacherId.toString() !== session.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda bukan pengampu kelas ini" },
        { status: 403 }
      );
    }

    if (session.role === "siswa") {
      const studentIds = Array.isArray(courseClass.studentIds)
        ? courseClass.studentIds.map((s: unknown) => String(s))
        : [];
      if (!studentIds.includes(session.id)) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda belum terdaftar di kelas ini" },
          { status: 403 }
        );
      }
    }
    const body = await req.json();

    const { action, title, content, postId, message, commentId, parentId } = body;

    // Action: Add comment to post or general class discussion
    if (action === "comment") {
      const validation = validateComment(message);
      if (!validation.isValid) {
        return NextResponse.json(
          { success: false, message: validation.message },
          { status: 400 }
        );
      }

      let targetPostId = postId;
      let targetPost = null;
      if (!targetPostId || targetPostId === "general") {
        targetPost = await ClassPost.findOne({ courseClassId: id }).sort({ createdAt: -1 });
        if (!targetPost) {
          targetPost = await ClassPost.create({
            courseClassId: id,
            teacherId: courseClass.teacherId,
            type: "announcement",
            title: `Forum Diskusi Kelas ${courseClass.name}`,
            content: "Ruang diskusi dan komentar untuk kelas ini.",
            comments: [],
          });
        }
        targetPostId = targetPost._id;
      } else {
        targetPost = await ClassPost.findById(targetPostId);
      }

      let resolvedParentId = null;
      if (parentId && targetPost) {
        const parentComment = (targetPost.comments || []).find(
          (c: { _id?: unknown }) => String(c._id) === String(parentId)
        );
        if (parentComment) {
          resolvedParentId = parentComment.parentId ? parentComment.parentId : parentComment._id;
        }
      }

      const updated = await ClassPost.findByIdAndUpdate(
        targetPostId,
        {
          $push: {
            comments: {
              userId: session.id,
              userName: session.name,
              userRole: session.role,
              message: message.trim(),
              parentId: resolvedParentId,
              isDeleted: false,
              createdAt: new Date(),
            },
          },
        },
        { new: true }
      );
      return NextResponse.json({ success: true, data: updated });
    }

    // Action: Delete comment (supported via POST action or DELETE HTTP method)
    if (action === "delete_comment") {
      if (!commentId) {
        return NextResponse.json(
          { success: false, message: "ID komentar wajib diisi" },
          { status: 400 }
        );
      }

      const targetPost = await ClassPost.findOne({
        courseClassId: id,
        "comments._id": commentId,
      });

      if (!targetPost) {
        return NextResponse.json(
          { success: false, message: "Komentar tidak ditemukan" },
          { status: 404 }
        );
      }

      const comment = targetPost.comments.find(
        (c: { _id?: unknown }) => String(c._id) === String(commentId)
      );

      const isOwner = comment && String(comment.userId) === session.id;
      const isTeacher =
        session.role === "guru" &&
        (String(courseClass.teacherId) === session.id || String(targetPost.teacherId) === session.id);
      const isAdmin = session.role === "admin";

      if (!isOwner && !isTeacher && !isAdmin) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda tidak memiliki izin menghapus komentar ini" },
          { status: 403 }
        );
      }

      if (comment.parentId) {
        targetPost.comments = targetPost.comments.filter(
          (c: { _id?: unknown }) => String(c._id) !== String(commentId)
        );
      } else {
        const hasReplies = targetPost.comments.some(
          (c: { parentId?: unknown; isDeleted?: boolean }) =>
            String(c.parentId) === String(commentId) && !c.isDeleted
        );

        if (hasReplies) {
          const idx = targetPost.comments.findIndex(
            (c: { _id?: unknown }) => String(c._id) === String(commentId)
          );
          if (idx !== -1) {
            targetPost.comments[idx].isDeleted = true;
            targetPost.comments[idx].message = "Komentar ini telah dihapus";
            targetPost.comments[idx].deletedAt = new Date();
            targetPost.comments[idx].deletedBy = session.id;
          }
        } else {
          targetPost.comments = targetPost.comments.filter(
            (c: { _id?: unknown }) => String(c._id) !== String(commentId)
          );
        }
      }

      await targetPost.save();
      return NextResponse.json({ success: true, message: "Komentar berhasil dihapus", data: targetPost });
    }

    // Action: Update/Edit existing comment
    if (action === "update_comment" || action === "edit_comment") {
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

      const targetPost = await ClassPost.findOne({
        courseClassId: id,
        "comments._id": commentId,
      });

      if (!targetPost) {
        return NextResponse.json(
          { success: false, message: "Komentar tidak ditemukan" },
          { status: 404 }
        );
      }

      const comment = targetPost.comments.find(
        (c: { _id?: unknown }) => String(c._id) === String(commentId)
      );

      const isOwner = comment && String(comment.userId) === session.id;
      const isTeacher = session.role === "guru" && String(courseClass.teacherId) === session.id;

      if (!isOwner && !isTeacher) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda tidak memiliki izin mengedit komentar ini" },
          { status: 403 }
        );
      }

      const updated = await ClassPost.findOneAndUpdate(
        { courseClassId: id, "comments._id": commentId },
        { $set: { "comments.$.message": message.trim() } },
        { new: true }
      );

      return NextResponse.json({ success: true, data: updated });
    }

    // Action: Create new announcement post
    if (!title) {
      return NextResponse.json(
        { success: false, message: "Judul postingan wajib diisi" },
        { status: 400 }
      );
    }

    const titleValidation = validateComment(title);
    if (!titleValidation.isValid) {
      return NextResponse.json(
        { success: false, message: titleValidation.message },
        { status: 400 }
      );
    }

    if (content) {
      const contentValidation = validateComment(content);
      if (!contentValidation.isValid) {
        return NextResponse.json(
          { success: false, message: contentValidation.message },
          { status: 400 }
        );
      }
    }

    const newPost = await ClassPost.create({
      courseClassId: id,
      teacherId: session.id,
      type: "announcement",
      title: title.trim(),
      content: content ? content.trim() : "",
      comments: [],
    });

    return NextResponse.json({ success: true, data: newPost }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat postingan";
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

    const targetPost = await ClassPost.findOne({
      courseClassId: id,
      "comments._id": commentId,
    });

    if (!targetPost) {
      return NextResponse.json(
        { success: false, message: "Komentar tidak ditemukan" },
        { status: 404 }
      );
    }

    const comment = targetPost.comments.find(
      (c: { _id?: unknown }) => String(c._id) === String(commentId)
    );

    const isOwner = comment && String(comment.userId) === session.id;
    const isTeacher = session.role === "guru" && String(targetPost.teacherId) === session.id;
    const isAdmin = session.role === "admin";

    if (!isOwner && !isTeacher && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda tidak memiliki izin mengedit komentar ini" },
        { status: 403 }
      );
    }

    const updated = await ClassPost.findOneAndUpdate(
      { courseClassId: id, "comments._id": commentId },
      { $set: { "comments.$.message": message.trim() } },
      { new: true }
    );

    return NextResponse.json({ success: true, data: updated });
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

    const courseClass = await CourseClass.findById(id);
    if (!courseClass) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

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

    const targetPost = await ClassPost.findOne({
      courseClassId: id,
      "comments._id": commentId,
    });

    if (!targetPost) {
      return NextResponse.json(
        { success: false, message: "Komentar tidak ditemukan" },
        { status: 404 }
      );
    }

    const comment = targetPost.comments.find(
      (c: { _id?: unknown }) => String(c._id) === String(commentId)
    );

    const isOwner = comment && String(comment.userId) === session.id;
    const isTeacher =
      session.role === "guru" &&
      (String(courseClass.teacherId) === session.id || String(targetPost.teacherId) === session.id);
    const isAdmin = session.role === "admin";

    if (!isOwner && !isTeacher && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda tidak memiliki izin menghapus komentar ini" },
        { status: 403 }
      );
    }

    if (comment.parentId) {
      targetPost.comments = targetPost.comments.filter(
        (c: { _id?: unknown }) => String(c._id) !== String(commentId)
      );
    } else {
      const hasReplies = targetPost.comments.some(
        (c: { parentId?: unknown; isDeleted?: boolean }) =>
          String(c.parentId) === String(commentId) && !c.isDeleted
      );

      if (hasReplies) {
        const idx = targetPost.comments.findIndex(
          (c: { _id?: unknown }) => String(c._id) === String(commentId)
        );
        if (idx !== -1) {
          targetPost.comments[idx].isDeleted = true;
          targetPost.comments[idx].message = "Komentar ini telah dihapus";
          targetPost.comments[idx].deletedAt = new Date();
          targetPost.comments[idx].deletedBy = session.id;
        }
      } else {
        targetPost.comments = targetPost.comments.filter(
          (c: { _id?: unknown }) => String(c._id) !== String(commentId)
        );
      }
    }

    await targetPost.save();
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
