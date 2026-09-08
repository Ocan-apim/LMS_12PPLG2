import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User, ClassModel } from "@/models";

export async function POST(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();

    const { studentIds, targetClassId } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0 || !targetClassId) {
      return NextResponse.json(
        { success: false, message: "ID siswa dan kelas tujuan wajib diisi" },
        { status: 400 }
      );
    }

    const targetClass = await ClassModel.findById(targetClassId);
    if (!targetClass) {
      return NextResponse.json(
        { success: false, message: "Kelas tujuan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check capacity
    const currentStudentCount = targetClass.studentIds ? targetClass.studentIds.length : 0;
    if (currentStudentCount + studentIds.length > targetClass.maxCapacity) {
      return NextResponse.json(
        {
          success: false,
          message: `Kapasitas kelas tujuan tidak mencukupi (Tersisa: ${
            targetClass.maxCapacity - currentStudentCount
          }, Siswa yang dipindahkan: ${studentIds.length})`,
        },
        { status: 400 }
      );
    }

    // Process each student
    for (const studentId of studentIds) {
      const student = await User.findById(studentId);
      if (student && student.role === "siswa") {
        const oldClassId = student.classId;
        if (oldClassId && oldClassId.toString() !== targetClassId) {
          await ClassModel.findByIdAndUpdate(oldClassId, {
            $pull: { studentIds: studentId },
          });
        }
        await User.findByIdAndUpdate(studentId, {
          classId: targetClassId,
          grade: targetClass.grade,
          departmentId: targetClass.departmentId || student.departmentId,
        });
        await ClassModel.findByIdAndUpdate(targetClassId, {
          $addToSet: { studentIds: studentId },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memindahkan ${studentIds.length} siswa ke kelas ${targetClass.name}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memindahkan siswa";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
