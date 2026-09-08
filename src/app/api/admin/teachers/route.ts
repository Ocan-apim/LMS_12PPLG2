import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User, ClassModel, Subject } from "@/models";

export async function GET(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const subjectId = searchParams.get("subjectId");
    const isHomeroom = searchParams.get("isHomeroom");
    const sort = searchParams.get("sort") || "name";

    const query: Record<string, unknown> = {
      role: "guru",
      isActive: true,
    };

    if (subjectId && subjectId !== "all") {
      query.subjects = subjectId;
    }
    if (isHomeroom === "true") {
      query.isHomeroomTeacher = true;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { nip: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const sortOption: Record<string, 1 | -1> = sort === "nip" ? { nip: 1 } : { name: 1 };

    const teachers = await User.find(query)
      .populate("subjects", "name code category")
      .populate("homeroomClassId", "name grade")
      .sort(sortOption)
      .select("-password")
      .lean();

    return NextResponse.json({ success: true, data: teachers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat data guru";
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
      nip,
      email,
      password,
      degree,
      lastEducation,
      photoUrl,
      subjects,
      joinDate,
      isHomeroomTeacher,
      homeroomClassId,
      phone,
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: "Nama lengkap dan email wajib diisi" },
        { status: 400 }
      );
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, message: `Email ${email} sudah digunakan` },
        { status: 400 }
      );
    }

    if (nip) {
      const existingNip = await User.findOne({ nip: nip.trim() });
      if (existingNip) {
        return NextResponse.json(
          { success: false, message: `NIP ${nip} sudah terdaftar` },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password || "guru12345", 10);

    const teacher = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "guru",
      nip: nip ? nip.trim() : undefined,
      degree: degree ? degree.trim() : undefined,
      lastEducation: lastEducation || "S1 / Sarjana",
      photoUrl,
      subjects: Array.isArray(subjects) ? subjects : [],
      joinDate: joinDate ? new Date(joinDate) : new Date(),
      isHomeroomTeacher: Boolean(isHomeroomTeacher),
      homeroomClassId: isHomeroomTeacher && homeroomClassId ? homeroomClassId : undefined,
      phone,
      isActive: true,
    });

    // If teacher is assigned as homeroom teacher, update that class
    if (isHomeroomTeacher && homeroomClassId) {
      await ClassModel.findByIdAndUpdate(homeroomClassId, {
        homeroomTeacherId: teacher._id,
      });
    }

    // Link teacher to subjects
    if (Array.isArray(subjects) && subjects.length > 0) {
      await Subject.updateMany(
        { _id: { $in: subjects } },
        { $addToSet: { teacherIds: teacher._id } }
      );
    }

    const populated = await User.findById(teacher._id)
      .populate("subjects", "name code category")
      .populate("homeroomClassId", "name grade")
      .select("-password");

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menambahkan data guru";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
