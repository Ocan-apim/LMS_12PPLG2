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
      Department.find({ isActive: true }).select("name code capacity maxClasses").lean(),
    ]);

    // Homeroom teachers count
    const homeroomTeachersCount = await ClassModel.countDocuments({
      homeroomTeacherId: { $exists: true, $ne: null },
      isActive: true,
    });

    // Enrich departments with real sum of class capacities (matching manajemen jurusan)
    const enrichedDepartments = await Promise.all(
      (departments as any[]).map(async (dept) => {
        const activeClasses = await ClassModel.find({ departmentId: dept._id, isActive: true })
          .select("_id maxCapacity")
          .lean();

        const deptClassIds = (activeClasses as any[]).map((c) => c._id);

        const studentCount = await User.countDocuments({
          role: "siswa",
          isActive: true,
          $or: [
            { departmentId: dept._id },
            { classId: { $in: deptClassIds } },
          ],
        });

        const totalCapacity = (activeClasses as any[]).reduce(
          (sum, c) => sum + (Number(c.maxCapacity) || 36),
          0
        );

        return {
          ...dept,
          classCount: activeClasses.length,
          studentCount,
          capacity: totalCapacity,
          totalCapacity,
        };
      })
    );

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
        departments: enrichedDepartments,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat statistik";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
