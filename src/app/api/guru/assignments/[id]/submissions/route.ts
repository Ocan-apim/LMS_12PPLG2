import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Assignment, Submission, CourseClass, ClassModel, User, Quiz } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;
    await connectDB();

    const assignment = await Assignment.findById(id)
      .populate("courseClassId", "name code studentIds classRombelId")
      .populate("classId", "name grade studentIds")
      .populate("quizId");

    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan" },
        { status: 404 }
      );
    }

    if (session.role === "guru" && assignment.teacherId.toString() !== session.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda bukan pemilik tugas ini" },
        { status: 403 }
      );
    }

    // Fetch existing submissions for this assignment first
    const submissions = await Submission.find({ assignmentId: id })
      .populate("studentId", "name email nisn")
      .lean();

    // Determine all students in this class
    const studentIdSet = new Set<string>();

    if (assignment.courseClassId && Array.isArray(assignment.courseClassId.studentIds)) {
      assignment.courseClassId.studentIds.forEach((s: unknown) => {
        if (s) studentIdSet.add(String((s as any)._id || s));
      });
    }

    if (assignment.classId && Array.isArray(assignment.classId.studentIds)) {
      assignment.classId.studentIds.forEach((s: unknown) => {
        if (s) studentIdSet.add(String((s as any)._id || s));
      });
    }

    // Include students from rombel
    const rombelId = assignment.courseClassId?.classRombelId || assignment.classId;
    if (rombelId) {
      const rombelDoc: any = await ClassModel.findById(rombelId).lean();
      if (rombelDoc && Array.isArray(rombelDoc.studentIds)) {
        rombelDoc.studentIds.forEach((s: unknown) => {
          if (s) studentIdSet.add(String((s as any)._id || s));
        });
      }
      const usersInRombel = await User.find({ classId: rombelId, role: "siswa" })
        .select("_id")
        .lean();
      usersInRombel.forEach((u) => studentIdSet.add(String(u._id)));
    }

    // Include any student who has submitted
    submissions.forEach((sub) => {
      const sid = String(sub.studentId?._id || sub.studentId || "");
      if (sid) studentIdSet.add(sid);
    });

    // Fetch all student details
    const studentIds = Array.from(studentIdSet);
    const students: any[] = await User.find({
      _id: { $in: studentIds },
      role: "siswa",
    })
      .select("name email nisn")
      .sort({ name: 1 })
      .lean();

    const submissionMap = new Map(
      submissions.map((sub) => [String(sub.studentId?._id || sub.studentId), sub])
    );

    const matchedStudentIds = new Set<string>();

    // Merge students with their submissions
    const items: any[] = students.map((st) => {
      matchedStudentIds.add(String(st._id));
      const sub = submissionMap.get(String(st._id));
      if (sub) {
        return {
          submissionId: sub._id,
          student: st,
          hasSubmitted: true,
          status: sub.status,
          score: sub.score,
          draftScore: sub.draftScore,
          feedback: sub.feedback,
          privateComments: sub.privateComments || [],
          attachments: sub.attachments || (sub.fileUrl ? [{ name: "Lampiran Siswa", url: sub.fileUrl, type: "file", size: "1.0 MB" }] : []),
          content: sub.content,
          quizAnswers: sub.quizAnswers || [],
          submittedAt: sub.submittedAt,
          gradedAt: sub.gradedAt,
        };
      } else {
        return {
          submissionId: null,
          student: st,
          hasSubmitted: false,
          status: "assigned", // Belum mengumpulkan
          score: null,
          draftScore: null,
          feedback: "",
          privateComments: [],
          attachments: [],
          content: "",
          quizAnswers: [],
          submittedAt: null,
          gradedAt: null,
        };
      }
    });

    // Also include any submissions whose student wasn't in students
    submissions.forEach((sub) => {
      const sid = String(sub.studentId?._id || sub.studentId || "");
      if (sid && !matchedStudentIds.has(sid) && sub.studentId) {
        items.push({
          submissionId: sub._id,
          student: {
            _id: (sub.studentId as any)._id || sub.studentId,
            name: (sub.studentId as any).name || "Siswa",
            email: (sub.studentId as any).email || "-",
            nisn: (sub.studentId as any).nisn || "-",
          },
          hasSubmitted: true,
          status: sub.status,
          score: sub.score,
          draftScore: sub.draftScore,
          feedback: sub.feedback,
          privateComments: sub.privateComments || [],
          attachments: sub.attachments || (sub.fileUrl ? [{ name: "Lampiran Siswa", url: sub.fileUrl, type: "file", size: "1.0 MB" }] : []),
          content: sub.content,
          quizAnswers: sub.quizAnswers || [],
          submittedAt: sub.submittedAt,
          gradedAt: sub.gradedAt,
        });
      }
    });

    const turnedInCount = items.filter((i) => i.status === "turned_in" || i.status === "late").length;
    const gradedCount = items.filter((i) => i.status === "graded").length;
    const assignedCount = items.filter((i) => i.status === "assigned").length;

    return NextResponse.json({
      success: true,
      data: {
        assignment: {
          _id: assignment._id,
          title: assignment.title,
          instructions: assignment.instructions,
          maxScore: assignment.maxScore,
          dueDate: assignment.dueDate,
          attachments: assignment.attachments || [],
          className: assignment.courseClassId?.name || assignment.classId?.name || "Kelas",
          quiz: assignment.quizId || null,
        },
        stats: {
          totalStudents: items.length,
          turnedInCount,
          gradedCount,
          assignedCount,
        },
        items,
      },
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat submisi";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
