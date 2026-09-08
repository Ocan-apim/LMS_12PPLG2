import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const user = await User.findById(id).select("-password");
    if (!user) {
      return NextResponse.json({ success: false, message: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const { error, session } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();
    const body = await req.json();

    const { name, email, role, isActive, password, nip, nisn, phone } = body;

    // Prevent admin from deactivating themselves
    if (session?.id === id && isActive === false) {
      return NextResponse.json(
        { success: false, message: "Anda tidak dapat menonaktifkan akun sendiri" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (nip !== undefined) updateData.nip = nip;
    if (nisn !== undefined) updateData.nisn = nisn;
    if (phone !== undefined) updateData.phone = phone;

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updated = await User.findByIdAndUpdate(id, updateData, { new: true }).select("-password");
    if (!updated) {
      return NextResponse.json({ success: false, message: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui pengguna";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error, session } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    if (session?.id === id) {
      return NextResponse.json(
        { success: false, message: "Anda tidak dapat menghapus akun sendiri" },
        { status: 400 }
      );
    }

    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Pengguna berhasil dihapus" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus pengguna";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
