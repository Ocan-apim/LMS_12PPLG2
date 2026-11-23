import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import {
  CourseClass,
  ClassModel,
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
    const subjectIdParam = searchParams.get("subjectId");
    const teacherIdParam = searchParams.get("teacherId");
    const classIdParam = searchParams.get("classId");
    const academicYearParam = searchParams.get("academicYear");

    if (subjectIdParam && !mongoose.Types.ObjectId.isValid(subjectIdParam)) {
      return NextResponse.json(
        { success: false, message: "subjectId tidak valid" },
        { status: 400 }
      );
    }
    if (teacherIdParam && !mongoose.Types.ObjectId.isValid(teacherIdParam)) {
      return NextResponse.json(
        { success: false, message: "teacherId tidak valid" },
        { status: 400 }
      );
    }
    if (classIdParam && !mongoose.Types.ObjectId.isValid(classIdParam)) {
      return NextResponse.json(
        { success: false, message: "classId tidak valid" },
        { status: 400 }
      );
    }

    const courseClassQuery: Record<string, any> = { isActive: true };
    if (subjectIdParam) courseClassQuery.subjectId = subjectIdParam;
    if (teacherIdParam) courseClassQuery.teacherId = teacherIdParam;
    if (academicYearParam) courseClassQuery.academicYear = academicYearParam;

    if (classIdParam) {
      const rombel: any = await ClassModel.findById(classIdParam).lean();
      if (rombel) {
        courseClassQuery.classRombelId = rombel._id;
      } else {
        courseClassQuery._id = classIdParam;
      }
    }

    const courseClasses: any[] = await CourseClass.find(courseClassQuery)
      .populate("teacherId", "name")
      .populate("subjectId", "name code")
      .populate("classRombelId", "name grade")
      .lean();

    if (courseClasses.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          filters: {
            subjectId: subjectIdParam || null,
            teacherId: teacherIdParam || null,
            classId: classIdParam || null,
            academicYear: academicYearParam || null,
          },
          rows: [],
        },
      });
    }

    const courseClassIds = courseClasses.map((cc) => cc._id);

    const studentIdSet = new Set<string>();
    courseClasses.forEach((cc) => {
      (cc.studentIds || []).forEach((sid: any) => studentIdSet.add(String(sid)));
    });

    const students: any[] = await User.find({
      _id: { $in: Array.from(studentIdSet) },
      role: "siswa",
    })
      .select("_id name nis nisn")
      .sort({ name: 1 })
      .lean();

    const studentMap = new Map<string, any>(
      students.map((s) => [String(s._id), s])
    );

    const [assignments, quizzes] = await Promise.all([
      Assignment.find({
        courseClassId: { $in: courseClassIds },
        isPublished: true,
        isArchived: { $ne: true },
      })
        .select("_id title type maxScore quizId courseClassId")
        .lean(),
      Quiz.find({
        courseClassId: { $in: courseClassIds },
        isPublished: true,
      })
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
      courseClassId: { $in: courseClassIds },
      status: "graded",
    })
      .select(
        "studentId courseClassId assignmentId quizId status score rawScore maxRawScore normalizedScore provisionalScore gradingStatus quizAnswers"
      )
      .lean();

    const subMap = new Map<string, Array<{ sub: any; normalizedScore: number; isQuiz: boolean }>>();
    for (const sub of submissions) {
      const aDoc = sub.assignmentId ? assignMap.get(String(sub.assignmentId)) : null;
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

      const isQuiz =
        Boolean(sub.quizId) ||
        (sub.quizId && quizIdSet.has(String(sub.quizId))) ||
        (sub.assignmentId && quizAssignmentIdSet.has(String(sub.assignmentId))) ||
        resolved.isQuiz;

      const key = `${sub.studentId}_${sub.courseClassId}`;
      if (!subMap.has(key)) {
        subMap.set(key, []);
      }
      subMap.get(key)!.push({
        sub,
        normalizedScore: resolved.normalizedScore,
        isQuiz,
      });
    }

    type ReportRow = {
      studentId: string;
      studentName: string;
      nis: string | null;
      className: string;
      subjectName: string;
      teacherName: string;
      assignmentAverage: number | null;
      quizAverage: number | null;
      finalAverage: number | null;
    };

    const rows: ReportRow[] = [];

    for (const cc of courseClasses) {
      const className = cc.classRombelId?.name || cc.name;
      const subjectName = cc.subjectId?.name || cc.name;
      const teacherName = cc.teacherId?.name || "Guru";

      for (const sId of cc.studentIds || []) {
        const student = studentMap.get(String(sId));
        if (!student) continue;

        const key = `${sId}_${cc._id}`;
        const stSubs = subMap.get(key) || [];

        let assignAvg: number | null = null;
        let quizAvg: number | null = null;
        let finalAvg: number | null = null;

        if (stSubs.length > 0) {
          const sum = stSubs.reduce((acc, curr) => acc + curr.normalizedScore, 0);
          finalAvg = roundScore(sum / stSubs.length);

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

        rows.push({
          studentId: String(student._id),
          studentName: student.name,
          nis: student.nis || student.nisn || null,
          className,
          subjectName,
          teacherName,
          assignmentAverage: assignAvg,
          quizAverage: quizAvg,
          finalAverage: finalAvg,
        });
      }
    }

    rows.sort((a, b) => {
      const cmpClass = a.className.localeCompare(b.className);
      if (cmpClass !== 0) return cmpClass;
      return a.studentName.localeCompare(b.studentName);
    });

    return NextResponse.json({
      success: true,
      data: {
        filters: {
          subjectId: subjectIdParam || null,
          teacherId: teacherIdParam || null,
          classId: classIdParam || null,
          academicYear: academicYearParam || null,
        },
        rows,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memuat laporan nilai";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
