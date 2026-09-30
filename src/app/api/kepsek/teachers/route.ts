import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User, CourseClass, Assignment, Quiz } from "@/models";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["kepsek", "admin", "kurikulum"]);
  if (error || !session) return error;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";

    const query: Record<string, any> = { role: "guru" };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { nip: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const teachers: any[] = await User.find(query)
      .select("-password")
      .populate("subjects", "name code")
      .sort({ name: 1 })
      .lean();

    const teacherIds = teachers.map((t) => t._id);

    // Fetch classes taught by these teachers
    const classes: any[] = await CourseClass.find({
      teacherId: { $in: teacherIds },
      isActive: true,
    })
      .populate("subjectId", "name code")
      .populate("classRombelId", "name grade")
      .lean();

    const classIds = classes.map((c) => c._id);

    // Fetch assignments and quizzes for these classes
    const [assignments, quizzes] = await Promise.all([
      Assignment.find({
        courseClassId: { $in: classIds },
        isArchived: { $ne: true },
      })
        .select("_id title type dueDate maxScore courseClassId createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      Quiz.find({
        courseClassId: { $in: classIds },
      })
        .select("_id title durationSeconds totalPoints totalQuestions dueDate courseClassId createdAt")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // Map classes by teacher
    const teacherClassMap = new Map<string, any[]>();
    const classInfoMap = new Map<string, any>();
    for (const c of classes) {
      const tId = String(c.teacherId);
      if (!teacherClassMap.has(tId)) {
        teacherClassMap.set(tId, []);
      }
      teacherClassMap.get(tId)!.push(c);
      classInfoMap.set(String(c._id), c);
    }

    // Map activities by teacher
    const teacherActivitiesMap = new Map<string, any[]>();

    for (const a of assignments) {
      const c = classInfoMap.get(String(a.courseClassId));
      if (c) {
        const tId = String(c.teacherId);
        if (!teacherActivitiesMap.has(tId)) teacherActivitiesMap.set(tId, []);
        teacherActivitiesMap.get(tId)!.push({
          _id: String(a._id),
          title: a.title,
          activityType: "tugas",
          className: c.name,
          classId: String(c._id),
          dueDate: a.dueDate,
          createdAt: a.createdAt,
        });
      }
    }

    for (const q of quizzes) {
      const c = classInfoMap.get(String(q.courseClassId));
      if (c) {
        const tId = String(c.teacherId);
        if (!teacherActivitiesMap.has(tId)) teacherActivitiesMap.set(tId, []);
        teacherActivitiesMap.get(tId)!.push({
          _id: String(q._id),
          title: q.title,
          activityType: "kuis",
          className: c.name,
          classId: String(c._id),
          dueDate: q.dueDate,
          createdAt: q.createdAt,
        });
      }
    }

    const data = teachers.map((t) => {
      const taughtClasses = teacherClassMap.get(String(t._id)) || [];
      const activities = (teacherActivitiesMap.get(String(t._id)) || []).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const subjects = new Set<string>();
      if (Array.isArray(t.subjects)) {
        t.subjects.forEach((s: any) => {
          if (s?.name) subjects.add(s.name);
        });
      }
      taughtClasses.forEach((c: any) => {
        if (c.subjectId?.name) subjects.add(c.subjectId.name);
      });

      return {
        _id: String(t._id),
        name: t.name,
        nip: t.nip || "-",
        email: t.email,
        subjects: Array.from(subjects),
        classes: taughtClasses.map((c) => ({
          _id: String(c._id),
          name: c.name,
          rombelName: c.classRombelId?.name || "",
        })),
        activities,
        isActive: t.isActive !== false,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat monitoring guru";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
