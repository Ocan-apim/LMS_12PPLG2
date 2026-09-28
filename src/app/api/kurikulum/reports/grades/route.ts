import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import {
  CourseClass,
  ClassModel,
  User,
  Subject,
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
    const teacherIdParam = searchParams.get("teacherId");
    const classIdParam = searchParams.get("classId");
    const academicYearParam = searchParams.get("academicYear");

    // Validate ID parameters
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

    // Build filter for CourseClass
    const courseClassQuery: Record<string, any> = { isActive: true };

    if (subjectIdParam) {
      courseClassQuery.subjectId = subjectIdParam;
    }
    if (teacherIdParam) {
      courseClassQuery.teacherId = teacherIdParam;
    }
    if (academicYearParam) {
      courseClassQuery.academicYear = academicYearParam;
    }

    // If classIdParam is provided, it could be a Class (rombel) or CourseClass
    if (classIdParam) {
      const rombel: any = await ClassModel.findById(classIdParam).lean();
      if (rombel) {
        courseClassQuery.classRombelId = rombel._id;
      } else {
        courseClassQuery._id = classIdParam;
      }
    }

    // Find all matching CourseClasses
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

    // Collect all enrolled students across these course classes
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

    // Fetch assignments and quizzes for these course classes
    const [assignments, quizzes] = await Promise.all([
      Assignment.find({
        courseClassId: { $in: courseClassIds },
        isPublished: true,
        isArchived: { $ne: true },
      })
        .select("_id title type courseClassId")
        .lean(),
      Quiz.find({
        courseClassId: { $in: courseClassIds },
        isPublished: true,
      })
        .select("_id title courseClassId")
        .lean(),
    ]);

    const assignmentIds = assignments.map((a: any) => a._id);
    const quizIds = quizzes.map((q: any) => q._id);
    const quizIdSet = new Set(quizIds.map(String));

    // Fetch graded submissions
    const submissions: any[] = await Submission.find({
      courseClassId: { $in: courseClassIds },
      status: "graded",
      score: { $exists: true, $ne: null },
    })
      .select("studentId courseClassId assignmentId quizId score")
      .lean();

    // Map submissions by key: `${studentId}_${courseClassId}`
    const subMap = new Map<string, any[]>();
    for (const sub of submissions) {
      const key = `${sub.studentId}_${sub.courseClassId}`;
      if (!subMap.has(key)) {
        subMap.set(key, []);
      }
      subMap.get(key)!.push(sub);
    }

    // Generate rows per student per courseClass
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
          const sum = stSubs.reduce((acc, curr) => acc + curr.score, 0);
          finalAvg = Math.round((sum / stSubs.length) * 10) / 10;

          const assignSubs = stSubs.filter(
            (s) => !s.quizId && !quizIdSet.has(String(s.assignmentId))
          );
          if (assignSubs.length > 0) {
            const sumA = assignSubs.reduce((acc, curr) => acc + curr.score, 0);
            assignAvg = Math.round((sumA / assignSubs.length) * 10) / 10;
          }

          const qSubs = stSubs.filter(
            (s) => Boolean(s.quizId) || quizIdSet.has(String(s.assignmentId))
          );
          if (qSubs.length > 0) {
            const sumQ = qSubs.reduce((acc, curr) => acc + curr.score, 0);
            quizAvg = Math.round((sumQ / qSubs.length) * 10) / 10;
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

    // Sort by class name then student name
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
    const message = err instanceof Error ? err.message : "Gagal memuat laporan nilai";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
