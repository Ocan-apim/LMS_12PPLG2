import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { AcademicAssignment } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const deleted = await AcademicAssignment.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Penugasan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Penugasan berhasil dihapus" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus penugasan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
