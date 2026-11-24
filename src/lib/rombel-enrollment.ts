import mongoose from "mongoose";
import { ClassModel, CourseClass, User } from "@/models";

/**
 * Returns a deduplicated list of active student ObjectIds belonging to a specific rombel.
 * Only active students (role === "siswa", isActive === true) whose classId matches the rombel
 * (or who are in ClassModel.studentIds without a conflicting classId) are included.
 */
export async function getActiveStudentIdsForRombel(
  rombelId: string | mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId[]> {
  if (!rombelId || !mongoose.Types.ObjectId.isValid(String(rombelId))) {
    return [];
  }

  const rombelObjId = new mongoose.Types.ObjectId(String(rombelId));
  const rombelDoc = (await ClassModel.findOne({
    _id: rombelObjId,
    isActive: true,
  })
    .select("_id studentIds")
    .lean()) as {
    _id: mongoose.Types.ObjectId;
    studentIds?: mongoose.Types.ObjectId[];
  } | null;

  if (!rombelDoc) {
    return [];
  }

  const rombelListedIds = Array.isArray(rombelDoc.studentIds)
    ? rombelDoc.studentIds
    : [];

  const orConditions: Record<string, unknown>[] = [{ classId: rombelObjId }];
  if (rombelListedIds.length > 0) {
    orConditions.push({
      _id: { $in: rombelListedIds },
      $or: [
        { classId: rombelObjId },
        { classId: null },
        { classId: { $exists: false } },
      ],
    });
  }

  const activeStudents = (await User.find({
    role: "siswa",
    isActive: true,
    $or: orConditions,
  })
    .select("_id")
    .lean()) as Array<{ _id: mongoose.Types.ObjectId }>;

  const uniqueMap = new Map<string, mongoose.Types.ObjectId>();
  for (const st of activeStudents) {
    uniqueMap.set(String(st._id), st._id);
  }

  return Array.from(uniqueMap.values());
}

/**
 * Synchronizes all active students in a rombel into:
 * 1. ClassModel.studentIds (via $addToSet)
 * 2. All active CourseClass documents assigned to that rombel (via $addToSet)
 *
 * Non-destructive and idempotent: never creates duplicate enrollments and never
 * deletes historical enrollments, submissions, or grades.
 */
export async function syncRombelStudents(
  rombelId: string | mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId[]> {
  const activeStudentIds = await getActiveStudentIdsForRombel(rombelId);
  if (activeStudentIds.length === 0) {
    return [];
  }

  const rombelObjId = new mongoose.Types.ObjectId(String(rombelId));

  await Promise.all([
    ClassModel.findByIdAndUpdate(rombelObjId, {
      $addToSet: { studentIds: { $each: activeStudentIds } },
    }),
    CourseClass.updateMany(
      {
        isActive: true,
        $or: [
          { classRombelId: rombelObjId },
          { assignedRombelIds: rombelObjId },
        ],
      },
      {
        $addToSet: { studentIds: { $each: activeStudentIds } },
      }
    ),
  ]);

  return activeStudentIds;
}

/**
 * Synchronizes a single active student into all active CourseClass documents
 * assigned to their current rombel.
 */
export async function syncSingleStudentRombelEnrollment(
  studentId: string | mongoose.Types.ObjectId,
  rombelId?: string | mongoose.Types.ObjectId | null
): Promise<void> {
  if (!studentId || !mongoose.Types.ObjectId.isValid(String(studentId))) {
    return;
  }

  const studentObjId = new mongoose.Types.ObjectId(String(studentId));
  const student = (await User.findOne({
    _id: studentObjId,
    role: "siswa",
    isActive: true,
  })
    .select("_id classId")
    .lean()) as {
    _id: mongoose.Types.ObjectId;
    classId?: mongoose.Types.ObjectId;
  } | null;

  if (!student) {
    return;
  }

  const targetRombel = rombelId || student.classId;
  if (!targetRombel || !mongoose.Types.ObjectId.isValid(String(targetRombel))) {
    return;
  }

  const rombelObjId = new mongoose.Types.ObjectId(String(targetRombel));

  await Promise.all([
    ClassModel.findByIdAndUpdate(rombelObjId, {
      $addToSet: { studentIds: studentObjId },
    }),
    CourseClass.updateMany(
      {
        isActive: true,
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
