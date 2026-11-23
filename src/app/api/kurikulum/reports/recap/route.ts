import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import {
  SchoolSetting,
  ClassModel,
  CourseClass,
  User,
  Submission,
  Assignment,
  Quiz,
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
    const studentIdParam = searchParams.get("studentId");

    // 1. Fetch School Setting
    const schoolDoc: any = await SchoolSetting.findOne().lean();
    const school = {
      schoolName: schoolDoc?.schoolName || "SMK Negeri 1",
      npsn: schoolDoc?.npsn || "12345678",
      address: schoolDoc?.address || "Jl. Pendidikan Kejuruan No. 1",
      phone: schoolDoc?.phone || "(021) 1234567",
      email: schoolDoc?.email || "info@smknegeri1.sch.id",
      logoUrl: schoolDoc?.logoUrl || null,
      headmasterName: schoolDoc?.headmasterName || "Drs. H. Mulyadi, M.Pd.",
    };

    // 2. Resolve Class and Students
    let targetClass: any = null;
    if (classIdParam && mongoose.Types.ObjectId.isValid(classIdParam)) {
      targetClass = await ClassModel.findById(classIdParam).lean();
    }
    if (!targetClass) {
      targetClass = await ClassModel.findOne({ isActive: true })
        .sort({ name: 1 })
        .lean();
    }

    const studentQuery: Record<string, any> = { role: "siswa", isActive: true };
    if (studentIdParam && mongoose.Types.ObjectId.isValid(studentIdParam)) {
      studentQuery._id = studentIdParam;
    } else if (targetClass) {
      if (targetClass.studentIds && targetClass.studentIds.length > 0) {
        studentQuery._id = { $in: targetClass.studentIds };
      } else {
        studentQuery.classId = targetClass._id;
      }
    }

    const students: any[] = await User.find(studentQuery)
      .select("_id name nis nisn classId")
      .populate("classId", "name grade")
      .sort({ name: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);

    // 3. Find active CourseClasses for this class
    const courseClassQuery: Record<string, any> = { isActive: true };
    if (targetClass) {
      courseClassQuery.$or = [
        { classRombelId: targetClass._id },
        { studentIds: { $in: studentIds } },
      ];
    }
    if (academicYearParam) {
      courseClassQuery.academicYear = academicYearParam;
    }

    const courseClasses: any[] = await CourseClass.find(courseClassQuery)
      .populate("subjectId", "name code")
      .populate("teacherId", "name")
      .populate("classRombelId", "name")
      .lean();

    const courseClassIds = courseClasses.map((cc) => cc._id);

    const [assignments, quizzes] = await Promise.all([
      Assignment.find({
        courseClassId: { $in: courseClassIds },
        isArchived: { $ne: true },
      })
        .select("_id title type maxScore quizId courseClassId")
        .lean(),
      Quiz.find({ courseClassId: { $in: courseClassIds } })
        .select("_id title totalPoints maxRawPoints questions courseClassId")
        .lean(),
    ]);

    const assignMap = new Map<string, any>(
      assignments.map((a: any) => [String(a._id), a])
    );
    const quizMap = new Map<string, any>(
      quizzes.map((q: any) => [String(q._id), q])
    );
    const quizIdSet = new Set(quizzes.map((q: any) => String(q._id)));
    const quizAssignmentIdSet = new Set(
      assignments
        .filter((a: any) => a.type === "kuis" || Boolean(a.quizId))
        .map((a: any) => String(a._id))
    );

    const submissions: any[] = await Submission.find({
      studentId: { $in: studentIds },
      courseClassId: { $in: courseClassIds },
      status: "graded",
    })
      .select(
        "studentId courseClassId assignmentId quizId status score rawScore maxRawScore normalizedScore provisionalScore gradingStatus quizAnswers"
      )
      .lean();

    const subMap = new Map<string, Array<{ normalizedScore: number; isQuiz: boolean }>>();
    for (const s of submissions) {
      const aDoc = s.assignmentId ? assignMap.get(String(s.assignmentId)) : null;
      if (aDoc?.isArchived) continue;
      const qIdStr = s.quizId
        ? String(s.quizId)
        : aDoc?.quizId
          ? String(aDoc.quizId)
          : null;
      const qDoc = qIdStr ? quizMap.get(qIdStr) : null;

      const resolved = resolveSubmissionScoring(s, qDoc, aDoc);
      if (!resolved.isFinalGraded || resolved.normalizedScore === null) {
        continue;
      }

      const isQuiz =
        Boolean(s.quizId) ||
        (s.quizId && quizIdSet.has(String(s.quizId))) ||
        (s.assignmentId && quizAssignmentIdSet.has(String(s.assignmentId))) ||
        resolved.isQuiz;

      const key = `${s.studentId}_${s.courseClassId}`;
      if (!subMap.has(key)) {
        subMap.set(key, []);
      }
      subMap.get(key)!.push({
        normalizedScore: resolved.normalizedScore,
        isQuiz,
      });
    }

    const rows = students.map((st) => {
      const studentClass =
        (st.classId as any)?.name || targetClass?.name || "Kelas";

      const subjectResults: Array<{
        subjectId: string;
        subjectName: string;
        teacherName: string;
        assignmentAverage: number | null;
        quizAverage: number | null;
        average: number | null;
      }> = [];

      let totalSubjectScore = 0;
      let gradedSubjectsCount = 0;

      for (const cc of courseClasses) {
        const isEnrolled =
          Array.isArray(cc.studentIds) &&
          cc.studentIds.some((sid: any) => String(sid) === String(st._id));

        if (
          !isEnrolled &&
          targetClass &&
          String(cc.classRombelId?._id || cc.classRombelId) !==
            String(targetClass._id)
        ) {
          continue;
        }

        const key = `${st._id}_${cc._id}`;
        const stSubs = subMap.get(key) || [];

        let avg: number | null = null;
        let assignAvg: number | null = null;
        let quizAvg: number | null = null;

        if (stSubs.length > 0) {
          const sum = stSubs.reduce(
            (acc, curr) => acc + curr.normalizedScore,
            0
          );
          avg = roundScore(sum / stSubs.length);
          totalSubjectScore += avg;
          gradedSubjectsCount++;

          const assignSubs = stSubs.filter((s) => !s.isQuiz);
          if (assignSubs.length > 0) {
            const sumA = assignSubs.reduce(
              (acc, curr) => acc + curr.normalizedScore,
              0
            );
            assignAvg = roundScore(sumA / assignSubs.length);
          }

          const qSubs = stSubs.filter((s) => s.isQuiz);
          if (qSubs.length > 0) {
            const sumQ = qSubs.reduce(
              (acc, curr) => acc + curr.normalizedScore,
              0
            );
            quizAvg = roundScore(sumQ / qSubs.length);
          }
        }

        subjectResults.push({
          subjectId: String(cc.subjectId?._id || cc.subjectId),
          subjectName: cc.subjectId?.name || cc.name,
          teacherName: cc.teacherId?.name || "Guru",
          assignmentAverage: assignAvg,
          quizAverage: quizAvg,
          average: avg,
        });
      }

      const overallAverage =
        gradedSubjectsCount > 0
          ? roundScore(totalSubjectScore / gradedSubjectsCount)
          : null;

      return {
        studentId: String(st._id),
        studentName: st.name,
        nis: st.nis || null,
        nisn: st.nisn || null,
        className: studentClass,
        subjects: subjectResults,
        overallAverage,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        school,
        academicYear:
          academicYearParam ||
          schoolDoc?.currentAcademicYear ||
          targetClass?.academicYear ||
          "2024/2025",
        generatedAt: new Date().toISOString(),
        rows,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memuat rekap laporan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
