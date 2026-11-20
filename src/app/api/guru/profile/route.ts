import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User } from "@/models";
import bcrypt from "bcryptjs";

export async function GET(_req: NextRequest) {
  const { session, error } = await requireRole(["guru"]);
  if (error || !session) return error;

  try {
    await connectDB();

    const user = await User.findById(session.id)
      .select("-password")
      .populate("subjects", "name code")
      .populate("homeroomClassId", "name grade")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Data pengguna guru tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat profil guru";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireRole(["guru"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));

    // CRITICAL SECURITY: Strict allowlist on mutable fields
    // Guru may ONLY modify: email, password, and photoUrl.
    const allowedKeys = new Set(["email", "password", "currentPassword", "photoUrl"]);
    const providedKeys = Object.keys(body);

    for (const key of providedKeys) {
      if (!allowedKeys.has(key)) {
        return NextResponse.json(
          {
            success: false,
            message: `Bidang '${key}' tidak dapat diubah oleh guru. Data identitas resmi hanya dapat diubah oleh Administrator.`,
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
      .populate("subjects", "name code")
      .populate("homeroomClassId", "name grade")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Pengaturan akun guru berhasil diperbarui",
      data: { user: updatedUser },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui pengaturan akun guru";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
