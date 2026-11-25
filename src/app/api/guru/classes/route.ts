import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, ClassModel, Assignment, Subject, Quiz } from "@/models";
import { getActiveStudentIdsForRombel, syncRombelStudents } from "@/lib/rombel-enrollment";

function generateClassCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(req: Request) {
  const { session, error } = await requireRole(["guru", "admin", "kurikulum", "kepsek"]);
  if (error || !session) return error;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const academicYear = searchParams.get("academicYear") || "";

    const query: Record<string, unknown> = {
      isActive: true,
    };

    if (session.role === "guru") {
      query.teacherId = session.id;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    if (academicYear) {
      query.academicYear = academicYear;
    }

    // Sync rombel students for active classes linked to a rombel when requested by Guru
    if (session.role === "guru") {
      const preClasses = await CourseClass.find(query)
        .select("classRombelId assignedRombelIds")
        .lean();
      const rombelIdsToSync = new Set<string>();
      for (const pc of preClasses) {
        if (pc.classRombelId) rombelIdsToSync.add(String(pc.classRombelId));
        if (Array.isArray(pc.assignedRombelIds)) {
          for (const rid of pc.assignedRombelIds) {
            if (rid) rombelIdsToSync.add(String(rid));
          }
        }
      }
      if (rombelIdsToSync.size > 0) {
        await Promise.all(Array.from(rombelIdsToSync).map((rid) => syncRombelStudents(rid)));
      }
    }

    const classes = await CourseClass.find(query)
      .populate("subjectId", "name code category")
      .populate("classRombelId", "name grade academicYear")
      .populate("assignedRombelIds", "name grade academicYear")
      .populate("teacherId", "name nip")
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with assignment count, quiz count, and student count
    const enriched = await Promise.all(
      classes.map(async (cls) => {
        const [assignmentCount, quizCount] = await Promise.all([
          Assignment.countDocuments({
            courseClassId: cls._id,
            isArchived: { $ne: true },
          }),
          Quiz.countDocuments({
            courseClassId: cls._id,
          }),
        ]);

        const effectiveMethod =
          (cls as { enrollmentMethod?: "rombel" | "invitation" }).enrollmentMethod ||
          (cls.classRombelId ? "rombel" : "invitation");

        return {
          ...cls,
          enrollmentMethod: effectiveMethod,
          studentCount: Array.isArray(cls.studentIds) ? cls.studentIds.length : 0,
          assignmentCount,
          quizCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat daftar kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const body = await req.json();

    const {
      name,
      subjectId,
      classRombelId,
      assignedRombelIds,
      enrollmentMethod,
      password,
      description,
      academicYear = "2026/2027 - Ganjil",
      bannerColor = "blue",
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Nama kelas wajib diisi" },
        { status: 400 }
      );
    }

    // TASK 1: Selecting ONE rombel is strictly mandatory for every newly created Mapel Class
    if (Array.isArray(classRombelId)) {
      return NextResponse.json(
        { success: false, message: "Setiap Kelas Mapel hanya boleh ditetapkan ke tepat 1 Rombel" },
        { status: 400 }
      );
    }

    if (Array.isArray(assignedRombelIds) && assignedRombelIds.length > 1) {
      return NextResponse.json(
        { success: false, message: "Setiap Kelas Mapel hanya boleh memiliki 1 Rombel tujuan" },
        { status: 400 }
      );
    }

    const selectedRombelId =
      typeof classRombelId === "string" && classRombelId.trim()
        ? classRombelId.trim()
        : Array.isArray(assignedRombelIds) && assignedRombelIds.length === 1 && typeof assignedRombelIds[0] === "string"
        ? assignedRombelIds[0].trim()
        : "";

    if (!selectedRombelId || !mongoose.Types.ObjectId.isValid(selectedRombelId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Wajib memilih 1 Rombel tujuan sebelum membuat Kelas Mapel",
        },
        { status: 400 }
      );
    }

    const rombelDoc = await ClassModel.findOne({
      _id: selectedRombelId,
      isActive: true,
    });
    if (!rombelDoc) {
      return NextResponse.json(
        { success: false, message: "Rombel yang dipilih tidak ditemukan atau tidak aktif" },
        { status: 404 }
      );
    }

    if (!password || !String(password).trim()) {
      return NextResponse.json(
        { success: false, message: "Password undangan kelas wajib diisi" },
        { status: 400 }
      );
    }

    const effectivePassword = String(password).trim();

    // Generate unique 5-char invitation code so invitation credentials always remain functional
    let code = generateClassCode();
    let exists = await CourseClass.findOne({ code });
    let attempts = 0;
    while (exists && attempts < 10) {
      code = generateClassCode();
      exists = await CourseClass.findOne({ code });
      attempts++;
    }

    // Preserve unified enrollment behavior:
    // All active students belonging to the selected rombel automatically receive access,
    // while the generated invitation code and mandatory password also remain available.
    const method: "rombel" | "invitation" =
      enrollmentMethod === "invitation" ? "invitation" : "rombel";
    const initialStudents = await getActiveStudentIdsForRombel(rombelDoc._id);

    // Resolve default subject if not provided
    let resolvedSubjectId = subjectId || undefined;
    if (!resolvedSubjectId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anySubject: any = await Subject.findOne({ isActive: true }).lean();
      if (anySubject) {
        resolvedSubjectId = anySubject._id;
      }
    }

    const newCourseClass = await CourseClass.create({
      name: name.trim(),
      code,
      password: effectivePassword,
      enrollmentMethod: method,
      teacherId: session.id,
      subjectId: resolvedSubjectId,
      classRombelId: rombelDoc._id,
      assignedRombelIds: [rombelDoc._id],
      description: description?.trim() || "",
      academicYear,
      bannerColor,
      studentIds: initialStudents,
      isActive: true,
    });

    await syncRombelStudents(rombelDoc._id);

    const populated = await CourseClass.findById(newCourseClass._id)
      .populate("subjectId", "name code category")
      .populate("classRombelId", "name grade academicYear")
      .populate("assignedRombelIds", "name grade academicYear")
      .populate("teacherId", "name nip")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Kelas berhasil dibuat",
        data: populated,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat kelas baru";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
