import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User } from "@/models";

export async function GET() {
  const { session, error } = await requireRole(["kurikulum"]);
  if (error || !session) return error;

  try {
    await connectDB();

    // Authoritative resolution via session.id
    const user: any = await User.findById(session.id)
      .select("-password")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Pengguna kurikulum tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
          nip: user.nip || null,
          phone: user.phone || null,
          photoUrl: user.photoUrl || null,
          isActive: user.isActive !== false,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat profil kurikulum";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
