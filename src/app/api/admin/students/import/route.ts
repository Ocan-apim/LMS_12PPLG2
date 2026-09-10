import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User, ClassModel, Department } from "@/models";

export interface ImportRowPayload {
  name?: string;
  nisn?: string;
  kelas?: string;
  jurusan?: string;
  rombel?: string | number;
  kelamin?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
}

function parseDMYDate(dmy?: string): Date | null {
  if (!dmy || typeof dmy !== "string") return null;
  const match = dmy.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (month < 1 || month > 12) return null;
  if (year < 1950 || year > 2030) return null;
  if (day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function normalizeGrade(val?: string): "X" | "XI" | "XII" | null {
  if (!val) return null;
  const upper = val.toString().trim().toUpperCase();
  if (upper === "X" || upper === "10" || upper === "KELAS 10" || upper === "KELAS X") return "X";
  if (upper === "XI" || upper === "11" || upper === "KELAS 11" || upper === "KELAS XI") return "XI";
  if (upper === "XII" || upper === "12" || upper === "KELAS 12" || upper === "KELAS XII") return "XII";
  return null;
}

function normalizeGender(val?: string): "Laki-laki" | "Perempuan" | null {
  if (!val) return null;
  const s = val.toString().trim().toLowerCase();
  if (s === "laki-laki" || s === "laki" || s === "l" || s === "pria" || s === "male") return "Laki-laki";
  if (s === "perempuan" || s === "p" || s === "wanita" || s === "female") return "Perempuan";
  return null;
}

export async function POST(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();
    const { rows, mode } = body as { rows: ImportRowPayload[]; mode: "validate" | "commit" };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data baris siswa tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Pre-fetch all classes, departments, and existing students
    const [allClasses, allDepartments, existingUsers] = await Promise.all([
      ClassModel.find({ isActive: true }).select("_id name grade departmentId parallelNumber"),
      Department.find({ isActive: true }).select("_id code name"),
      User.find({ role: "siswa" }).select("nisn email"),
    ]);

    const classMap = new Map(allClasses.map((c) => [c.name.toUpperCase().trim(), c]));
    const deptMap = new Map<string, typeof allDepartments[0]>();
    for (const d of allDepartments) {
      deptMap.set(d.code.toUpperCase().trim(), d);
      deptMap.set(d.name.toUpperCase().trim(), d);
    }
    const existingNisns = new Set(existingUsers.map((u) => u.nisn).filter(Boolean));

    const validatedRows = [];
    const seenNisnsInBatch = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const errors: string[] = [];
      const fieldErrors: Record<string, string> = {};

      const cleanName = row.name?.toString().trim() || "";
      const cleanNisn = row.nisn?.toString().trim() || "";
      const rawKelas = row.kelas?.toString().trim() || "";
      const normalizedKelas = normalizeGrade(rawKelas);
      const cleanJurusan = row.jurusan?.toString().trim().toUpperCase() || "";
      const cleanRombel = row.rombel?.toString().trim() || "";
      const rawKelamin = row.kelamin?.toString().trim() || "";
      const normalizedKelamin = normalizeGender(rawKelamin);
      const cleanTempatLahir = row.tempatLahir?.toString().trim() || "";
      const cleanTanggalLahir = row.tanggalLahir?.toString().trim() || "";

      // 1. Nama Lengkap
      if (!cleanName) {
        errors.push("Nama siswa wajib diisi");
        fieldErrors.name = "Nama siswa wajib diisi";
      }

      // 2. NISN
      if (!cleanNisn) {
        errors.push("NISN wajib diisi");
        fieldErrors.nisn = "NISN wajib diisi";
      } else if (!/^\d{10}$/.test(cleanNisn)) {
        errors.push("NISN harus tepat 10 digit angka");
        fieldErrors.nisn = "NISN harus 10 digit";
      } else if (existingNisns.has(cleanNisn)) {
        errors.push(`NISN ${cleanNisn} sudah terdaftar di sistem`);
        fieldErrors.nisn = "NISN sudah terdaftar";
      } else if (seenNisnsInBatch.has(cleanNisn)) {
        errors.push(`NISN ${cleanNisn} duplikat dalam berkas`);
        fieldErrors.nisn = "Duplikat di berkas";
      } else {
        seenNisnsInBatch.add(cleanNisn);
      }

      // 3. Kelas (X, XI, XII)
      if (!rawKelas) {
        errors.push("Kelas wajib diisi");
        fieldErrors.kelas = "Kelas wajib diisi";
      } else if (!normalizedKelas) {
        errors.push("Kelas harus salah satu dari X, XI, atau XII");
        fieldErrors.kelas = "Harus X, XI, atau XII";
      }

      // 4. Jurusan
      let matchedDept = null;
      if (!cleanJurusan) {
        errors.push("Jurusan wajib diisi");
        fieldErrors.jurusan = "Jurusan wajib diisi";
      } else {
        matchedDept = deptMap.get(cleanJurusan);
        if (!matchedDept) {
          errors.push(`Jurusan "${cleanJurusan}" tidak terdaftar`);
          fieldErrors.jurusan = "Jurusan tidak ditemukan";
        }
      }

      // 5. Rombel
      const rombelNum = parseInt(cleanRombel, 10);
      if (!cleanRombel) {
        errors.push("Rombel wajib diisi");
        fieldErrors.rombel = "Rombel wajib diisi";
      } else if (isNaN(rombelNum) || rombelNum < 1) {
        errors.push("Rombel harus berupa angka (misal: 1, 2)");
        fieldErrors.rombel = "Harus berupa angka";
      }

      // 6. Jenis Kelamin
      if (!rawKelamin) {
        errors.push("Jenis kelamin wajib diisi");
        fieldErrors.kelamin = "Jenis kelamin wajib diisi";
      } else if (!normalizedKelamin) {
        errors.push("Jenis kelamin harus Laki-laki atau Perempuan");
        fieldErrors.kelamin = "Harus Laki-laki / Perempuan";
      }

      // 7. Tempat Lahir
      if (!cleanTempatLahir) {
        errors.push("Tempat lahir wajib diisi");
        fieldErrors.tempatLahir = "Tempat lahir wajib diisi";
      }

      // 8. Tanggal Lahir (day-month-year)
      const parsedDate = parseDMYDate(cleanTanggalLahir);
      if (!cleanTanggalLahir) {
        errors.push("Tanggal lahir wajib diisi");
        fieldErrors.tanggalLahir = "Tanggal lahir wajib diisi";
      } else if (!parsedDate) {
        errors.push("Format tanggal lahir harus DD/MM/YYYY (contoh: 29/02/2000)");
        fieldErrors.tanggalLahir = "Format harus DD/MM/YYYY";
      }

      const isValid = errors.length === 0;

      // Class matching if all class components are present
      let matchedClass = null;
      if (normalizedKelas && matchedDept && !isNaN(rombelNum)) {
        const fullClassName = `${normalizedKelas} ${matchedDept.code} ${rombelNum}`.toUpperCase();
        matchedClass = classMap.get(fullClassName);
      }

      validatedRows.push({
        index: i + 1,
        name: cleanName,
        nisn: cleanNisn,
        kelas: normalizedKelas || rawKelas,
        jurusan: cleanJurusan,
        rombel: cleanRombel,
        kelamin: normalizedKelamin || rawKelamin,
        tempatLahir: cleanTempatLahir,
        tanggalLahir: cleanTanggalLahir,
        parsedBirthDate: parsedDate ? parsedDate.toISOString() : undefined,
        classId: matchedClass ? matchedClass._id : undefined,
        departmentId: matchedDept ? matchedDept._id : undefined,
        status: isValid ? "VALID" : "ERROR",
        isValid,
        errors,
        fieldErrors,
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

    // Commit mode: strictly forbid importing if any rows are invalid
    const invalidRows = validatedRows.filter((r) => !r.isValid);
    if (invalidRows.length > 0) {
      const firstInvalid = invalidRows[0];
      const errFields = Object.keys(firstInvalid.fieldErrors || {});
      const firstField = errFields[0] || "data";
      const studentName = firstInvalid.name || `Baris ${firstInvalid.index}`;
      return NextResponse.json(
        {
          success: false,
          message: `Tidak dapat mengimpor data: Data "${studentName}" bagian "${firstField}" invalid! Masih terdapat ${invalidRows.length} data berstatus ERROR.`,
        },
        { status: 400 }
      );
    }

    const validRowsToCommit = validatedRows;
    if (validRowsToCommit.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada data siswa yang dapat disimpan" },
        { status: 400 }
      );
    }

    const defaultPassword = await bcrypt.hash("password123", 10);
    const createdUsers = [];

    for (const item of validRowsToCommit) {
      const studentEmail = `${item.nisn}@siswa.smk.sch.id`;

      // Resolve or auto-create class if not exists
      let finalClassId = item.classId;
      const gradeNum = item.kelas === "X" ? "10" : item.kelas === "XI" ? "11" : "12";

      if (!finalClassId && item.departmentId) {
        const fullClassName = `${item.kelas} ${item.jurusan} ${item.rombel}`;
        let cls = await ClassModel.findOne({ name: fullClassName });
        if (!cls) {
          cls = await ClassModel.create({
            name: fullClassName,
            grade: gradeNum,
            departmentId: item.departmentId,
            parallelNumber: parseInt(item.rombel, 10) || 1,
            academicYear: "2024/2025 - Genap",
            maxCapacity: 36,
            studentIds: [],
            isActive: true,
          });
        }
        finalClassId = cls._id;
      }

      const studentNis = (item.nisn || "").toString().trim();
      const newUser = await User.create({
        name: item.name,
        email: studentEmail,
        password: defaultPassword,
        role: "siswa",
        nis: studentNis,
        nisn: studentNis,
        gender: item.kelamin === "Perempuan" ? "Perempuan" : "Laki-laki",
        birthPlace: item.tempatLahir,
        birthDate: item.parsedBirthDate ? new Date(item.parsedBirthDate) : undefined,
        grade: gradeNum,
        departmentId: item.departmentId,
        classId: finalClassId,
        academicYear: "2024/2025 - Genap",
        isActive: true,
      });

      if (finalClassId) {
        await ClassModel.findByIdAndUpdate(finalClassId, {
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
