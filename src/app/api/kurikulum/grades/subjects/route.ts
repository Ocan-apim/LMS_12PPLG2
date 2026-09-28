import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import {
  Subject,
  CourseClass,
  Assignment,
  Quiz,
  Submission,
} from "@/models";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["kurikulum"]);
  if (error || !session) return error;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const subjectIdParam = searchParams.get("subjectId");
    const academicYearParam = searchParams.get("academicYear");

    // Fetch all active subjects for dropdown
    const subjects = await Subject.find({ isActive: true })
      .sort({ name: 1 })
      .select("_id name code category")
      .lean();

    const subjectsList = subjects.map((s: any) => ({
      id: String(s._id),
      name: s.name,
      code: s.code,
      category: s.category,
    }));

    if (subjectsList.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          subjectsList: [],
          subjectInfo: null,
          overallAverage: null,
          classComparison: [],
          trend: [],
          components: { assignmentAverage: null, quizAverage: null },
          classesBreakdown: [],
        },
      });
    }

    // Determine selected subject
    let targetSubjectId = subjectIdParam;
    if (targetSubjectId && !mongoose.Types.ObjectId.isValid(targetSubjectId)) {
      return NextResponse.json(
        { success: false, message: "subjectId tidak valid" },
        { status: 400 }
      );
    }

    let selectedSubject: any = null;
    if (targetSubjectId) {
      selectedSubject = await Subject.findById(targetSubjectId).lean();
    }
    if (!selectedSubject) {
      selectedSubject = subjects[0];
      targetSubjectId = String(selectedSubject._id);
    }

    // Find all CourseClasses for this subject
    const courseClassQuery: Record<string, any> = {
      subjectId: selectedSubject._id,
      isActive: true,
    };
    if (academicYearParam) {
      courseClassQuery.academicYear = academicYearParam;
    }

    const courseClasses: any[] = await CourseClass.find(courseClassQuery)
      .populate("teacherId", "name")
      .populate("classRombelId", "name grade")
      .lean();

    const courseClassIds = courseClasses.map((cc) => cc._id);

    // Find assignments and quizzes for these course classes
    const [assignments, quizzes] = await Promise.all([
      Assignment.find({
        courseClassId: { $in: courseClassIds },
        isPublished: true,
        isArchived: { $ne: true },
      })
        .select("_id title type courseClassId createdAt")
        .lean(),
      Quiz.find({
        courseClassId: { $in: courseClassIds },
        isPublished: true,
      })
        .select("_id title courseClassId createdAt")
        .lean(),
    ]);

    const assignmentIds = assignments.map((a: any) => a._id);
    const quizIds = quizzes.map((q: any) => q._id);

    // Fetch all graded submissions
    const submissions: any[] = await Submission.find({
      $or: [
        { assignmentId: { $in: assignmentIds } },
        { quizId: { $in: quizIds } },
        { courseClassId: { $in: courseClassIds } },
      ],
      status: "graded",
      score: { $exists: true, $ne: null },
    })
      .select("assignmentId quizId courseClassId score submittedAt gradedAt createdAt")
      .sort({ gradedAt: 1, createdAt: 1 })
      .lean();

    // 1. Calculate overall average and component averages
    let totalScore = 0;
    let assignmentScoreSum = 0;
    let assignmentCount = 0;
    let quizScoreSum = 0;
    let quizCount = 0;

    const quizIdSet = new Set(quizIds.map(String));

    // Group submissions by courseClassId for class comparison and breakdown
    const classSubMap = new Map<string, any[]>();
    // Group submissions by period (month YYYY-MM) for trend
    const periodMap = new Map<string, { sum: number; count: number }>();

    for (const sub of submissions) {
      const score = sub.score as number;
      totalScore += score;

      const isQuiz = Boolean(sub.quizId) || quizIdSet.has(String(sub.assignmentId));
      if (isQuiz) {
        quizScoreSum += score;
        quizCount++;
      } else {
        assignmentScoreSum += score;
        assignmentCount++;
      }

      // Group by class
      const ccId = String(sub.courseClassId);
      if (!classSubMap.has(ccId)) {
        classSubMap.set(ccId, []);
      }
      classSubMap.get(ccId)!.push(sub);

      // Period for trend
      const dateVal = sub.gradedAt || sub.submittedAt || sub.createdAt;
      if (dateVal) {
        const d = new Date(dateVal);
        const periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, { sum: 0, count: 0 });
        }
        const currP = periodMap.get(periodKey)!;
        currP.sum += score;
        currP.count++;
      }
    }

    const overallAverage =
      submissions.length > 0
        ? Math.round((totalScore / submissions.length) * 10) / 10
        : null;

    const assignmentAverage =
      assignmentCount > 0
        ? Math.round((assignmentScoreSum / assignmentCount) * 10) / 10
        : null;

    const quizAverage =
      quizCount > 0
        ? Math.round((quizScoreSum / quizCount) * 10) / 10
        : null;

    // 2. Class Comparison and Breakdown
    const classComparison: any[] = [];
    const classesBreakdown: any[] = [];

    for (const cc of courseClasses) {
      const ccSubs = classSubMap.get(String(cc._id)) || [];
      const className = cc.classRombelId?.name || cc.name;
      const teacherName = cc.teacherId?.name || "Guru Pengampu";

      let classAvg: number | null = null;
      let classAssignAvg: number | null = null;
      let classQuizAvg: number | null = null;

      if (ccSubs.length > 0) {
        const sum = ccSubs.reduce((acc, curr) => acc + curr.score, 0);
        classAvg = Math.round((sum / ccSubs.length) * 10) / 10;

        const classAssignSubs = ccSubs.filter(
          (s) => !s.quizId && !quizIdSet.has(String(s.assignmentId))
        );
        if (classAssignSubs.length > 0) {
          const sumA = classAssignSubs.reduce((acc, curr) => acc + curr.score, 0);
          classAssignAvg = Math.round((sumA / classAssignSubs.length) * 10) / 10;
        }

        const classQuizSubs = ccSubs.filter(
          (s) => Boolean(s.quizId) || quizIdSet.has(String(s.assignmentId))
        );
        if (classQuizSubs.length > 0) {
          const sumQ = classQuizSubs.reduce((acc, curr) => acc + curr.score, 0);
          classQuizAvg = Math.round((sumQ / classQuizSubs.length) * 10) / 10;
        }
      }

      classComparison.push({
        classId: String(cc._id),
        className,
        average: classAvg,
      });

      const status =
        classAvg !== null
          ? classAvg >= 75
            ? "Tuntas"
            : "Perlu Peningkatan"
          : "Belum Ada Nilai";

      classesBreakdown.push({
        courseClassId: String(cc._id),
        className,
        teacherName,
        assignmentAverage: classAssignAvg,
        quizAverage: classQuizAvg,
        finalAverage: classAvg,
        status,
      });
    }

    // 3. Chronological Trend Array
    const trend: Array<{ period: string; average: number }> = [];
    const sortedPeriods = Array.from(periodMap.keys()).sort();
    for (const p of sortedPeriods) {
      const pData = periodMap.get(p)!;
      trend.push({
        period: p,
        average: Math.round((pData.sum / pData.count) * 10) / 10,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        subjectsList,
        subjectInfo: {
          id: String(selectedSubject._id),
          name: selectedSubject.name,
          code: selectedSubject.code,
          category: selectedSubject.category,
        },
        overallAverage,
        classComparison,
        trend,
        components: {
          assignmentAverage,
          quizAverage,
        },
        classesBreakdown,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat monitoring nilai mapel";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
