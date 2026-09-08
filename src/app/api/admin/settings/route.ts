import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { SchoolSetting } from "@/models";

export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();

    let settings = await SchoolSetting.findOne();
    if (!settings) {
      settings = await SchoolSetting.create({
        schoolName: "SMK Negeri 1 LMS",
        npsn: "20104050",
        address: "Jl. Pendidikan Vokasi No. 10",
        phone: "(021) 555-1234",
        email: "admin@smknegeri1.sch.id",
        headmasterName: "Drs. H. Mulyadi, M.Pd.",
        currentAcademicYear: "2024/2025 - Genap",
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat pengaturan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();

    const {
      schoolName,
      npsn,
      address,
      phone,
      email,
      headmasterName,
      logoUrl,
      currentAcademicYear,
    } = body;

    const settings = await SchoolSetting.findOneAndUpdate(
      {},
      {
        schoolName,
        npsn,
        address,
        phone,
        email,
        headmasterName,
        logoUrl,
        currentAcademicYear,
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, data: settings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui pengaturan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
