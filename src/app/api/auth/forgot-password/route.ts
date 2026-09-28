import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import { User, SupportTicket, SupportMessage, Notification } from "@/models";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountType, identifier } = body;

    if (!accountType || !identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json(
        { success: false, message: "Tipe akun dan nomor identitas/email wajib diisi" },
        { status: 400 }
      );
    }

    if (accountType !== "siswa" && accountType !== "staff") {
      return NextResponse.json(
        { success: false, message: "Tipe akun tidak valid. Pilih siswa atau pekerja." },
        { status: 400 }
      );
    }

    await connectDB();

    const cleanId = identifier.trim();
    let user: any = null;

    if (accountType === "siswa") {
      user = await User.findOne({
        nis: cleanId,
        role: "siswa",
      });
    } else {
      user = await User.findOne({
        role: { $in: ["guru", "kurikulum", "kepsek"] },
        $or: [
          { nip: cleanId },
          { email: cleanId.toLowerCase() },
        ],
      });
    }

    // Generic response message to prevent account enumeration
    const genericMessage =
      "Jika akun ditemukan, permintaan bantuan akan dibuat dan dapat ditindaklanjuti oleh Admin.";

    if (!user) {
      // Do not disclose whether account exists
      return NextResponse.json({
        success: true,
        message: genericMessage,
        data: null,
      });
    }

    // Generate cryptographically secure random token (64 hex characters)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    // Check for an existing active ticket for this user to avoid ticket spamming
    let ticket = await SupportTicket.findOne({
      userId: user._id,
      category: "Lupa Password",
      status: { $in: ["WAITING", "IN_PROGRESS"] },
    });

    if (ticket) {
      // Refresh the token and expiry for the existing ticket
      ticket.ticketAccessTokenHash = tokenHash;
      ticket.ticketAccessExpiresAt = expiresAt;
      ticket.lastMessageAt = new Date();
      await ticket.save();
    } else {
      // Create new ticket
      ticket = await SupportTicket.create({
        userId: user._id,
        category: "Lupa Password",
        subject: "Permintaan Bantuan Login",
        status: "WAITING",
        ticketAccessTokenHash: tokenHash,
        ticketAccessExpiresAt: expiresAt,
        lastMessageAt: new Date(),
      });

      const roleLabel =
        user.role === "siswa"
          ? "Siswa"
          : user.role === "guru"
          ? "Guru"
          : user.role === "kurikulum"
          ? "Kurikulum"
          : "Kepala Sekolah";

      const idDetail = user.nis ? `NIS: ${user.nis}` : user.nip ? `NIP: ${user.nip}` : `Email: ${user.email}`;

      await SupportMessage.create({
        ticketId: ticket._id,
        senderId: user._id,
        message: `Saya tidak dapat login dan membutuhkan bantuan untuk mereset password akun saya. (${roleLabel}: ${user.name} - ${idDetail})`,
      });
    }

    // Notify administrators
    try {
      const adminUsers = await User.find({ role: "admin" }).select("_id").lean();
      if (adminUsers.length > 0) {
        const notifs = adminUsers.map((adm: any) => ({
          recipientId: adm._id,
          title: "Permintaan Bantuan Password",
          message: `${user.name} (${user.role.toUpperCase()}) mengajukan permohonan reset password.`,
          type: "general" as const,
          read: false,
        }));
        await Notification.insertMany(notifs);
      }
    } catch (notifErr) {
      console.error("Gagal membuat notifikasi admin:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: genericMessage,
      data: {
        ticketToken: rawToken,
        ticketId: String(ticket._id),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
