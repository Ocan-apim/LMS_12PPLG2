import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User, ClassModel, Department } from "@/models";

interface ImportRow {
  name: string;
  nisn: string;
  grade?: string;
  className?: string;
  departmentCode?: string;
  gender?: "Laki-laki" | "Perempuan";
  birthPlace?: string;
  birthDate?: string;
}

export async function POST(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();
    const { rows, mode } = body as { rows: ImportRow[]; mode: "validate" | "commit" };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data baris siswa tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Pre-fetch all classes and departments for fast lookup
    const [allClasses, allDepartments, existingUsers] = await Promise.all([
      ClassModel.find({ isActive: true }).select("_id name grade departmentId"),
      Department.find({ isActive: true }).select("_id code name"),
      User.find({ role: "siswa" }).select("nisn email"),
    ]);

    const classMap = new Map(allClasses.map((c) => [c.name.toUpperCase().trim(), c]));
    const deptMap = new Map(allDepartments.map((d) => [d.code.toUpperCase().trim(), d]));
    const existingNisns = new Set(existingUsers.map((u) => u.nisn).filter(Boolean));

    const validatedRows = [];
    const seenNisnsInBatch = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const errors: string[] = [];

      const cleanName = row.name?.trim();
      const cleanNisn = row.nisn?.toString().trim();
      const cleanClass = row.className?.trim();
      const cleanDept = row.departmentCode?.trim().toUpperCase();

      if (!cleanName) {
        errors.push("Nama siswa wajib diisi");
      }

      if (!cleanNisn) {
        errors.push("NISN wajib diisi");
      } else if (!/^\d{10}$/.test(cleanNisn)) {
        errors.push("NISN harus berupa 10 digit angka");
      } else if (existingNisns.has(cleanNisn)) {
        errors.push(`NISN ${cleanNisn} sudah terdaftar di sistem`);
      } else if (seenNisnsInBatch.has(cleanNisn)) {
        errors.push(`NISN ${cleanNisn} duplikat dalam file unggahan`);
      } else {
        seenNisnsInBatch.add(cleanNisn);
      }

      let matchedClass = null;
      if (cleanClass) {
        matchedClass = classMap.get(cleanClass.toUpperCase());
        if (!matchedClass) {
          errors.push(`Kelas "${cleanClass}" tidak ditemukan`);
        }
      }

      let matchedDept = null;
      if (cleanDept) {
        matchedDept = deptMap.get(cleanDept);
        if (!matchedDept) {
          errors.push(`Jurusan "${cleanDept}" tidak ditemukan`);
        }
      } else if (matchedClass && matchedClass.departmentId) {
        matchedDept = allDepartments.find(
          (d) => d._id.toString() === matchedClass.departmentId?.toString()
        );
      }

      validatedRows.push({
        index: i + 1,
        ...row,
        name: cleanName || "",
        nisn: cleanNisn || "",
        className: cleanClass || "",
        departmentCode: cleanDept || (matchedDept ? matchedDept.code : ""),
        classId: matchedClass ? matchedClass._id : undefined,
        departmentId: matchedDept ? matchedDept._id : undefined,
        grade: matchedClass?.grade || row.grade || "10",
        isValid: errors.length === 0,
        errors,
      });
    }

    if (mode === "validate") {
      const validCount = validatedRows.filter((r) => r.isValid).length;
      const errorCount = validatedRows.filter((r) => !r.isValid).length;

      return NextResponse.json({
        success: true,
        data: {
          totalRows: validatedRows.length,
          validCount,
          errorCount,
          rows: validatedRows,
        },
      });
    }

    // Commit mode: only insert valid rows
    const validRowsToCommit = validatedRows.filter((r) => r.isValid);
    if (validRowsToCommit.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada data valid yang dapat disimpan" },
        { status: 400 }
      );
    }

    const defaultPassword = await bcrypt.hash("password123", 10);
    const createdUsers = [];

    for (const item of validRowsToCommit) {
      const studentEmail = `${item.nisn}@siswa.smk.sch.id`;

      const newUser = await User.create({
        name: item.name,
        email: studentEmail,
        password: defaultPassword,
        role: "siswa",
        nisn: item.nisn,
        gender: item.gender === "Perempuan" ? "Perempuan" : "Laki-laki",
        birthPlace: item.birthPlace || "",
        birthDate: item.birthDate ? new Date(item.birthDate) : undefined,
        grade: item.grade || "10",
        departmentId: item.departmentId,
        classId: item.classId,
        academicYear: "2024/2025 - Genap",
        isActive: true,
      });

      if (item.classId) {
        await ClassModel.findByIdAndUpdate(item.classId, {
          $addToSet: { studentIds: newUser._id },
        });
      }

      createdUsers.push(newUser);
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${createdUsers.length} siswa ke dalam sistem`,
      data: {
        importedCount: createdUsers.length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memproses impor siswa";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
