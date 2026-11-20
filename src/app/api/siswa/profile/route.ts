import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User, CourseClass, Submission } from "@/models";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  // Authorization: Role must be siswa
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();

    // Security: Identity MUST ALWAYS be authoritative from session.id
    // Any query parameter such as ?studentId=... or ?userId=... MUST be ignored.
    const user: any = await User.findById(session.id)
      .select("-password")
      .populate("classId", "name grade academicYear")
      .populate("departmentId", "name code")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    // Enrich with academic statistics for profile view
    const totalClasses = await CourseClass.countDocuments({
      studentIds: session.id,
      isActive: true,
    });

    const completedAssignments = await Submission.countDocuments({
      studentId: session.id,
      status: { $in: ["turned_in", "late", "graded"] },
    });

    const gradedSubmissions = await Submission.find({
      studentId: session.id,
      status: "graded",
      score: { $exists: true, $ne: null },
    })
      .select("score")
      .lean();

    let averageGrade = 0;
    if (gradedSubmissions.length > 0) {
      const sum = gradedSubmissions.reduce(
        (acc: number, curr: any) => acc + (typeof curr.score === "number" ? curr.score : 0),
        0
      );
      averageGrade = Math.round((sum / gradedSubmissions.length) * 10) / 10;
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          nis: user.nis,
          nisn: user.nisn,
          gender: user.gender,
          birthPlace: user.birthPlace,
          birthDate: user.birthDate,
          phone: user.phone,
          photoUrl: user.photoUrl,
          grade: user.grade,
          classId: user.classId,
          departmentId: user.departmentId,
          academicYear: user.academicYear,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        stats: {
          totalClasses,
          completedAssignments,
          averageGrade,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat profil siswa";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  // Authorization: Role must be siswa
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));

    // CRITICAL SECURITY: Strict allowlist on mutable fields
    // Siswa may ONLY modify: email, password, and photoUrl.
    const allowedKeys = new Set(["email", "password", "currentPassword", "photoUrl"]);
    const providedKeys = Object.keys(body);

    for (const key of providedKeys) {
      if (!allowedKeys.has(key)) {
        return NextResponse.json(
          {
            success: false,
            message: `Bidang '${key}' tidak dapat diubah oleh siswa. Data identitas resmi hanya dapat diubah oleh Administrator.`,
          },
          { status: 400 }
        );
      }
    }

    const currentUser = await User.findById(session.id);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {};

    // 1. Email update validation
    if (body.email !== undefined) {
      const emailStr = String(body.email).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        return NextResponse.json(
          { success: false, message: "Format email tidak valid" },
          { status: 400 }
        );
      }

      const existing = await User.findOne({
        email: emailStr,
        _id: { $ne: session.id },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, message: "Email ini sudah digunakan oleh akun lain" },
          { status: 400 }
        );
      }

      updates.email = emailStr;
    }

    // 2. Password update validation (requires currentPassword verification)
    if (body.password !== undefined && body.password !== "") {
      const newPassword = String(body.password);
      const currentPassword = String(body.currentPassword || "");

      if (!currentPassword) {
        return NextResponse.json(
          { success: false, message: "Password saat ini wajib diisi untuk mengubah password" },
          { status: 400 }
        );
      }

      const isCurrentValid = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isCurrentValid) {
        return NextResponse.json(
          { success: false, message: "Password saat ini tidak sesuai" },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: "Password baru minimal terdiri dari 6 karakter" },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updates.password = hashedPassword;
    }

    // 3. Profile picture update
    if (body.photoUrl !== undefined) {
      updates.photoUrl = typeof body.photoUrl === "string" ? body.photoUrl.trim() : "";
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada data perubahan yang diberikan" },
        { status: 400 }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      session.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate("classId", "name grade academicYear")
      .populate("departmentId", "name code")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Pengaturan akun siswa berhasil diperbarui",
      data: { user: updatedUser },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui profil siswa";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
