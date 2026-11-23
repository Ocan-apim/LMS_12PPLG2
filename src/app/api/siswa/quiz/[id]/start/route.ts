import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Quiz, Assignment, CourseClass, Submission, User } from "@/models";
import mongoose from "mongoose";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function verifyStudentQuizClassMembership(
  studentId: string,
  courseClass: Record<string, any> | null
): Promise<boolean> {
  if (!courseClass) return false;
  const studentIds = Array.isArray(courseClass.studentIds)
    ? courseClass.studentIds.map((sid: unknown) => String(sid))
    : [];
  if (studentIds.includes(studentId)) return true;

  const studentUser = (await User.findById(studentId)
    .select("classId")
    .lean()) as { classId?: unknown } | null;
  const studentRombelId = studentUser?.classId ? String(studentUser.classId) : null;
  if (!studentRombelId) return false;

  const classRombelStr = courseClass.classRombelId
    ? String(courseClass.classRombelId)
    : null;
  const assignedRombelStrs = Array.isArray(courseClass.assignedRombelIds)
    ? courseClass.assignedRombelIds.map((r: unknown) => String(r))
    : [];

  if (
    studentRombelId === classRombelStr ||
    assignedRombelStrs.includes(studentRombelId)
  ) {
    await CourseClass.findByIdAndUpdate(courseClass._id, {
      $addToSet: { studentIds: studentId },
    });
    return true;
  }

  return false;
}

export async function POST(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "ID Kuis tidak valid" },
        { status: 404 }
      );
    }

    // 1. Resolve Quiz & Associated Assignment
    let quiz: any = await Quiz.findById(id);
    let assignment: any = null;

    if (quiz) {
      assignment = await Assignment.findOne({
        quizId: quiz._id,
        isArchived: { $ne: true },
      });
    } else {
      assignment = await Assignment.findById(id);
      if (assignment && assignment.quizId) {
        quiz = await Quiz.findById(assignment.quizId);
      }
    }

    if (!quiz || quiz.isPublished === false) {
      return NextResponse.json(
        { success: false, message: "Kuis tidak ditemukan atau belum diterbitkan" },
        { status: 404 }
      );
    }

    // 2. Security Check: Enforce class membership
    const courseClass: any = await CourseClass.findById(quiz.courseClassId).lean();
    const enrolled = await verifyStudentQuizClassMembership(session.id, courseClass);
    if (!enrolled) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda tidak terdaftar di kelas kuis ini",
        },
        { status: 403 }
      );
    }

    // 3. Check Existing Attempt
    const queryCond: Record<string, unknown>[] = [
      { quizId: quiz._id, studentId: session.id },
    ];
    if (assignment) {
      queryCond.push({ assignmentId: assignment._id, studentId: session.id });
    }

    let submission = await Submission.findOne({ $or: queryCond });

    const now = new Date();
    const durationSeconds = quiz.durationSeconds || 60;

    if (submission) {
      if (["graded", "turned_in", "late"].includes(submission.status)) {
        return NextResponse.json(
          {
            success: false,
            message: "Kuis sudah selesai dikerjakan dan tidak dapat diulang kembali.",
          },
          { status: 400 }
        );
      }

      // If already started, compute remaining time
      let startedAt = submission.startedAt || now;
      if (!submission.startedAt) {
        submission.startedAt = now;
        await submission.save();
        startedAt = now;
      }

      const elapsed = Math.floor(
        (now.getTime() - new Date(startedAt).getTime()) / 1000
      );
      const remainingSeconds = Math.max(0, durationSeconds - elapsed);

      return NextResponse.json({
        success: true,
        message: "Melanjutkan sesi kuis",
        data: {
          startedAt,
          durationSeconds,
          remainingSeconds,
          isExpired: remainingSeconds <= 0,
        },
      });
    }

    // 4. Create New Attempt
    submission = await Submission.create({
      assignmentId: assignment?._id || quiz._id,
      quizId: quiz._id,
      studentId: session.id,
      courseClassId: quiz.courseClassId,
      status: "assigned",
      gradingStatus: "not_started",
      startedAt: now,
      submittedAt: now,
    });

    return NextResponse.json({
      success: true,
      message: "Kuis berhasil dimulai",
      data: {
        startedAt: now,
        durationSeconds,
        remainingSeconds: durationSeconds,
        isExpired: false,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memulai kuis";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
