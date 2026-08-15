import type { ReactNode } from "react";
import { RoleLayout } from "@/components/layout/RoleLayout";

export default function KepsekLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="kepsek">{children}</RoleLayout>;
}
