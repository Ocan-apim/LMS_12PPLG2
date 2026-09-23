import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, Assignment, Submission, User } from "@/models";
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

    if (session.role === "guru" && courseClass.teacherId.toString() !== session.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda bukan pengampu kelas ini" },
        { status: 403 }
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

    // Build Excel Headers
    const headers = [
      "No",
      "Nama Siswa",
      "NISN",
      "Kelas",
      ...assignments.map((a) => `${a.title} (Maks ${a.maxScore})`),
      "Rata-rata",
      "Predikat",
      "Status",
    ];

    const dataRows: (string | number)[][] = [];

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

      const avg = count > 0 ? Number((total / count).toFixed(1)) : 0;
      let predikat = "C";
      if (avg >= 85) predikat = "A";
      else if (avg >= 75) predikat = "B";
      else if (avg >= 60) predikat = "C";
      else if (avg > 0) predikat = "D";

      const status = avg >= 75 ? "Tuntas" : avg > 0 ? "Remedial" : "Belum Ada Nilai";

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

    // Auto set column widths
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
    const message = err instanceof Error ? err.message : "Gagal mengunduh rekap nilai";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

