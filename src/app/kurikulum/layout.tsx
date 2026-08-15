import type { ReactNode } from "react";
import { RoleLayout } from "@/components/layout/RoleLayout";

export default function KurikulumLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="kurikulum">{children}</RoleLayout>;
}
