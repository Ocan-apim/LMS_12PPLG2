/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import {
  User,
  ClassModel,
  CourseClass,
  Assignment,
  Quiz,
  Material,
  ClassPost,
  Submission,
  Subject,
  Department,
  AcademicAssignment,
  Notification,
} from "@/models";

export interface ClassDeletionAnalysis {
  _id: string;
  name: string;
  code: string;
  rombelName: string | null;
  materialCount: number;
  assignmentCount: number;
  quizCount: number;
  postCount: number;
  submissionCount: number;
  gradedSubmissionCount: number;
  studentCommentCount: number;
  hasMeaningfulHistoricalRecords: boolean;
}

export interface TeacherDeletionSummary {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  teacherNip: string;
  classCount: number;
  materialCount: number;
  assignmentCount: number;
  quizCount: number;
  submissionCount: number;
  gradedSubmissionCount: number;
  hasHistoricalRecords: boolean;
  classes: ClassDeletionAnalysis[];
}

export interface TeacherDeletionResult {
  teacherId: string;
  teacherName: string;
  deletedClassesCount: number;
  preservedHistoricalClassesCount: number;
  preservedHistoricalClasses: Array<{
    _id: string;
    name: string;
    submissionCount: number;
    gradedSubmissionCount: number;
  }>;
  deletedMaterialsCount: number;
  deletedAssignmentsCount: number;
  deletedQuizzesCount: number;
  deletedPostsCount: number;
}

export interface OrphanClassInspectionResult {
  removedEmptyOrphanClassIds: string[];
  removedEmptyOrphanClassNames: string[];
  orphanedClassesWithRecords: Array<{
    _id: string;
    name: string;
    code: string;
    rombelId: string | null;
    rombelName: string;
    academicYear: string;
    studentCount: number;
    assignmentCount: number;
    quizCount: number;
    submissionCount: number;
    gradedSubmissionCount: number;
    studentCommentCount: number;
    isActive: boolean;
  }>;
  validLegacyUnassignedClasses: Array<{
    _id: string;
    name: string;
    code: string;
    teacherId: string;
    teacherName: string;
    category: string;
    studentCount: number;
    academicYear: string;
  }>;
}

function countStudentCommentsInArray(comments?: any[]): number {
  if (!Array.isArray(comments)) return 0;
  return comments.filter(
    (c) =>
      c &&
      !c.isDeleted &&
      (c.userRole === "siswa" || c.senderRole === "siswa" || Boolean(c.message))
  ).length;
}

/**
 * Inspect a single CourseClass to determine its related counts and whether it
 * contains meaningful student academic records (submissions, grades, feedback, or discussion comments).
 */
export async function analyzeCourseClassRecords(
  courseClass: any,
  rombelNameFallback: string | null = null
): Promise<ClassDeletionAnalysis> {
  const ccId = courseClass._id;

  const [materials, assignments, quizzes, posts] = await Promise.all([
    Material.find({ courseClassId: ccId }).select("_id").lean(),
    Assignment.find({ courseClassId: ccId })
      .select("_id title type quizId comments")
      .lean(),
    Quiz.find({ courseClassId: ccId }).select("_id title comments").lean(),
    ClassPost.find({ courseClassId: ccId }).select("_id comments").lean(),
  ]);

  const assignIds = assignments.map((a: any) => a._id);
  const quizIds = quizzes.map((q: any) => q._id);

  const subOrConds: Record<string, unknown>[] = [{ courseClassId: ccId }];
  if (assignIds.length > 0) {
    subOrConds.push({ assignmentId: { $in: assignIds } });
  }
  if (quizIds.length > 0) {
    subOrConds.push({ quizId: { $in: quizIds } });
  }

  const submissions = await Submission.find({ $or: subOrConds })
    .select("_id status score feedback answers")
    .lean();

  const meaningfulSubmissions = submissions.filter(
    (s: any) =>
      ["turned_in", "late", "graded"].includes(s.status) ||
      typeof s.score === "number" ||
      (typeof s.feedback === "string" && s.feedback.trim().length > 0) ||
      (Array.isArray(s.answers) && s.answers.length > 0)
  );

  const gradedSubmissions = meaningfulSubmissions.filter(
    (s: any) => s.status === "graded" || typeof s.score === "number"
  );

  let studentCommentCount = 0;
  for (const a of assignments as any[]) {
    studentCommentCount += countStudentCommentsInArray(a.comments);
  }
  for (const q of quizzes as any[]) {
    studentCommentCount += countStudentCommentsInArray(q.comments);
  }
  for (const p of posts as any[]) {
    studentCommentCount += countStudentCommentsInArray(p.comments);
  }

  const linkedQuizIds = new Set<string>();
  let ordinaryAssignmentCount = 0;
  let quizTypeAssignmentCount = 0;

  for (const a of assignments as any[]) {
    if (a.quizId) {
      linkedQuizIds.add(String(a.quizId));
    }
    if (a.type === "kuis" || a.quizId) {
      quizTypeAssignmentCount++;
    } else {
      ordinaryAssignmentCount++;
    }
  }

  const standaloneQuizCount = quizzes.filter(
    (q: any) => !linkedQuizIds.has(String(q._id))
  ).length;

  const totalQuizCount = Math.max(
    quizzes.length,
    quizTypeAssignmentCount + standaloneQuizCount
  );

  const hasMeaningfulHistoricalRecords =
    meaningfulSubmissions.length > 0 ||
    gradedSubmissions.length > 0 ||
    studentCommentCount > 0;

  const rombelObj = courseClass.classRombelId;
  const resolvedRombelName =
    (rombelObj && typeof rombelObj === "object" && rombelObj.name
      ? String(rombelObj.name)
      : null) || rombelNameFallback;

  return {
    _id: String(ccId),
    name: courseClass.name || "Kelas Mapel",
    code: courseClass.code || "-",
    rombelName: resolvedRombelName,
    materialCount: materials.length,
    assignmentCount: ordinaryAssignmentCount,
    quizCount: totalQuizCount,
    postCount: posts.length,
    submissionCount: meaningfulSubmissions.length,
    gradedSubmissionCount: gradedSubmissions.length,
    studentCommentCount,
    hasMeaningfulHistoricalRecords,
  };
}

/**
 * Permanently delete a CourseClass and all of its class-specific child records
 * (Material, ClassPost, Submission, Assignment, Quiz, Notification).
 * Used when an Admin explicitly deletes a Mapel Class (even if historical submissions exist)
 * or when cleaning up a genuinely empty CourseClass.
 * Never deletes the Rombel (ClassModel), student accounts (User), or other classes' records.
 */
export async function deleteCourseClassAndAllRecords(
  ccId: string | mongoose.Types.ObjectId
): Promise<{
  deletedMaterials: number;
  deletedAssignments: number;
  deletedQuizzes: number;
  deletedPosts: number;
  deletedSubmissions: number;
}> {
  const objId = new mongoose.Types.ObjectId(String(ccId));

  const [assignments, quizzes] = await Promise.all([
    Assignment.find({ courseClassId: objId }).select("_id").lean(),
    Quiz.find({ courseClassId: objId }).select("_id").lean(),
  ]);

  const assignIds = assignments.map((a: any) => a._id);
  const quizIds = quizzes.map((q: any) => q._id);

  const subOrConds: Record<string, unknown>[] = [{ courseClassId: objId }];
  if (assignIds.length > 0) {
    subOrConds.push({ assignmentId: { $in: assignIds } });
  }
  if (quizIds.length > 0) {
    subOrConds.push({ quizId: { $in: quizIds } });
  }

  const entityIds: mongoose.Types.ObjectId[] = [
    objId,
    ...assignIds,
    ...quizIds,
  ];

  const [matDel, postDel, subDel, assignDel, quizDel] = await Promise.all([
    Material.deleteMany({ courseClassId: objId }),
    ClassPost.deleteMany({ courseClassId: objId }),
    Submission.deleteMany({ $or: subOrConds }),
    Assignment.deleteMany({ courseClassId: objId }),
    Quiz.deleteMany({ courseClassId: objId }),
    Notification.deleteMany({ relatedEntityId: { $in: entityIds } }),
  ]);

  await CourseClass.deleteOne({ _id: objId });

  return {
    deletedMaterials: matDel.deletedCount || 0,
    deletedAssignments: assignDel.deletedCount || 0,
    deletedQuizzes: quizDel.deletedCount || 0,
    deletedPosts: postDel.deletedCount || 0,
    deletedSubmissions: subDel.deletedCount || 0,
  };
}

/**
 * Permanently delete a genuinely empty CourseClass and all of its empty class-specific child records.
 * Must ONLY be called after verifying `hasMeaningfulHistoricalRecords === false`.
 */
export async function deleteEmptyCourseClassCascade(
  ccId: string | mongoose.Types.ObjectId
): Promise<{
  deletedMaterials: number;
  deletedAssignments: number;
  deletedQuizzes: number;
  deletedPosts: number;
}> {
  const res = await deleteCourseClassAndAllRecords(ccId);
  return {
    deletedMaterials: res.deletedMaterials,
    deletedAssignments: res.deletedAssignments,
    deletedQuizzes: res.deletedQuizzes,
    deletedPosts: res.deletedPosts,
  };
}

/**
 * Build a live database summary of all Mapel Classes, Materi, Tugas, Kuis, and Submissions
 * linked to a specific Guru account before confirmation.
 */
export async function getTeacherDeletionSummary(
  teacherId: string
): Promise<TeacherDeletionSummary | null> {
  if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
    return null;
  }

  const teacher: any = await User.findOne({
    _id: teacherId,
    role: "guru",
  })
    .select("_id name email nip degree")
    .lean();

  if (!teacher) {
    return null;
  }

  const classes = await CourseClass.find({ teacherId: teacher._id })
    .populate("classRombelId", "name grade")
    .sort({ createdAt: -1 })
    .lean();

  const classAnalyses = await Promise.all(
    classes.map((cc) => analyzeCourseClassRecords(cc))
  );

  const classIds = classes.map((c: any) => c._id);

  // Also count any standalone teacher-owned materials/assignments/quizzes not tied to those classIds
  const [extraMaterialsCount, extraAssignments, extraQuizzesCount] =
    await Promise.all([
      Material.countDocuments({
        teacherId: teacher._id,
        ...(classIds.length > 0 ? { courseClassId: { $nin: classIds } } : {}),
      }),
      Assignment.find({
        teacherId: teacher._id,
        ...(classIds.length > 0 ? { courseClassId: { $nin: classIds } } : {}),
      })
        .select("_id type quizId")
        .lean(),
      Quiz.countDocuments({
        teacherId: teacher._id,
        ...(classIds.length > 0 ? { courseClassId: { $nin: classIds } } : {}),
      }),
    ]);

  const extraOrdinaryAssignments = extraAssignments.filter(
    (a: any) => a.type !== "kuis" && !a.quizId
  ).length;

  const materialCount =
    classAnalyses.reduce((sum, c) => sum + c.materialCount, 0) +
    extraMaterialsCount;
  const assignmentCount =
    classAnalyses.reduce((sum, c) => sum + c.assignmentCount, 0) +
    extraOrdinaryAssignments;
  const quizCount =
    classAnalyses.reduce((sum, c) => sum + c.quizCount, 0) + extraQuizzesCount;
  const submissionCount = classAnalyses.reduce(
    (sum, c) => sum + c.submissionCount,
    0
  );
  const gradedSubmissionCount = classAnalyses.reduce(
    (sum, c) => sum + c.gradedSubmissionCount,
    0
  );

  const teacherDisplayName = `${teacher.name}${
    teacher.degree ? `, ${teacher.degree}` : ""
  }`;

  return {
    teacherId: String(teacher._id),
    teacherName: teacherDisplayName,
    teacherEmail: teacher.email || "-",
    teacherNip: teacher.nip || "-",
    classCount: classes.length,
    materialCount,
    assignmentCount,
    quizCount,
    submissionCount,
    gradedSubmissionCount,
    hasHistoricalRecords: classAnalyses.some(
      (c) => c.hasMeaningfulHistoricalRecords
    ),
    classes: classAnalyses,
  };
}

/**
 * Safely delete a Guru account and clean up all associated Mapel Classes:
 * - Empty Mapel Classes (no student submissions/grades/feedback) are deleted along with their materials, assignments, quizzes, and posts.
 * - Mapel Classes containing meaningful student submissions/grades/academic history are deactivated/archived (`isActive: false`) so student academic history is never silently destroyed, and reported back to Admin.
 * - Unlinks homeroom class, subjects, departments, and academic assignments without affecting other teachers or students.
 */
export async function deleteTeacherAndClasses(
  teacherId: string
): Promise<TeacherDeletionResult | null> {
  if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
    return null;
  }

  const teacher: any = await User.findOne({
    _id: teacherId,
    role: "guru",
  });

  if (!teacher) {
    return null;
  }

  const teacherObjId = teacher._id;
  const teacherDisplayName = `${teacher.name}${
    teacher.degree ? `, ${teacher.degree}` : ""
  }`;

  const classes = await CourseClass.find({ teacherId: teacherObjId }).lean();

  let deletedClassesCount = 0;
  let deletedMaterialsCount = 0;
  let deletedAssignmentsCount = 0;
  let deletedQuizzesCount = 0;
  let deletedPostsCount = 0;
  const preservedHistoricalClasses: TeacherDeletionResult["preservedHistoricalClasses"] =
    [];
  const preservedClassObjIds: mongoose.Types.ObjectId[] = [];

  for (const cc of classes) {
    const analysis = await analyzeCourseClassRecords(cc);
    if (analysis.hasMeaningfulHistoricalRecords) {
      // Preserve historical student submissions, grades, and comments; deactivate class so it is archived safely
      await Promise.all([
        CourseClass.findByIdAndUpdate(cc._id, {
          $set: { isActive: false },
        }),
        Assignment.updateMany(
          { courseClassId: cc._id },
          { $set: { isArchived: true, isPublished: false } }
        ),
        Quiz.updateMany(
          { courseClassId: cc._id },
          { $set: { isPublished: false } }
        ),
      ]);
      preservedClassObjIds.push(new mongoose.Types.ObjectId(String(cc._id)));
      preservedHistoricalClasses.push({
        _id: String(cc._id),
        name: cc.name,
        submissionCount: analysis.submissionCount,
        gradedSubmissionCount: analysis.gradedSubmissionCount,
      });
    } else {
      const delCounts = await deleteEmptyCourseClassCascade(String(cc._id));
      deletedClassesCount++;
      deletedMaterialsCount += delCounts.deletedMaterials;
      deletedAssignmentsCount += delCounts.deletedAssignments;
      deletedQuizzesCount += delCounts.deletedQuizzes;
      deletedPostsCount += delCounts.deletedPosts;
    }
  }

  // Clean up any standalone materials/posts/assignments/quizzes owned by this teacher that are not in preserved historical classes
  const standaloneFilter: Record<string, unknown> = {
    teacherId: teacherObjId,
    ...(preservedClassObjIds.length > 0
      ? { courseClassId: { $nin: preservedClassObjIds } }
      : {}),
  };

  const standaloneAssignments = await Assignment.find(standaloneFilter)
    .select("_id")
    .lean();
  const standaloneQuizzes = await Quiz.find(standaloneFilter)
    .select("_id")
    .lean();

  for (const sa of standaloneAssignments) {
    const subCount = await Submission.countDocuments({
      assignmentId: sa._id,
      status: { $in: ["turned_in", "late", "graded"] },
    });
    if (subCount === 0) {
      await Submission.deleteMany({ assignmentId: sa._id });
      await Assignment.deleteOne({ _id: sa._id });
      deletedAssignmentsCount++;
    } else {
      await Assignment.findByIdAndUpdate(sa._id, {
        $set: { isArchived: true, isPublished: false },
      });
    }
  }

  for (const sq of standaloneQuizzes) {
    const subCount = await Submission.countDocuments({
      quizId: sq._id,
      status: { $in: ["turned_in", "late", "graded"] },
    });
    if (subCount === 0) {
      await Submission.deleteMany({ quizId: sq._id });
      await Quiz.deleteOne({ _id: sq._id });
      deletedQuizzesCount++;
    } else {
      await Quiz.findByIdAndUpdate(sq._id, {
        $set: { isPublished: false },
      });
    }
  }

  const [extraMatDel, extraPostDel] = await Promise.all([
    Material.deleteMany(standaloneFilter),
    ClassPost.deleteMany(standaloneFilter),
  ]);
  deletedMaterialsCount += extraMatDel.deletedCount || 0;
  deletedPostsCount += extraPostDel.deletedCount || 0;

  // Unlink homeroom classes, subjects, departments, and academic assignments
  await Promise.all([
    ClassModel.updateMany(
      { homeroomTeacherId: teacherObjId },
      { $unset: { homeroomTeacherId: 1 } }
    ),
    Subject.updateMany(
      { teacherIds: teacherObjId },
      { $pull: { teacherIds: teacherObjId } }
    ),
    Department.updateMany(
      { headOfDepartmentId: teacherObjId },
      { $unset: { headOfDepartmentId: 1 } }
    ),
    AcademicAssignment.deleteMany({ teacherId: teacherObjId }),
  ]);

  // Delete the Guru user record
  await User.findByIdAndDelete(teacherObjId);

  return {
    teacherId: String(teacherObjId),
    teacherName: teacherDisplayName,
    deletedClassesCount,
    preservedHistoricalClassesCount: preservedHistoricalClasses.length,
    preservedHistoricalClasses,
    deletedMaterialsCount,
    deletedAssignmentsCount,
    deletedQuizzesCount,
    deletedPostsCount,
  };
}

/**
 * Inspect all Mapel Classes (CourseClass) in the database to distinguish:
 * 1. Classes WITHOUT a valid assigned Guru:
 *    - If genuinely empty (no student submissions, grades, feedback, or comments), permanently remove from DB along with empty child records.
 *    - If containing meaningful historical records, preserve in DB and surface in `orphanedClassesWithRecords` for Admin review.
 * 2. Classes WITH a valid assigned Guru but WITHOUT a rombel (`classRombelId` null/missing):
 *    - Preserve in `validLegacyUnassignedClasses` for Admin's one-time rombel assignment workflow.
 */
export async function inspectAndCleanOrphanedClasses(): Promise<OrphanClassInspectionResult> {
  const [allGuruUsers, allRombels, allCourseClasses] = await Promise.all([
    User.find({ role: "guru" })
      .select("_id name email nip degree isActive")
      .lean(),
    ClassModel.find({}).select("_id name grade").lean(),
    CourseClass.find({})
      .populate("subjectId", "name code category")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const guruById = new Map<string, any>();
  for (const g of allGuruUsers as any[]) {
    guruById.set(String(g._id), g);
  }

  const rombelById = new Map<string, any>();
  for (const r of allRombels as any[]) {
    rombelById.set(String(r._id), r);
  }

  const removedEmptyOrphanClassIds: string[] = [];
  const removedEmptyOrphanClassNames: string[] = [];
  const orphanedClassesWithRecords: OrphanClassInspectionResult["orphanedClassesWithRecords"] =
    [];
  const validLegacyUnassignedClasses: OrphanClassInspectionResult["validLegacyUnassignedClasses"] =
    [];

  for (const cc of allCourseClasses as any[]) {
    const rawTeacherId = cc.teacherId
      ? String(cc.teacherId._id || cc.teacherId)
      : "";
    const validTeacher = rawTeacherId ? guruById.get(rawTeacherId) : null;
    const rawRombelId = cc.classRombelId
      ? String(cc.classRombelId._id || cc.classRombelId)
      : "";
    const rombelDoc = rawRombelId ? rombelById.get(rawRombelId) : null;

    if (!validTeacher) {
      // Orphaned class: no valid assigned Guru in the database
      const analysis = await analyzeCourseClassRecords(
        cc,
        rombelDoc?.name || null
      );

      if (!analysis.hasMeaningfulHistoricalRecords) {
        // Genuinely empty orphan class -> remove from database along with empty child records
        await deleteEmptyCourseClassCascade(String(cc._id));
        removedEmptyOrphanClassIds.push(String(cc._id));
        removedEmptyOrphanClassNames.push(cc.name || String(cc._id));
      } else {
        // Orphaned class with meaningful student submissions/grades/comments -> preserve for Admin review
        orphanedClassesWithRecords.push({
          _id: String(cc._id),
          name: cc.name,
          code: cc.code || "-",
          rombelId: rawRombelId || null,
          rombelName: rombelDoc?.name || "Belum Ditetapkan",
          academicYear: cc.academicYear || "-",
          studentCount: Array.isArray(cc.studentIds)
            ? cc.studentIds.length
            : 0,
          assignmentCount: analysis.assignmentCount,
          quizCount: analysis.quizCount,
          submissionCount: analysis.submissionCount,
          gradedSubmissionCount: analysis.gradedSubmissionCount,
          studentCommentCount: analysis.studentCommentCount,
          isActive: Boolean(cc.isActive),
        });
      }
    } else if (cc.isActive && !rawRombelId) {
      // Class has a valid assigned Guru, but has no rombel assignment -> eligible for legacy one-time rombel assignment
      const teacherDisplayName = `${validTeacher.name}${
        validTeacher.degree ? `, ${validTeacher.degree}` : ""
      }`;
      validLegacyUnassignedClasses.push({
        _id: String(cc._id),
        name: cc.name,
        code: cc.code || "-",
        teacherId: String(validTeacher._id),
        teacherName: teacherDisplayName,
        category: cc.subjectId?.category || "Kejuruan",
        studentCount: Array.isArray(cc.studentIds) ? cc.studentIds.length : 0,
        academicYear: cc.academicYear || "-",
      });
    }
  }

  return {
    removedEmptyOrphanClassIds,
    removedEmptyOrphanClassNames,
    orphanedClassesWithRecords,
    validLegacyUnassignedClasses,
  };
}
