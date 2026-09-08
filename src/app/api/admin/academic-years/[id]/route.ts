import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { AcademicYear, SchoolSetting } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();
    const body = await req.json();

    const { name, semester, startDate, endDate } = body;

    const updated = await AcademicYear.findByIdAndUpdate(
      id,
      {
        name,
        semester,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, message: "Tahun ajaran tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui tahun ajaran";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const year = await AcademicYear.findById(id);
    if (!year) {
      return NextResponse.json({ success: false, message: "Tahun ajaran tidak ditemukan" }, { status: 404 });
    }

    if (year.isActive) {
      return NextResponse.json(
        { success: false, message: "Tahun ajaran aktif tidak dapat dihapus. Aktifkan tahun ajaran lain terlebih dahulu." },
        { status: 400 }
      );
    }

    await AcademicYear.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Tahun ajaran berhasil dihapus" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus tahun ajaran";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
