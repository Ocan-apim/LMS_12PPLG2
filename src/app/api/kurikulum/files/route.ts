import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, Material, Assignment } from "@/models";

export async function GET() {
  const { session, error } = await requireRole(["kurikulum"]);
  if (error || !session) return error;

  try {
    await connectDB();

    // 1. Fetch active course classes with teacher and subject
    const activeClasses: any[] = await CourseClass.find({ isActive: true })
      .populate("teacherId", "name")
      .populate("subjectId", "name code")
      .lean();

    const activeClassIds = activeClasses.map((c) => c._id);
    const classMap = new Map<string, any>(
      activeClasses.map((c) => [String(c._id), c])
    );

    type FileItem = {
      id: string;
      name: string;
      type: string;
      url: string;
      size: string;
      createdAt: string;
      teacherName: string;
      subjectName: string;
      className: string;
    };

    const files: FileItem[] = [];

    // 2. Collect shared files from CourseClasses
    for (const c of activeClasses) {
      if (Array.isArray(c.sharedFiles)) {
        c.sharedFiles.forEach((f: any, idx: number) => {
          if (f && f.url) {
            files.push({
              id: `${c._id}_shared_${idx}`,
              name: f.name || "Berkas Bersama",
              type: f.type || "document",
              url: f.url,
              size: f.size || "1.0 MB",
              createdAt: new Date(f.uploadedAt || c.updatedAt || c.createdAt).toISOString(),
              teacherName: c.teacherId?.name || "Guru Pengampu",
              subjectName: c.subjectId?.name || c.name,
              className: c.name,
            });
          }
        });
      }
    }

    // 3. Collect material attachments
    const materials: any[] = await Material.find({
      courseClassId: { $in: activeClassIds },
      isPublished: true,
    })
      .populate("teacherId", "name")
      .populate("courseClassId", "name subjectId")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    for (const m of materials) {
      const cc = classMap.get(String(m.courseClassId?._id || m.courseClassId));
      if (Array.isArray(m.attachments)) {
        m.attachments.forEach((att: any, idx: number) => {
          if (att && att.url) {
            files.push({
              id: `${m._id}_mat_${idx}`,
              name: att.name || m.title,
              type: att.type || "document",
              url: att.url,
              size: att.size || "1.0 MB",
              createdAt: new Date(att.uploadedAt || m.createdAt).toISOString(),
              teacherName: m.teacherId?.name || cc?.teacherId?.name || "Guru",
              subjectName: cc?.subjectId?.name || cc?.name || "Mata Pelajaran",
              className: cc?.name || (m.courseClassId as any)?.name || "Kelas",
            });
          }
        });
      }
    }

    // 4. Collect assignment attachments
    const assignments: any[] = await Assignment.find({
      courseClassId: { $in: activeClassIds },
      isPublished: true,
      isArchived: { $ne: true },
      "attachments.0": { $exists: true },
    })
      .populate("teacherId", "name")
      .populate("courseClassId", "name subjectId")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    for (const a of assignments) {
      const cc = classMap.get(String(a.courseClassId?._id || a.courseClassId));
      if (Array.isArray(a.attachments)) {
        a.attachments.forEach((att: any, idx: number) => {
          if (att && att.url) {
            files.push({
              id: `${a._id}_att_${idx}`,
              name: att.name || a.title,
              type: att.type || "document",
              url: att.url,
              size: att.size || "1.0 MB",
              createdAt: new Date(att.uploadedAt || a.createdAt).toISOString(),
              teacherName: a.teacherId?.name || cc?.teacherId?.name || "Guru",
              subjectName: cc?.subjectId?.name || cc?.name || "Mata Pelajaran",
              className: cc?.name || (a.courseClassId as any)?.name || "Kelas",
            });
          }
        });
      }
    }

    // Sort by createdAt descending
    files.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        files,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat repositori file";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
