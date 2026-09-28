import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { SupportTicket, SupportMessage, User, Notification } from "@/models";

const ALLOWED_CATEGORIES = [
  "Lupa Password",
  "Kendala Login",
  "Kendala Akun",
  "Kendala Kelas",
  "Kendala Tugas/Kuis",
  "Kendala Teknis",
  "Lainnya",
];

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();

    const tickets = await SupportTicket.find({ userId: session.id })
      .sort({ updatedAt: -1 })
      .lean();

    // Enrich with latest message
    const ticketIds = tickets.map((t) => t._id);
    const messages = await SupportMessage.find({
      ticketId: { $in: ticketIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    const latestMessageMap = new Map<string, string>();
    for (const m of messages) {
      const tid = String(m.ticketId);
      if (!latestMessageMap.has(tid)) {
        latestMessageMap.set(tid, m.message);
      }
    }

    const formatted = tickets.map((t: any) => ({
      id: String(t._id),
      category: t.category,
      subject: t.subject,
      status: t.status,
      lastMessage: latestMessageMap.get(String(t._id)) || null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      resolvedAt: t.resolvedAt || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        tickets: formatted,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat tiket bantuan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const { category, subject, message } = body;

    // Validation
    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          success: false,
          message: `Kategori tidak valid. Pilih dari: ${ALLOWED_CATEGORIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return NextResponse.json(
        { success: false, message: "Subjek pertanyaan wajib diisi" },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, message: "Pesan pertanyaan wajib diisi" },
        { status: 400 }
      );
    }

    // Authoritative session user resolution (ignore client-supplied userId)
    const ticket = await SupportTicket.create({
      userId: session.id,
      category,
      subject: subject.trim(),
      status: "WAITING",
      lastMessageAt: new Date(),
    });

    // Create initial message
    const initialMessage = await SupportMessage.create({
      ticketId: ticket._id,
      senderId: session.id,
      message: message.trim(),
    });

    // Notify administrators
    try {
      const student = await User.findById(session.id).select("name").lean();
      const studentName = student ? (student as any).name : "Siswa";
      const admins = await User.find({ role: "admin", isActive: true })
        .select("_id")
        .lean();

      if (admins.length > 0) {
        const notifs = admins.map((adm: any) => ({
          recipientId: adm._id,
          type: "general" as const,
          title: "Permintaan Bantuan Baru",
          message: `${studentName} membuat permintaan bantuan baru: ${ticket.subject}`,
          link: `/admin/support/${ticket._id}`,
          relatedEntityId: ticket._id,
        }));
        await Notification.insertMany(notifs);
      }
    } catch (notifErr) {
      console.error("Gagal mengirim notifikasi ke admin:", notifErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Tiket bantuan berhasil dibuat",
        data: {
          ticket: {
            id: String(ticket._id),
            category: ticket.category,
            subject: ticket.subject,
            status: ticket.status,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
          },
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat tiket bantuan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
