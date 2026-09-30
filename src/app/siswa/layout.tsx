import type { ReactNode } from "react";
import { RoleLayout } from "@/components/layout/RoleLayout";

export default function SiswaLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="siswa" allowedRoles={["siswa", "guru", "admin", "kurikulum", "kepsek"]}>{children}</RoleLayout>;
}
