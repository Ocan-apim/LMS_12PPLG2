import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import { User, ClassModel } from "@/models";

export async function GET(req: Request) {
  const { session, error } = await requireSession();
  if (error || !session) return error;

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 1) {
      return NextResponse.json({
        success: true,
        data: { students: [], classes: [], teachers: [] },
      });
    }

    await connectDB();
    const regex = new RegExp(q, "i");

    const [students, classes, teachers] = await Promise.all([
      User.find({
        role: "siswa",
        $or: [{ name: regex }, { nis: regex }, { nisn: regex }, { email: regex }],
      })
        .select("_id name nis nisn email classId")
        .populate("classId", "name grade")
        .limit(5)
        .lean(),

      ClassModel.find({
        $or: [{ name: regex }, { code: regex }],
      })
        .select("_id name code grade")
        .limit(5)
        .lean(),

      User.find({
        role: "guru",
        $or: [{ name: regex }, { nip: regex }, { email: regex }],
      })
        .select("_id name nip email")
        .limit(5)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: { students, classes, teachers },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal melakukan pencarian";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
