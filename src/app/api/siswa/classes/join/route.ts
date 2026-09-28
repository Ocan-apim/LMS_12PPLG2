import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass } from "@/models";

export async function POST(req: Request) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const body = await req.json();
    const { code, password } = body;

    if (!code || !code.trim()) {
      return NextResponse.json(
        { success: false, message: "Kode kelas wajib diisi" },
        { status: 400 }
      );
    }

    if (!password || !password.trim()) {
      return NextResponse.json(
        { success: false, message: "Password kelas wajib diisi" },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanPassword = password.trim();

    const courseClass = await CourseClass.findOne({
      code: cleanCode,
      isActive: true,
    });

    if (!courseClass) {
      return NextResponse.json(
        { success: false, message: "Kelas dengan kode tersebut tidak ditemukan" },
        { status: 404 }
      );
    }

    // Verify class password (separate from user account password)
    if (courseClass.password !== cleanPassword) {
      return NextResponse.json(
        { success: false, message: "Password kelas salah" },
        { status: 403 }
      );
    }

    // Check if student already joined
    const studentIdStr = session.id;
    const isAlreadyMember = courseClass.studentIds
      .map((sid: unknown) => String(sid))
      .includes(studentIdStr);

    if (isAlreadyMember) {
      return NextResponse.json({
        success: true,
        message: "Anda sudah terdaftar di kelas ini",
        data: courseClass,
      });
    }

    // Add student to class
    courseClass.studentIds.push(studentIdStr);
    await courseClass.save();

    return NextResponse.json({
      success: true,
      message: `Berhasil bergabung ke kelas ${courseClass.name}!`,
      data: courseClass,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal bergabung ke kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
