import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import {
  CourseClass,
  Assignment,
  Quiz,
  Submission,
  User,
  ClassModel,
} from "@/models";
import { resolveSubmissionScoring, roundScore } from "@/lib/quiz-scoring";

export async function GET(req: Request) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const courseClassId = searchParams.get("courseClassId");

    // Get all teacher's classes for the dropdown
    const teacherClasses = await CourseClass.find({
      ...(session.role === "guru" ? { teacherId: session.id } : {}),
      isActive: true,
    })
      .populate("classRombelId", "name grade")
      .select("_id name code classRombelId")
      .lean();

    const targetClassId =
      courseClassId ||
      (teacherClasses[0]?._id ? String(teacherClasses[0]._id) : null);

    let selectedClass: any = null;
    let assignments: any[] = [];
    let students: any[] = [];
    let matrix: Array<{
      student: { _id: unknown; name: string; nisn: string; email: string };
      scores: Record<string, number | null>;
      average: number;
      gradeLetter: string;
      status: string;
    }> = [];

    if (targetClassId) {
      selectedClass = await CourseClass.findById(targetClassId)
        .populate("classRombelId", "name grade")
        .lean();

      if (selectedClass) {
        if (
          session.role === "guru" &&
          selectedClass.teacherId.toString() !== session.id
        ) {
          return NextResponse.json(
            {
              success: false,
              message: "Akses ditolak: Anda bukan pengampu kelas ini",
            },
            { status: 403 }
          );
        }

        // Assignments and standalone Quizzes in this class
        const [rawAssignments, rawQuizzes] = await Promise.all([
          Assignment.find({
            courseClassId: targetClassId,
            isArchived: { $ne: true },
          })
            .sort({ createdAt: 1 })
            .select("_id title maxScore type quizId")
            .lean(),
          Quiz.find({
            courseClassId: targetClassId,
            isPublished: true,
          })
            .sort({ createdAt: 1 })
            .select("_id title totalPoints maxRawPoints questions")
            .lean(),
        ]);

        const quizMap = new Map<string, any>();
        rawQuizzes.forEach((q: any) => quizMap.set(String(q._id), q));

        const linkedQuizIds = new Set<string>();
        rawAssignments.forEach((a: any) => {
          if (a.quizId) linkedQuizIds.add(String(a.quizId));
        });

        const standaloneQuizzes = rawQuizzes.filter(
          (q: any) => !linkedQuizIds.has(String(q._id))
        );

        assignments = [
          ...rawAssignments.map((a: any) => ({
            _id: a._id,
            title: a.title,
            maxScore: a.type === "kuis" || a.quizId ? 100 : a.maxScore || 100,
            type: a.type || (a.quizId ? "kuis" : "tugas"),
            quizId: a.quizId || null,
          })),
          ...standaloneQuizzes.map((q: any) => ({
            _id: q._id,
            title: q.title,
            maxScore: 100,
            type: "kuis",
            quizId: q._id,
            isStandaloneQuiz: true,
          })),
        ];

        const assignmentIds = rawAssignments.map((a: any) => a._id);
        const quizIds = rawQuizzes.map((q: any) => q._id);

        const submissions = await Submission.find({
          $or: [
            ...(assignmentIds.length > 0
              ? [{ assignmentId: { $in: assignmentIds } }]
              : []),
            ...(quizIds.length > 0 ? [{ quizId: { $in: quizIds } }] : []),
            { courseClassId: targetClassId },
          ],
        }).lean();

        const studentIdSet = new Set<string>();
        (selectedClass.studentIds || []).forEach((s: any) =>
          studentIdSet.add(String(s))
        );

        const rombelId =
          selectedClass.classRombelId?._id || selectedClass.classRombelId;
        if (rombelId) {
          const rombelDoc: any = await ClassModel.findById(rombelId).lean();
          if (rombelDoc && Array.isArray(rombelDoc.studentIds)) {
            rombelDoc.studentIds.forEach((s: any) =>
              studentIdSet.add(String(s))
            );
          }
          const usersInRombel = await User.find({
            classId: rombelId,
            role: "siswa",
          })
            .select("_id")
            .lean();
          usersInRombel.forEach((u) => studentIdSet.add(String(u._id)));
        }

        submissions.forEach((sub) => {
          if (sub.studentId) studentIdSet.add(String(sub.studentId));
        });

        students = await User.find({
          _id: { $in: Array.from(studentIdSet) },
          role: "siswa",
        })
          .sort({ name: 1 })
          .select("_id name nisn email")
          .lean();

        const assignById = new Map<string, any>();
        rawAssignments.forEach((a: any) => assignById.set(String(a._id), a));

        const subMap = new Map<string, number | null>();
        submissions.forEach((sub: any) => {
          const aDoc = sub.assignmentId
            ? assignById.get(String(sub.assignmentId))
            : null;
          const qIdStr = sub.quizId
            ? String(sub.quizId)
            : aDoc?.quizId
              ? String(aDoc.quizId)
              : null;
          const qDoc = qIdStr ? quizMap.get(qIdStr) : null;

          const resolved = resolveSubmissionScoring(sub, qDoc, aDoc);
          const normVal = resolved.isFinalGraded
            ? resolved.normalizedScore
            : null;

          if (sub.assignmentId) {
            subMap.set(`${sub.studentId}_${sub.assignmentId}`, normVal);
          }
          if (qIdStr) {
            subMap.set(`${sub.studentId}_${qIdStr}`, normVal);
          }
        });

        // Build matrix using normalized 0-100 scores
        matrix = students.map((st) => {
          const studentScores: Record<string, number | null> = {};
          let totalScore = 0;
          let scoredCount = 0;

          assignments.forEach((a) => {
            const keyPrimary = `${st._id}_${a._id}`;
            const keyQuiz = a.quizId ? `${st._id}_${a.quizId}` : null;
            const s =
              subMap.get(keyPrimary) ??
              (keyQuiz ? subMap.get(keyQuiz) : null) ??
              null;

            studentScores[String(a._id)] = s;
            if (s !== null) {
              totalScore += s;
              scoredCount++;
            }
          });

          const average =
            scoredCount > 0 ? roundScore(totalScore / scoredCount) : 0;
          let gradeLetter = "C";
          if (average >= 85) gradeLetter = "A";
          else if (average >= 75) gradeLetter = "B";
          else if (average >= 60) gradeLetter = "C";
          else if (average > 0) gradeLetter = "D";

          return {
            student: st,
            scores: studentScores,
            average,
            gradeLetter,
            status:
              average >= 75
                ? "Tuntas"
                : average > 0
                  ? "Remedial"
                  : "Belum Ada Nilai",
          };
        });
      }
    }

    // Calculate class average
    const validAverages = matrix.filter((m) => m.average > 0);
    const classAverage =
      validAverages.length > 0
        ? roundScore(
            validAverages.reduce((s, m) => s + m.average, 0) /
              validAverages.length
          )
        : 0;

    // Recent submissions across teacher's assignments & quizzes
    const [teacherAssignments, teacherQuizzes] = await Promise.all([
      Assignment.find({
        ...(session.role === "guru" ? { teacherId: session.id } : {}),
        isArchived: { $ne: true },
      })
        .select("_id title maxScore type quizId")
        .lean(),
      Quiz.find({
        ...(session.role === "guru" ? { teacherId: session.id } : {}),
      })
        .select("_id title totalPoints maxRawPoints questions")
        .lean(),
    ]);

    const teacherAssignIds = teacherAssignments.map((a) => a._id);
    const teacherQuizIds = teacherQuizzes.map((q) => q._id);
    const teacherQuizMap = new Map(
      teacherQuizzes.map((q: any) => [String(q._id), q])
    );
    const teacherAssignMap = new Map(
      teacherAssignments.map((a: any) => [String(a._id), a])
    );

    const rawRecentSubmissions = await Submission.find({
      $or: [
        ...(teacherAssignIds.length > 0
          ? [{ assignmentId: { $in: teacherAssignIds } }]
          : []),
        ...(teacherQuizIds.length > 0
          ? [{ quizId: { $in: teacherQuizIds } }]
          : []),
      ],
    })
      .populate("studentId", "name nisn email")
      .populate("assignmentId", "title maxScore type quizId")
      .populate("quizId", "title totalPoints maxRawPoints questions")
      .sort({ submittedAt: -1 })
      .limit(10)
      .lean();

    const recentSubmissions = rawRecentSubmissions.map((s: any) => {
      const aObj = s.assignmentId;
      const qObj =
        s.quizId ||
        (aObj?.quizId ? teacherQuizMap.get(String(aObj.quizId)) : null);
      const resolved = resolveSubmissionScoring(
        s,
        qObj,
        aObj || (s.assignmentId ? teacherAssignMap.get(String(s.assignmentId)) : null)
      );

      return {
        ...s,
        assignmentId: aObj || (qObj ? { _id: qObj._id, title: qObj.title, maxScore: 100, type: "kuis" } : null),
        score: resolved.isFinalGraded ? resolved.normalizedScore : null,
        rawScore: resolved.rawScore,
        maxRawScore: resolved.maxRawScore,
        normalizedScore: resolved.normalizedScore,
        provisionalScore: resolved.provisionalScore,
        gradingStatus: resolved.gradingStatus,
        isPendingManual: resolved.isPendingManual,
      };
    });

    const pendingCount = await Submission.countDocuments({
      $or: [
        ...(teacherAssignIds.length > 0
          ? [{ assignmentId: { $in: teacherAssignIds } }]
          : []),
        ...(teacherQuizIds.length > 0
          ? [{ quizId: { $in: teacherQuizIds } }]
          : []),
      ],
      status: { $in: ["turned_in", "late"] },
    });

    const sortedMatrix = [...matrix].sort((a, b) => b.average - a.average);
    const topPerformers = sortedMatrix.slice(0, 3).map((m) => ({
      name: m.student.name,
      score: m.average,
    }));

    const gradeDistribution = {
      A: matrix.filter((m) => m.average >= 85).length,
      B: matrix.filter((m) => m.average >= 75 && m.average < 85).length,
      C: matrix.filter((m) => m.average >= 60 && m.average < 75).length,
      D: matrix.filter((m) => m.average > 0 && m.average < 60).length,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          classes: teacherClasses,
          selectedClass,
          assignments,
          matrix,
          stats: {
            classAverage,
            pendingCount,
            topPerformers,
            gradeDistribution,
          },
          recentSubmissions,
        },
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memuat rekap nilai";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
