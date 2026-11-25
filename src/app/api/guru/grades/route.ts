/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Department,
} from "@/models";
import { resolveSubmissionScoring, roundScore } from "@/lib/quiz-scoring";

function inferGradeFromText(text?: string | null): string {
  if (!text) return "";
  const s = String(text).toUpperCase();
  if (/\b(12|XII)\b/.test(s) || /12/.test(s)) return "12";
  if (/\b(11|XI)\b/.test(s) || /11/.test(s)) return "11";
  if (/\b(10|X)\b/.test(s) || /10/.test(s)) return "10";
  return "";
}

function inferMajorFromText(
  text: string | undefined | null,
  deptCodes: string[]
): string {
  if (!text) return "";
  const upper = String(text).toUpperCase();
  for (const code of deptCodes) {
    if (upper.includes(code.toUpperCase())) {
      return code;
    }
  }
  return "";
}

export async function GET(req: Request) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const courseClassId = searchParams.get("courseClassId") || "";
    const rawGradeFilter = (
      searchParams.get("grade") ||
      searchParams.get("kelas") ||
      ""
    ).trim();
    const gradeFilter =
      rawGradeFilter && rawGradeFilter !== "all" ? rawGradeFilter : "";
    const rawJurusanFilter = (
      searchParams.get("jurusan") ||
      searchParams.get("department") ||
      searchParams.get("departmentId") ||
      ""
    ).trim();
    const jurusanFilter =
      rawJurusanFilter && rawJurusanFilter !== "all" ? rawJurusanFilter : "";

    // Dynamically load available majors from Department and active ClassModel records
    const [rawDepartments, allActiveRombels] = await Promise.all([
      Department.find({ isActive: { $ne: false } })
        .select("_id name code")
        .sort({ code: 1, name: 1 })
        .lean(),
      ClassModel.find({ isActive: true })
        .populate("departmentId", "name code")
        .select("_id name grade departmentId studentIds")
        .lean(),
    ]);

    const deptMap = new Map<
      string,
      { _id: string; code: string; name: string }
    >();
    const deptById = new Map<
      string,
      { _id: string; code: string; name: string }
    >();

    for (const d of rawDepartments as any[]) {
      if (!d?.code) continue;
      const code = String(d.code).trim();
      const item = {
        _id: String(d._id),
        code,
        name: String(d.name || code).trim(),
      };
      deptMap.set(code.toUpperCase(), item);
      deptById.set(String(d._id), item);
    }

    for (const r of allActiveRombels as any[]) {
      const rDept = r?.departmentId;
      if (rDept && typeof rDept === "object" && rDept.code) {
        const code = String(rDept.code).trim();
        const item = {
          _id: String(rDept._id || code),
          code,
          name: String(rDept.name || code).trim(),
        };
        if (!deptMap.has(code.toUpperCase())) {
          deptMap.set(code.toUpperCase(), item);
        }
        if (rDept._id) {
          deptById.set(String(rDept._id), item);
        }
      }
    }

    const availableDepartments = Array.from(deptMap.values());
    const allDeptCodes = availableDepartments.map((d) => d.code);

    // Resolve normalized jurusan filter (can be code like "PPLG" or department _id)
    let normalizedJurusanCode = "";
    if (jurusanFilter) {
      const byId = deptById.get(jurusanFilter);
      if (byId) {
        normalizedJurusanCode = byId.code.toUpperCase();
      } else {
        normalizedJurusanCode = jurusanFilter.toUpperCase();
      }
    }

    const rombelById = new Map<string, any>();
    for (const r of allActiveRombels as any[]) {
      rombelById.set(String(r._id), r);
    }

    // Get all teacher's classes
    const rawTeacherClasses = await CourseClass.find({
      ...(session.role === "guru" ? { teacherId: session.id } : {}),
      isActive: true,
    })
      .populate({
        path: "classRombelId",
        select: "name grade departmentId",
        populate: { path: "departmentId", select: "name code" },
      })
      .select("_id name code classRombelId studentIds")
      .lean();

    const teacherClasses = (rawTeacherClasses as any[]).map((c) => {
      const rombelObj = c.classRombelId;
      const rombelDoc =
        rombelObj && rombelObj._id
          ? rombelById.get(String(rombelObj._id)) || rombelObj
          : rombelObj
            ? rombelById.get(String(rombelObj))
            : null;

      const resolvedGrade =
        rombelDoc?.grade ||
        inferGradeFromText(rombelDoc?.name) ||
        inferGradeFromText(c.name) ||
        "";

      const resolvedJurusanCode =
        rombelDoc?.departmentId?.code ||
        inferMajorFromText(rombelDoc?.name, allDeptCodes) ||
        inferMajorFromText(c.name, allDeptCodes) ||
        "";

      const resolvedDeptId = rombelDoc?.departmentId?._id
        ? String(rombelDoc.departmentId._id)
        : "";

      return {
        ...c,
        grade: resolvedGrade,
        jurusanCode: resolvedJurusanCode,
        departmentId: resolvedDeptId,
      };
    });

    const classMetaById = new Map<string, any>();
    for (const c of teacherClasses) {
      classMetaById.set(String(c._id), c);
    }

    const matchingTeacherClasses = teacherClasses.filter((c) => {
      if (gradeFilter && c.grade !== gradeFilter) {
        return false;
      }
      if (
        normalizedJurusanCode &&
        c.jurusanCode.toUpperCase() !== normalizedJurusanCode
      ) {
        return false;
      }
      return true;
    });

    const targetClassId =
      courseClassId ||
      (gradeFilter || normalizedJurusanCode
        ? matchingTeacherClasses[0]?._id
          ? String(matchingTeacherClasses[0]._id)
          : null
        : teacherClasses[0]?._id
          ? String(teacherClasses[0]._id)
          : null);

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
        .populate({
          path: "classRombelId",
          select: "name grade departmentId",
          populate: { path: "departmentId", select: "name code" },
        })
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
        .select("_id title maxScore type quizId courseClassId classId")
        .lean(),
      Quiz.find({
        ...(session.role === "guru" ? { teacherId: session.id } : {}),
      })
        .select(
          "_id title totalPoints maxRawPoints questions courseClassId classId"
        )
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
      .populate("studentId", "name nisn email grade classId departmentId")
      .populate(
        "assignmentId",
        "title maxScore type quizId courseClassId classId"
      )
      .populate(
        "quizId",
        "title totalPoints maxRawPoints questions courseClassId classId"
      )
      .sort({ submittedAt: -1 })
      .limit(100)
      .lean();

    const mappedSubmissions = rawRecentSubmissions.map((s: any) => {
      const aObj = s.assignmentId;
      const qObj =
        s.quizId ||
        (aObj?.quizId ? teacherQuizMap.get(String(aObj.quizId)) : null);
      const resolved = resolveSubmissionScoring(
        s,
        qObj,
        aObj ||
          (s.assignmentId
            ? teacherAssignMap.get(String(s.assignmentId))
            : null)
      );

      const resolvedCourseClassId = String(
        s.courseClassId ||
          aObj?.courseClassId ||
          qObj?.courseClassId ||
          selectedClass?._id ||
          ""
      );
      const classMeta = classMetaById.get(resolvedCourseClassId);

      const studentDoc = s.studentId;
      const studentRombel = studentDoc?.classId
        ? rombelById.get(String(studentDoc.classId))
        : null;
      const assignRombelId = aObj?.classId || qObj?.classId;
      const assignRombel = assignRombelId
        ? rombelById.get(String(assignRombelId))
        : null;

      // Resolve academic grade level ("10", "11", "12") for this submission
      // Prefer the CourseClass/assignment's rombel grade first, then the student's rombel/grade
      const submissionGrade =
        classMeta?.grade ||
        assignRombel?.grade ||
        studentRombel?.grade ||
        studentDoc?.grade ||
        inferGradeFromText(classMeta?.name) ||
        "";

      // Resolve major code (e.g. "PPLG", "TJKT", "DKV") for this submission
      const studentDept = studentDoc?.departmentId
        ? deptById.get(String(studentDoc.departmentId))
        : null;
      const submissionJurusan =
        classMeta?.jurusanCode ||
        assignRombel?.departmentId?.code ||
        studentRombel?.departmentId?.code ||
        studentDept?.code ||
        inferMajorFromText(classMeta?.name, allDeptCodes) ||
        "";

      const resolvedClassName =
        assignRombel?.name ||
        classMeta?.classRombelId?.name ||
        studentRombel?.name ||
        classMeta?.name ||
        selectedClass?.name ||
        "Kelas";

      return {
        ...s,
        courseClassId: resolvedCourseClassId,
        studentClass: resolvedClassName,
        studentGrade: submissionGrade,
        studentJurusan: submissionJurusan,
        assignmentId:
          aObj ||
          (qObj
            ? {
                _id: qObj._id,
                title: qObj.title,
                maxScore: 100,
                type: "kuis",
              }
            : null),
        score: resolved.isFinalGraded ? resolved.normalizedScore : null,
        rawScore: resolved.rawScore,
        maxRawScore: resolved.maxRawScore,
        normalizedScore: resolved.normalizedScore,
        provisionalScore: resolved.provisionalScore,
        gradingStatus: resolved.gradingStatus,
        isPendingManual: resolved.isPendingManual,
      };
    });

    const recentSubmissions = mappedSubmissions.filter((item) => {
      if (courseClassId && item.courseClassId !== courseClassId) {
        return false;
      }
      if (gradeFilter && item.studentGrade !== gradeFilter) {
        return false;
      }
      if (
        normalizedJurusanCode &&
        String(item.studentJurusan || "").toUpperCase() !==
          normalizedJurusanCode
      ) {
        return false;
      }
      return true;
    });

    const pendingCount = recentSubmissions.filter((s) =>
      ["turned_in", "late"].includes(s.status)
    ).length;

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
          departments: availableDepartments,
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
