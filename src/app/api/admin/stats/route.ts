import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User, ClassModel, Department, Subject } from "@/models";

export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();

    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalDepartments,
      totalSubjects,
      recentStudents,
      departments,
    ] = await Promise.all([
      User.countDocuments({ role: "siswa", isActive: true }),
      User.countDocuments({ role: "guru", isActive: true }),
      ClassModel.countDocuments({ isActive: true }),
      Department.countDocuments({ isActive: true }),
      Subject.countDocuments({ isActive: true }),
      User.find({ role: "siswa" })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("classId", "name")
        .select("name nisn createdAt classId"),
      Department.find({ isActive: true }).select("name code capacity maxClasses"),
    ]);

    // Homeroom teachers count
    const homeroomTeachersCount = await ClassModel.countDocuments({
      homeroomTeacherId: { $exists: true, $ne: null },
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        totalStudents,
        totalTeachers,
        totalClasses,
        totalDepartments,
        totalSubjects,
        homeroomTeachersCount,
        recentStudents,
        departments,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat statistik";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
