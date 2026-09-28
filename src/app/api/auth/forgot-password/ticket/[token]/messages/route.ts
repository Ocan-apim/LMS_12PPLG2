import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import { SupportTicket, SupportMessage, Notification, User } from "@/models";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;

    if (!token || typeof token !== "string" || token.length < 16) {
      return NextResponse.json(
        { success: false, message: "Token tiket tidak valid" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, message: "Pesan tidak boleh kosong" },
        { status: 400 }
      );
    }

    await connectDB();

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const ticket = await SupportTicket.findOne({
      ticketAccessTokenHash: tokenHash,
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Tiket bantuan tidak ditemukan atau token tidak valid" },
        { status: 404 }
      );
    }

    // Check expiration
    if (ticket.ticketAccessExpiresAt && new Date(ticket.ticketAccessExpiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, message: "Token akses tiket telah kedaluwarsa. Silakan ajukan permohonan baru." },
        { status: 410 }
      );
    }

    // Block new messages if resolved
    if (ticket.status === "RESOLVED") {
      return NextResponse.json(
        {
          success: false,
          message: "Tiket bantuan telah selesai ditangani. Anda tidak dapat mengirim pesan baru.",
        },
        { status: 400 }
      );
    }

    const newMsg = await SupportMessage.create({
      ticketId: ticket._id,
      senderId: ticket.userId,
      message: message.trim(),
    });

    // Update ticket activity and set status to WAITING if it was IN_PROGRESS
    ticket.lastMessageAt = new Date();
    if (ticket.status === "IN_PROGRESS") {
      ticket.status = "WAITING";
    }
    await ticket.save();

    // Notify administrators
    try {
      const adminUsers = await User.find({ role: "admin" }).select("_id").lean();
      if (adminUsers.length > 0) {
        const notifs = adminUsers.map((adm: any) => ({
          recipientId: adm._id,
          title: "Pesan Baru pada Tiket Bantuan Password",
          message: `Terdapat pesan balasan baru dari pemohon pada tiket #${String(ticket._id).slice(-6).toUpperCase()}.`,
          type: "general" as const,
          read: false,
        }));
        await Notification.insertMany(notifs);
      }
    } catch (notifErr) {
      console.error("Gagal membuat notifikasi pesan tiket:", notifErr);
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
              id: String(ticket.userId),
              name: "Pemohon",
              role: "pemohon",
              isAdmin: false,
              isSelf: true,
            },
          },
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengirim pesan";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
