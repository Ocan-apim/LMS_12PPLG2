import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, ClassModel, Assignment, User, Notification } from "@/models";

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

    return NextResponse.json(
      { success: true, data: enriched },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
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

    const { name, password, description, classRombelId, assignedRombelIds, bannerColor } = body;

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

    // Collect all targeted rombels
    const targetRombelIds: string[] = [];
    if (Array.isArray(assignedRombelIds)) {
      assignedRombelIds.forEach((rid: any) => {
        if (rid) targetRombelIds.push(String(rid));
      });
    }
    if (classRombelId && !targetRombelIds.includes(String(classRombelId))) {
      targetRombelIds.push(String(classRombelId));
    }

    // Auto-enroll all students belonging to these rombels
    const initialStudentIdSet = new Set<string>();
    const rombelNames: string[] = [];

    if (targetRombelIds.length > 0) {
      // 1. From ClassModel
      const rombelDocs = await ClassModel.find({ _id: { $in: targetRombelIds } });
      rombelDocs.forEach((r) => {
        rombelNames.push(r.name);
        if (Array.isArray(r.studentIds)) {
          r.studentIds.forEach((sid: any) => initialStudentIdSet.add(String(sid)));
        }
      });

      // 2. From User model where classId in targetRombelIds and role === "siswa"
      const studentsInRombels = await User.find({
        classId: { $in: targetRombelIds },
        role: "siswa",
      }).select("_id");
      studentsInRombels.forEach((u) => initialStudentIdSet.add(String(u._id)));
    }

    const initialStudents = Array.from(initialStudentIdSet);
    const primaryRombelId = targetRombelIds[0] || undefined;

    const newClass = await CourseClass.create({
      name: name.trim(),
      description: description ? description.trim() : undefined,
      code,
      password: password.trim(),
      teacherId: session.id,
      classRombelId: primaryRombelId,
      assignedRombelIds: targetRombelIds.length > 0 ? targetRombelIds : undefined,
      bannerColor: bannerColor || "blue",
      studentIds: initialStudents,
      sharedFiles: [],
      isActive: true,
    });

    // Also update ClassModel.studentIds and User.classId if needed, ensuring integrity
    if (primaryRombelId && initialStudents.length > 0) {
      await ClassModel.findByIdAndUpdate(primaryRombelId, {
        $addToSet: { studentIds: { $each: initialStudents } },
      });
    }

    // Send Notification to all enrolled students
    if (initialStudents.length > 0) {
      const rombelDisplay = rombelNames.length > 0 ? rombelNames.join(", ") : "Rombel";
      const notifDocs = initialStudents.map((sid) => ({
        recipientId: sid,
        type: "general" as const,
        title: "Kelas Baru",
        message: `Anda telah ditambahkan ke kelas:\n${newClass.name}\n\nGuru: ${session.name}\nKelas: ${rombelDisplay}`,
        link: `/siswa/courses/${newClass._id}`,
        relatedEntityId: newClass._id,
        relatedEntityType: "CourseClass" as const,
        read: false,
      }));
      await Notification.insertMany(notifDocs);
    }

    const populated = await CourseClass.findById(newClass._id)
      .populate("classRombelId", "name grade")
      .populate("studentIds", "name nisn email");

    return NextResponse.json(
      {
        success: true,
        message: "Kelas berhasil dibuat!",
        data: populated,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
