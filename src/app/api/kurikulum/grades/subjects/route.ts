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
import { resolveSubmissionScoring, roundScore } from "@/lib/quiz-scoring";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["kurikulum", "kepsek", "admin"]);
  if (error || !session) return error;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const subjectIdParam = searchParams.get("subjectId");
    const academicYearParam = searchParams.get("academicYear");

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

    const [assignments, quizzes] = await Promise.all([
      Assignment.find({
        courseClassId: { $in: courseClassIds },
        isPublished: true,
        isArchived: { $ne: true },
      })
        .select("_id title type maxScore quizId courseClassId createdAt")
        .lean(),
      Quiz.find({
        courseClassId: { $in: courseClassIds },
        isPublished: true,
      })
        .select("_id title totalPoints maxRawPoints questions courseClassId createdAt")
        .lean(),
    ]);

    const assignmentIds = assignments.map((a: any) => a._id);
    const quizIds = quizzes.map((q: any) => q._id);
    const assignMap = new Map<string, any>(
      assignments.map((a: any) => [String(a._id), a])
    );
    const quizMap = new Map<string, any>(
      quizzes.map((q: any) => [String(q._id), q])
    );
    const quizIdSet = new Set(quizIds.map(String));
    const quizAssignmentIdSet = new Set(
      assignments
        .filter((a: any) => a.type === "kuis" || Boolean(a.quizId))
        .map((a: any) => String(a._id))
    );

    const rawSubmissions: any[] = await Submission.find({
      $or: [
        { assignmentId: { $in: assignmentIds } },
        { quizId: { $in: quizIds } },
        { courseClassId: { $in: courseClassIds } },
      ],
      status: "graded",
    })
      .select(
        "assignmentId quizId courseClassId status score rawScore maxRawScore normalizedScore provisionalScore gradingStatus quizAnswers submittedAt gradedAt createdAt"
      )
      .sort({ gradedAt: 1, createdAt: 1 })
      .lean();

    let totalScore = 0;
    let totalCount = 0;
    let assignmentScoreSum = 0;
    let assignmentCount = 0;
    let quizScoreSum = 0;
    let quizCount = 0;

    const classSubMap = new Map<
      string,
      Array<{ normalizedScore: number; isQuiz: boolean }>
    >();
    const periodMap = new Map<string, { sum: number; count: number }>();

    for (const sub of rawSubmissions) {
      const aDoc = sub.assignmentId
        ? assignMap.get(String(sub.assignmentId))
        : null;
      if (aDoc?.isArchived) continue;
      const qIdStr = sub.quizId
        ? String(sub.quizId)
        : aDoc?.quizId
          ? String(aDoc.quizId)
          : null;
      const qDoc = qIdStr ? quizMap.get(qIdStr) : null;

      const resolved = resolveSubmissionScoring(sub, qDoc, aDoc);
      if (!resolved.isFinalGraded || resolved.normalizedScore === null) {
        continue;
      }

      const score = resolved.normalizedScore;
      totalScore += score;
      totalCount++;

      const isQuiz =
        Boolean(sub.quizId) ||
        (sub.quizId && quizIdSet.has(String(sub.quizId))) ||
        (sub.assignmentId && quizAssignmentIdSet.has(String(sub.assignmentId))) ||
        resolved.isQuiz;

      if (isQuiz) {
        quizScoreSum += score;
        quizCount++;
      } else {
        assignmentScoreSum += score;
        assignmentCount++;
      }

      const ccId = String(sub.courseClassId);
      if (!classSubMap.has(ccId)) {
        classSubMap.set(ccId, []);
      }
      classSubMap.get(ccId)!.push({ normalizedScore: score, isQuiz });

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
      totalCount > 0 ? roundScore(totalScore / totalCount) : null;

    const assignmentAverage =
      assignmentCount > 0
        ? roundScore(assignmentScoreSum / assignmentCount)
        : null;

    const quizAverage =
      quizCount > 0 ? roundScore(quizScoreSum / quizCount) : null;

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
        const sum = ccSubs.reduce(
          (acc, curr) => acc + curr.normalizedScore,
          0
        );
        classAvg = roundScore(sum / ccSubs.length);

        const classAssignSubs = ccSubs.filter((s) => !s.isQuiz);
        if (classAssignSubs.length > 0) {
          const sumA = classAssignSubs.reduce(
            (acc, curr) => acc + curr.normalizedScore,
            0
          );
          classAssignAvg = roundScore(sumA / classAssignSubs.length);
        }

        const classQuizSubs = ccSubs.filter((s) => s.isQuiz);
        if (classQuizSubs.length > 0) {
          const sumQ = classQuizSubs.reduce(
            (acc, curr) => acc + curr.normalizedScore,
            0
          );
          classQuizAvg = roundScore(sumQ / classQuizSubs.length);
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

    const trend: Array<{ period: string; average: number }> = [];
    const sortedPeriods = Array.from(periodMap.keys()).sort();
    for (const p of sortedPeriods) {
      const pData = periodMap.get(p)!;
      trend.push({
        period: p,
        average: roundScore(pData.sum / pData.count),
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
    const message =
      err instanceof Error
        ? err.message
        : "Gagal memuat monitoring nilai mapel";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
