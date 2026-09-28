import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Assignment, CourseClass, Submission } from "@/models";

export async function GET(req: Request) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const filterTab = searchParams.get("tab"); // "all", "active", "late", "completed"

    // 1. Get all active course classes the student has joined
    const joinedClasses = await CourseClass.find({
      studentIds: session.id,
      isArchived: { $ne: true },
    })
      .select("_id name bannerColor subjectId teacherId")
      .populate("subjectId", "name code category")
      .populate("teacherId", "name email title")
      .lean();

    const joinedClassIds = joinedClasses.map((c) => c._id);

    if (joinedClassIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          summary: {
            needsAttention: 0,
            dueThisWeek: 0,
            averageScore: 0,
            counts: { all: 0, active: 0, late: 0, completed: 0 },
          },
          assignments: [],
        },
      });
    }

    // 2. Fetch all published assignments for these classes
    const assignments = await Assignment.find({
      courseClassId: { $in: joinedClassIds },
      isArchived: { $ne: true },
      isPublished: true,
    })
      .populate("courseClassId", "name bannerColor")
      .populate("subjectId", "name code category")
      .populate("teacherId", "name")
      .sort({ dueDate: 1 })
      .lean();

    const assignmentIds = assignments.map((a) => a._id);

    // 3. Fetch submissions for this student
    const studentSubmissions = await Submission.find({
      assignmentId: { $in: assignmentIds },
      studentId: session.id,
    }).lean();

    const submissionMap = new Map();
    studentSubmissions.forEach((sub) => {
      submissionMap.set(sub.assignmentId.toString(), sub);
    });

    // 4. Map each assignment with status, due date formatting, and icon type
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let needsAttentionCount = 0;
    let dueThisWeekCount = 0;
    let gradedScoreSum = 0;
    let gradedCount = 0;

    let allCount = assignments.length;
    let activeCount = 0;
    let lateCount = 0;
    let completedCount = 0;

    const enrichedAssignments = assignments.map((a: any) => {
      const sub = submissionMap.get(a._id.toString());
      const dueDate = a.dueDate ? new Date(a.dueDate) : null;

      let status: "pending" | "late" | "completed" = "pending";
      let statusDetail = "Pending";
      let scoreStr: string | undefined = undefined;

      if (sub && ["turned_in", "late", "graded"].includes(sub.status)) {
        status = "completed";
        completedCount++;
        if (sub.status === "graded" && typeof sub.score === "number") {
          statusDetail = "Graded";
          scoreStr = `${sub.score} / ${a.maxScore || 100}`;
          gradedScoreSum += sub.score;
          gradedCount++;
        } else {
          statusDetail = sub.status === "late" ? "Submitted (Late)" : "Submitted";
        }
      } else {
        // Not submitted
        if (dueDate && dueDate < now) {
          status = "late";
          statusDetail = "Missing / Overdue";
          lateCount++;
          needsAttentionCount++;
        } else {
          status = "pending";
          statusDetail = "Active";
          activeCount++;
          if (dueDate && dueDate <= oneWeekFromNow && dueDate >= now) {
            dueThisWeekCount++;
          }
        }
      }

      // Friendly due date & due time formatting
      let formattedDueDate = "No due date";
      let formattedDueTime = "";
      if (dueDate) {
        const isTomorrow =
          dueDate.getDate() === now.getDate() + 1 &&
          dueDate.getMonth() === now.getMonth() &&
          dueDate.getFullYear() === now.getFullYear();

        if (isTomorrow) {
          formattedDueDate = "Tomorrow";
        } else {
          formattedDueDate = dueDate.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
        }

        formattedDueTime = dueDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }

      // Select icon type based on subject or assignment type
      let icon: "file" | "flask" | "flow" | "math" | "code" = "file";
      const subjectName = (a.subjectId?.name || a.courseClassId?.name || "").toLowerCase();
      if (subjectName.includes("pbo") || subjectName.includes("flow")) {
        icon = "flow";
      } else if (subjectName.includes("program") || subjectName.includes("pwpb") || subjectName.includes("rpl") || subjectName.includes("code")) {
        icon = "code";
      } else if (subjectName.includes("ipa") || subjectName.includes("kimia") || subjectName.includes("kik")) {
        icon = "flask";
      } else if (subjectName.includes("matematika") || subjectName.includes("math")) {
        icon = "math";
      }

      return {
        _id: a._id.toString(),
        title: a.title,
        subject: a.subjectId?.name || a.courseClassId?.name || "Mata Pelajaran",
        className: a.courseClassId?.name || "",
        teacherName: a.teacherId?.name || "Guru",
        dueDate: formattedDueDate,
        dueTime: formattedDueTime,
        rawDueDate: a.dueDate,
        status,
        statusDetail,
        score: scoreStr,
        maxScore: a.maxScore || 100,
        type: a.type || "tugas",
        href: `/siswa/assignments/${a._id}`,
        icon,
        isSubmitted: Boolean(sub && ["turned_in", "late", "graded"].includes(sub.status)),
        submissionId: sub ? sub._id.toString() : null,
      };
    });

    // Calculate Average Score
    const averageScore = gradedCount > 0 ? Math.round(gradedScoreSum / gradedCount) : 0;

    // Filter by tab if requested
    let filteredList = enrichedAssignments;
    if (filterTab && ["active", "late", "completed"].includes(filterTab)) {
      filteredList = enrichedAssignments.filter((a) => a.status === filterTab);
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          needsAttention: needsAttentionCount,
          dueThisWeek: dueThisWeekCount,
          averageScore,
          counts: {
            all: allCount,
            active: activeCount,
            late: lateCount,
            completed: completedCount,
          },
        },
        assignments: filteredList,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat daftar tugas";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
