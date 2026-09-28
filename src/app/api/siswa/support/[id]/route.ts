import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { SupportTicket, SupportMessage } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
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

    const ticket: any = await SupportTicket.findById(id).lean();

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Tiket bantuan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Strict ownership verification: Siswa may ONLY access their own ticket
    if (ticket.userId.toString() !== session.id) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke tiket ini" },
        { status: 403 }
      );
    }

    // Fetch conversation messages
    const messages: any[] = await SupportMessage.find({ ticketId: ticket._id })
      .populate("senderId", "name role")
      .sort({ createdAt: 1 })
      .lean();

    const formattedMessages = messages.map((m) => {
      const sender = m.senderId || {};
      const senderIdStr = sender._id ? sender._id.toString() : m.senderId?.toString();
      return {
        id: String(m._id),
        message: m.message,
        createdAt: m.createdAt,
        sender: {
          id: senderIdStr,
          name: sender.name || (senderIdStr === session.id ? session.name : "Admin Learnix"),
          role: sender.role || (senderIdStr === session.id ? "siswa" : "admin"),
          isSelf: senderIdStr === session.id,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ticket: {
          id: String(ticket._id),
          category: ticket.category,
          subject: ticket.subject,
          status: ticket.status,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          resolvedAt: ticket.resolvedAt || null,
        },
        messages: formattedMessages,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat detail tiket";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
