import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Subject, User } from "@/models";

export async function GET(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const departmentId = searchParams.get("departmentId");
    const grade = searchParams.get("grade");
    const search = searchParams.get("search");

    const query: Record<string, unknown> = { isActive: true };

    if (category && category !== "all") {
      query.category = category;
    }
    if (departmentId && departmentId !== "all") {
      query.departmentId = departmentId;
    }
    if (grade && grade !== "all") {
      query.grade = grade;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const subjects = await Subject.find(query)
      .populate("departmentId", "name code")
      .populate("teacherIds", "name email nip degree")
      .sort({ category: 1, name: 1 })
      .lean();

    return NextResponse.json({ success: true, data: subjects });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat mata pelajaran";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();

    const { name, code, category, departmentId, grade, teacherIds, description } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, message: "Nama dan kode mata pelajaran wajib diisi" },
        { status: 400 }
      );
    }

    const existing = await Subject.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Mata pelajaran dengan kode ${code} sudah ada` },
        { status: 400 }
      );
    }

    const subject = await Subject.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      category: category || "Umum",
      departmentId: category === "Kejuruan" && departmentId ? departmentId : undefined,
      grade: grade || "Semua",
      teacherIds: Array.isArray(teacherIds) ? teacherIds : [],
      description,
      isActive: true,
    });

    // Also update teachers' subjects list
    if (Array.isArray(teacherIds) && teacherIds.length > 0) {
      await User.updateMany(
        { _id: { $in: teacherIds } },
        { $addToSet: { subjects: subject._id } }
      );
    }

    const populated = await Subject.findById(subject._id)
      .populate("departmentId", "name code")
      .populate("teacherIds", "name email nip degree");

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menambahkan mata pelajaran";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
