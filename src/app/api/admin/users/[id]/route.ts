import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  isActivationRole,
  isUsernameAvailableForRole,
  validateUsername,
} from "@/lib/activation";
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
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
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

    const currentUser = await User.findById(id);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    const {
      name,
      email,
      loginUsername,
      username,
      role,
      isActive,
      password,
      nip,
      nisn,
      phone,
      isActivated,
      mustChangePassword,
      requireActivation,
    } = body;

    // Prevent admin from deactivating themselves
    if (session?.id === id && isActive === false) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak dapat menonaktifkan akun sendiri",
        },
        { status: 400 }
      );
    }

    const targetRole = role || currentUser.role;
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (nip !== undefined) updateData.nip = nip ? String(nip).trim() : undefined;
    if (nisn !== undefined)
      updateData.nisn = nisn ? String(nisn).trim() : undefined;
    if (phone !== undefined)
      updateData.phone = phone ? String(phone).trim() : undefined;

    // Optional explicit loginUsername update by Admin (editing official name never modifies loginUsername)
    const rawRequestedUsername =
      loginUsername !== undefined ? loginUsername : username;
    if (
      isActivationRole(targetRole) &&
      typeof rawRequestedUsername === "string" &&
      rawRequestedUsername.trim().length > 0 &&
      rawRequestedUsername.trim().toLowerCase() !==
        (currentUser.loginUsername || "").toLowerCase()
    ) {
      const validation = validateUsername(rawRequestedUsername);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, message: validation.message },
          { status: 400 }
        );
      }
      const available = await isUsernameAvailableForRole(
        validation.username,
        targetRole,
        id
      );
      if (!available) {
        return NextResponse.json(
          {
            success: false,
            message: `Username sudah digunakan oleh akun ${targetRole === "guru" ? "Guru" : "Kurikulum"} lain`,
          },
          { status: 400 }
        );
      }
      updateData.loginUsername = validation.username;
    }

    if (password && typeof password === "string" && password.trim()) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
      if (
        isActivationRole(targetRole) &&
        (requireActivation === true || mustChangePassword === true)
      ) {
        updateData.isActivated = false;
        updateData.mustChangePassword = true;
      }
    }

    if (typeof isActivated === "boolean") {
      updateData.isActivated = isActivated;
      if (isActivated) {
        updateData.mustChangePassword = false;
      }
    }
    if (typeof mustChangePassword === "boolean") {
      updateData.mustChangePassword = mustChangePassword;
    }

    const updated = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    }).select("-password");

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Email, NIP, atau username sudah digunakan",
        },
        { status: 400 }
      );
    }
    const message =
      err instanceof Error ? err.message : "Gagal memperbarui pengguna";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: Request, context: RouteContext) {
  return PATCH(req, context);
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
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Pengguna berhasil dihapus",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal menghapus pengguna";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
