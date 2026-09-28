import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { SupportTicket, SupportMessage, User, Notification } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "ID tiket tidak valid" },
        { status: 400 }
      );
    }

    await connectDB();

    const ticket = await SupportTicket.findById(id);

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Tiket bantuan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Strict ownership verification: Siswa may ONLY send messages on their own ticket
    if (ticket.userId.toString() !== session.id) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke tiket ini" },
        { status: 403 }
      );
    }

    // Resolved tickets do not accept new messages unless reopened
    if (ticket.status === "RESOLVED") {
      return NextResponse.json(
        {
          success: false,
          message: "Tiket bantuan ini telah ditandai Selesai. Silakan buat tiket baru jika Anda mengalami kendala lain.",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { message } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, message: "Pesan tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Security: Sender MUST ALWAYS be authoritative from session.id
    const newMsg = await SupportMessage.create({
      ticketId: ticket._id,
      senderId: session.id,
      message: message.trim(),
    });

    // Update ticket activity timestamp
    ticket.lastMessageAt = new Date();
    await ticket.save();

    // Notify admins of student reply
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
          title: "Pesan Baru Bantuan Siswa",
          message: `${studentName} mengirim pesan pada tiket: ${ticket.subject}`,
          link: `/admin/support/${ticket._id}`,
          relatedEntityId: ticket._id,
        }));
        await Notification.insertMany(notifs);
      }
    } catch (notifErr) {
      console.error("Gagal mengirim notifikasi pesan ke admin:", notifErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Pesan berhasil dikirim",
        data: {
          message: {
            id: String(newMsg._id),
            message: newMsg.message,
            createdAt: newMsg.createdAt,
            sender: {
              id: session.id,
              name: session.name,
              role: "siswa",
              isSelf: true,
            },
          },
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mengirim pesan";
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
