import { requireRole } from "@/lib/session";
import { handleGetProfile, handleUpdateProfile } from "@/lib/profile-service";

const ALL_ROLES = ["admin", "guru", "siswa", "kurikulum", "kepsek"] as const;

export async function GET(req: Request) {
  const { session, error } = await requireRole([...ALL_ROLES]);
  if (error || !session) return error;
  return handleGetProfile(req, session);
}

export async function PATCH(req: Request) {
  const { session, error } = await requireRole([...ALL_ROLES]);
  if (error || !session) return error;
  return handleUpdateProfile(req, session);
}

export const PUT = PATCH;
export const POST = PATCH;
export const DELETE = PATCH;
