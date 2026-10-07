import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { User } from "@/models";
import type { SessionUser } from "@/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const teacher = await User.findOne({ _id: id, role: "guru", isActive: true });
    if (!teacher) {
      return NextResponse.json(
        { success: false, message: "Akun guru tidak ditemukan atau nonaktif" },
        { status: 404 }
      );
    }

    const sessionUser: SessionUser = {
      id: teacher._id.toString(),
      name: teacher.name,
      email: teacher.email,
      role: "guru",
      nip: teacher.nip,
    };

    const token = await createSessionToken(sessionUser);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: `Berhasil login sebagai ${teacher.name}`,
      redirectTo: "/guru",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal melakukan impersonasi guru";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
