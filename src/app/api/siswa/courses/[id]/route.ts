import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, Assignment, Submission, ClassPost, Material, Quiz, ClassModel } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["siswa", "admin", "kurikulum", "kepsek", "guru"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const isStudent = session.role === "siswa";
    const isStaff = ["admin", "kurikulum", "kepsek", "guru"].includes(session.role);

    const url = new URL(req.url);
    const requestedCourseId = url.searchParams.get("courseClassId");

    let targetCourseId = id;
    let courseClass: any = null;
    let siblingClasses: any[] = [];
    let rombelInfo: any = null;

    // 1. Try finding CourseClass directly
    courseClass = await CourseClass.findById(targetCourseId)
      .populate("teacherId", "name email degree nip")
      .populate("subjectId", "name code category")
      .populate("classRombelId", "name grade")
      .populate("studentIds", "name nisn email gender")
      .lean();

    // 2. If not found by direct ID, check if id is a ClassModel (Rombel)
    if (!courseClass) {
      const rombel: any = await ClassModel.findById(id)
        .populate("homeroomTeacherId", "name email degree nip")
        .populate("departmentId", "name code")
        .populate("studentIds", "name nisn email gender")
        .lean();

      if (rombel) {
        rombelInfo = rombel;
        // Find all active CourseClasses for this rombel
        const foundCourses = await CourseClass.find({
          classRombelId: rombel._id,
          isActive: true,
        })
          .populate("teacherId", "name email degree nip")
          .populate("subjectId", "name code category")
          .populate("studentIds", "name nisn email gender")
          .lean();

        siblingClasses = foundCourses;

        if (foundCourses.length > 0) {
          const selected = requestedCourseId
            ? foundCourses.find((c) => String(c._id) === requestedCourseId) || foundCourses[0]
            : foundCourses[0];

          targetCourseId = String(selected._id);
          courseClass = await CourseClass.findById(targetCourseId)
            .populate("teacherId", "name email degree nip")
            .populate("subjectId", "name code category")
            .populate("classRombelId", "name grade")
            .populate("studentIds", "name nisn email gender")
            .lean();
        } else {
          // Rombel exists but has no CourseClass yet
          return NextResponse.json({
            success: true,
            data: {
              _id: String(rombel._id),
              name: rombel.name,
              code: "-",
              bannerColor: "blue",
              academicYear: rombel.academicYear || "2026/2027",
              teacher: rombel.homeroomTeacherId,
              rombel: { _id: String(rombel._id), name: rombel.name, grade: rombel.grade },
              students: rombel.studentIds || [],
              studentCount: Array.isArray(rombel.studentIds) ? rombel.studentIds.length : 0,
              assignments: [],
              quizzes: [],
              posts: [],
              materials: [],
              sharedFiles: [],
              siblingClasses: [],
              isReadOnly: isStaff,
              currentUserRole: session.role,
              noCourseClass: true,
            },
          });
        }
      }
    }

    if (!courseClass || courseClass.isActive === false) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan atau belum aktif" },
        { status: 404 }
      );
    }

    // If courseClass has a rombel and we haven't loaded siblings yet, load them
    if (courseClass.classRombelId && siblingClasses.length === 0) {
      const rombelId = courseClass.classRombelId._id || courseClass.classRombelId;
      siblingClasses = await CourseClass.find({
        classRombelId: rombelId,
        isActive: true,
      })
        .populate("teacherId", "name email degree nip")
        .populate("subjectId", "name code category")
        .lean();
    }

    // Verify membership: for student, session.id must be in studentIds
    const rawStudentIds = Array.isArray(courseClass.studentIds)
      ? courseClass.studentIds.map((s: any) => (s && s._id ? String(s._id) : String(s)))
      : [];

    if (isStudent && !rawStudentIds.includes(session.id)) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda belum terdaftar di kelas ini" },
        { status: 403 }
      );
    }

    // Assignments in this class
    const assignments = await Assignment.find({
      courseClassId: targetCourseId,
      isArchived: { $ne: true },
      isPublished: true,
    })
      .select("_id title type description dueDate maxScore quizId createdAt")
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    // Map student submissions
    const assignmentIds = assignments.map((a: any) => a._id);
    let subMap = new Map();

    if (isStudent) {
      const submissions = await Submission.find({
        assignmentId: { $in: assignmentIds },
        studentId: session.id,
      })
        .select("assignmentId status score submittedAt")
        .lean();

      subMap = new Map(
        submissions.map((s: any) => [String(s.assignmentId), s])
      );
    }

    const enrichedAssignments = assignments.map((a: any) => {
      const sub = subMap.get(String(a._id));
      const isLate = !sub && a.dueDate && new Date(a.dueDate).getTime() < Date.now();
      return {
        _id: a._id,
        title: a.title,
        description: a.description,
        type: "tugas" as const,
        dueDate: a.dueDate,
        maxScore: a.maxScore || 100,
        submissionStatus: sub ? sub.status : isLate ? "late" : "assigned",
        score: sub ? sub.score : null,
        submittedAt: sub ? sub.submittedAt : null,
        createdAt: a.createdAt,
      };
    });

    // Quizzes in this class
    const quizzes = await Quiz.find({
      courseClassId: targetCourseId,
      isPublished: true,
    })
      .select("_id title description durationSeconds totalPoints totalQuestions dueDate createdAt")
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    const quizIds = quizzes.map((q: any) => q._id);
    let quizSubMap = new Map();

    if (isStudent) {
      const quizSubmissions = await Submission.find({
        quizId: { $in: quizIds },
        studentId: session.id,
      })
        .select("quizId status score submittedAt")
        .lean();

      quizSubMap = new Map(
        quizSubmissions.map((s: any) => [String(s.quizId), s])
      );
    }

    const enrichedQuizzes = quizzes.map((q: any) => {
      const sub = quizSubMap.get(String(q._id));
      const isLate = !sub && q.dueDate && new Date(q.dueDate).getTime() < Date.now();
      return {
        _id: q._id,
        title: q.title,
        description: q.description,
        type: "kuis" as const,
        dueDate: q.dueDate,
        maxScore: q.totalPoints || 100,
        totalQuestions: q.totalQuestions,
        durationSeconds: q.durationSeconds,
        submissionStatus: sub ? sub.status : isLate ? "late" : "assigned",
        score: sub ? sub.score : null,
        submittedAt: sub ? sub.submittedAt : null,
        createdAt: q.createdAt,
      };
    });

    // Activity stream / Class Posts
    const posts = await ClassPost.find({ courseClassId: targetCourseId })
      .populate("teacherId", "name degree")
      .sort({ createdAt: -1 })
      .lean();

    // Published Materials
    const materials = await Material.find({
      courseClassId: targetCourseId,
      isPublished: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Shared Files
    const sharedFiles = courseClass.sharedFiles || [];

    // Format students list
    const studentsList = Array.isArray(courseClass.studentIds)
      ? courseClass.studentIds.map((st: any) => ({
          _id: String(st._id || st),
          name: st.name || "Siswa",
          nisn: st.nisn || "-",
          email: st.email || "-",
          gender: st.gender || "-",
        }))
      : [];

    // Format sibling course classes
    const formattedSiblingClasses = siblingClasses.map((sc: any) => ({
      _id: String(sc._id),
      name: sc.name,
      code: sc.code,
      subjectName: sc.subjectId?.name || sc.name,
      teacherName: sc.teacherId
        ? `${sc.teacherId.name}${sc.teacherId.degree ? `, ${sc.teacherId.degree}` : ""}`
        : "Guru Pengampu",
    }));

    return NextResponse.json({
      success: true,
      data: {
        _id: String(courseClass._id),
        name: courseClass.name,
        code: courseClass.code,
        bannerColor: courseClass.bannerColor || "blue",
        academicYear: courseClass.academicYear,
        teacher: courseClass.teacherId,
        subject: courseClass.subjectId,
        rombel: courseClass.classRombelId || rombelInfo,
        students: studentsList,
        studentCount: studentsList.length,
        assignments: enrichedAssignments,
        quizzes: enrichedQuizzes,
        posts,
        materials,
        sharedFiles,
        siblingClasses: formattedSiblingClasses,
        isReadOnly: isStaff,
        currentUserRole: session.role,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat detail kelas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
