import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { ClassPost, CourseClass } from "@/models";

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

    const { action, title, content, postId, message } = body;

    // Action: Add comment to post or general class discussion
    if (action === "comment" && message) {
      let targetPostId = postId;
      if (!targetPostId || targetPostId === "general") {
        let targetPost = await ClassPost.findOne({ courseClassId: id }).sort({ createdAt: -1 });
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
              createdAt: new Date(),
            },
          },
        },
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
