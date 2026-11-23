import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Assignment, CourseClass, ClassPost, Submission, Quiz } from "@/models";

export async function GET(req: Request) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const courseClassId = searchParams.get("courseClassId");
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    // Ensure stray forum discussion entries are not treated as assignments
    const query: Record<string, unknown> = {
      teacherId: session.id,
      isArchived: { $ne: true },
      title: { $not: /forum[\s_-]*diskusi/i },
    };

    if (courseClassId && courseClassId !== "all") {
      query.courseClassId = courseClassId;
    }
    if (type && type !== "all") {
      query.type = type;
    }
    if (search) {
      query.title = { $regex: search, $options: "i", $not: /forum[\s_-]*diskusi/i };
    }

    const assignments = await Assignment.find(query)
      .populate("courseClassId", "name code classRombelId")
      .populate("classId", "name grade")
      .populate("quizId", "title durationSeconds questions totalPoints")
      .sort({ createdAt: -1 })
      .lean();

    const linkedQuizIds = new Set<string>();
    assignments.forEach((a: any) => {
      if (a.quizId) {
        linkedQuizIds.add(String(a.quizId._id || a.quizId));
      }
    });

    // Enrich with submissions count
    const enrichedAssignments = await Promise.all(
      assignments.map(async (a: any) => {
        const subOrConds: Record<string, unknown>[] = [{ assignmentId: a._id }];
        if (a.quizId) {
          subOrConds.push({ quizId: a.quizId._id || a.quizId });
        }
        const [totalTurnedIn, totalGraded] = await Promise.all([
          Submission.countDocuments({
            $or: subOrConds,
            status: { $in: ["turned_in", "late", "graded"] },
          }),
          Submission.countDocuments({
            $or: subOrConds,
            status: "graded",
          }),
        ]);

        return {
          ...a,
          submittedCount: totalTurnedIn,
          gradedCount: totalGraded,
        };
      })
    );

    // Also include standalone Quizzes owned by this teacher when type filter allows "kuis"
    let enrichedStandaloneQuizzes: any[] = [];
    if (!type || type === "all" || type === "kuis") {
      const quizQuery: Record<string, unknown> = {
        teacherId: session.id,
        isPublished: { $ne: false },
      };
      if (courseClassId && courseClassId !== "all") {
        quizQuery.courseClassId = courseClassId;
      }
      if (search) {
        quizQuery.title = { $regex: search, $options: "i" };
      }

      const standaloneQuizzes = await Quiz.find(quizQuery)
        .populate("courseClassId", "name code classRombelId")
        .sort({ createdAt: -1 })
        .lean();

      const unlinkedQuizzes = standaloneQuizzes.filter(
        (q: any) => !linkedQuizIds.has(String(q._id))
      );

      enrichedStandaloneQuizzes = await Promise.all(
        unlinkedQuizzes.map(async (q: any) => {
          const [totalTurnedIn, totalGraded] = await Promise.all([
            Submission.countDocuments({
              quizId: q._id,
              status: { $in: ["turned_in", "late", "graded"] },
            }),
            Submission.countDocuments({
              quizId: q._id,
              status: "graded",
            }),
          ]);

          return {
            _id: q._id,
            title: q.title,
            instructions: q.description || "",
            description: q.description || "",
            type: "kuis",
            courseClassId: q.courseClassId,
            teacherId: q.teacherId,
            dueDate: q.dueDate,
            maxScore: 100,
            quizId: q,
            isPublished: q.isPublished,
            createdAt: q.createdAt,
            updatedAt: q.updatedAt,
            submittedCount: totalTurnedIn,
            gradedCount: totalGraded,
          };
        })
      );
    }

    const combined = [...enrichedAssignments, ...enrichedStandaloneQuizzes].sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    );

    return NextResponse.json({ success: true, data: combined });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat daftar tugas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const body = await req.json();

    const {
      title,
      instructions,
      description,
      type,
      courseClassId,
      classId,
      dueDate,
      maxScore,
      attachments,
      bannerUrl,
      quizId,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "Judul tugas wajib diisi" },
        { status: 400 }
      );
    }

    if (!courseClassId && !classId) {
      return NextResponse.json(
        { success: false, message: "Pilih kelas untuk tugas ini" },
        { status: 400 }
      );
    }

    let finalCourseClassId = courseClassId;
    let finalClassId = classId;

    if (courseClassId) {
      const targetClass = await CourseClass.findById(courseClassId);
      if (!targetClass) {
        return NextResponse.json(
          { success: false, message: "Kelas tidak ditemukan" },
          { status: 404 }
        );
      }
      if (session.role === "guru" && targetClass.teacherId.toString() !== session.id) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda bukan pengampu kelas ini" },
          { status: 403 }
        );
      }
      if (!finalClassId && targetClass.classRombelId) {
        finalClassId = targetClass.classRombelId.toString();
      }
    } else if (classId) {
      const matchingCourse = await CourseClass.findOne({
        teacherId: session.id,
        $or: [{ classRombelId: classId }, { assignedRombelIds: classId }],
        isActive: true,
      });
      if (matchingCourse) {
        finalCourseClassId = matchingCourse._id.toString();
      }
    }

    const newAssignment = await Assignment.create({
      title: title.trim(),
      instructions: instructions || description || "",
      description: description || instructions || "",
      type: type || "tugas",
      courseClassId: finalCourseClassId || undefined,
      classId: finalClassId || undefined,
      teacherId: session.id,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      maxScore: Number(maxScore) || 100,
      attachments: Array.isArray(attachments) ? attachments : [],
      bannerUrl,
      quizId: quizId || undefined,
      isPublished: true,
    });

    // Automatically post in class stream
    if (finalCourseClassId) {
      await ClassPost.create({
        courseClassId: finalCourseClassId,
        teacherId: session.id,
        type: type === "kuis" ? "quiz" : "assignment",
        title: type === "kuis" ? `Anda memulai Quiz: ${title}` : `Anda memposting tugas baru: ${title}`,
        content: instructions || "",
        refId: newAssignment._id,
        comments: [],
      });
    }

    const populated = await Assignment.findById(newAssignment._id)
      .populate("courseClassId", "name code")
      .populate("classId", "name grade");

    return NextResponse.json(
      { success: true, data: populated },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat tugas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
