"use client";

import { use, Suspense } from "react";
import { SharedRombelPreview } from "@/components/class/SharedRombelPreview";
import { Loader2 } from "lucide-react";

export default function KepsekClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#0066FF]" />
          <p className="text-sm font-semibold text-slate-500">Memuat pratinjau kelas...</p>
        </div>
      }
    >
      <SharedRombelPreview
        rombelId={id}
        role="kepsek"
        backHref="/kepsek/teachers"
        backLabel="Monitor Guru"
      />
    </Suspense>
  );
}
