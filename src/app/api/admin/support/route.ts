import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { SupportTicket, SupportMessage, User } from "@/models";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["admin"]);
  if (error || !session) return error;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const categoryParam = searchParams.get("category");
    const searchParam = searchParams.get("search");

    const query: Record<string, any> = {};

    if (statusParam && statusParam !== "all") {
      query.status = statusParam;
    }

    if (categoryParam && categoryParam !== "all") {
      query.category = categoryParam;
    }

    if (searchParam && searchParam.trim()) {
      const q = searchParam.trim();
      const matchingUsers = await User.find({
        role: "siswa",
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { nis: { $regex: q, $options: "i" } },
          { nisn: { $regex: q, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();

      const userIds = matchingUsers.map((u: any) => u._id);

      query.$or = [
        { subject: { $regex: q, $options: "i" } },
        { userId: { $in: userIds } },
      ];
    }

    const tickets: any[] = await SupportTicket.find(query)
      .populate({
        path: "userId",
        select: "name email nis nisn grade classId",
        populate: { path: "classId", select: "name grade" },
      })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    // Summary counts
    const [total, waiting, inProgress, resolved] = await Promise.all([
      SupportTicket.countDocuments(),
      SupportTicket.countDocuments({ status: "WAITING" }),
      SupportTicket.countDocuments({ status: "IN_PROGRESS" }),
      SupportTicket.countDocuments({ status: "RESOLVED" }),
    ]);

    const formatted = tickets.map((t) => {
      const u = t.userId || {};
      return {
        id: String(t._id),
        category: t.category,
        subject: t.subject,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        resolvedAt: t.resolvedAt || null,
        lastMessageAt: t.lastMessageAt || t.updatedAt,
        student: {
          id: u._id ? String(u._id) : null,
          name: u.name || "Siswa",
          email: u.email || "-",
          nis: u.nis || u.nisn || "-",
          className: u.classId?.name || "-",
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total,
          waiting,
          inProgress,
          resolved,
        },
        tickets: formatted,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat daftar tiket bantuan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
