import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import {
  CourseClass,
  User,
  Subject,
  Assignment,
  Quiz,
  Material,
  ClassPost,
} from "@/models";

export async function GET() {
  const { session, error } = await requireRole(["kurikulum"]);
  if (error || !session) return error;

  try {
    await connectDB();

    // 1. Calculate Summary Metrics
    const totalActiveClasses = await CourseClass.countDocuments({ isActive: true });
    const totalStudents = await User.countDocuments({ role: "siswa", isActive: true });
    const totalTeachers = await User.countDocuments({ role: "guru", isActive: true });
    
    // Count distinct subjects utilized by active CourseClasses
    const activeSubjectIds = await CourseClass.distinct("subjectId", { isActive: true });
    const totalSubjects = activeSubjectIds.filter(Boolean).length || (await Subject.countDocuments({ isActive: true }));

    // 2. Fetch Recent Activities from Multiple LMS Collections
    const [recentAssignments, recentQuizzes, recentMaterials, recentPosts] = await Promise.all([
      Assignment.find({ isPublished: true, isArchived: { $ne: true } })
        .populate("courseClassId", "name subjectId")
        .populate("teacherId", "name")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Quiz.find({ isPublished: true })
        .populate("courseClassId", "name subjectId")
        .populate("teacherId", "name")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Material.find({ isPublished: true })
        .populate("courseClassId", "name subjectId")
        .populate("teacherId", "name")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      ClassPost.find({})
        .populate("courseClassId", "name")
        .populate("teacherId", "name")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    // Map subjects for fast lookup
    const allSubjects = await Subject.find({}).select("_id name").lean();
    const subjectMap = new Map(allSubjects.map((s: any) => [String(s._id), s.name]));

    type ActivityItem = {
      id: string;
      type: "assignment" | "quiz" | "material" | "post";
      title: string;
      teacherName: string;
      courseClassName: string;
      subjectName: string;
      createdAt: string;
    };

    const activities: ActivityItem[] = [];

    for (const a of recentAssignments as any[]) {
      const isQuiz = a.type === "kuis" || Boolean(a.quizId);
      const subId = a.courseClassId?.subjectId ? String(a.courseClassId.subjectId) : "";
      activities.push({
        id: String(a._id),
        type: isQuiz ? "quiz" : "assignment",
        title: a.title,
        teacherName: a.teacherId?.name || "Guru",
        courseClassName: a.courseClassId?.name || "Kelas",
        subjectName: subjectMap.get(subId) || a.courseClassId?.name || "Mata Pelajaran",
        createdAt: new Date(a.createdAt).toISOString(),
      });
    }

    for (const q of recentQuizzes as any[]) {
      // Avoid duplicate if already covered by assignment
      if (!activities.some((act) => act.id === String(q._id) || act.title === q.title)) {
        const subId = q.courseClassId?.subjectId ? String(q.courseClassId.subjectId) : "";
        activities.push({
          id: String(q._id),
          type: "quiz",
          title: q.title,
          teacherName: q.teacherId?.name || "Guru",
          courseClassName: q.courseClassId?.name || "Kelas",
          subjectName: subjectMap.get(subId) || q.courseClassId?.name || "Kuis",
          createdAt: new Date(q.createdAt).toISOString(),
        });
      }
    }

    for (const m of recentMaterials as any[]) {
      const subId = m.courseClassId?.subjectId ? String(m.courseClassId.subjectId) : "";
      activities.push({
        id: String(m._id),
        type: "material",
        title: m.title,
        teacherName: m.teacherId?.name || "Guru",
        courseClassName: m.courseClassId?.name || "Kelas",
        subjectName: subjectMap.get(subId) || m.courseClassId?.name || "Materi",
        createdAt: new Date(m.createdAt).toISOString(),
      });
    }

    for (const p of recentPosts as any[]) {
      activities.push({
        id: String(p._id),
        type: "post",
        title: p.content ? (p.content.length > 60 ? p.content.slice(0, 60) + "..." : p.content) : "Pengumuman Kelas",
        teacherName: p.teacherId?.name || "Pengajar",
        courseClassName: p.courseClassId?.name || "Forum",
        subjectName: "Diskusi Kelas",
        createdAt: new Date(p.createdAt).toISOString(),
      });
    }

    // Sort descending by createdAt and take top 15
    activities.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        totalActiveClasses,
        totalStudents,
        totalTeachers,
        totalSubjects,
        recentActivities: activities.slice(0, 15),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat dashboard kurikulum";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
