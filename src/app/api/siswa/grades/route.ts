import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, Submission, Assignment } from "@/models";

export async function GET(req: Request) {
  // 1. Role Guard
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();

    // 2. Fetch all active course classes student has joined
    const joinedClasses: any[] = await CourseClass.find({
      studentIds: session.id,
      isArchived: { $ne: true },
    })
      .populate("teacherId", "name title degree email")
      .populate("subjectId", "name code category")
      .lean();

    const joinedClassIds = joinedClasses.map((c) => c._id);

    if (joinedClassIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          currentGpa: 0,
          totalGraded: 0,
          gradeTrends: [],
          subjectBreakdown: [],
          gradedItems: [],
        },
      });
    }

    // 3. Fetch all graded submissions strictly belonging to session.id
    const submissions: any[] = await Submission.find({
      studentId: session.id,
      status: "graded",
    })
      .populate("assignmentId", "title maxScore type subjectId courseClassId")
      .populate("quizId", "title totalPoints")
      .populate({
        path: "courseClassId",
        select: "name bannerColor teacherId subjectId",
        populate: [
          { path: "teacherId", select: "name title degree" },
          { path: "subjectId", select: "name code category" },
        ],
      })
      .sort({ gradedAt: -1, submittedAt: -1 })
      .lean();

    // 4. Calculate Current GPA / Average
    let totalScoreSum = 0;
    let totalPossibleSum = 0;
    let totalScorePercentages = 0;

    const gradedItems = submissions.map((sub: any) => {
      const title = sub.assignmentId?.title || sub.quizId?.title || "Tugas";
      const type = sub.assignmentId?.type || (sub.quizId ? "kuis" : "tugas");
      const className =
        sub.courseClassId?.name ||
        sub.assignmentId?.courseClassId?.name ||
        "Mata Pelajaran";
      const teacherName =
        sub.courseClassId?.teacherId?.name || "Guru Pengampu";
      const maxScore = Number(sub.assignmentId?.maxScore || sub.quizId?.totalPoints) || 100;
      const score = Number(sub.score) || 0;
      const percentage = Math.round((score / maxScore) * 100);

      totalScoreSum += score;
      totalPossibleSum += maxScore;
      totalScorePercentages += percentage;

      return {
        _id: sub._id.toString(),
        title,
        type,
        className,
        teacherName,
        score,
        maxScore,
        percentage,
        feedback: sub.feedback || null,
        submittedAt: sub.submittedAt,
        gradedAt: sub.gradedAt || sub.submittedAt,
      };
    });

    const currentGpa =
      gradedItems.length > 0
        ? Math.round(totalScorePercentages / gradedItems.length)
        : 0;

    // 5. Subject Breakdown per Joined Class
    const subjectBreakdown = await Promise.all(
      joinedClasses.map(async (c: any) => {
        const classSubmissions = gradedItems.filter(
          (item) => item.className === c.name
        );

        let classAverage = 0;
        if (classSubmissions.length > 0) {
          const sum = classSubmissions.reduce((acc, curr) => acc + curr.percentage, 0);
          classAverage = Math.round(sum / classSubmissions.length);
        }

        // Letter Grade mapping
        let letterGrade = "-";
        if (classSubmissions.length > 0) {
          if (classAverage >= 90) letterGrade = "A";
          else if (classAverage >= 80) letterGrade = "B+";
          else if (classAverage >= 70) letterGrade = "B";
          else if (classAverage >= 60) letterGrade = "C";
          else letterGrade = "D";
        }

        // Count assignments & progress
        const totalClassTasks = await Assignment.countDocuments({
          courseClassId: c._id,
          isArchived: { $ne: true },
          isPublished: true,
        });

        const completedClassTasks = classSubmissions.length;
        const progress =
          totalClassTasks > 0
            ? Math.round((completedClassTasks / totalClassTasks) * 100)
            : 0;

        // Latest teacher feedback for this class
        const feedbackSub = classSubmissions.find((s) => Boolean(s.feedback));
        const feedback = feedbackSub?.feedback || "Progres pembelajaran berjalan dengan baik.";

        return {
          courseClassId: c._id.toString(),
          subjectName: c.subjectId?.name || c.name,
          className: c.name,
          teacherName: c.teacherId?.name || "Guru Pengampu",
          letterGrade,
          averageScore: classAverage,
          progress,
          completedTasks: completedClassTasks,
          totalTasks: totalClassTasks,
          feedback,
        };
      })
    );

    // 6. Real Grade Trends (grouping by month)
    const monthMap = new Map<string, { sum: number; count: number }>();
    submissions.forEach((sub: any) => {
      const d = new Date(sub.gradedAt || sub.submittedAt || sub.createdAt);
      const monthKey = d.toLocaleDateString("id-ID", { month: "short" });
      const maxScore = Number(sub.assignmentId?.maxScore || sub.quizId?.totalPoints) || 100;
      const score = Number(sub.score) || 0;
      const percentage = Math.round((score / maxScore) * 100);

      const existing = monthMap.get(monthKey) || { sum: 0, count: 0 };
      existing.sum += percentage;
      existing.count += 1;
      monthMap.set(monthKey, existing);
    });

    const gradeTrends = Array.from(monthMap.entries()).map(([month, val]) => ({
      month,
      average: Math.round(val.sum / val.count),
    }));

    return NextResponse.json({
      success: true,
      data: {
        currentGpa,
        totalGraded: gradedItems.length,
        gradeTrends,
        subjectBreakdown,
        gradedItems,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat data nilai";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
