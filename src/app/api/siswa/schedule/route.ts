import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, Assignment, Submission } from "@/models";

export async function GET(_req: Request) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();

    // 1. Fetch joined classes
    const joinedClasses: any[] = await CourseClass.find({
      studentIds: session.id,
      isArchived: { $ne: true },
    })
      .select("_id name bannerColor subjectId")
      .populate("subjectId", "name code")
      .lean();

    const joinedClassIds = joinedClasses.map((c) => c._id);

    if (joinedClassIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          events: [],
          activeTasks: [],
        },
      });
    }

    // 2. Fetch assignments with deadlines from these classes
    const assignments: any[] = await Assignment.find({
      courseClassId: { $in: joinedClassIds },
      isArchived: { $ne: true },
      isPublished: true,
      dueDate: { $exists: true, $ne: null },
    })
      .populate("courseClassId", "name bannerColor")
      .populate("subjectId", "name code")
      .populate("teacherId", "name")
      .sort({ dueDate: 1 })
      .lean();

    // 3. Fetch student submissions to calculate completion status
    const assignmentIds = assignments.map((a) => a._id);
    const submissions: any[] = await Submission.find({
      assignmentId: { $in: assignmentIds },
      studentId: session.id,
    }).lean();

    const submissionMap = new Map<string, any>();
    submissions.forEach((s) => {
      submissionMap.set(s.assignmentId.toString(), s);
    });

    const now = new Date();

    // 4. Map events
    const events = assignments.map((a: any, idx: number) => {
      const sub = submissionMap.get(a._id.toString());
      const dueDate = new Date(a.dueDate);

      let status: "completed" | "pending" | "late" = "pending";
      if (sub && ["turned_in", "late", "graded"].includes(sub.status)) {
        status = "completed";
      } else if (dueDate < now) {
        status = "late";
      }

      const isQuiz = a.type === "kuis" || a.title.toLowerCase().includes("kuis");
      const eventType: "tugas" | "ujian" | "event" = isQuiz ? "ujian" : "tugas";

      // Color coding
      let color: "orange" | "purple" | "blue" | "green" | "red" = "purple";
      if (isQuiz) {
        color = "green";
      } else if (status === "late") {
        color = "red";
      } else if (status === "completed") {
        color = "blue";
      } else {
        color = "purple";
      }

      // Format date YYYY-MM-DD
      const dateStr = dueDate.toISOString().split("T")[0];
      const timeStr = dueDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      return {
        id: idx + 1,
        assignmentId: a._id.toString(),
        quizId: a.quizId ? a.quizId.toString() : null,
        title: a.title,
        subject: a.subjectId?.name || a.courseClassId?.name || "Mata Pelajaran",
        className: a.courseClassId?.name || "",
        teacherName: a.teacherId?.name || "Guru",
        date: dateStr,
        time: timeStr,
        rawDueDate: a.dueDate,
        color,
        type: eventType,
        status,
        href: isQuiz && a.quizId ? `/siswa/quiz/${a.quizId}` : `/siswa/assignments/${a._id}`,
      };
    });

    // Active upcoming tasks (tasks that are pending or due in the future)
    const activeTasks = events
      .filter((e) => e.status !== "completed")
      .slice(0, 6);

    return NextResponse.json({
      success: true,
      data: {
        events,
        activeTasks,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat jadwal akademik";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
