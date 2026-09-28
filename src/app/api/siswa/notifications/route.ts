import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Notification, CourseClass, Assignment, Submission } from "@/models";

export async function GET(req: NextRequest) {
  // Authorization: Role must be siswa
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();

    // 1. Find classes that this student has actively joined
    const joinedClasses = await CourseClass.find({
      studentIds: session.id,
      isActive: true,
    })
      .select("_id name")
      .lean();

    const joinedClassIds = joinedClasses.map((c: any) => c._id);

    // 2. Deterministic Notification Synchronization:
    // Derives events from current LMS data for this student's classes and submissions.
    // Deduplication is enforced via { recipientId, type, relatedEntityId } upsert.
    if (joinedClassIds.length > 0) {
      // (a) Assignments published in student's classes
      const publishedAssignments = await Assignment.find({
        courseClassId: { $in: joinedClassIds },
        isPublished: true,
        isArchived: { $ne: true },
      })
        .populate("courseClassId", "name")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      for (const a of publishedAssignments) {
        const isQuiz = a.type === "kuis" || Boolean(a.quizId);
        const className = (a.courseClassId as any)?.name || "Mata Pelajaran";
        const notifType = isQuiz ? "quiz" : "assignment";
        const title = isQuiz ? `Kuis Baru: ${a.title}` : `Tugas Baru: ${a.title}`;
        const message = isQuiz
          ? `Kuis baru telah tersedia di kelas ${className}. Segera kerjakan sebelum batas waktu.`
          : `Tugas baru telah dipublikasikan di kelas ${className}.`;
        const link = isQuiz
          ? `/siswa/quiz/${a.quizId || a._id}`
          : `/siswa/assignments/${a._id}`;

        await Notification.updateOne(
          {
            recipientId: session.id,
            type: notifType,
            relatedEntityId: a._id,
          },
          {
            $setOnInsert: {
              recipientId: session.id,
              type: notifType,
              title,
              message,
              link,
              relatedEntityId: a._id,
              relatedEntityType: "Assignment",
              read: false,
              createdAt: a.createdAt || new Date(),
            },
          },
          { upsert: true }
        );
      }

      // (b) Graded submissions for this student
      const gradedSubmissions = await Submission.find({
        studentId: session.id,
        status: "graded",
      })
        .populate("assignmentId", "title")
        .sort({ gradedAt: -1, updatedAt: -1 })
        .limit(10)
        .lean();

      for (const sub of gradedSubmissions) {
        const assignmentTitle = (sub.assignmentId as any)?.title || "Tugas";
        const title = `Nilai Diberikan: ${assignmentTitle}`;
        const message = `Guru telah memberikan penilaian untuk ${assignmentTitle}. Nilai Anda: ${
          sub.score ?? 0
        }`;
        const link = `/siswa/grades`;

        await Notification.updateOne(
          {
            recipientId: session.id,
            type: "grade",
            relatedEntityId: sub._id,
          },
          {
            $setOnInsert: {
              recipientId: session.id,
              type: "grade",
              title,
              message,
              link,
              relatedEntityId: sub._id,
              relatedEntityType: "Submission",
              read: false,
              createdAt: sub.gradedAt || sub.updatedAt || new Date(),
            },
          },
          { upsert: true }
        );
      }
    }

    // 3. Fetch notifications exclusively for the authenticated student (session.id)
    const notifications = await Notification.find({ recipientId: session.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipientId: session.id,
      read: false,
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat notifikasi";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
