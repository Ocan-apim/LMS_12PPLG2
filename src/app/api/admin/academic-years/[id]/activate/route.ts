import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { AcademicYear, SchoolSetting } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const targetYear = await AcademicYear.findById(id);
    if (!targetYear) {
      return NextResponse.json({ success: false, message: "Tahun ajaran tidak ditemukan" }, { status: 404 });
    }

    const currentActive = await AcademicYear.findOne({ isActive: true });
    if (currentActive) {
      const activeStart = parseInt(currentActive.name.match(/\d{4}/)?.[0] || "0", 10);
      const targetStart = parseInt(targetYear.name.match(/\d{4}/)?.[0] || "0", 10);

      const isPast =
        (targetStart > 0 && activeStart > 0 && targetStart < activeStart) ||
        (targetStart === activeStart && currentActive.semester === "Genap" && targetYear.semester === "Ganjil") ||
        (targetYear.endDate && new Date(targetYear.endDate) < new Date());

      if (isPast) {
        return NextResponse.json(
          {
            success: false,
            message: "Tahun ajaran periode lampau tidak dapat diaktifkan kembali",
          },
          { status: 400 }
        );
      }
    }

    // Set all to false, then this to true
    await AcademicYear.updateMany({}, { isActive: false });
    targetYear.isActive = true;
    await targetYear.save();

    await SchoolSetting.findOneAndUpdate(
      {},
      { currentAcademicYear: `${targetYear.name} - ${targetYear.semester}` },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: `Tahun ajaran ${targetYear.name} (${targetYear.semester}) berhasil diaktifkan`,
      data: targetYear,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengaktifkan tahun ajaran";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
