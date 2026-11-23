import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import {
  CourseClass,
  Assignment,
  Quiz,
  Submission,
  Material,
  Notification,
  StudentEvent,
  User,
} from "@/models";

export async function GET() {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();

    // 1. Fetch authenticated student information from MongoDB
    const studentUser: any = await User.findById(session.id)
      .select("-password")
      .populate("classId", "name grade academicYear")
      .populate("departmentId", "name code")
      .lean();

    const studentRombelId = studentUser?.classId?._id || studentUser?.classId || null;

    const studentInfo = {
      _id: String(studentUser?._id || session.id),
      name: studentUser?.name || session.name,
      email: studentUser?.email || session.email,
      nis: studentUser?.nis || null,
      nisn: studentUser?.nisn || null,
      photoUrl: studentUser?.photoUrl || null,
      gender: studentUser?.gender || null,
      grade: studentUser?.grade || studentUser?.classId?.grade || null,
      rombelName: studentUser?.classId?.name || null,
      departmentName: studentUser?.departmentId?.name || null,
      departmentCode: studentUser?.departmentId?.code || null,
      academicYear:
        studentUser?.academicYear || studentUser?.classId?.academicYear || null,
    };

    // 2. Fetch student's active joined classes
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
      .populate("teacherId", "name degree email")
      .populate("subjectId", "name code category")
      .populate("classRombelId", "name grade")
      .sort({ createdAt: -1 })
      .lean();

    const joinedClassIds = joinedClasses.map((c: any) => c._id);

    // 3. Fetch active published Assignments and Quizzes for student's classes
    const allAssignments: any[] =
      joinedClassIds.length > 0
        ? await Assignment.find({
            courseClassId: { $in: joinedClassIds },
            isArchived: { $ne: true },
            isPublished: true,
            title: { $not: /forum[\s_-]*diskusi/i },
          })
            .populate("courseClassId", "name bannerColor")
            .populate("subjectId", "name code category")
            .populate("teacherId", "name degree")
            .populate("quizId", "title durationSeconds questions totalPoints dueDate isPublished")
            .sort({ dueDate: 1, createdAt: -1 })
            .lean()
        : [];

    const allQuizzes: any[] =
      joinedClassIds.length > 0
        ? await Quiz.find({
            courseClassId: { $in: joinedClassIds },
            isPublished: true,
          })
            .populate("courseClassId", "name bannerColor")
            .populate("teacherId", "name degree")
            .sort({ dueDate: 1, createdAt: -1 })
            .lean()
        : [];

    // Deduplicate quizzes: track Quiz IDs already linked to an Assignment via quizId
    const linkedQuizIds = new Set<string>();
    allAssignments.forEach((a: any) => {
      if (a.quizId) {
        const qId = String(a.quizId._id || a.quizId);
        linkedQuizIds.add(qId);
      }
    });

    const standaloneQuizzes = allQuizzes.filter(
      (q: any) => !linkedQuizIds.has(String(q._id))
    );

    // 4. Fetch student's submissions strictly belonging to session.id for these active assignments & quizzes
    const activeAssignmentIds = allAssignments.map((a: any) => a._id);
    const activeQuizIds = [
      ...Array.from(linkedQuizIds).map((id) => new mongoose.Types.ObjectId(id)),
      ...standaloneQuizzes.map((q: any) => q._id),
    ];

    const studentSubmissions: any[] =
      activeAssignmentIds.length > 0 || activeQuizIds.length > 0
        ? await Submission.find({
            studentId: session.id,
            $or: [
              ...(activeAssignmentIds.length > 0
                ? [{ assignmentId: { $in: activeAssignmentIds } }]
                : []),
              ...(activeQuizIds.length > 0
                ? [{ quizId: { $in: activeQuizIds } }]
                : []),
            ],
          })
            .select(
              "_id assignmentId quizId courseClassId status score feedback submittedAt gradedAt"
            )
            .lean()
        : [];

    const subByAssignment = new Map<string, any>();
    const subByQuiz = new Map<string, any>();
    studentSubmissions.forEach((s: any) => {
      if (s.assignmentId) subByAssignment.set(String(s.assignmentId), s);
      if (s.quizId) subByQuiz.set(String(s.quizId), s);
    });

    // 5. Calculate Average Grade ONLY from valid graded submissions (no ungraded counted as 0, no double-counting)
    const uniqueGradedSubmissions = new Map<string, any>();
    studentSubmissions.forEach((s: any) => {
      if (s.status === "graded" && typeof s.score === "number" && !Number.isNaN(s.score)) {
        uniqueGradedSubmissions.set(String(s._id), s);
      }
    });

    const gradedList = Array.from(uniqueGradedSubmissions.values());
    let averageGrade = 0;
    if (gradedList.length > 0) {
      const totalScore = gradedList.reduce(
        (acc: number, curr: any) => acc + Number(curr.score),
        0
      );
      averageGrade = Math.round((totalScore / gradedList.length) * 10) / 10;
    }

    const now = Date.now();

    // 6. Separate ordinary Assignments (Tugas) and Quizzes (Kuis), plus combined upcomingAssignments
    const tugasList: any[] = [];
    const kuisList: any[] = [];

    for (const a of allAssignments) {
      const isQuizItem = a.type === "kuis" || Boolean(a.quizId);
      const linkedQuizObj =
        a.quizId && typeof a.quizId === "object" && a.quizId._id ? a.quizId : null;
      const resolvedQuizId = linkedQuizObj
        ? String(linkedQuizObj._id)
        : a.quizId
          ? String(a.quizId)
          : null;

      const sub =
        subByAssignment.get(String(a._id)) ||
        (resolvedQuizId ? subByQuiz.get(resolvedQuizId) : null);

      const dueTime = a.dueDate ? new Date(a.dueDate).getTime() : null;
      const isSubmitted = Boolean(
        sub && ["turned_in", "late", "graded"].includes(sub.status)
      );
      const isGraded = Boolean(
        sub && sub.status === "graded" && typeof sub.score === "number"
      );
      const isLate = !isSubmitted && dueTime !== null && dueTime < now;
      const status = sub ? sub.status : isLate ? "late" : "assigned";
      const isUrgent =
        !isSubmitted && dueTime !== null && dueTime - now < 48 * 3600 * 1000;

      const teacherObj = a.teacherId as any;
      const teacherName = teacherObj?.name
        ? `${teacherObj.name}${teacherObj.degree ? `, ${teacherObj.degree}` : ""}`
        : "Guru Pengampu";
      const className = (a.courseClassId as any)?.name || "Kelas";
      const bannerColor = (a.courseClassId as any)?.bannerColor || "blue";

      if (isQuizItem) {
        const targetQuizId = resolvedQuizId || String(a._id);
        kuisList.push({
          _id: String(a._id),
          quizId: targetQuizId,
          assignmentId: String(a._id),
          title: a.title,
          type: "kuis" as const,
          dueDate: a.dueDate || linkedQuizObj?.dueDate || null,
          maxScore: Number(linkedQuizObj?.totalPoints || a.maxScore) || 100,
          durationSeconds: Number(linkedQuizObj?.durationSeconds) || 1800,
          totalQuestions: Array.isArray(linkedQuizObj?.questions)
            ? linkedQuizObj.questions.length
            : 0,
          className,
          courseClassId: String((a.courseClassId as any)?._id || a.courseClassId),
          teacherName,
          bannerColor,
          status,
          isCompleted: isSubmitted,
          isGraded,
          score: isGraded ? sub.score : null,
          feedback: sub?.feedback || null,
          submittedAt: sub?.submittedAt || null,
          gradedAt: sub?.gradedAt || null,
          isUrgent,
          href: `/siswa/quiz/${targetQuizId}`,
        });
      } else {
        tugasList.push({
          _id: String(a._id),
          title: a.title,
          type: "tugas" as const,
          dueDate: a.dueDate || null,
          maxScore: Number(a.maxScore) || 100,
          className,
          courseClassId: String((a.courseClassId as any)?._id || a.courseClassId),
          teacherName,
          bannerColor,
          status,
          isSubmitted,
          isGraded,
          score: isGraded ? sub.score : null,
          feedback: sub?.feedback || null,
          submittedAt: sub?.submittedAt || null,
          gradedAt: sub?.gradedAt || null,
          isUrgent,
          href: `/siswa/assignments/${a._id}`,
        });
      }
    }

    // Add standalone quizzes not linked to any Assignment wrapper
    for (const q of standaloneQuizzes) {
      const sub = subByQuiz.get(String(q._id));
      const dueTime = q.dueDate ? new Date(q.dueDate).getTime() : null;
      const isCompleted = Boolean(
        sub && ["turned_in", "late", "graded"].includes(sub.status)
      );
      const isGraded = Boolean(
        sub && sub.status === "graded" && typeof sub.score === "number"
      );
      const isLate = !isCompleted && dueTime !== null && dueTime < now;
      const status = sub ? sub.status : isLate ? "late" : "assigned";
      const isUrgent =
        !isCompleted && dueTime !== null && dueTime - now < 48 * 3600 * 1000;

      const teacherObj = q.teacherId as any;
      const teacherName = teacherObj?.name
        ? `${teacherObj.name}${teacherObj.degree ? `, ${teacherObj.degree}` : ""}`
        : "Guru Pengampu";

      kuisList.push({
        _id: String(q._id),
        quizId: String(q._id),
        assignmentId: null,
        title: q.title,
        type: "kuis" as const,
        dueDate: q.dueDate || null,
        maxScore: Number(q.totalPoints) || 100,
        durationSeconds: Number(q.durationSeconds) || 60,
        totalQuestions: Array.isArray(q.questions) ? q.questions.length : 0,
        className: (q.courseClassId as any)?.name || "Kelas",
        courseClassId: String((q.courseClassId as any)?._id || q.courseClassId),
        teacherName,
        bannerColor: (q.courseClassId as any)?.bannerColor || "blue",
        status,
        isCompleted,
        isGraded,
        score: isGraded ? sub.score : null,
        feedback: sub?.feedback || null,
        submittedAt: sub?.submittedAt || null,
        gradedAt: sub?.gradedAt || null,
        isUrgent,
        href: `/siswa/quiz/${q._id}`,
      });
    }

    const upcomingAssignments = [...tugasList, ...kuisList].slice(0, 12);

    // 7. Classes summary with accurate task/quiz counts and completion status
    const classesSummary = joinedClasses.map((c: any) => {
      const classIdStr = String(c._id);
      const classTugas = tugasList.filter((t) => t.courseClassId === classIdStr);
      const classKuis = kuisList.filter((q) => q.courseClassId === classIdStr);
      const classAllItems = [...classTugas, ...classKuis];

      const totalClassTasks = classAllItems.length;
      const completedClassTasks =
        classTugas.filter((t) => t.isSubmitted).length +
        classKuis.filter((q) => q.isCompleted).length;

      const isCompleted =
        totalClassTasks > 0 && completedClassTasks >= totalClassTasks;

      // Next pending item with dueDate
      const pendingWithDue = classAllItems
        .filter((item) => {
          const done = item.type === "kuis" ? item.isCompleted : item.isSubmitted;
          return !done && item.dueDate;
        })
        .sort(
          (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );

      let urgentText = "";
      if (isCompleted) {
        urgentText = "Semua tugas & kuis selesai";
      } else if (pendingWithDue.length > 0) {
        const nextItem = pendingWithDue[0];
        const dueStr = new Date(nextItem.dueDate).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        });
        urgentText = `Tenggat: ${nextItem.title} (${dueStr})`;
      } else if (totalClassTasks === 0) {
        urgentText = "Belum ada tugas";
      } else {
        urgentText = `${totalClassTasks - completedClassTasks} tugas/kuis belum selesai`;
      }

      const teacherObj = c.teacherId as any;
      const teacherDisplay = teacherObj?.name
        ? `${teacherObj.name}${teacherObj.degree ? `, ${teacherObj.degree}` : ""}`
        : "Guru Pengampu";

      return {
        _id: String(c._id),
        name: c.name,
        code: c.code,
        teacher: teacherDisplay,
        subjectName: (c.subjectId as any)?.name || c.name,
        category: (c.subjectId as any)?.category || "Kejuruan",
        rombelName: (c.classRombelId as any)?.name || null,
        bannerColor: c.bannerColor || "blue",
        studentCount: Array.isArray(c.studentIds) ? c.studentIds.length : 0,
        urgentText,
        completed: isCompleted,
        totalTasks: totalClassTasks,
        completedTasks: completedClassTasks,
        totalAssignments: classTugas.length,
        totalQuizzes: classKuis.length,
      };
    });

    // 8. Recent shared files from student's active classes
    const recentFiles: Array<{
      name: string;
      url: string;
      type: string;
      size: string;
      uploadedAt: Date;
      className: string;
    }> = [];

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

    if (joinedClassIds.length > 0) {
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
    }

    recentFiles.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    // 9. Notifications belonging to the authenticated student
    const notifications = await Notification.find({ recipientId: session.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const unreadNotificationsCount = await Notification.countDocuments({
      recipientId: session.id,
      read: false,
    });

    // 10. Student-created personal calendar events (Task 4)
    const rawPersonalEvents = await StudentEvent.find({
      studentId: session.id,
    })
      .sort({ startDate: 1, endDate: 1 })
      .limit(6)
      .lean();

    const personalEvents = rawPersonalEvents.map((ev: any) => ({
      _id: String(ev._id),
      title: ev.title,
      description: ev.description || "",
      startDate: ev.startDate,
      endDate: ev.endDate,
    }));

    // 11. Academic statistics calculated strictly from real database records
    const completedAssignmentsCount = tugasList.filter((t) => t.isSubmitted).length;
    const pendingAssignmentsCount = tugasList.length - completedAssignmentsCount;
    const completedQuizzesCount = kuisList.filter((q) => q.isCompleted).length;
    const pendingQuizzesCount = kuisList.length - completedQuizzesCount;
    const upcomingDeadlinesCount = pendingAssignmentsCount + pendingQuizzesCount;

    const stats = {
      totalClasses: joinedClasses.length,
      totalAssignments: tugasList.length,
      completedAssignments: completedAssignmentsCount,
      pendingAssignments: pendingAssignmentsCount,
      totalQuizzes: kuisList.length,
      completedQuizzes: completedQuizzesCount,
      pendingQuizzes: pendingQuizzesCount,
      averageGrade,
      totalGraded: gradedList.length,
      upcomingDeadlines: upcomingDeadlinesCount,
      unreadNotifications: unreadNotificationsCount,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          student: studentInfo,
          stats,
          averageGrade,
          totalGraded: gradedList.length,
          totalJoinedClasses: joinedClasses.length,
          classes: classesSummary,
          assignments: tugasList,
          quizzes: kuisList,
          upcomingAssignments,
          notifications,
          unreadNotificationsCount,
          personalEvents,
          recentFiles: recentFiles.slice(0, 6),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memuat dashboard siswa";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
