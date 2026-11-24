import mongoose from "mongoose";
import { ClassModel, CourseClass, User } from "@/models";

export interface ActiveRombelStudent {
  _id: string;
  name: string;
  nis: string;
  nisn: string;
  email: string;
  gender: string;
  rombelName: string;
}

export interface CourseEnrollmentCompleteness {
  rombelId: string | null;
  rombelName: string;
  totalActiveRombelStudents: number;
  enrolledCount: number;
  missingCount: number;
  completionPercentage: number;
  enrollmentStatus: "Complete" | "Incomplete" | "No active students" | "Unassigned";
  enrolledStudents: ActiveRombelStudent[];
  missingStudents: ActiveRombelStudent[];
}

/**
 * Resolve all active student ObjectIds belonging to a Rombel (ClassModel).
 * Combines User.find({ classId: rombelId, role: "siswa", isActive: true })
 * and ClassModel.studentIds (filtered to active students whose classId is either
 * this rombel or unset, avoiding counting students who transferred to another rombel)
 * so both sources of truth stay aligned.
 */
export async function getActiveStudentIdsForRombel(
  rombelId: string | mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId[]> {
  if (!rombelId || !mongoose.Types.ObjectId.isValid(String(rombelId))) {
    return [];
  }

  const rombelObjId = new mongoose.Types.ObjectId(String(rombelId));

  const [rombelDoc, usersInClass]: [
    { studentIds?: mongoose.Types.ObjectId[] } | null,
    Array<{ _id: unknown }>
  ] = await Promise.all([
    ClassModel.findById(rombelObjId).select("studentIds").lean() as Promise<{
      studentIds?: mongoose.Types.ObjectId[];
    } | null>,
    User.find({
      role: "siswa",
      isActive: true,
      classId: rombelObjId,
    })
      .select("_id")
      .lean(),
  ]);

  const idSet = new Set<string>();
  for (const u of usersInClass) {
    idSet.add(String(u._id));
  }

  if (rombelDoc && Array.isArray(rombelDoc.studentIds) && rombelDoc.studentIds.length > 0) {
    // Only include students from rombelDoc.studentIds if they are active AND haven't transferred to a different classId
    const validClassStudents = await User.find({
      _id: { $in: rombelDoc.studentIds },
      role: "siswa",
      isActive: true,
      $or: [{ classId: rombelObjId }, { classId: null }, { classId: { $exists: false } }],
    })
      .select("_id")
      .lean();

    for (const u of validClassStudents) {
      idSet.add(String(u._id));
    }
  }

  return Array.from(idSet).map((id) => new mongoose.Types.ObjectId(id));
}

/**
 * Retrieve detailed active student records officially assigned to a Rombel.
 * Excludes inactive students and students who transferred to a different rombel.
 */
export async function getActiveStudentsForRombelDetailed(
  rombelId: string | mongoose.Types.ObjectId,
  rombelNameFallback = "-"
): Promise<ActiveRombelStudent[]> {
  if (!rombelId || !mongoose.Types.ObjectId.isValid(String(rombelId))) {
    return [];
  }

  const rombelObjId = new mongoose.Types.ObjectId(String(rombelId));
  const rombelDoc = (await ClassModel.findById(rombelObjId)
    .select("name studentIds")
    .lean()) as { name?: string } | null;

  const resolvedRombelName = rombelDoc?.name || rombelNameFallback;
  const activeIds = await getActiveStudentIdsForRombel(rombelObjId);

  if (activeIds.length === 0) {
    return [];
  }

  const users = await User.find({
    _id: { $in: activeIds },
    role: "siswa",
    isActive: true,
  })
    .select("_id name nis nisn email gender")
    .sort({ name: 1 })
    .lean();

  return users.map((u) => {
    const rec = u as {
      _id: unknown;
      name?: string;
      nis?: string;
      nisn?: string;
      email?: string;
      gender?: string;
    };
    return {
      _id: String(rec._id),
      name: rec.name || "Siswa",
      nis: rec.nis || "-",
      nisn: rec.nisn || "-",
      email: rec.email || "-",
      gender: rec.gender || "-",
      rombelName: resolvedRombelName,
    };
  });
}

/**
 * Calculate enrollment completeness for a specific Mapel Class (CourseClass)
 * against the active students officially assigned to its rombel.
 *
 * Rules:
 * - Exclude inactive students from the expected active roster.
 * - Deduplicate enrolled student IDs.
 * - Do not count students from unrelated rombels toward the assigned rombel's completion percentage.
 * - Pure read-only calculation: never mutates enrollment records.
 */
export function calculateCourseEnrollmentCompleteness(
  courseClass: {
    classRombelId?: unknown;
    studentIds?: unknown[];
  },
  activeRombelStudents: ActiveRombelStudent[],
  rombelName = "-"
): CourseEnrollmentCompleteness {
  const rombelField = courseClass?.classRombelId as { _id?: unknown } | string | null | undefined;
  const rawRombelId = rombelField
    ? String(typeof rombelField === "object" && rombelField._id ? rombelField._id : rombelField)
    : null;

  if (!rawRombelId) {
    return {
      rombelId: null,
      rombelName: "Belum Ditetapkan (Legacy)",
      totalActiveRombelStudents: 0,
      enrolledCount: 0,
      missingCount: 0,
      completionPercentage: 0,
      enrollmentStatus: "Unassigned",
      enrolledStudents: [],
      missingStudents: [],
    };
  }

  // Build deduplicated set of student IDs currently enrolled in the Mapel Class
  const enrolledIdSet = new Set<string>();
  if (Array.isArray(courseClass.studentIds)) {
    for (const s of courseClass.studentIds) {
      if (!s) continue;
      const obj = s as { _id?: unknown };
      const sid = typeof s === "object" && obj._id ? String(obj._id) : String(s);
      if (sid) enrolledIdSet.add(sid);
    }
  }

  const enrolledStudents: ActiveRombelStudent[] = [];
  const missingStudents: ActiveRombelStudent[] = [];

  // Deduplicate activeRombelStudents just in case
  const seenActiveIds = new Set<string>();
  for (const student of activeRombelStudents) {
    const sid = String(student._id);
    if (seenActiveIds.has(sid)) continue;
    seenActiveIds.add(sid);

    if (enrolledIdSet.has(sid)) {
      enrolledStudents.push(student);
    } else {
      missingStudents.push(student);
    }
  }

  const totalActiveRombelStudents = seenActiveIds.size;
  const enrolledCount = enrolledStudents.length;
  const missingCount = missingStudents.length;

  let enrollmentStatus: CourseEnrollmentCompleteness["enrollmentStatus"];
  let completionPercentage = 0;

  if (totalActiveRombelStudents === 0) {
    enrollmentStatus = "No active students";
    completionPercentage = 0;
  } else if (missingCount === 0) {
    enrollmentStatus = "Complete";
    completionPercentage = 100;
  } else {
    enrollmentStatus = "Incomplete";
    completionPercentage = Math.round((enrolledCount / totalActiveRombelStudents) * 100);
  }

  return {
    rombelId: rawRombelId,
    rombelName,
    totalActiveRombelStudents,
    enrolledCount,
    missingCount,
    completionPercentage,
    enrollmentStatus,
    enrolledStudents,
    missingStudents,
  };
}

/**
 * Ensure ClassModel.studentIds and automatic-rombel CourseClasses assigned to this Rombel
 * include all active students of the Rombel.
 * Note: Only auto-enrolls into CourseClasses where enrollmentMethod === "rombel"
 * so that invitation-based classes assigned to the rombel preserve accurate enrolled vs missing tracking.
 */
export async function syncRombelStudents(
  rombelId: string | mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId[]> {
  if (!rombelId || !mongoose.Types.ObjectId.isValid(String(rombelId))) {
    return [];
  }

  const rombelObjId = new mongoose.Types.ObjectId(String(rombelId));
  const studentIds = await getActiveStudentIdsForRombel(rombelObjId);

  if (studentIds.length > 0) {
    await Promise.all([
      ClassModel.findByIdAndUpdate(rombelObjId, {
        $addToSet: { studentIds: { $each: studentIds } },
      }),
      CourseClass.updateMany(
        {
          isActive: true,
          enrollmentMethod: "rombel",
          $or: [
            { classRombelId: rombelObjId },
            { assignedRombelIds: rombelObjId },
          ],
        },
        {
          $addToSet: { studentIds: { $each: studentIds } },
        }
      ),
    ]);
  }

  return studentIds;
}

/**
 * Automatically enroll a single newly registered/updated student into their Rombel
 * and any automatic-rombel CourseClass (enrollmentMethod === "rombel") linked to that Rombel.
 */
export async function syncSingleStudentRombelEnrollment(
  studentId: string | mongoose.Types.ObjectId,
  rombelId: string | mongoose.Types.ObjectId
): Promise<void> {
  if (
    !studentId ||
    !rombelId ||
    !mongoose.Types.ObjectId.isValid(String(studentId)) ||
    !mongoose.Types.ObjectId.isValid(String(rombelId))
  ) {
    return;
  }

  const studentObjId = new mongoose.Types.ObjectId(String(studentId));
  const rombelObjId = new mongoose.Types.ObjectId(String(rombelId));

  await Promise.all([
    ClassModel.findByIdAndUpdate(rombelObjId, {
      $addToSet: { studentIds: studentObjId },
    }),
    CourseClass.updateMany(
      {
        isActive: true,
        enrollmentMethod: "rombel",
        $or: [
          { classRombelId: rombelObjId },
          { assignedRombelIds: rombelObjId },
        ],
      },
      {
        $addToSet: { studentIds: studentObjId },
      }
    ),
  ]);
}
