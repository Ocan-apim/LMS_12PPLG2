import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { AcademicYear, SchoolSetting } from "@/models";

export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const years = await AcademicYear.find().sort({ name: -1, semester: -1 }).lean();
    return NextResponse.json({ success: true, data: years });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat tahun ajaran";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();

    const { name, semester, isActive, startDate, endDate } = body;

    if (!name || !semester) {
      return NextResponse.json(
        { success: false, message: "Nama tahun ajaran dan semester wajib diisi" },
        { status: 400 }
      );
    }

    if (isActive) {
      await AcademicYear.updateMany({}, { isActive: false });
    }

    const year = await AcademicYear.create({
      name: name.trim(),
      semester,
      isActive: Boolean(isActive),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    if (isActive) {
      await SchoolSetting.findOneAndUpdate(
        {},
        { currentAcademicYear: `${year.name} - ${year.semester}` },
        { upsert: true }
      );
    }

    return NextResponse.json({ success: true, data: year }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat tahun ajaran";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
