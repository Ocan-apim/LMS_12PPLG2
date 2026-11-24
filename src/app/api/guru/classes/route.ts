import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import {
  getActiveStudentIdsForRombel,
  syncRombelStudents,
} from "@/lib/rombel-enrollment";
import { requireRole } from "@/lib/session";
import {
  CourseClass,
  ClassModel,
  Assignment,
  Notification,
} from "@/models";

// Helper to generate a 5-character unique class code (existing invitation code generator)
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

    // First find active classes for this teacher to sync any rombel-assigned classes
    const initialClasses = (await CourseClass.find({
      teacherId: session.id,
      isActive: true,
    })
      .select("_id classRombelId")
      .lean()) as Array<{
      _id: mongoose.Types.ObjectId;
      classRombelId?: mongoose.Types.ObjectId;
    }>;

    const distinctRombelIds = Array.from(
      new Set(
        initialClasses
          .map((c) => (c.classRombelId ? String(c.classRombelId) : ""))
          .filter(Boolean)
      )
    );

    if (distinctRombelIds.length > 0) {
      await Promise.all(
        distinctRombelIds.map((rid) => syncRombelStudents(rid))
      );
    }

    const classes = await CourseClass.find({
      teacherId: session.id,
      isActive: true,
    })
      .populate("classRombelId", "name grade academicYear")
      .populate("studentIds", "name nisn email")
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with assignment counts and sanitize credentials for rombel-assigned classes
    const enriched = await Promise.all(
      classes.map(async (c) => {
        const assignmentCount = await Assignment.countDocuments({
          courseClassId: c._id,
        });
        const isRombelMethod = c.enrollmentMethod === "rombel";
        const sanitized: Record<string, unknown> = {
          ...c,
          enrollmentMethod: isRombelMethod ? "rombel" : "invitation",
          studentCount: Array.isArray(c.studentIds) ? c.studentIds.length : 0,
          assignmentCount,
        };
        if (isRombelMethod) {
          delete sanitized.password;
          sanitized.code = "";
        }
        return sanitized;
      })
    );

    return NextResponse.json(
      { success: true, data: enriched },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
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

    const {
      name,
      password,
      description,
      enrollmentMethod: rawEnrollmentMethod,
      classRombelId,
      assignedRombelIds,
      bannerColor,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Judul Mapel / Kelas wajib diisi" },
        { status: 400 }
      );
    }

    // Validate against multiple-rombel assignment
    if (Array.isArray(classRombelId)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Satu kelas mata pelajaran hanya dapat ditugaskan ke satu rombel.",
        },
        { status: 400 }
      );
    }

    const normalizedAssignedList = Array.isArray(assignedRombelIds)
      ? Array.from(
          new Set(
            assignedRombelIds
              .filter((r: unknown) => r !== null && r !== undefined && String(r).trim() !== "")
              .map((r: unknown) => String(r).trim())
          )
        )
      : [];

    if (normalizedAssignedList.length > 1) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Satu kelas mata pelajaran hanya dapat ditugaskan ke satu rombel.",
        },
        { status: 400 }
      );
    }

    const explicitRombelId =
      classRombelId !== undefined &&
      classRombelId !== null &&
      String(classRombelId).trim() !== ""
        ? String(classRombelId).trim()
        : "";

    if (
      explicitRombelId &&
      normalizedAssignedList.length === 1 &&
      normalizedAssignedList[0] !== explicitRombelId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Satu kelas mata pelajaran hanya dapat ditugaskan ke satu rombel.",
        },
        { status: 400 }
      );
    }

    const selectedRombelId =
      explicitRombelId || normalizedAssignedList[0] || "";

    // Determine enrollment method ('rombel' vs 'invitation')
    let enrollmentMethod: "rombel" | "invitation";
    if (rawEnrollmentMethod === "rombel") {
      enrollmentMethod = "rombel";
    } else if (rawEnrollmentMethod === "invitation") {
      enrollmentMethod = "invitation";
    } else if (selectedRombelId && (!password || !String(password).trim())) {
      enrollmentMethod = "rombel";
    } else {
      enrollmentMethod = "invitation";
    }

    // Generate a unique code using the existing code generator
    let code = generateClassCode();
    let existing = await CourseClass.findOne({ code });
    while (existing) {
      code = generateClassCode();
      existing = await CourseClass.findOne({ code });
    }

    let primaryRombelId: mongoose.Types.ObjectId | undefined;
    let rombelName = "";
    let rombelAcademicYear = "2024/2025 - Genap";
    let initialStudents: mongoose.Types.ObjectId[] = [];
    let resolvedPassword = "";

    if (enrollmentMethod === "rombel") {
      if (!selectedRombelId) {
        return NextResponse.json(
          {
            success: false,
            message: "Silakan pilih satu rombel untuk metode Assign ke Rombel",
          },
          { status: 400 }
        );
      }

      if (!mongoose.Types.ObjectId.isValid(selectedRombelId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Rombel yang dipilih tidak valid",
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
          {
            success: false,
            message: "Rombel yang dipilih tidak ditemukan atau tidak aktif",
          },
          { status: 404 }
        );
      }

      primaryRombelId = rombelDoc._id;
      rombelName = rombelDoc.name;
      rombelAcademicYear = rombelDoc.academicYear || rombelAcademicYear;

      // Automatically enroll all active students belonging to this single rombel
      initialStudents = await getActiveStudentIdsForRombel(rombelDoc._id);
    } else {
      // Option B: Existing Kode Undangan method
      if (!password || typeof password !== "string" || !password.trim()) {
        return NextResponse.json(
          { success: false, message: "Password kelas wajib diisi" },
          { status: 400 }
        );
      }
      resolvedPassword = password.trim();

      // If legacy caller supplied a valid single rombel along with password and didn't specify 'invitation' explicitly,
      // preserve backward compatibility; if explicit 'invitation' was selected, do not bind rombel.
      if (rawEnrollmentMethod !== "invitation" && selectedRombelId) {
        if (!mongoose.Types.ObjectId.isValid(selectedRombelId)) {
          return NextResponse.json(
            { success: false, message: "Rombel yang dipilih tidak valid" },
            { status: 400 }
          );
        }
        const rombelDoc = await ClassModel.findOne({
          _id: selectedRombelId,
          isActive: true,
        });
        if (!rombelDoc) {
          return NextResponse.json(
            {
              success: false,
              message: "Rombel yang dipilih tidak ditemukan atau tidak aktif",
            },
            { status: 404 }
          );
        }
        primaryRombelId = rombelDoc._id;
        rombelName = rombelDoc.name;
        initialStudents = await getActiveStudentIdsForRombel(rombelDoc._id);
      }
    }

    const newClass = await CourseClass.create({
      name: name.trim(),
      description:
        description && typeof description === "string" && description.trim()
          ? description.trim()
          : undefined,
      enrollmentMethod,
      code,
      password: resolvedPassword,
      teacherId: session.id,
      classRombelId: primaryRombelId,
      assignedRombelIds: primaryRombelId ? [primaryRombelId] : [],
      academicYear: rombelAcademicYear,
      bannerColor: bannerColor || "blue",
      studentIds: initialStudents,
      sharedFiles: [],
      isActive: true,
    });

    if (primaryRombelId && initialStudents.length > 0) {
      await ClassModel.findByIdAndUpdate(primaryRombelId, {
        $addToSet: { studentIds: { $each: initialStudents } },
      });
    }

    // Send Notification to all auto-enrolled students
    if (initialStudents.length > 0) {
      const rombelDisplay = rombelName || "Rombel";
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

    const populated = (await CourseClass.findById(newClass._id)
      .populate("classRombelId", "name grade academicYear")
      .populate("studentIds", "name nisn email")
      .lean()) as Record<string, unknown> | null;

    const responseData: Record<string, unknown> = {
      ...(populated || {}),
      enrollmentMethod,
      studentCount: Array.isArray(populated?.studentIds)
        ? (populated.studentIds as unknown[]).length
        : 0,
    };

    if (enrollmentMethod === "rombel") {
      delete responseData.password;
      responseData.code = "";
    }

    return NextResponse.json(
      {
        success: true,
        message:
          enrollmentMethod === "rombel"
            ? `Kelas berhasil dibuat dan ditugaskan ke rombel ${rombelName}!`
            : "Kelas berhasil dibuat!",
        data: responseData,
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal membuat kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
