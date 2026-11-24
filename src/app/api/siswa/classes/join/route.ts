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

    if (!code || !password) {
      return NextResponse.json(
        { success: false, message: "Kode kelas dan password wajib diisi" },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase();
    const cleanPassword = String(password).trim();

    const courseClass = await CourseClass.findOne({
      code: cleanCode,
      isActive: true,
    });

    if (!courseClass) {
      return NextResponse.json(
        {
          success: false,
          message: "Kode kelas tidak ditemukan atau kelas sudah tidak aktif",
        },
        { status: 404 }
      );
    }

    if (courseClass.password && courseClass.password !== cleanPassword) {
      return NextResponse.json(
        { success: false, message: "Password kelas tidak sesuai" },
        { status: 401 }
      );
    }

    const alreadyJoined = courseClass.studentIds.some(
      (id: unknown) => String(id) === session.id
    );

    if (alreadyJoined) {
      return NextResponse.json(
        { success: false, message: "Anda sudah terdaftar di kelas ini" },
        { status: 400 }
      );
    }

    // Use $addToSet to prevent duplicate enrollments
    await CourseClass.findByIdAndUpdate(courseClass._id, {
      $addToSet: { studentIds: session.id },
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil bergabung ke kelas ${courseClass.name}`,
      data: {
        _id: courseClass._id,
        name: courseClass.name,
        code: courseClass.code,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal bergabung ke kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
