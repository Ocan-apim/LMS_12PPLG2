import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, ClassModel, Assignment, User } from "@/models";

// Helper to generate a 5-character unique class code
function generateClassCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET() {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    await connectDB();

    const classes = await CourseClass.find({
      teacherId: session.id,
      isActive: true,
    })
      .populate("classRombelId", "name grade")
      .populate("studentIds", "name nisn email")
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with assignment counts
    const enriched = await Promise.all(
      classes.map(async (c) => {
        const assignmentCount = await Assignment.countDocuments({
          courseClassId: c._id,
        });
        return {
          ...c,
          studentCount: Array.isArray(c.studentIds) ? c.studentIds.length : 0,
          assignmentCount,
        };
      })
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const body = await req.json();

    const { name, password, classRombelId, bannerColor } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Judul Mapel / Kelas wajib diisi" },
        { status: 400 }
      );
    }
    if (!password || !password.trim()) {
      return NextResponse.json(
        { success: false, message: "Password kelas wajib diisi" },
        { status: 400 }
      );
    }

    // Generate a unique code
    let code = generateClassCode();
    let existing = await CourseClass.findOne({ code });
    while (existing) {
      code = generateClassCode();
      existing = await CourseClass.findOne({ code });
    }

    // If linked to a rombel class (e.g. 10 PPLG 1), auto-enroll students from that rombel
    let initialStudents: string[] = [];
    if (classRombelId) {
      const rombel = await ClassModel.findById(classRombelId);
      if (rombel && Array.isArray(rombel.studentIds)) {
        initialStudents = rombel.studentIds.map((id: unknown) => String(id));
      }
    }

    const newClass = await CourseClass.create({
      name: name.trim(),
      code,
      password: password.trim(),
      teacherId: session.id,
      classRombelId: classRombelId || undefined,
      bannerColor: bannerColor || "blue",
      studentIds: initialStudents,
      sharedFiles: [],
      isActive: true,
    });

    const populated = await CourseClass.findById(newClass._id)
      .populate("classRombelId", "name grade")
      .populate("studentIds", "name nisn email");

    return NextResponse.json(
      {
        success: true,
        message: "Kelas berhasil dibuat!",
        data: populated,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
