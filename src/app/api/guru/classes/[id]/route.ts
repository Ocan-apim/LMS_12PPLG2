import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, ClassModel, Assignment, Submission, ClassPost, Material, Quiz } from "@/models";
import {
  syncRombelStudents,
  getActiveStudentsForRombelDetailed,
  calculateCourseEnrollmentCompleteness,
} from "@/lib/rombel-enrollment";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin", "kurikulum", "kepsek"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const preClass: any = await CourseClass.findById(id)
      .select("classRombelId assignedRombelIds teacherId enrollmentMethod")
      .lean();
    if (!preClass) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Only auto-sync rombel students if the logged-in teacher owns this class AND enrollmentMethod === "rombel".
    // Never mutate enrollments during Admin/Kepsek/Kurikulum read-only monitoring.
    if (session.role === "guru" && preClass.enrollmentMethod === "rombel") {
      const rombelToSync =
        preClass.classRombelId ||
        (Array.isArray(preClass.assignedRombelIds) && preClass.assignedRombelIds[0]);
      if (rombelToSync) {
        await syncRombelStudents(String(rombelToSync));
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const courseClass: any = await CourseClass.findById(id)
      .populate("subjectId", "name code category")
      .populate("classRombelId", "name grade academicYear maxCapacity")
      .populate("assignedRombelIds", "name grade academicYear maxCapacity")
      .populate("teacherId", "name email nip degree")
      .populate("studentIds", "name email nis nisn gender photoUrl")
      .lean();

    if (!courseClass) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Verify ownership if guru
    if (
      session.role === "guru" &&
      String((courseClass.teacherId as { _id?: unknown })?._id || courseClass.teacherId) !==
        session.id
    ) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke kelas ini" },
        { status: 403 }
      );
    }

    // Fetch assignments for this course class
    const assignments = await Assignment.find({
      courseClassId: id,
      isArchived: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Enrich assignments with submission stats
    const totalStudents = Array.isArray(courseClass.studentIds)
      ? courseClass.studentIds.length
      : 0;

    const enrichedAssignments = await Promise.all(
      assignments.map(async (asg) => {
        const submissions = await Submission.find({ assignmentId: asg._id })
          .select("status score")
          .lean();

        const submittedCount = submissions.length;
        const gradedCount = submissions.filter((s) => s.status === "graded").length;

        return {
          ...asg,
          totalStudents,
          submittedCount,
          gradedCount,
        };
      })
    );

    // Fetch posts / stream items
    const posts = await ClassPost.find({ courseClassId: id })
      .populate("teacherId", "name degree")
      .sort({ isPinned: -1, createdAt: -1 })
      .lean();

    // Fetch materials
    const materials = await Material.find({ courseClassId: id })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch quizzes (Ulangan Harian) for this courseClass
    const quizzes = await Quiz.find({ courseClassId: id })
      .sort({ createdAt: -1 })
      .lean();

    const enrichedQuizzes = await Promise.all(
      quizzes.map(async (q) => {
        const submissions = await Submission.find({ quizId: q._id })
          .select("status score")
          .lean();

        return {
          ...q,
          totalStudents,
          submittedCount: submissions.length,
        };
      })
    );

    const effectiveMethod =
      (courseClass as any).enrollmentMethod ||
      (courseClass.classRombelId ? "rombel" : "invitation");

    const rombelObj: any = courseClass.classRombelId;
    const rombelIdStr = rombelObj ? String(rombelObj._id || rombelObj) : null;
    const rombelNameStr = rombelObj?.name || "-";

    const activeRombelStudents = rombelIdStr
      ? await getActiveStudentsForRombelDetailed(rombelIdStr, rombelNameStr)
      : [];
    const enrollmentMonitoring = calculateCourseEnrollmentCompleteness(
      courseClass,
      activeRombelStudents,
      rombelNameStr
    );

    return NextResponse.json({
      success: true,
      data: {
        ...courseClass,
        enrollmentMethod: effectiveMethod,
        assignments: enrichedAssignments,
        quizzes: enrichedQuizzes,
        posts,
        materials,
        enrollmentMonitoring,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat detail kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const existingClass = await CourseClass.findById(id);
    if (!existingClass) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    if (
      session.role === "guru" &&
      String(existingClass.teacherId) !== session.id
    ) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki izin mengubah kelas ini" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      password,
      bannerColor,
      sharedFiles,
      classRombelId,
      assignedRombelIds,
    } = body;

    // TASK 1 & TASK 3: Enforce strict immutability of classRombelId once assigned
    const existingRombelId = existingClass.classRombelId
      ? String(existingClass.classRombelId)
      : null;

    if (classRombelId !== undefined || assignedRombelIds !== undefined) {
      if (Array.isArray(classRombelId) || (Array.isArray(assignedRombelIds) && assignedRombelIds.length > 1)) {
        return NextResponse.json(
          { success: false, message: "Setiap Kelas Mapel hanya boleh ditetapkan ke tepat 1 Rombel" },
          { status: 400 }
        );
      }

      const requestedRombelId =
        typeof classRombelId === "string" && classRombelId.trim()
          ? classRombelId.trim()
          : Array.isArray(assignedRombelIds) && assignedRombelIds.length === 1 && assignedRombelIds[0]
          ? String(assignedRombelIds[0]).trim()
          : "";

      if (existingRombelId) {
        // Already assigned -> immutable! Reject any attempt to change or clear it
        if (!requestedRombelId || requestedRombelId !== existingRombelId) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Rombel kelas sudah ditetapkan dan bersifat permanen (tidak dapat diubah setelah pembuatan).",
            },
            { status: 400 }
          );
        }
      } else {
        // Legacy Mapel Class without a rombel: controlled one-time assignment allowed ONLY by Admin
        if (session.role !== "admin") {
          return NextResponse.json(
            {
              success: false,
              message:
                "Hanya Admin yang dapat menetapkan Rombel satu kali pada Kelas Mapel lama (legacy).",
            },
            { status: 403 }
          );
        }

        if (!requestedRombelId || !mongoose.Types.ObjectId.isValid(requestedRombelId)) {
          return NextResponse.json(
            { success: false, message: "ID Rombel tidak valid untuk penetapan satu kali" },
            { status: 400 }
          );
        }

        const targetRombel = await ClassModel.findOne({
          _id: requestedRombelId,
          isActive: true,
        });
        if (!targetRombel) {
          return NextResponse.json(
            { success: false, message: "Rombel tujuan tidak ditemukan atau tidak aktif" },
            { status: 404 }
          );
        }

        existingClass.classRombelId = targetRombel._id;
        existingClass.assignedRombelIds = [targetRombel._id];
      }
    }

    if (name !== undefined) {
      if (!String(name).trim()) {
        return NextResponse.json(
          { success: false, message: "Nama kelas tidak boleh kosong" },
          { status: 400 }
        );
      }
      existingClass.name = String(name).trim();
    }
    if (description !== undefined) existingClass.description = String(description).trim();
    if (password !== undefined && String(password).trim()) {
      existingClass.password = String(password).trim();
    }
    if (bannerColor) existingClass.bannerColor = bannerColor;
    if (Array.isArray(sharedFiles)) existingClass.sharedFiles = sharedFiles;

    await existingClass.save();

    const updated = await CourseClass.findById(id)
      .populate("subjectId", "name code category")
      .populate("classRombelId", "name grade academicYear")
      .populate("assignedRombelIds", "name grade academicYear")
      .populate("teacherId", "name email nip degree")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Kelas berhasil diperbarui",
      data: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const existingClass = await CourseClass.findById(id);
    if (!existingClass) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    if (
      session.role === "guru" &&
      String(existingClass.teacherId) !== session.id
    ) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki izin menghapus kelas ini" },
        { status: 403 }
      );
    }

    // TASK 4: Safe Mapel Class Deletion (Soft-Delete Only)
    // Preserve all historical academic data: student submissions, quiz attempts/results,
    // grades, teacher feedback, comments/replies (ClassPost), materials/attachments, and historical studentIds.
    await CourseClass.findByIdAndUpdate(id, { isActive: false });
    await Assignment.updateMany(
      { courseClassId: id },
      { isArchived: true, isPublished: false }
    );

    return NextResponse.json({
      success: true,
      message: "Kelas berhasil diarsipkan secara aman tanpa menghapus riwayat nilai, tugas, kuis, atau diskusi",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
