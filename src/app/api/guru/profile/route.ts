import { requireRole } from "@/lib/session";
import { handleGetProfile, handleUpdateProfile } from "@/lib/profile-service";

export async function GET(req: Request) {
  const { session, error } = await requireRole(["guru"]);
  if (error || !session) return error;
  return handleGetProfile(req, session);
}

export async function PATCH(req: Request) {
  const { session, error } = await requireRole(["guru"]);
  if (error || !session) return error;
  return handleUpdateProfile(req, session);
}

export const PUT = PATCH;
export const POST = PATCH;
export const DELETE = PATCH;
