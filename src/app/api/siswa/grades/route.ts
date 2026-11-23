import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, Submission, Assignment, User } from "@/models";
import { resolveSubmissionScoring, roundScore } from "@/lib/quiz-scoring";

export async function GET() {
  // 1. Role Guard
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();

    const studentUser: any = await User.findById(session.id)
      .select("classId")
      .lean();
    const studentRombelId = studentUser?.classId;

    // 2. Fetch all active course classes student has joined
    const joinedClasses: any[] = await CourseClass.find({
      isActive: true,
      $or: [
        { studentIds: session.id },
        ...(studentRombelId
          ? [
              { classRombelId: studentRombelId },
              { assignedRombelIds: studentRombelId },
            ]
          : []),
      ],
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

    // 3. Fetch all submissions strictly belonging to session.id in active classes
    const rawSubmissions: any[] = await Submission.find({
      studentId: session.id,
      courseClassId: { $in: joinedClassIds },
      status: "graded",
    })
      .populate({
        path: "assignmentId",
        select:
          "title maxScore type subjectId courseClassId quizId isArchived",
        populate: {
          path: "quizId",
          select: "title totalPoints maxRawPoints questions isPublished",
        },
      })
      .populate(
        "quizId",
        "title totalPoints maxRawPoints questions isPublished"
      )
      .populate({
        path: "courseClassId",
        select: "name bannerColor teacherId subjectId isActive",
        populate: [
          { path: "teacherId", select: "name title degree" },
          { path: "subjectId", select: "name code category" },
        ],
      })
      .sort({ gradedAt: -1, submittedAt: -1 })
      .lean();

    const submissions = rawSubmissions.filter(
      (sub) =>
        !sub.assignmentId?.isArchived && sub.courseClassId?.isActive !== false
    );

    // 4. Calculate Current GPA / Average using normalized 0-100 grades
    let totalScorePercentages = 0;

    const gradedItems: any[] = [];

    for (const sub of submissions) {
      const quizObj = sub.quizId || sub.assignmentId?.quizId || null;
      const resolved = resolveSubmissionScoring(sub, quizObj, sub.assignmentId);

      // Exclude pending manual essay submissions or invalid max score
      if (!resolved.isFinalGraded || resolved.normalizedScore === null) {
        continue;
      }

      const title = sub.assignmentId?.title || sub.quizId?.title || "Tugas";
      const type = sub.assignmentId?.type || (sub.quizId ? "kuis" : "tugas");
      const className =
        sub.courseClassId?.name ||
        sub.assignmentId?.courseClassId?.name ||
        "Mata Pelajaran";
      const teacherName =
        sub.courseClassId?.teacherId?.name || "Guru Pengampu";

      const normalizedScore = resolved.normalizedScore;
      totalScorePercentages += normalizedScore;

      gradedItems.push({
        _id: sub._id.toString(),
        title,
        type,
        className,
        teacherName,
        score: normalizedScore,
        maxScore: 100,
        rawScore: resolved.rawScore,
        maxRawScore: resolved.maxRawScore,
        normalizedScore,
        gradingStatus: resolved.gradingStatus,
        percentage: normalizedScore,
        feedback: sub.feedback || null,
        submittedAt: sub.submittedAt,
        gradedAt: sub.gradedAt || sub.submittedAt,
        createdAt: sub.createdAt,
      });
    }

    const currentGpa =
      gradedItems.length > 0
        ? roundScore(totalScorePercentages / gradedItems.length)
        : 0;

    // 5. Subject Breakdown per Joined Class
    const subjectBreakdown = await Promise.all(
      joinedClasses.map(async (c: any) => {
        const classSubmissions = gradedItems.filter(
          (item) => item.className === c.name
        );

        let classAverage = 0;
        if (classSubmissions.length > 0) {
          const sum = classSubmissions.reduce(
            (acc, curr) => acc + curr.percentage,
            0
          );
          classAverage = roundScore(sum / classSubmissions.length);
        }

        let letterGrade = "-";
        if (classSubmissions.length > 0) {
          if (classAverage >= 90) letterGrade = "A";
          else if (classAverage >= 80) letterGrade = "B+";
          else if (classAverage >= 70) letterGrade = "B";
          else if (classAverage >= 60) letterGrade = "C";
          else letterGrade = "D";
        }

        const totalClassTasks = await Assignment.countDocuments({
          courseClassId: c._id,
          isArchived: { $ne: true },
          isPublished: true,
        });

        const completedClassTasks = classSubmissions.length;
        const progress =
          totalClassTasks > 0
            ? Math.min(100, Math.round((completedClassTasks / totalClassTasks) * 100))
            : 0;

        const feedbackSub = classSubmissions.find((s) => Boolean(s.feedback));
        const feedback =
          feedbackSub?.feedback ||
          "Progres pembelajaran berjalan dengan baik.";

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

    // 6. Real Grade Trends (grouping by month using normalized score)
    const monthMap = new Map<string, { sum: number; count: number }>();
    gradedItems.forEach((item: any) => {
      const d = new Date(item.gradedAt || item.submittedAt || item.createdAt);
      const monthKey = d.toLocaleDateString("id-ID", { month: "short" });

      const existing = monthMap.get(monthKey) || { sum: 0, count: 0 };
      existing.sum += item.normalizedScore;
      existing.count += 1;
      monthMap.set(monthKey, existing);
    });

    const gradeTrends = Array.from(monthMap.entries()).map(([month, val]) => ({
      month,
      average: roundScore(val.sum / val.count),
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
    const message =
      err instanceof Error ? err.message : "Gagal memuat data nilai";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
