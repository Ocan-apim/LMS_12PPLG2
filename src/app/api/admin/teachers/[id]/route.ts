import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  isUsernameAvailableForRole,
  validateUsername,
} from "@/lib/activation";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User, ClassModel, Subject } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const teacher = await User.findOne({ _id: id, role: "guru" })
      .populate("subjects", "name code category")
      .populate("homeroomClassId", "name grade")
      .select("-password");

    if (!teacher) {
      return NextResponse.json(
        { success: false, message: "Guru tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: teacher });
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

    const currentTeacher = await User.findOne({ _id: id, role: "guru" });
    if (!currentTeacher) {
      return NextResponse.json(
        { success: false, message: "Guru tidak ditemukan" },
        { status: 404 }
      );
    }

    const {
      name,
      nip,
      email,
      loginUsername,
      username,
      degree,
      lastEducation,
      photoUrl,
      subjects,
      joinDate,
      tahunBergabung,
      isHomeroomTeacher,
      homeroomClassId,
      phone,
      isActive,
      isActivated,
      mustChangePassword,
      requireActivation,
    } = body;

    if (Array.isArray(subjects) && subjects.length > 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Guru hanya dapat mengajar maksimal 2 mata pelajaran.",
        },
        { status: 400 }
      );
    }

    // Handle homeroom class updates
    const oldClassId = currentTeacher.homeroomClassId?.toString();
    const newClassId =
      isHomeroomTeacher && homeroomClassId
        ? homeroomClassId.toString()
        : isHomeroomTeacher === undefined && oldClassId
          ? oldClassId
          : null;

    if (newClassId && oldClassId !== newClassId) {
      const existingClass = await ClassModel.findById(newClassId);
      if (
        existingClass?.homeroomTeacherId &&
        existingClass.homeroomTeacherId.toString() !== id
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Kelas ${existingClass.name} sudah memiliki wali kelas lain.`,
          },
          { status: 400 }
        );
      }
    }

    if (oldClassId && oldClassId !== newClassId) {
      await ClassModel.findByIdAndUpdate(oldClassId, {
        $unset: { homeroomTeacherId: 1 },
      });
    }

    if (newClassId && oldClassId !== newClassId) {
      await ClassModel.findByIdAndUpdate(newClassId, {
        homeroomTeacherId: id,
      });
    }

    const setFields: Record<string, unknown> = {};
    if (name !== undefined) setFields.name = name.trim();
    if (nip !== undefined) setFields.nip = nip ? nip.trim() : undefined;
    if (email !== undefined)
      setFields.email = email ? email.toLowerCase().trim() : currentTeacher.email;
    if (degree !== undefined)
      setFields.degree = degree ? degree.trim() : undefined;
    if (lastEducation !== undefined) setFields.lastEducation = lastEducation;
    if (photoUrl !== undefined) setFields.photoUrl = photoUrl;
    if (Array.isArray(subjects)) setFields.subjects = subjects;
    if (joinDate !== undefined)
      setFields.joinDate = joinDate ? new Date(joinDate) : currentTeacher.joinDate;
    if (isHomeroomTeacher !== undefined)
      setFields.isHomeroomTeacher = Boolean(isHomeroomTeacher && newClassId);
    if (phone !== undefined) setFields.phone = phone;
    if (isActive !== undefined) setFields.isActive = isActive;

    // Optional explicit loginUsername update by Admin (changing official name never alters loginUsername)
    const rawRequestedUsername =
      loginUsername !== undefined ? loginUsername : username;
    if (
      typeof rawRequestedUsername === "string" &&
      rawRequestedUsername.trim().length > 0 &&
      rawRequestedUsername.trim().toLowerCase() !==
        (currentTeacher.loginUsername || "").toLowerCase()
    ) {
      const validation = validateUsername(rawRequestedUsername);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, message: validation.message },
          { status: 400 }
        );
      }
      const available = await isUsernameAvailableForRole(
        validation.username,
        "guru",
        id
      );
      if (!available) {
        return NextResponse.json(
          {
            success: false,
            message: "Username sudah digunakan oleh akun Guru lain",
          },
          { status: 400 }
        );
      }
      setFields.loginUsername = validation.username;
    }

    // Preserve existing tahunBergabung/joinYear (non-editable for all roles)
    if (!currentTeacher.tahunBergabung && tahunBergabung !== undefined) {
      setFields.tahunBergabung = tahunBergabung
        ? String(tahunBergabung).trim()
        : undefined;
      const parsedYear = parseInt(String(tahunBergabung), 10);
      if (!isNaN(parsedYear)) {
        setFields.joinYear = parsedYear;
      }
    }

    const updateQuery: {
      $set: Record<string, unknown>;
      $unset?: Record<string, 1>;
    } = {
      $set: setFields,
    };

    if (isHomeroomTeacher !== undefined) {
      if (newClassId) {
        updateQuery.$set.homeroomClassId = newClassId;
      } else {
        updateQuery.$unset = { homeroomClassId: 1 };
      }
    }

    if (
      body.password &&
      typeof body.password === "string" &&
      body.password.trim()
    ) {
      updateQuery.$set.password = await bcrypt.hash(body.password.trim(), 10);
      if (requireActivation === true || mustChangePassword === true) {
        updateQuery.$set.isActivated = false;
        updateQuery.$set.mustChangePassword = true;
      }
    }

    if (typeof isActivated === "boolean") {
      updateQuery.$set.isActivated = isActivated;
      if (isActivated) {
        updateQuery.$set.mustChangePassword = false;
      }
    }
    if (typeof mustChangePassword === "boolean") {
      updateQuery.$set.mustChangePassword = mustChangePassword;
    }

    // Sync subjects teacherIds
    if (Array.isArray(subjects)) {
      await Subject.updateMany(
        { teacherIds: id, _id: { $nin: subjects } },
        { $pull: { teacherIds: id } }
      );
      if (subjects.length > 0) {
        await Subject.updateMany(
          { _id: { $in: subjects } },
          { $addToSet: { teacherIds: id } }
        );
      }
    }

    const updated = await User.findByIdAndUpdate(id, updateQuery, {
      new: true,
      runValidators: true,
    })
      .populate("subjects", "name code category")
      .populate("homeroomClassId", "name grade")
      .select("-password");

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memperbarui data guru";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const teacher = await User.findOne({ _id: id, role: "guru" });
    if (!teacher) {
      return NextResponse.json(
        { success: false, message: "Guru tidak ditemukan" },
        { status: 404 }
      );
    }

    if (teacher.homeroomClassId) {
      await ClassModel.findByIdAndUpdate(teacher.homeroomClassId, {
        $unset: { homeroomTeacherId: 1 },
      });
    }

    await Subject.updateMany({ teacherIds: id }, { $pull: { teacherIds: id } });

    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Data guru berhasil dihapus",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal menghapus data guru";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
