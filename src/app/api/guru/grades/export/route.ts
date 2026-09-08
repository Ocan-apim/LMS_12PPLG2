import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, Assignment, Submission, User } from "@/models";

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

    const assignments = await Assignment.find({ courseClassId })
      .sort({ createdAt: 1 })
      .select("_id title maxScore")
      .lean();

    const students = await User.find({
      _id: { $in: courseClass.studentIds || [] },
      role: "siswa",
    })
      .sort({ name: 1 })
      .select("_id name nisn")
      .lean();

    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await Submission.find({
      assignmentId: { $in: assignmentIds },
    }).lean();

    const subMap = new Map<string, number | null>();
    submissions.forEach((sub) => {
      const key = `${sub.studentId}_${sub.assignmentId}`;
      subMap.set(key, typeof sub.score === "number" ? sub.score : null);
    });

    // Build CSV Headers
    const headers = [
      "No",
      "Nama Siswa",
      "NISN",
      "Kelas",
      ...assignments.map((a) => `"${a.title.replace(/"/g, '""')} (Maks ${a.maxScore})"`),
      "Rata-rata",
      "Predikat",
      "Status",
    ];

    const rows = [headers.join(",")];

    students.forEach((st, idx) => {
      let total = 0;
      let count = 0;
      const scores = assignments.map((a) => {
        const key = `${st._id}_${a._id}`;
        const score = subMap.get(key);
        if (score !== null && score !== undefined) {
          total += score;
          count++;
          return score;
        }
        return "-";
      });

      const avg = count > 0 ? (Math.round((total / count) * 10) / 10).toFixed(1) : "0.0";
      let predikat = "C";
      const numAvg = parseFloat(avg);
      if (numAvg >= 85) predikat = "A";
      else if (numAvg >= 75) predikat = "B";
      else if (numAvg >= 60) predikat = "C";
      else if (numAvg > 0) predikat = "D";

      const status = numAvg >= 75 ? "Tuntas" : numAvg > 0 ? "Remedial" : "Belum Ada Nilai";

      rows.push(
        [
          idx + 1,
          `"${st.name.replace(/"/g, '""')}"`,
          `'${st.nisn || ""}'`,
          `"${courseClass.name}"`,
          ...scores,
          avg,
          predikat,
          status,
        ].join(",")
      );
    });

    const csvOutput = rows.join("\n");
    const filename = `Rekap_Nilai_${courseClass.name.replace(/\s+/g, "_")}.csv`;

    return new NextResponse(csvOutput, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengunduh rekap nilai";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
