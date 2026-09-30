"use client";

import { use } from "react";
import { SharedClassDetail } from "@/components/class/SharedClassDetail";

export default function KepsekClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <SharedClassDetail
      classId={id}
      mode="readonly"
      role="kepsek"
      backHref="/kepsek/teachers"
      backLabel="Monitor Guru"
    />
  );
}
