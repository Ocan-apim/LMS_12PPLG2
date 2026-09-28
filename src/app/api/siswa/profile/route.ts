import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User, CourseClass, Submission } from "@/models";

export async function GET(req: NextRequest) {
  // Authorization: Role must be siswa
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();

    // Security: Identity MUST ALWAYS be authoritative from session.id
    // Any query parameter such as ?studentId=... or ?userId=... MUST be ignored.
    const user: any = await User.findById(session.id)
      .select("-password")
      .populate("classId", "name grade academicYear")
      .populate("departmentId", "name code")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    // Enrich with academic statistics for profile view
    const totalClasses = await CourseClass.countDocuments({
      studentIds: session.id,
      isActive: true,
    });

    const completedAssignments = await Submission.countDocuments({
      studentId: session.id,
      status: { $in: ["turned_in", "late", "graded"] },
    });

    const gradedSubmissions = await Submission.find({
      studentId: session.id,
      status: "graded",
      score: { $exists: true, $ne: null },
    })
      .select("score")
      .lean();

    let averageGrade = 0;
    if (gradedSubmissions.length > 0) {
      const sum = gradedSubmissions.reduce(
        (acc: number, curr: any) => acc + (typeof curr.score === "number" ? curr.score : 0),
        0
      );
      averageGrade = Math.round((sum / gradedSubmissions.length) * 10) / 10;
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          nis: user.nis,
          nisn: user.nisn,
          gender: user.gender,
          birthPlace: user.birthPlace,
          birthDate: user.birthDate,
          phone: user.phone,
          photoUrl: user.photoUrl,
          grade: user.grade,
          classId: user.classId,
          departmentId: user.departmentId,
          academicYear: user.academicYear,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        stats: {
          totalClasses,
          completedAssignments,
          averageGrade,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat profil siswa";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  // Authorization: Role must be siswa
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));

    // CRITICAL SECURITY: Strict allowlist of mutable fields.
    // Disallow role escalation, modifying another user, changing NIS/NISN/email/password/grades/classes.
    const allowedFields = ["phone", "gender", "birthPlace", "birthDate", "photoUrl"];
    const updateData: Record<string, any> = {};

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        if (key === "gender") {
          if (body[key] === "Laki-laki" || body[key] === "Perempuan") {
            updateData.gender = body[key];
          }
        } else if (key === "birthDate") {
          const parsed = new Date(body[key]);
          if (!isNaN(parsed.getTime())) {
            updateData.birthDate = parsed;
          }
        } else if (typeof body[key] === "string") {
          updateData[key] = body[key].trim();
        }
      }
    }

    // Authoritative user mutation: ONLY update session.id
    const updatedUser: any = await User.findByIdAndUpdate(
      session.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate("classId", "name grade academicYear")
      .populate("departmentId", "name code")
      .lean();

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profil berhasil diperbarui",
      data: { user: updatedUser },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui profil siswa";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
