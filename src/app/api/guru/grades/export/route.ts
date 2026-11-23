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
import * as XLSX from "xlsx";

export async function GET(req: Request) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const courseClassId = searchParams.get("courseClassId");

    if (!courseClassId) {
      return NextResponse.json(
        { success: false, message: "ID kelas wajib disertakan" },
        { status: 400 }
      );
    }

    const courseClass: any = await CourseClass.findById(courseClassId)
      .populate("classRombelId", "name grade")
      .lean();

    if (!courseClass) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    if (
      session.role === "guru" &&
      courseClass.teacherId.toString() !== session.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda bukan pengampu kelas ini",
        },
        { status: 403 }
      );
    }

    const [rawAssignments, rawQuizzes] = await Promise.all([
      Assignment.find({
        courseClassId,
        isArchived: { $ne: true },
      })
        .sort({ createdAt: 1 })
        .select("_id title maxScore type quizId")
        .lean(),
      Quiz.find({
        courseClassId,
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

    const assignments = [
      ...rawAssignments.map((a: any) => ({
        _id: a._id,
        title: a.title,
        maxScore: a.type === "kuis" || a.quizId ? 100 : a.maxScore || 100,
        quizId: a.quizId || null,
      })),
      ...standaloneQuizzes.map((q: any) => ({
        _id: q._id,
        title: q.title,
        maxScore: 100,
        quizId: q._id,
      })),
    ];

    const studentIdSet = new Set<string>();
    (courseClass.studentIds || []).forEach((s: any) =>
      studentIdSet.add(String(s))
    );

    const rombelId =
      courseClass.classRombelId?._id || courseClass.classRombelId;
    if (rombelId) {
      const rombelDoc: any = await ClassModel.findById(rombelId).lean();
      if (rombelDoc && Array.isArray(rombelDoc.studentIds)) {
        rombelDoc.studentIds.forEach((s: any) => studentIdSet.add(String(s)));
      }
      const usersInRombel = await User.find({
        classId: rombelId,
        role: "siswa",
      })
        .select("_id")
        .lean();
      usersInRombel.forEach((u) => studentIdSet.add(String(u._id)));
    }

    const assignmentIds = rawAssignments.map((a) => a._id);
    const quizIds = rawQuizzes.map((q) => q._id);

    const submissions = await Submission.find({
      $or: [
        ...(assignmentIds.length > 0
          ? [{ assignmentId: { $in: assignmentIds } }]
          : []),
        ...(quizIds.length > 0 ? [{ quizId: { $in: quizIds } }] : []),
        { courseClassId },
      ],
    }).lean();

    submissions.forEach((sub: any) => {
      if (sub.studentId) studentIdSet.add(String(sub.studentId));
    });

    const students = await User.find({
      _id: { $in: Array.from(studentIdSet) },
      role: "siswa",
    })
      .sort({ name: 1 })
      .select("_id name nisn")
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
      const normVal = resolved.isFinalGraded ? resolved.normalizedScore : null;

      if (sub.assignmentId) {
        subMap.set(`${sub.studentId}_${sub.assignmentId}`, normVal);
      }
      if (qIdStr) {
        subMap.set(`${sub.studentId}_${qIdStr}`, normVal);
      }
    });

    // Build Excel Headers (all grades normalized on 0-100 scale)
    const headers = [
      "No",
      "Nama Siswa",
      "NISN",
      "Kelas",
      ...assignments.map((a) => `${a.title} (Skala 100)`),
      "Rata-rata",
      "Predikat",
      "Status",
    ];

    const dataRows: (string | number)[][] = [];

    students.forEach((st, idx) => {
      let total = 0;
      let count = 0;
      const scores = assignments.map((a) => {
        const keyPrimary = `${st._id}_${a._id}`;
        const keyQuiz = a.quizId ? `${st._id}_${a.quizId}` : null;
        const score =
          subMap.get(keyPrimary) ??
          (keyQuiz ? subMap.get(keyQuiz) : null) ??
          null;
        if (score !== null && score !== undefined) {
          total += score;
          count++;
          return score;
        }
        return "-";
      });

      const avg = count > 0 ? roundScore(total / count) : 0;
      let predikat = "C";
      if (avg >= 85) predikat = "A";
      else if (avg >= 75) predikat = "B";
      else if (avg >= 60) predikat = "C";
      else if (avg > 0) predikat = "D";

      const status =
        avg >= 75 ? "Tuntas" : avg > 0 ? "Remedial" : "Belum Ada Nilai";

      dataRows.push([
        idx + 1,
        st.name,
        st.nisn || "-",
        courseClass.name,
        ...scores,
        avg,
        predikat,
        status,
      ]);
    });

    const aoa = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    const colWidths = headers.map((h, i) => {
      let maxLen = h.length;
      dataRows.forEach((row) => {
        const valStr = String(row[i] || "");
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      return { wch: Math.min(Math.max(maxLen + 3, 10), 40) };
    });
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Nilai");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `Rekap_Nilai_${courseClass.name.replace(/\s+/g, "_")}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal mengunduh rekap nilai";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
