import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { ClassPost, CourseClass } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin", "siswa"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

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
  const { session, error } = await requireRole(["guru", "admin", "siswa"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();
    const body = await req.json();

    const { action, title, content, postId, message } = body;

    // Action: Add comment to existing post
    if (action === "comment" && postId && message) {
      const updated = await ClassPost.findByIdAndUpdate(
        postId,
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
