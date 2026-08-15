"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-5 inline-flex items-center gap-2 rounded-md border border-[#d9deeb] bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#674ce7] hover:text-[#674ce7]"
    >
      <ArrowLeft className="size-4" />
      Back
    </button>
  );
}
