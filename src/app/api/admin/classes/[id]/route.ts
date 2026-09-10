import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { ClassModel, User } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const cls = await ClassModel.findById(id)
      .populate("homeroomTeacherId", "name email nip degree")
      .populate("departmentId", "name code")
      .populate("studentIds", "name nisn email gender birthPlace birthDate");

    if (!cls) {
      return NextResponse.json({ success: false, message: "Kelas tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: cls });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();
    const body = await req.json();

    const currentClass = await ClassModel.findById(id);
    if (!currentClass) {
      return NextResponse.json({ success: false, message: "Kelas tidak ditemukan" }, { status: 404 });
    }

    const {
      name,
      grade,
      departmentId,
      parallelNumber,
      academicYear,
      homeroomTeacherId,
      maxCapacity,
      isActive,
    } = body;

    // Normalize teacher ID: empty string or falsy means unassign
    const oldTeacherId = currentClass.homeroomTeacherId ? currentClass.homeroomTeacherId.toString() : null;
    const newTeacherId =
      homeroomTeacherId && typeof homeroomTeacherId === "string" && homeroomTeacherId.trim().length > 0
        ? homeroomTeacherId.trim()
        : null;

    // Validate: Teacher cannot be walas of 2 classes
    if (newTeacherId && newTeacherId !== oldTeacherId) {
      const existingWalasClass = await ClassModel.findOne({
        _id: { $ne: id },
        homeroomTeacherId: newTeacherId,
        isActive: true,
      });

      if (existingWalasClass) {
        return NextResponse.json(
          {
            success: false,
            message: `Guru tersebut sudah menjadi wali kelas di ${existingWalasClass.name}. Satu guru hanya dapat menjadi wali kelas untuk 1 kelas.`,
          },
          { status: 400 }
        );
      }
    }

    // Update old teacher if changed or unassigned
    if (oldTeacherId && oldTeacherId !== newTeacherId) {
      await User.findByIdAndUpdate(oldTeacherId, {
        isHomeroomTeacher: false,
        $unset: { homeroomClassId: 1 },
      });
    }

    // Update new teacher if assigned
    if (newTeacherId && oldTeacherId !== newTeacherId) {
      await User.findByIdAndUpdate(newTeacherId, {
        isHomeroomTeacher: true,
        homeroomClassId: id,
      });
    }

    const updateQuery: {
      $set: Record<string, unknown>;
      $unset?: Record<string, 1>;
    } = {
      $set: {
        name,
        grade,
        departmentId: departmentId || undefined,
        parallelNumber: parallelNumber !== undefined ? Number(parallelNumber) : undefined,
        academicYear,
        maxCapacity: maxCapacity !== undefined ? Number(maxCapacity) : undefined,
        isActive: isActive !== undefined ? isActive : true,
      },
    };

    if (newTeacherId) {
      updateQuery.$set.homeroomTeacherId = newTeacherId;
    } else {
      updateQuery.$unset = { homeroomTeacherId: 1 };
    }

    const updated = await ClassModel.findByIdAndUpdate(id, updateQuery, {
      new: true,
      runValidators: true,
    })
      .populate("homeroomTeacherId", "name email nip degree")
      .populate("departmentId", "name code");

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const cls = await ClassModel.findById(id);
    if (!cls) {
      return NextResponse.json({ success: false, message: "Kelas tidak ditemukan" }, { status: 404 });
    }

    if (cls.studentIds && cls.studentIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Kelas ini masih memiliki ${cls.studentIds.length} siswa. Pindahkan siswa terlebih dahulu sebelum menghapus kelas.`,
        },
        { status: 400 }
      );
    }

    if (cls.homeroomTeacherId) {
      await User.findByIdAndUpdate(cls.homeroomTeacherId, {
        isHomeroomTeacher: false,
        $unset: { homeroomClassId: 1 },
      });
    }

    await ClassModel.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Kelas berhasil dihapus" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
