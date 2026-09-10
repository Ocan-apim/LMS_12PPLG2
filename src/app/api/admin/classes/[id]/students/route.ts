import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { ClassModel, User } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const students = await User.find({ classId: id, role: "siswa", isActive: true })
      .select("name nis nisn email gender birthPlace birthDate")
      .sort({ name: 1 })
      .lean();

    const formatted = students.map((st) => ({
      ...st,
      password: (st as { initialPassword?: string }).initialPassword || "password123",
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat siswa di kelas ini";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
