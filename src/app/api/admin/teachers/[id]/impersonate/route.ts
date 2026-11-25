import { NextResponse } from "next/server";

/**
 * TASK 3: Admin Login-as-Guru (Impersonation) has been permanently disabled and removed.
 * Admin cannot generate a Guru session or switch authenticated identity to another user.
 */
function impersonationDisabledResponse() {
  return NextResponse.json(
    {
      success: false,
      code: "IMPERSONATION_DISABLED",
      message:
        "Fitur login sebagai guru (impersonasi) telah dihapus dan tidak diizinkan.",
    },
    { status: 403 }
  );
}

export async function POST() {
  return impersonationDisabledResponse();
}

export async function GET() {
  return impersonationDisabledResponse();
}

export async function PUT() {
  return impersonationDisabledResponse();
}

export async function PATCH() {
  return impersonationDisabledResponse();
}

export async function DELETE() {
  return impersonationDisabledResponse();
}
