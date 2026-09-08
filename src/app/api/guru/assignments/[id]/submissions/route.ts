import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Assignment, Submission, CourseClass, ClassModel, User } from "@/models";

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
      .populate("classId", "name grade studentIds");

    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Determine all students in this class
    let studentIds: string[] = [];

    if (assignment.courseClassId && Array.isArray(assignment.courseClassId.studentIds)) {
      studentIds = assignment.courseClassId.studentIds.map((s: unknown) => String(s));
    } else if (assignment.classId && Array.isArray(assignment.classId.studentIds)) {
      studentIds = assignment.classId.studentIds.map((s: unknown) => String(s));
    }

    // Fetch all student details
    const students = await User.find({
      _id: { $in: studentIds },
      role: "siswa",
    })
      .select("name email nisn")
      .sort({ name: 1 })
      .lean();

    // Fetch existing submissions for this assignment
    const submissions = await Submission.find({ assignmentId: id })
      .populate("studentId", "name email nisn")
      .lean();

    const submissionMap = new Map(
      submissions.map((sub) => [String(sub.studentId?._id || sub.studentId), sub])
    );

    // Merge students with their submissions
    const items = students.map((st) => {
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
          submittedAt: null,
          gradedAt: null,
        };
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
        },
        stats: {
          totalStudents: students.length,
          turnedInCount,
          gradedCount,
          assignedCount,
        },
        items,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat submisi";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
