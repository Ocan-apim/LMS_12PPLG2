import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, Assignment, Submission, Material, User } from "@/models";

export async function GET() {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();

    const studentUser: any = await User.findById(session.id).select("classId").lean();
    const studentRombelId = studentUser?.classId;

    // 1. Get student's joined classes
    const joinedClasses = await CourseClass.find({
      isActive: true,
      $or: [
        { studentIds: session.id },
        ...(studentRombelId ? [{ classRombelId: studentRombelId }, { assignedRombelIds: studentRombelId }] : []),
      ],
    })
      .populate("teacherId", "name degree")
      .populate("subjectId", "name category")
      .sort({ createdAt: -1 })
      .lean();

    const joinedClassIds = joinedClasses.map((c: any) => c._id);

    // 2. Calculate Average Grade (Nilai Rata-rata)
    // ONLY from this authenticated student's own graded submissions
    const gradedSubmissions = await Submission.find({
      studentId: session.id,
      status: "graded",
      score: { $exists: true, $ne: null },
    })
      .select("score")
      .lean();

    let averageGrade = 0;
    if (gradedSubmissions.length > 0) {
      const totalScore = gradedSubmissions.reduce(
        (acc: number, curr: any) =>
          acc + (typeof curr.score === "number" ? curr.score : 0),
        0
      );
      averageGrade = Math.round((totalScore / gradedSubmissions.length) * 10) / 10;
    }

    // 3. Upcoming / Urgent Assignments from student's classes
    const upcomingAssignments = await Assignment.find({
      courseClassId: { $in: joinedClassIds },
      isArchived: { $ne: true },
      isPublished: true,
    })
      .populate("courseClassId", "name bannerColor")
      .select("_id title type dueDate maxScore courseClassId createdAt")
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(10)
      .lean();

    // Get student's submissions for these assignments
    const assignmentIds = upcomingAssignments.map((a: any) => a._id);
    const studentSubmissions = await Submission.find({
      assignmentId: { $in: assignmentIds },
      studentId: session.id,
    })
      .select("assignmentId status score submittedAt")
      .lean();

    const subMap = new Map(
      studentSubmissions.map((s: any) => [String(s.assignmentId), s])
    );

    const enrichedTasks = upcomingAssignments.map((a: any) => {
      const sub = subMap.get(String(a._id));
      const isLate = !sub && a.dueDate && new Date(a.dueDate).getTime() < Date.now();
      const status = sub ? sub.status : isLate ? "late" : "assigned";

      // Urgency flag (due within 48h or overdue and unsubmitted)
      const now = Date.now();
      const dueTime = a.dueDate ? new Date(a.dueDate).getTime() : null;
      const isUrgent =
        (!sub || sub.status === "assigned") &&
        dueTime !== null &&
        dueTime - now < 48 * 3600 * 1000;

      return {
        _id: a._id,
        title: a.title,
        type: a.type,
        dueDate: a.dueDate,
        maxScore: a.maxScore,
        className: (a.courseClassId as any)?.name || "Kelas",
        bannerColor: (a.courseClassId as any)?.bannerColor || "blue",
        status,
        score: sub ? sub.score : null,
        isUrgent,
      };
    });

    // 4. Classes summary with urgent task subtitle for DashboardSubjectCard
    const classesSummary = await Promise.all(
      joinedClasses.map(async (c: any) => {
        // Next pending task
        const nextTask: any = await Assignment.findOne({
          courseClassId: c._id,
          isArchived: { $ne: true },
          isPublished: true,
          dueDate: { $gte: new Date() },
        })
          .sort({ dueDate: 1 })
          .select("title dueDate type")
          .lean();

        // Check if all tasks completed in this class
        const totalClassTasks = await Assignment.countDocuments({
          courseClassId: c._id,
          isArchived: { $ne: true },
          isPublished: true,
        });

        const completedClassTasks = await Submission.countDocuments({
          courseClassId: c._id,
          studentId: session.id,
          status: { $in: ["turned_in", "late", "graded"] },
        });

        const isCompleted =
          totalClassTasks > 0 && completedClassTasks >= totalClassTasks;

        let urgentText = "";
        if (nextTask) {
          const dueStr = new Date(nextTask.dueDate).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
          });
          urgentText = `Due Next: ${nextTask.title} (${dueStr})`;
        } else if (totalClassTasks === 0) {
          urgentText = "Belum ada tugas";
        }

        return {
          _id: c._id,
          name: c.name,
          teacher: (c.teacherId as any)?.name || "Guru Pengampu",
          category: (c.subjectId as any)?.category || "Kejuruan",
          bannerColor: c.bannerColor || "blue",
          urgentText,
          completed: isCompleted,
          totalTasks: totalClassTasks,
          completedTasks: completedClassTasks,
        };
      })
    );

    // 5. Recent shared files from student's classes
    const recentFiles: Array<{
      name: string;
      url: string;
      type: string;
      size: string;
      uploadedAt: Date;
      className: string;
    }> = [];

    // Class shared files
    joinedClasses.forEach((c: any) => {
      if (Array.isArray(c.sharedFiles)) {
        c.sharedFiles.forEach((f: any) => {
          recentFiles.push({
            name: f.name,
            url: f.url,
            type: f.type || "document",
            size: f.size || "1.0 MB",
            uploadedAt: f.uploadedAt || c.updatedAt,
            className: c.name,
          });
        });
      }
    });

    // Material attachments from joined classes
    const materials = await Material.find({
      courseClassId: { $in: joinedClassIds },
      isPublished: true,
    })
      .populate("courseClassId", "name")
      .select("title attachments courseClassId createdAt")
      .limit(10)
      .lean();

    materials.forEach((m: any) => {
      if (Array.isArray(m.attachments)) {
        m.attachments.forEach((att: any) => {
          recentFiles.push({
            name: att.name || m.title,
            url: att.url,
            type: att.type || "document",
            size: att.size || "1.0 MB",
            uploadedAt: att.uploadedAt || m.createdAt,
            className: (m.courseClassId as any)?.name || "Materi",
          });
        });
      }
    });

    // Sort recent files by uploadedAt desc
    recentFiles.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        averageGrade,
        totalGraded: gradedSubmissions.length,
        totalJoinedClasses: joinedClasses.length,
        classes: classesSummary,
        upcomingAssignments: enrichedTasks,
        recentFiles: recentFiles.slice(0, 6),
      },
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat dashboard siswa";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
