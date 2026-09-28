import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { CourseClass, Material, Assignment } from "@/models";

export async function GET(_req: Request) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();

    // 1. Fetch joined classes
    const joinedClasses: any[] = await CourseClass.find({
      studentIds: session.id,
      isArchived: { $ne: true },
    })
      .populate("teacherId", "name title degree email")
      .populate("subjectId", "name code category description")
      .lean();

    const joinedClassIds = joinedClasses.map((c) => c._id);

    if (joinedClassIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          lastAccessed: [],
          subjectFolders: [],
          recentFiles: [],
        },
      });
    }

    // 2. Fetch Materials from joined classes
    const materials: any[] = await Material.find({
      courseClassId: { $in: joinedClassIds },
      isPublished: true,
    })
      .populate("courseClassId", "name")
      .lean();

    // 3. Fetch Assignments from joined classes
    const assignments: any[] = await Assignment.find({
      courseClassId: { $in: joinedClassIds },
      isArchived: { $ne: true },
      isPublished: true,
      "attachments.0": { $exists: true },
    })
      .populate("courseClassId", "name")
      .lean();

    // 4. Aggregate all files
    const allFiles: Array<{
      name: string;
      url: string;
      type: string;
      size: string;
      uploadedAt: Date;
      className: string;
      subjectName: string;
      downloadUrl: string;
    }> = [];

    // Class shared files
    joinedClasses.forEach((c: any) => {
      if (Array.isArray(c.sharedFiles)) {
        c.sharedFiles.forEach((f: any) => {
          allFiles.push({
            name: f.name,
            url: f.url,
            type: f.type || "pdf",
            size: f.size || "1.0 MB",
            uploadedAt: f.uploadedAt || c.updatedAt || new Date(),
            className: c.name,
            subjectName: c.subjectId?.name || c.name,
            downloadUrl: `/api/files/download?path=${encodeURIComponent(f.url)}&name=${encodeURIComponent(f.name)}`,
          });
        });
      }
    });

    // Material attachments
    materials.forEach((m: any) => {
      if (Array.isArray(m.attachments)) {
        m.attachments.forEach((att: any) => {
          allFiles.push({
            name: att.name || m.title,
            url: att.url,
            type: att.type || "doc",
            size: att.size || "1.5 MB",
            uploadedAt: att.uploadedAt || m.createdAt || new Date(),
            className: m.courseClassId?.name || "Materi",
            subjectName: m.courseClassId?.name || "Materi",
            downloadUrl: `/api/files/download?path=${encodeURIComponent(att.url)}&name=${encodeURIComponent(att.name || m.title)}`,
          });
        });
      }
    });

    // Assignment attachments
    assignments.forEach((a: any) => {
      if (Array.isArray(a.attachments)) {
        a.attachments.forEach((att: any) => {
          allFiles.push({
            name: att.name || a.title,
            url: att.url,
            type: att.type || "doc",
            size: att.size || "1.2 MB",
            uploadedAt: att.uploadedAt || a.createdAt || new Date(),
            className: a.courseClassId?.name || "Tugas",
            subjectName: a.courseClassId?.name || "Tugas",
            downloadUrl: `/api/files/download?path=${encodeURIComponent(att.url)}&name=${encodeURIComponent(att.name || a.title)}`,
          });
        });
      }
    });

    // Sort files by uploadedAt desc
    allFiles.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    // 5. Subject Folders
    const subjectFolders = joinedClasses.map((c: any) => {
      const classFileCount = allFiles.filter(
        (f) => f.className === c.name || f.subjectName === (c.subjectId?.name || c.name)
      ).length;

      return {
        _id: c._id.toString(),
        name: c.subjectId?.name || c.name,
        className: c.name,
        teacher: c.teacherId?.name || "Guru Pengampu",
        description: c.subjectId?.description || "Materi dan referensi pembelajaran kelas.",
        fileCount: classFileCount,
        folderUrl: `/siswa/courses/${c._id}`,
      };
    });

    // 6. Last accessed format for top cards
    const lastAccessed = allFiles.slice(0, 4).map((f) => {
      const diffHours = Math.floor(
        (Date.now() - new Date(f.uploadedAt).getTime()) / (1000 * 60 * 60)
      );
      let dateLabel = "Baru saja";
      if (diffHours < 24 && diffHours > 0) {
        dateLabel = `Diunggah ${diffHours}j lalu`;
      } else if (diffHours >= 24) {
        dateLabel = new Date(f.uploadedAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        });
      }

      return {
        name: f.name,
        url: f.url,
        downloadUrl: f.downloadUrl,
        date: dateLabel,
        type: f.type || "pdf",
        className: f.className,
      };
    });

    // 7. Recent files table list
    const recentFiles = allFiles.slice(0, 10).map((f) => ({
      name: f.name,
      subject: f.subjectName || f.className,
      size: f.size,
      date: new Date(f.uploadedAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      type: f.type,
      url: f.url,
      downloadUrl: f.downloadUrl,
    }));

    return NextResponse.json({
      success: true,
      data: {
        lastAccessed,
        subjectFolders,
        recentFiles,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat repositori file";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
