import type { ReactNode } from "react";
import { RoleLayout } from "@/components/layout/RoleLayout";

export default function GuruLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="guru">{children}</RoleLayout>;
}
