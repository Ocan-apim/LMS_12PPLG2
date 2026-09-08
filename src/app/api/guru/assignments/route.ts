import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Assignment, CourseClass, ClassPost, Submission } from "@/models";

export async function GET(req: Request) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const courseClassId = searchParams.get("courseClassId");
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    const query: Record<string, unknown> = {
      teacherId: session.id,
    };

    if (courseClassId && courseClassId !== "all") {
      query.courseClassId = courseClassId;
    }
    if (type && type !== "all") {
      query.type = type;
    }
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    const assignments = await Assignment.find(query)
      .populate("courseClassId", "name code classRombelId")
      .populate("classId", "name grade")
      .populate("quizId", "title durationSeconds questions totalPoints")
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with submissions count
    const enriched = await Promise.all(
      assignments.map(async (a) => {
        const [totalTurnedIn, totalGraded] = await Promise.all([
          Submission.countDocuments({
            assignmentId: a._id,
            status: { $in: ["turned_in", "late", "graded"] },
          }),
          Submission.countDocuments({
            assignmentId: a._id,
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

    return NextResponse.json({ success: true, data: enriched });
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

    const newAssignment = await Assignment.create({
      title: title.trim(),
      instructions: instructions || description || "",
      description: description || instructions || "",
      type: type || "tugas",
      courseClassId: courseClassId || undefined,
      classId: classId || undefined,
      teacherId: session.id,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      maxScore: Number(maxScore) || 100,
      attachments: Array.isArray(attachments) ? attachments : [],
      bannerUrl,
      quizId: quizId || undefined,
      isPublished: true,
    });

    // Automatically post in class stream
    if (courseClassId) {
      await ClassPost.create({
        courseClassId,
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

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat tugas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
