import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import {
  ClassModel,
  CourseClass,
  User,
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
    const classIdParam = searchParams.get("classId");
    const academicYearParam = searchParams.get("academicYear");

    const classRombels = await ClassModel.find({ isActive: true })
      .sort({ name: 1 })
      .select("_id name grade academicYear studentIds")
      .lean();

    const classesList = classRombels.map((c: any) => ({
      id: String(c._id),
      name: c.name,
      grade: c.grade,
      academicYear: c.academicYear,
      studentCount: (c.studentIds || []).length,
    }));

    if (classesList.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          classesList: [],
          classInfo: null,
          summary: {
            average: null,
            distribution: { A: 0, B: 0, C: 0, D: 0 },
            academicProgress: 0,
          },
          students: [],
        },
      });
    }

    let targetClassId = classIdParam;
    if (targetClassId && !mongoose.Types.ObjectId.isValid(targetClassId)) {
      return NextResponse.json(
        { success: false, message: "classId tidak valid" },
        { status: 400 }
      );
    }

    let selectedRombel: any = null;
    if (targetClassId) {
      selectedRombel = await ClassModel.findById(targetClassId).lean();
    }
    if (!selectedRombel) {
      selectedRombel = classRombels[0];
      targetClassId = String(selectedRombel._id);
    }

    const studentQuery: Record<string, any> = {
      role: "siswa",
      isActive: true,
    };
    if (selectedRombel.studentIds && selectedRombel.studentIds.length > 0) {
      studentQuery._id = { $in: selectedRombel.studentIds };
    } else {
      studentQuery.classId = selectedRombel._id;
    }

    const students: any[] = await User.find(studentQuery)
      .select("_id name nis nisn email")
      .sort({ name: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);

    const courseClassQuery: Record<string, any> = {
      $or: [
        { classRombelId: selectedRombel._id },
        { studentIds: { $in: studentIds } },
      ],
      isActive: true,
    };
    if (academicYearParam) {
      courseClassQuery.academicYear = academicYearParam;
    }

    const courseClasses: any[] = await CourseClass.find(courseClassQuery)
      .select("_id name subjectId academicYear")
      .lean();

    const courseClassIds = courseClasses.map((cc) => cc._id);

    const assignments: any[] = await Assignment.find({
      courseClassId: { $in: courseClassIds },
      isPublished: true,
      isArchived: { $ne: true },
    })
      .select("_id title type courseClassId maxScore quizId")
      .lean();

    const assignmentIds = assignments.map((a) => a._id);
    const assignMap = new Map<string, any>(
      assignments.map((a) => [String(a._id), a])
    );

    const quizzes: any[] = await Quiz.find({
      courseClassId: { $in: courseClassIds },
      isPublished: true,
    })
      .select("_id title courseClassId totalPoints maxRawPoints questions")
      .lean();

    const quizIds = quizzes.map((q) => q._id);
    const quizMap = new Map<string, any>(
      quizzes.map((q) => [String(q._id), q])
    );

    const linkedQuizIds = new Set(
      assignments
        .map((a) => (a.quizId ? String(a.quizId) : null))
        .filter(Boolean) as string[]
    );
    const standaloneQuizzes = quizzes.filter(
      (q) => !linkedQuizIds.has(String(q._id))
    );
    const totalLmsActivities = assignments.length + standaloneQuizzes.length;

    const submissions: any[] = await Submission.find({
      studentId: { $in: studentIds },
      $or: [
        { assignmentId: { $in: assignmentIds } },
        { quizId: { $in: quizIds } },
        { courseClassId: { $in: courseClassIds } },
      ],
    }).lean();

    const studentSubMap = new Map<string, any[]>();
    for (const sub of submissions) {
      const sId = String(sub.studentId);
      if (!studentSubMap.has(sId)) {
        studentSubMap.set(sId, []);
      }
      studentSubMap.get(sId)!.push(sub);
    }

    const distribution = { A: 0, B: 0, C: 0, D: 0 };
    let classTotalScore = 0;
    let classGradedCount = 0;
    let totalProgressSum = 0;

    const studentRows = students.map((st) => {
      const stSubs = studentSubMap.get(String(st._id)) || [];

      const completedSubs = stSubs.filter(
        (s) =>
          s.status === "turned_in" ||
          s.status === "late" ||
          s.status === "graded"
      );
      const studentProgress =
        totalLmsActivities > 0
          ? Math.min(
              100,
              Math.round((completedSubs.length / totalLmsActivities) * 100)
            )
          : 0;
      totalProgressSum += studentProgress;

      const resolvedGraded: Array<{ normalizedScore: number; isQuiz: boolean }> = [];
      for (const s of stSubs) {
        const aDoc = s.assignmentId
          ? assignMap.get(String(s.assignmentId))
          : null;
        if (aDoc?.isArchived) continue;
        const qIdStr = s.quizId
          ? String(s.quizId)
          : aDoc?.quizId
            ? String(aDoc.quizId)
            : null;
        const qDoc = qIdStr ? quizMap.get(qIdStr) : null;

        const resolved = resolveSubmissionScoring(s, qDoc, aDoc);
        if (resolved.isFinalGraded && resolved.normalizedScore !== null) {
          resolvedGraded.push({
            normalizedScore: resolved.normalizedScore,
            isQuiz:
              Boolean(s.quizId) ||
              aDoc?.type === "kuis" ||
              Boolean(aDoc?.quizId) ||
              resolved.isQuiz,
          });
        }
      }

      let studentAvg: number | null = null;
      let assignmentAvg: number | null = null;
      let quizAvg: number | null = null;

      if (resolvedGraded.length > 0) {
        const sum = resolvedGraded.reduce(
          (acc, curr) => acc + curr.normalizedScore,
          0
        );
        studentAvg = roundScore(sum / resolvedGraded.length);
        classTotalScore += sum;
        classGradedCount += resolvedGraded.length;

        if (studentAvg >= 85) distribution.A++;
        else if (studentAvg >= 75) distribution.B++;
        else if (studentAvg >= 60) distribution.C++;
        else distribution.D++;
      }

      const gradedAssignments = resolvedGraded.filter((s) => !s.isQuiz);
      if (gradedAssignments.length > 0) {
        const sumA = gradedAssignments.reduce(
          (acc, curr) => acc + curr.normalizedScore,
          0
        );
        assignmentAvg = roundScore(sumA / gradedAssignments.length);
      }

      const gradedQuizzes = resolvedGraded.filter((s) => s.isQuiz);
      if (gradedQuizzes.length > 0) {
        const sumQ = gradedQuizzes.reduce(
          (acc, curr) => acc + curr.normalizedScore,
          0
        );
        quizAvg = roundScore(sumQ / gradedQuizzes.length);
      }

      return {
        studentId: String(st._id),
        studentName: st.name,
        nis: st.nis || st.nisn || null,
        average: studentAvg,
        assignmentAverage: assignmentAvg,
        quizAverage: quizAvg,
        academicProgress: studentProgress,
      };
    });

    const classAverage =
      classGradedCount > 0
        ? roundScore(classTotalScore / classGradedCount)
        : null;

    const classProgress =
      students.length > 0
        ? Math.round(totalProgressSum / students.length)
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        classesList,
        classInfo: {
          id: String(selectedRombel._id),
          name: selectedRombel.name,
          grade: selectedRombel.grade,
          academicYear: selectedRombel.academicYear || "2024/2025",
          totalStudents: students.length,
        },
        summary: {
          average: classAverage,
          distribution,
          academicProgress: classProgress,
        },
        students: studentRows,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Gagal memuat monitoring nilai kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
