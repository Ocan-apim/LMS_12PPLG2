"use client";

import { use } from "react";
import { SharedClassDetail } from "@/components/class/SharedClassDetail";

export default function AdminClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <SharedClassDetail
      classId={id}
      mode="readonly"
      role="admin"
      backHref="/admin/classes"
      backLabel="Manajemen Kelas"
    />
  );
}
