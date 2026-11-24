import { NextResponse } from "next/server";
import { requiresAccountActivation } from "@/lib/auth";
import { requireSession } from "@/lib/session";

export async function GET() {
  const { session, error } = await requireSession({ allowUnactivated: true });

  if (error || !session) {
    return (
      error ??
      NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      user: session,
      requiresActivation: requiresAccountActivation(session),
    },
  });
}
