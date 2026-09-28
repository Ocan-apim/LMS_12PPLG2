import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, Material } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin", "siswa"]);
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

    // Fetch materials linked to this courseClass
    const materials = await Material.find({ courseClassId: id })
      .sort({ createdAt: -1 })
      .lean();

    // Also include sharedFiles on courseClass
    const sharedFiles = courseClass.sharedFiles || [];

    return NextResponse.json({
      success: true,
      data: {
        materials,
        sharedFiles,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat materi kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin"]);
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

    const body = await req.json();
    const { title, description, content, fileUrl, attachments } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "Judul materi wajib diisi" },
        { status: 400 }
      );
    }

    const newMaterial = await Material.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      content: content ? content.trim() : "",
      fileUrl: fileUrl || undefined,
      courseClassId: id,
      teacherId: session.id,
      attachments: Array.isArray(attachments) ? attachments : [],
      isPublished: true,
    });

    // If attachments present, also keep CourseClass.sharedFiles synced
    if (Array.isArray(attachments) && attachments.length > 0) {
      await CourseClass.findByIdAndUpdate(id, {
        $push: { sharedFiles: { $each: attachments } },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Materi berhasil ditambahkan",
        data: newMaterial,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat materi kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
