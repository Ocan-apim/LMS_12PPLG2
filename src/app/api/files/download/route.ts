import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { requireRole } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { CourseClass, Material, Assignment, Submission } from "@/models";

export async function GET(req: Request) {
  // 1. Role & Session Verification
  const { session, error } = await requireRole(["guru", "admin", "siswa"]);
  if (error || !session) return error;

  try {
    const { searchParams } = new URL(req.url);
    const filePathParam = searchParams.get("path") || searchParams.get("url");
    const downloadName = searchParams.get("name") || "download";

    if (!filePathParam) {
      return NextResponse.json(
        { success: false, message: "Path file wajib disertakan" },
        { status: 400 }
      );
    }

    // Clean leading slash
    const cleanRelativePath = filePathParam.startsWith("/")
      ? filePathParam.slice(1)
      : filePathParam;

    // Security check: Must reside within public/uploads
    if (!cleanRelativePath.startsWith("uploads/")) {
      return NextResponse.json(
        { success: false, message: "Akses file tidak diizinkan" },
        { status: 403 }
      );
    }

    const absolutePath = path.join(process.cwd(), "public", cleanRelativePath);
    const resolvedPath = path.resolve(absolutePath);
    const allowedRoot = path.resolve(path.join(process.cwd(), "public", "uploads"));

    if (!resolvedPath.startsWith(allowedRoot)) {
      return NextResponse.json(
        { success: false, message: "Path traversal tidak diizinkan" },
        { status: 403 }
      );
    }

    // 2. Class Membership Authorization for Students
    if (session.role === "siswa") {
      await connectDB();
      const fileUrlPattern = new RegExp(cleanRelativePath.replace(/\\/g, "/"), "i");

      // Check if file is part of CourseClass sharedFiles
      const targetCourseClass = await CourseClass.findOne({
        "sharedFiles.url": { $regex: fileUrlPattern },
      }).select("studentIds");

      if (targetCourseClass) {
        const isMember = (targetCourseClass.studentIds || []).map((sid: any) => sid.toString()).includes(session.id);
        if (!isMember) {
          return NextResponse.json(
            { success: false, message: "Akses ditolak: Anda tidak terdaftar di kelas file ini" },
            { status: 403 }
          );
        }
      }

      // Check if file is part of Material attachments
      const targetMaterial = await Material.findOne({
        "attachments.url": { $regex: fileUrlPattern },
      }).select("courseClassId");

      if (targetMaterial && targetMaterial.courseClassId) {
        const materialClass = await CourseClass.findById(targetMaterial.courseClassId).select("studentIds");
        if (materialClass) {
          const isMember = (materialClass.studentIds || []).map((sid: any) => sid.toString()).includes(session.id);
          if (!isMember) {
            return NextResponse.json(
              { success: false, message: "Akses ditolak: Anda tidak terdaftar di kelas materi ini" },
              { status: 403 }
            );
          }
        }
      }

      // Check if file is part of Assignment attachments
      const targetAssignment = await Assignment.findOne({
        "attachments.url": { $regex: fileUrlPattern },
      }).select("courseClassId");

      if (targetAssignment && targetAssignment.courseClassId) {
        const assignClass = await CourseClass.findById(targetAssignment.courseClassId).select("studentIds");
        if (assignClass) {
          const isMember = (assignClass.studentIds || []).map((sid: any) => sid.toString()).includes(session.id);
          if (!isMember) {
            return NextResponse.json(
              { success: false, message: "Akses ditolak: Anda tidak terdaftar di kelas tugas ini" },
              { status: 403 }
            );
          }
        }
      }

      // Check if file is a Submission file
      const targetSubmission = await Submission.findOne({
        $or: [
          { "attachments.url": { $regex: fileUrlPattern } },
          { fileUrl: { $regex: fileUrlPattern } },
        ],
      }).select("studentId courseClassId");

      if (targetSubmission) {
        if (targetSubmission.studentId.toString() !== session.id) {
          return NextResponse.json(
            { success: false, message: "Akses ditolak: Anda tidak memiliki izin untuk mengunduh submission siswa lain" },
            { status: 403 }
          );
        }
      }
    }

    if (!existsSync(resolvedPath)) {
      return NextResponse.json(
        { success: false, message: "File tidak ditemukan" },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(resolvedPath);
    const safeDownloadName = downloadName.replace(/["\r\n]/g, "_");

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeDownloadName}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengunduh file";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
