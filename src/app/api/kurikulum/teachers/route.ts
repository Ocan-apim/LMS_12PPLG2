import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User, CourseClass, Subject } from "@/models";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["kurikulum"]);
  if (error || !session) return error;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const statusParam = searchParams.get("status");

    // Filter guru
    const query: Record<string, any> = { role: "guru" };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { nip: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (statusParam === "active") {
      query.isActive = { $ne: false };
    } else if (statusParam === "inactive") {
      query.isActive = false;
    }

    // Fetch teachers with subjects populated
    const teachers: any[] = await User.find(query)
      .select("-password")
      .populate("subjects", "name code")
      .sort({ name: 1 })
      .lean();

    const teacherIds = teachers.map((t) => t._id);

    // Fetch CourseClass taught by these teachers
    const courseClasses: any[] = await CourseClass.find({
      teacherId: { $in: teacherIds },
      isActive: true,
    })
      .populate("subjectId", "name code")
      .lean();

    // Group course classes by teacherId
    const teacherClassMap = new Map<string, any[]>();
    for (const cc of courseClasses) {
      const tId = String(cc.teacherId);
      if (!teacherClassMap.has(tId)) {
        teacherClassMap.set(tId, []);
      }
      teacherClassMap.get(tId)!.push(cc);
    }

    const result = teachers.map((t) => {
      const taughtClasses = teacherClassMap.get(String(t._id)) || [];
      const classCount = taughtClasses.length;
      // Teaching load: count of active classes taught
      const teachingLoad = classCount;

      // Extract subject names from taught classes and assigned subjects
      const subjectNames = new Set<string>();
      if (Array.isArray(t.subjects)) {
        t.subjects.forEach((s: any) => {
          if (s?.name) subjectNames.add(s.name);
        });
      }
      taughtClasses.forEach((cc: any) => {
        if (cc.subjectId?.name) subjectNames.add(cc.subjectId.name);
      });

      return {
        id: String(t._id),
        name: t.name,
        nip: t.nip || null,
        email: t.email,
        photoUrl: t.photoUrl || null,
        subjects: Array.from(subjectNames),
        teachingLoad,
        classCount,
        isActive: t.isActive !== false,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        teachers: result,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat data guru";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
