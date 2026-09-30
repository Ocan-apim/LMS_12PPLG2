"use client";

import { use } from "react";
import { SharedClassDetail } from "@/components/class/SharedClassDetail";

export default function KurikulumClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <SharedClassDetail
      classId={id}
      mode="readonly"
      role="kurikulum"
      backHref="/kurikulum/grades/classes"
      backLabel="Nilai Kelas"
    />
  );
}
