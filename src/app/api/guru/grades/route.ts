import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, Assignment, Submission, User, ClassModel } from "@/models";

export async function GET(req: Request) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const courseClassId = searchParams.get("courseClassId");

    // Get all teacher's classes for the dropdown
    const teacherClasses = await CourseClass.find({
      teacherId: session.id,
      isActive: true,
    })
      .populate("classRombelId", "name grade")
      .select("_id name code classRombelId")
      .lean();

    const targetClassId = courseClassId || (teacherClasses[0]?._id ? String(teacherClasses[0]._id) : null);

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
        if (session.role === "guru" && selectedClass.teacherId.toString() !== session.id) {
          return NextResponse.json(
            { success: false, message: "Akses ditolak: Anda bukan pengampu kelas ini" },
            { status: 403 }
          );
        }
        // Assignments in this class
        assignments = await Assignment.find({ courseClassId: targetClassId })
          .sort({ createdAt: 1 })
          .select("_id title maxScore type")
          .lean();

        const assignmentIds = assignments.map((a) => a._id);
        const submissions = await Submission.find({
          assignmentId: { $in: assignmentIds },
        }).lean();

        const studentIdSet = new Set<string>();
        (selectedClass.studentIds || []).forEach((s: any) => studentIdSet.add(String(s)));

        const rombelId = selectedClass.classRombelId?._id || selectedClass.classRombelId;
        if (rombelId) {
          const rombelDoc: any = await ClassModel.findById(rombelId).lean();
          if (rombelDoc && Array.isArray(rombelDoc.studentIds)) {
            rombelDoc.studentIds.forEach((s: any) => studentIdSet.add(String(s)));
          }
          const usersInRombel = await User.find({ classId: rombelId, role: "siswa" })
            .select("_id")
            .lean();
          usersInRombel.forEach((u) => studentIdSet.add(String(u._id)));
        }

        submissions.forEach((sub) => {
          if (sub.studentId) studentIdSet.add(String(sub.studentId));
        });

        // Students in this class
        students = await User.find({
          _id: { $in: Array.from(studentIdSet) },
          role: "siswa",
        })
          .sort({ name: 1 })
          .select("_id name nisn email")
          .lean();

        const subMap = new Map<string, number | null>();
        submissions.forEach((sub) => {
          const key = `${sub.studentId}_${sub.assignmentId}`;
          subMap.set(key, typeof sub.score === "number" ? sub.score : null);
        });

        // Build matrix
        matrix = students.map((st) => {
          const studentScores: Record<string, number | null> = {};
          let totalScore = 0;
          let scoredCount = 0;

          assignments.forEach((a) => {
            const key = `${st._id}_${a._id}`;
            const s = subMap.get(key) ?? null;
            studentScores[String(a._id)] = s;
            if (s !== null) {
              totalScore += s;
              scoredCount++;
            }
          });

          const average = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0;
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
            status: average >= 75 ? "Tuntas" : average > 0 ? "Remedial" : "Belum Ada Nilai",
          };
        });
      }
    }

    // Calculate class average
    const validAverages = matrix.filter((m) => m.average > 0);
    const classAverage =
      validAverages.length > 0
        ? Math.round((validAverages.reduce((s, m) => s + m.average, 0) / validAverages.length) * 10) / 10
        : 0;

    // Recent submissions across teacher's assignments
    const teacherAssignments = await Assignment.find({ teacherId: session.id }).select("_id");
    const teacherAssignIds = teacherAssignments.map((a) => a._id);

    const recentSubmissions = await Submission.find({
      assignmentId: { $in: teacherAssignIds },
    })
      .populate("studentId", "name nisn email")
      .populate("assignmentId", "title maxScore")
      .sort({ submittedAt: -1 })
      .limit(10)
      .lean();

    const pendingCount = await Submission.countDocuments({
      assignmentId: { $in: teacherAssignIds },
      status: { $in: ["turned_in", "late"] },
    });

    // Top performers
    const sortedMatrix = [...matrix].sort((a, b) => b.average - a.average);
    const topPerformers = sortedMatrix.slice(0, 3).map((m) => ({
      name: m.student.name,
      score: m.average,
    }));

    // Grade distribution
    const gradeDistribution = {
      A: matrix.filter((m) => m.average >= 85).length,
      B: matrix.filter((m) => m.average >= 75 && m.average < 85).length,
      C: matrix.filter((m) => m.average >= 60 && m.average < 75).length,
      D: matrix.filter((m) => m.average > 0 && m.average < 60).length,
    };

    return NextResponse.json({
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
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat rekap nilai";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
