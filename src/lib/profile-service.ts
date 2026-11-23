import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import type { SessionUser } from "@/types";
import {
  User,
  CourseClass,
  Assignment,
  Submission,
  Quiz,
  Material,
  ClassModel,
  Department,
  Subject,
} from "@/models";
import { resolveSubmissionScoring, roundScore } from "@/lib/quiz-scoring";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_NUMBER_REGEX = /^[A-Za-z0-9.\s-]{3,30}$/;

const ALLOWED_FIELDS_BY_ROLE: Record<string, Set<string>> = {
  siswa: new Set([
    "email",
    "nisn",
    "nis",
    "currentPassword",
    "password",
    "newPassword",
    "confirmPassword",
    "photoUrl",
  ]),
  guru: new Set([
    "email",
    "nip",
    "currentPassword",
    "password",
    "newPassword",
    "confirmPassword",
    "photoUrl",
  ]),
  admin: new Set([
    "email",
    "nip",
    "currentPassword",
    "password",
    "newPassword",
    "confirmPassword",
    "photoUrl",
  ]),
  kurikulum: new Set(),
  kepsek: new Set(),
};

const READ_ONLY_ROLES = new Set(["kurikulum", "kepsek"]);

export async function handleGetProfile(req: Request, session: SessionUser) {
  try {
    const url = new URL(req.url);
    const requestedUserId =
      url.searchParams.get("userId") ||
      url.searchParams.get("id") ||
      url.searchParams.get("studentId") ||
      url.searchParams.get("teacherId");

    if (requestedUserId && String(requestedUserId) !== String(session.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda hanya dapat melihat profil Anda sendiri.",
        },
        { status: 403 }
      );
    }

    await connectDB();

    const user: any = await User.findById(session.id)
      .select("-password")
      .populate("classId", "name grade academicYear")
      .populate("departmentId", "name code description")
      .populate("homeroomClassId", "name grade academicYear")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    const role = user.role;
    const isReadOnly = READ_ONLY_ROLES.has(role);

    const permissions = {
      canEditAccount: !isReadOnly,
      canEditEmail: !isReadOnly,
      canEditIdentificationNumber: role === "siswa" || role === "guru",
      identificationField:
        role === "siswa" ? "nisn" : role === "guru" ? "nip" : null,
      identificationLabel:
        role === "siswa" ? "NISN" : role === "guru" ? "NIP" : null,
      canEditPassword: !isReadOnly,
      isReadOnly,
    };

    if (role === "siswa") {
      const studentRombelId = user.classId?._id || user.classId || null;
      const joinedClasses: any[] = await CourseClass.find({
        isActive: true,
        $or: [
          { studentIds: session.id },
          ...(studentRombelId
            ? [
                { classRombelId: studentRombelId },
                { assignedRombelIds: studentRombelId },
              ]
            : []),
        ],
      })
        .populate("teacherId", "name degree")
        .populate("subjectId", "name code")
        .lean();

      const joinedClassIds = joinedClasses.map((c) => c._id);

      const [allAssignments, allQuizzes] = await Promise.all([
        joinedClassIds.length > 0
          ? Assignment.find({
              courseClassId: { $in: joinedClassIds },
              isArchived: { $ne: true },
              isPublished: true,
              title: { $not: /forum[\s_-]*diskusi/i },
            })
              .populate("quizId")
              .lean()
          : [],
        joinedClassIds.length > 0
          ? Quiz.find({
              courseClassId: { $in: joinedClassIds },
              isPublished: true,
            }).lean()
          : [],
      ]);

      const linkedQuizIds = new Set<string>();
      allAssignments.forEach((a: any) => {
        if (a.quizId) linkedQuizIds.add(String(a.quizId._id || a.quizId));
      });
      const standaloneQuizzes = allQuizzes.filter(
        (q: any) => !linkedQuizIds.has(String(q._id))
      );

      const submissions: any[] = await Submission.find({
        studentId: session.id,
      }).lean();

      const quizMapById = new Map<string, any>();
      allQuizzes.forEach((q: any) => quizMapById.set(String(q._id), q));
      allAssignments.forEach((a: any) => {
        if (a.quizId && typeof a.quizId === "object" && a.quizId._id) {
          quizMapById.set(String(a.quizId._id), a.quizId);
        }
      });
      const assignMapById = new Map<string, any>();
      allAssignments.forEach((a: any) => assignMapById.set(String(a._id), a));

      const completedSubmissions = submissions.filter((s) =>
        ["turned_in", "late", "graded"].includes(s.status)
      );

      const normalizedScores: number[] = [];
      submissions.forEach((s) => {
        const qDoc = s.quizId ? quizMapById.get(String(s.quizId)) : null;
        const aDoc = s.assignmentId
          ? assignMapById.get(String(s.assignmentId))
          : null;
        const resolved = resolveSubmissionScoring(s, qDoc, aDoc);
        if (
          resolved.isFinalGraded &&
          typeof resolved.normalizedScore === "number" &&
          !Number.isNaN(resolved.normalizedScore)
        ) {
          normalizedScores.push(resolved.normalizedScore);
        }
      });

      const averageScore =
        normalizedScores.length > 0
          ? roundScore(
              normalizedScores.reduce((acc, s) => acc + s, 0) /
                normalizedScores.length
            )
          : 0;

      const totalAssignmentsCount = allAssignments.filter(
        (a: any) => a.type !== "kuis" && !a.quizId
      ).length;
      const totalQuizzesCount =
        allAssignments.filter((a: any) => a.type === "kuis" || Boolean(a.quizId))
          .length + standaloneQuizzes.length;

      return NextResponse.json({
        success: true,
        data: {
          user: {
            ...user,
            academicYear:
              user.academicYear || user.classId?.academicYear || "2024/2025",
          },
          permissions,
          stats: {
            joinedClassesCount: joinedClasses.length,
            totalAssignmentsCount,
            totalQuizzesCount,
            completedCount: completedSubmissions.length,
            gradedCount: normalizedScores.length,
            averageScore,
          },
          classes: joinedClasses.map((c: any) => ({
            _id: String(c._id),
            name: c.name,
            code: c.code,
            subjectName: c.subjectId?.name || c.name,
            teacherName: c.teacherId?.name || "Guru Pengampu",
          })),
        },
      });
    }

    if (role === "guru") {
      const courses: any[] = await CourseClass.find({
        teacherId: session.id,
        isActive: true,
      })
        .populate("subjectId", "name code")
        .populate("classRombelId", "name grade")
        .lean();

      const courseIds = courses.map((c) => c._id);
      const [totalMaterials, totalAssignments, totalQuizzes] = await Promise.all([
        Material.countDocuments({
          courseClassId: { $in: courseIds },
          isPublished: true,
        }),
        Assignment.countDocuments({
          teacherId: session.id,
          isArchived: { $ne: true },
        }),
        Quiz.countDocuments({
          teacherId: session.id,
          isPublished: true,
        }),
      ]);

      const uniqueStudents = new Set<string>();
      courses.forEach((c) => {
        if (Array.isArray(c.studentIds)) {
          c.studentIds.forEach((sid: unknown) => uniqueStudents.add(String(sid)));
        }
      });

      const derivedSubjects = Array.from(
        new Set([
          ...(Array.isArray(user.subjects) ? user.subjects.filter(Boolean) : []),
          ...courses
            .map((c) => c.subjectId?.name || c.name)
            .filter(Boolean),
        ])
      );

      return NextResponse.json({
        success: true,
        data: {
          user: {
            ...user,
            subjects: derivedSubjects,
          },
          permissions,
          stats: {
            totalCourses: courses.length,
            totalStudents: uniqueStudents.size,
            totalMaterials,
            totalAssignments,
            totalQuizzes,
          },
          courses: courses.map((c) => ({
            _id: String(c._id),
            name: c.name,
            code: c.code,
            subjectName: c.subjectId?.name || c.name,
            rombelName: c.classRombelId?.name || null,
            studentsCount: Array.isArray(c.studentIds) ? c.studentIds.length : 0,
          })),
        },
      });
    }

    // Admin, Kurikulum, Kepsek
    const [
      totalTeachers,
      totalStudents,
      totalClasses,
      totalDepartments,
      totalSubjects,
      totalCourseClasses,
    ] = await Promise.all([
      User.countDocuments({ role: "guru", isActive: true }),
      User.countDocuments({ role: "siswa", isActive: true }),
      ClassModel.countDocuments({}),
      Department.countDocuments({}),
      Subject.countDocuments({}),
      CourseClass.countDocuments({ isActive: true }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        user,
        permissions,
        stats: {
          totalTeachers,
          totalStudents,
          totalClasses,
          totalDepartments,
          totalSubjects,
          totalCourseClasses,
        },
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memuat profil pengguna";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function handleUpdateProfile(req: Request, session: SessionUser) {
  try {
    // 1. Check read-only roles (Kurikulum & Kepsek cannot update any profile fields)
    if (READ_ONLY_ROLES.has(session.role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Akses ditolak: Profil untuk peran ini bersifat hanya-baca (read-only).",
        },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const queryTargetId =
      url.searchParams.get("userId") ||
      url.searchParams.get("id") ||
      url.searchParams.get("studentId") ||
      url.searchParams.get("teacherId");

    if (queryTargetId && String(queryTargetId) !== String(session.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Tidak dapat mengubah profil pengguna lain.",
        },
        { status: 403 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Format data permintaan tidak valid" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Data permintaan tidak valid" },
        { status: 400 }
      );
    }

    // 2. Reject any attempt to target another user's ID in body
    for (const idField of ["_id", "id", "userId", "studentId", "teacherId"]) {
      if (
        body[idField] !== undefined &&
        String(body[idField]) !== String(session.id)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Akses ditolak: Tidak dapat mengubah profil pengguna lain.",
          },
          { status: 403 }
        );
      }
    }

    // 3. Enforce strict per-role field allowlist (reject personal biodata or role tampering)
    const allowedFields = ALLOWED_FIELDS_BY_ROLE[session.role] || new Set();
    const bodyKeys = Object.keys(body);

    if (bodyKeys.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada data yang dikirim untuk diperbarui" },
        { status: 400 }
      );
    }

    const forbiddenKeys = bodyKeys.filter((key) => !allowedFields.has(key));
    if (forbiddenKeys.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Akses ditolak: Kolom berikut bersifat hanya-baca dan tidak dapat diubah (${forbiddenKeys.join(", ")}).`,
        },
        { status: 403 }
      );
    }

    await connectDB();

    const user = await User.findById(session.id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    let hasChanges = false;

    // 4. Validate and update Email
    if (body.email !== undefined) {
      const normalizedEmail = String(body.email).trim().toLowerCase();
      if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
        return NextResponse.json(
          { success: false, message: "Format email tidak valid" },
          { status: 400 }
        );
      }

      if (normalizedEmail !== user.email) {
        const existingEmail = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: session.id },
        })
          .select("_id")
          .lean();

        if (existingEmail) {
          return NextResponse.json(
            {
              success: false,
              message: "Email sudah digunakan oleh pengguna lain",
            },
            { status: 400 }
          );
        }

        user.email = normalizedEmail;
        hasChanges = true;
      }
    }

    // 5. Validate and update Identification Number (Siswa: nisn/nis, Guru/Admin: nip)
    if (session.role === "siswa") {
      if (body.nisn !== undefined) {
        const normalizedNisn = String(body.nisn).trim();
        if (!normalizedNisn || !ID_NUMBER_REGEX.test(normalizedNisn)) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Format NISN tidak valid (gunakan 3-30 karakter angka/huruf)",
            },
            { status: 400 }
          );
        }

        if (normalizedNisn !== user.nisn) {
          const existingNisn = await User.findOne({
            _id: { $ne: session.id },
            $or: [{ nisn: normalizedNisn }, { nis: normalizedNisn }],
          })
            .select("_id")
            .lean();

          if (existingNisn) {
            return NextResponse.json(
              {
                success: false,
                message: "NISN sudah digunakan oleh siswa lain",
              },
              { status: 400 }
            );
          }

          user.nisn = normalizedNisn;
          if (!user.nis) {
            user.nis = normalizedNisn;
          }
          hasChanges = true;
        }
      }

      if (body.nis !== undefined) {
        const normalizedNis = String(body.nis).trim();
        if (!normalizedNis || !ID_NUMBER_REGEX.test(normalizedNis)) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Format NIS tidak valid (gunakan 3-30 karakter angka/huruf)",
            },
            { status: 400 }
          );
        }

        if (normalizedNis !== user.nis) {
          const existingNis = await User.findOne({
            _id: { $ne: session.id },
            $or: [{ nis: normalizedNis }, { nisn: normalizedNis }],
          })
            .select("_id")
            .lean();

          if (existingNis) {
            return NextResponse.json(
              {
                success: false,
                message: "NIS sudah digunakan oleh siswa lain",
              },
              { status: 400 }
            );
          }

          user.nis = normalizedNis;
          hasChanges = true;
        }
      }
    }

    if (session.role === "guru" || session.role === "admin") {
      if (body.nip !== undefined) {
        const normalizedNip = String(body.nip).trim();
        if (!normalizedNip || !ID_NUMBER_REGEX.test(normalizedNip)) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Format NIP tidak valid (gunakan 3-30 karakter angka/huruf)",
            },
            { status: 400 }
          );
        }

        if (normalizedNip !== user.nip) {
          const existingNip = await User.findOne({
            _id: { $ne: session.id },
            nip: normalizedNip,
          })
            .select("_id")
            .lean();

          if (existingNip) {
            return NextResponse.json(
              {
                success: false,
                message: "NIP sudah digunakan oleh pengguna lain",
              },
              { status: 400 }
            );
          }

          user.nip = normalizedNip;
          hasChanges = true;
        }
      }
    }

    // 6. Optional Photo URL update
    if (body.photoUrl !== undefined && typeof body.photoUrl === "string") {
      user.photoUrl = body.photoUrl.trim();
      hasChanges = true;
    }

    // 7. Validate and update Password
    const rawNewPassword =
      body.newPassword !== undefined ? body.newPassword : body.password;
    const isPasswordUpdateRequested =
      rawNewPassword !== undefined && String(rawNewPassword).length > 0;

    if (
      isPasswordUpdateRequested ||
      (body.currentPassword !== undefined &&
        String(body.currentPassword).length > 0 &&
        rawNewPassword !== undefined)
    ) {
      const currentPasswordStr = String(body.currentPassword || "");
      const newPasswordStr = String(rawNewPassword || "");
      const confirmPasswordStr =
        body.confirmPassword !== undefined
          ? String(body.confirmPassword)
          : newPasswordStr;

      if (!currentPasswordStr) {
        return NextResponse.json(
          {
            success: false,
            message: "Password saat ini wajib diisi untuk mengubah password",
          },
          { status: 400 }
        );
      }

      if (newPasswordStr.length < 6) {
        return NextResponse.json(
          {
            success: false,
            message: "Password baru minimal harus 6 karakter",
          },
          { status: 400 }
        );
      }

      if (body.confirmPassword !== undefined && newPasswordStr !== confirmPasswordStr) {
        return NextResponse.json(
          {
            success: false,
            message: "Konfirmasi password baru tidak cocok",
          },
          { status: 400 }
        );
      }

      const isCurrentValid = await bcrypt.compare(
        currentPasswordStr,
        user.password
      );
      if (!isCurrentValid) {
        return NextResponse.json(
          {
            success: false,
            message: "Password saat ini tidak sesuai",
          },
          { status: 400 }
        );
      }

      user.password = await bcrypt.hash(newPasswordStr, 10);
      hasChanges = true;
    }

    if (hasChanges) {
      await user.save();
    }

    const updatedUser = await User.findById(session.id)
      .select("-password")
      .populate("classId", "name grade academicYear")
      .populate("departmentId", "name code description")
      .populate("homeroomClassId", "name grade academicYear")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Informasi akun berhasil diperbarui",
      data: updatedUser,
    });
  } catch (err: any) {
    if (err && err.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Email atau nomor induk sudah terdaftar pada akun pengguna lain",
        },
        { status: 400 }
      );
    }
    const message =
      err instanceof Error ? err.message : "Gagal memperbarui profil";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
