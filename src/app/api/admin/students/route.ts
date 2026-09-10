import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User, ClassModel } from "@/models";

export async function GET(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const classId = searchParams.get("classId");
    const departmentId = searchParams.get("departmentId");
    const grade = searchParams.get("grade");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(1, Number(searchParams.get("limit")) || 20);

    const query: Record<string, unknown> = {
      role: "siswa",
      isActive: true,
    };

    if (classId && classId !== "all") {
      query.classId = classId;
    }
    if (departmentId && departmentId !== "all") {
      query.departmentId = departmentId;
    }
    if (grade && grade !== "all") {
      query.grade = grade;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { nis: { $regex: search, $options: "i" } },
        { nisn: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(query);
    const students = await User.find(query)
      .populate("classId", "name grade")
      .populate("departmentId", "name code")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-password")
      .lean();

    return NextResponse.json({
      success: true,
      data: students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat siswa";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();

    const {
      name,
      nis,
      nisn,
      gender,
      birthPlace,
      birthDate,
      grade,
      departmentId,
      classId,
      academicYear,
      email,
      password,
    } = body;

    const cleanNis = (nis || nisn || "").toString().trim();
    const cleanNisn = (nisn || nis || "").toString().trim();

    if (!name || (!cleanNis && !cleanNisn)) {
      return NextResponse.json(
        { success: false, message: "Nama lengkap dan NIS / NISN wajib diisi" },
        { status: 400 }
      );
    }

    const duplicateChecks = [];
    if (cleanNis) duplicateChecks.push({ nis: cleanNis });
    if (cleanNisn) duplicateChecks.push({ nisn: cleanNisn });

    const existingStudent = await User.findOne({
      role: "siswa",
      $or: duplicateChecks,
    });

    if (existingStudent) {
      return NextResponse.json(
        { success: false, message: `Siswa dengan NIS/NISN (${cleanNis}) sudah terdaftar` },
        { status: 400 }
      );
    }

    const studentEmail = email?.trim().toLowerCase() || `${cleanNis}@siswa.smk.sch.id`;
    const existingEmail = await User.findOne({ email: studentEmail });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, message: `Email ${studentEmail} sudah digunakan` },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password || "password123", 10);

    const student = await User.create({
      name,
      email: studentEmail,
      password: hashedPassword,
      role: "siswa",
      nis: cleanNis,
      nisn: cleanNisn,
      gender: gender || "Laki-laki",
      birthPlace,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      grade,
      departmentId: departmentId || undefined,
      classId: classId || undefined,
      academicYear: academicYear || "2024/2025 - Genap",
      isActive: true,
    });

    // If classId provided, add student to ClassModel
    if (classId) {
      await ClassModel.findByIdAndUpdate(classId, {
        $addToSet: { studentIds: student._id },
      });
    }

    const populated = await User.findById(student._id)
      .populate("classId", "name grade")
      .populate("departmentId", "name code")
      .select("-password");

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menambahkan siswa";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
