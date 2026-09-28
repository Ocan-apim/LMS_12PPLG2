"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Folder,
  FileText,
  Download,
  Search,
  RefreshCw,
  AlertCircle,
  FileCode,
  FileSpreadsheet,
  FileImage,
  Inbox,
  Filter,
  ChevronRight,
  BookOpen,
  User,
  GraduationCap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Loaders";

export interface AcademicFileItem {
  id: string;
  name: string;
  type: string;
  url: string;
  size: string;
  createdAt: string;
  teacherName: string;
  subjectName: string;
  className: string;
}

function getFileIcon(fileName: string, type: string) {
  const lower = (fileName || "").toLowerCase();
  if (lower.endsWith(".pdf") || type.includes("pdf")) {
    return <FileText className="size-4 text-red-500" />;
  }
  if (
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".csv") ||
    type.includes("sheet") ||
    type.includes("csv")
  ) {
    return <FileSpreadsheet className="size-4 text-emerald-600" />;
  }
  if (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    type.includes("image")
  ) {
    return <FileImage className="size-4 text-purple-600" />;
  }
  if (
    lower.endsWith(".js") ||
    lower.endsWith(".ts") ||
    lower.endsWith(".html") ||
    lower.endsWith(".sql")
  ) {
    return <FileCode className="size-4 text-blue-600" />;
  }
  return <FileText className="size-4 text-slate-500" />;
}

function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function KurikulumFiles() {
  const [files, setFiles] = useState<AcademicFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/kurikulum/files");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat repositori file akademik");
      }

      setFiles(json.data.files || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat berkas";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Distinct classes for filter dropdown
  const distinctClasses = useMemo(() => {
    const set = new Set<string>();
    files.forEach((f) => {
      if (f.className) set.add(f.className);
    });
    return Array.from(set).sort();
  }, [files]);

  // Filtered files
  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.teacherName.toLowerCase().includes(q) ||
        f.subjectName.toLowerCase().includes(q) ||
        f.className.toLowerCase().includes(q);

      const matchClass = selectedClass === "all" || f.className === selectedClass;

      let matchType = true;
      if (selectedType === "pdf") {
        matchType = f.name.toLowerCase().endsWith(".pdf") || f.type.includes("pdf");
      } else if (selectedType === "sheet") {
        matchType =
          f.name.toLowerCase().endsWith(".xlsx") ||
          f.name.toLowerCase().endsWith(".xls") ||
          f.name.toLowerCase().endsWith(".csv");
      }

      return matchSearch && matchClass && matchType;
    });
  }, [files, searchQuery, selectedType, selectedClass]);

  const handleDownload = (file: AcademicFileItem) => {
    if (!file.url) return;
    const downloadUrl = file.url.startsWith("/uploads")
      ? `/api/files/download?path=${encodeURIComponent(file.url)}&name=${encodeURIComponent(file.name)}`
      : file.url;
    window.open(downloadUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Portal Kurikulum</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-blue-600 font-bold">Berkas Akademik</span>
          </div>
          <h1 className="mt-1 font-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Repositori Berkas Akademik
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Akses pemantauan dan unduh materi pembelajaran, modul, serta lampiran tugas seluruh kelas.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchFiles}
          disabled={loading}
          aria-label="Segarkan repositori berkas"
          className="inline-flex h-9.5 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* 2. Error State */}
      {error && !loading && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <h2 className="font-semibold text-red-900">Repositori gagal dimuat</h2>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchFiles}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 3. Toolbar & Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              aria-label="Filter Jenis Berkas"
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Semua Jenis Berkas</option>
              <option value="pdf">Dokumen PDF (.pdf)</option>
              <option value="sheet">Lembar Kerja / Spreadsheet</option>
            </select>

            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              aria-label="Filter Kelas"
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Semua Kelas Rombel</option>
              {distinctClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>

            {(selectedType !== "all" || selectedClass !== "all" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedType("all");
                  setSelectedClass("all");
                  setSearchQuery("");
                }}
                className="inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition"
              >
                <Filter className="size-3 text-slate-400" />
                Reset
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama berkas, mapel, atau guru..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8.5 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      {/* 4. Files Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/90 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Daftar Berkas Pembelajaran
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {filteredFiles.length} Berkas
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Nama Berkas
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Kelas & Mapel
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Guru Pengunggah
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Tanggal
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Ukuran
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6 text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-9 rounded-xl" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <Skeleton className="h-4 w-14" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6 text-right">
                      <Skeleton className="h-8 w-20 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                      <Inbox className="size-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Belum ada file akademik.
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                      {searchQuery || selectedType !== "all" || selectedClass !== "all"
                        ? "Tidak ada berkas yang sesuai filter pencarian."
                        : "Berkas pembelajaran akan muncul secara otomatis saat guru membagikan materi atau lampiran tugas."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-slate-50/70 transition-colors duration-150"
                  >
                    {/* Nama Berkas */}
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 border border-slate-200">
                          {getFileIcon(file.name, file.type)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-snug">
                            {file.name}
                          </p>
                          <p className="text-[11px] text-slate-400 uppercase font-mono">
                            {file.type || "FILE"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Kelas & Mapel */}
                    <td className="px-4 py-3.5 sm:px-6">
                      <p className="font-bold text-slate-800">{file.className}</p>
                      <p className="text-[11px] text-slate-500">{file.subjectName}</p>
                    </td>

                    {/* Guru Pengunggah */}
                    <td className="px-4 py-3.5 sm:px-6 text-slate-700 font-medium">
                      {file.teacherName}
                    </td>

                    {/* Tanggal */}
                    <td className="px-4 py-3.5 sm:px-6 text-slate-500">
                      {formatDateIndo(file.createdAt)}
                    </td>

                    {/* Ukuran */}
                    <td className="px-4 py-3.5 sm:px-6 font-mono text-slate-500 text-[11px]">
                      {file.size}
                    </td>

                    {/* Aksi: Unduh (Read-only) */}
                    <td className="px-4 py-3.5 sm:px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownload(file)}
                        aria-label={`Unduh ${file.name}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
                      >
                        <Download className="size-3.5 text-slate-500" />
                        <span>Unduh</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
