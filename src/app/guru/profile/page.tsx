"use client";

import { useEffect, useState } from "react";
import { User, Mail, Shield, BookOpen, Calendar, GraduationCap } from "lucide-react";
import { Spinner, Badge } from "@/components/ui";

interface TeacherProfile {
  name: string;
  nip?: string;
  email: string;
  role: string;
  subjects?: string[];
  homeroomClass?: string;
  joinYear?: number;
}

export default function GuruProfilePage() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (json.success && json.user) {
          setProfile(json.user);
        }
      } catch (err) {
        console.error("Gagal memuat profil:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const user = profile || {
    name: "Guru Pengampu",
    nip: "198501012010011001",
    email: "guru@learnix.sch.id",
    role: "guru",
    subjects: ["Pemrograman Web", "Basis Data"],
    joinYear: 2022,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profil Guru</h1>
        <p className="text-xs text-slate-500">
          Informasi identitas, penugasan mata pelajaran, dan status pengajar di Learnix LMS.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-blue-600 text-white text-2xl font-bold shadow-md">
            {user.name.charAt(0)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
              <Badge variant="blue">Guru Aktif</Badge>
            </div>
            <p className="text-xs text-slate-500 font-mono">NIP: {user.nip || "-"}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Email</span>
            <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Mail className="size-3.5 text-blue-600" />
              {user.email}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Tahun Bergabung</span>
            <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Calendar className="size-3.5 text-blue-600" />
              {user.joinYear || 2023}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 space-y-1 sm:col-span-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Mata Pelajaran yang Diampu</span>
            <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-blue-600" />
              {user.subjects && user.subjects.length > 0
                ? user.subjects.join(", ")
                : "Pemrograman Web, Basis Data"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
