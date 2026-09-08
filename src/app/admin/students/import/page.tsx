"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  XCircle,
  HelpCircle,
  Filter,
  Check,
} from "lucide-react";
import { Button, Spinner } from "@/components/ui";

interface PreviewRow {
  index: number;
  name: string;
  nisn: string;
  className: string;
  departmentCode: string;
  gender: "Laki-laki" | "Perempuan";
  birthPlace?: string;
  birthDate?: string;
  grade?: string;
  isValid: boolean;
  errors: string[];
}

export default function AdminImportStudentsPage() {
  const router = useRouter();

  // Wizard step: 1 (Upload), 2 (Preview & Validate), 3 (Complete)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [loading, setLoading] = useState(false);
  const [filterOnlyErrors, setFilterOnlyErrors] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [validCount, setValidCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  // Drag state
  const [dragActive, setDragActive] = useState(false);

  // Template generators
  function downloadTemplate(type: "csv" | "xlsx") {
    const csvContent =
      "name,nisn,className,departmentCode,gender,birthPlace,birthDate\n" +
      "Ahmad Fauzi,0098273650,XI PPLG 2,PPLG,Laki-laki,Yogyakarta,2008-05-12\n" +
      "Siti Aminah,0098273651,X TJKT 1,TJKT,Perempuan,Bandung,2009-08-20\n" +
      "Budi Cahyono,0098273652,XII PPLG 1,PPLG,Laki-laki,Semarang,2007-11-15\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `template_siswa_learnix.${type === "xlsx" ? "csv" : "csv"}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Parse CSV text
  function parseCSV(text: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const parsed = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = parts[idx] || "";
        });

        parsed.push({
          name: rowObj["name"] || rowObj["nama"] || parts[0] || "",
          nisn: rowObj["nisn"] || parts[1] || "",
          className: rowObj["classname"] || rowObj["kelas"] || parts[2] || "XI PPLG 2",
          departmentCode: rowObj["departmentcode"] || rowObj["jurusan"] || parts[3] || "PPLG",
          gender: (rowObj["gender"] === "Perempuan" ? "Perempuan" : "Laki-laki") as "Laki-laki" | "Perempuan",
          birthPlace: rowObj["birthplace"] || rowObj["tempat_lahir"] || parts[5] || "",
          birthDate: rowObj["birthdate"] || rowObj["tanggal_lahir"] || parts[6] || "",
        });
      }
    }
    return parsed;
  }

  async function handleFileUpload(file: File) {
    setLoading(true);
    try {
      const text = await file.text();
      const parsedRows = parseCSV(text);

      if (parsedRows.length === 0) {
        alert("File kosong atau format CSV tidak valid.");
        setLoading(false);
        return;
      }

      // Call validation API
      const res = await fetch("/api/admin/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows, mode: "validate" }),
      });

      const json = await res.json();
      if (json.success) {
        setRows(json.data.rows);
        setValidCount(json.data.validCount);
        setErrorCount(json.data.errorCount);
        setStep(2);
      } else {
        alert(json.message || "Gagal memproses validasi file.");
      }
    } catch {
      alert("Terjadi kesalahan saat membaca file.");
    } finally {
      setLoading(false);
    }
  }

  // Cell edit in preview
  function handleCellChange(index: number, field: keyof PreviewRow, val: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.index === index) {
          const updated = { ...r, [field]: val };
          // Re-validate basic rules
          const errors = [];
          if (!updated.name.trim()) errors.push("Nama siswa wajib diisi");
          if (!updated.nisn.trim() || updated.nisn.length !== 10) {
            errors.push("NISN harus 10 digit");
          }
          return {
            ...updated,
            isValid: errors.length === 0,
            errors,
          };
        }
        return r;
      })
    );
  }

  async function handleCommitImport() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, mode: "commit" }),
      });
      const json = await res.json();
      if (json.success) {
        setStep(3);
      } else {
        alert(json.message || "Gagal menyimpan data impor.");
      }
    } catch {
      alert("Terjadi kesalahan saat menyimpan ke database.");
    } finally {
      setLoading(false);
    }
  }

  const displayedRows = filterOnlyErrors ? rows.filter((r) => !r.isValid) : rows;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header & Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Link href="/admin/students" className="hover:text-blue-600 transition flex items-center gap-1">
            <ArrowLeft className="size-3" /> Manajemen Siswa
          </Link>
          <span>/</span>
          <span className="text-blue-600">Impor Data Siswa</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Impor Massal Data Siswa</h1>
      </div>

      {/* Stepper matching Image 4 */}
      <div className="flex items-center justify-center gap-4 border-b border-slate-200 pb-5">
        <div className={`flex items-center gap-2 text-sm font-semibold ${step >= 1 ? "text-blue-600" : "text-slate-400"}`}>
          <div className={`flex size-7 items-center justify-center rounded-full text-xs ${step >= 1 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
            1
          </div>
          <span>Unggah Berkas</span>
        </div>
        <div className="h-0.5 w-12 bg-slate-200" />
        <div className={`flex items-center gap-2 text-sm font-semibold ${step >= 2 ? "text-blue-600" : "text-slate-400"}`}>
          <div className={`flex size-7 items-center justify-center rounded-full text-xs ${step >= 2 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
            2
          </div>
          <span>Pratinjau & Validasi</span>
        </div>
        <div className="h-0.5 w-12 bg-slate-200" />
        <div className={`flex items-center gap-2 text-sm font-semibold ${step >= 3 ? "text-blue-600" : "text-slate-400"}`}>
          <div className={`flex size-7 items-center justify-center rounded-full text-xs ${step >= 3 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
            3
          </div>
          <span>Selesai</span>
        </div>
      </div>

      {/* Step 1: Upload File matching Image 4 Bottom-Left */}
      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-800">Langkah 1: Unggah Berkas</h2>
              <p className="text-xs text-slate-500 mt-1">
                Pastikan file Anda menggunakan format yang didukung (.csv atau .xlsx) agar data dapat diproses dengan benar oleh sistem Learnix.
              </p>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition ${
                  dragActive ? "border-blue-500 bg-blue-50/50" : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                }`}
              >
                <div className="flex size-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Upload className="size-7" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-800">
                  Seret & Lepas File di Sini
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  atau klik untuk menelusuri dari perangkat Anda
                </p>

                <label className="mt-5 cursor-pointer rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs transition">
                  PILIH BERKAS
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Validation Notes */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2 text-xs text-slate-600">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
                  <div className="font-semibold text-slate-800">Ukuran Maksimal</div>
                  <p className="text-slate-500 mt-0.5">Maksimal 10MB per unggahan (sekitar 5.000 baris data).</p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3.5">
                  <div className="font-semibold text-amber-900">Validasi Data</div>
                  <p className="text-amber-700 mt-0.5">Pastikan kolom NISN (10 digit) dan Nama tidak kosong.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Help Box matching Image 4 Bottom-Left */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <HelpCircle className="size-4 text-blue-600" />
                <span>Butuh Bantuan?</span>
              </div>
              <p className="text-xs text-slate-500">
                Unduh template standar kami untuk mempercepat proses impor data siswa.
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => downloadTemplate("xlsx")}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="size-5 text-emerald-600" />
                    <div>
                      <div>Template Excel (.xlsx)</div>
                      <div className="text-[11px] font-normal text-slate-400">Paling direkomendasikan</div>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-slate-400" />
                </button>

                <button
                  onClick={() => downloadTemplate("csv")}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="size-5 text-blue-600" />
                    <div>
                      <div>Template CSV (.csv)</div>
                      <div className="text-[11px] font-normal text-slate-400">Format ringan</div>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-slate-400" />
                </button>
              </div>

              <div className="rounded-lg bg-blue-50/70 p-3 text-xs text-blue-900 leading-relaxed border border-blue-100">
                Gunakan baris pertama sebagai nama kolom (header). Jangan biarkan ada baris kosong di tengah data.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview & Validation matching Image 4 Bottom-Right */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Summary Badges & Ready Banner */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs text-center min-w-[100px]">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">TOTAL BARIS</div>
                <div className="text-xl font-bold text-slate-800">{rows.length}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-xs text-center min-w-[100px]">
                <div className="text-[11px] font-semibold text-emerald-600 uppercase">DATA VALID</div>
                <div className="text-xl font-bold text-emerald-700">{validCount}</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-xs text-center min-w-[100px]">
                <div className="text-[11px] font-semibold text-rose-600 uppercase">BUTUH PERBAIKAN</div>
                <div className="text-xl font-bold text-rose-700">{errorCount}</div>
              </div>

              <button
                onClick={() => setFilterOnlyErrors(!filterOnlyErrors)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  filterOnlyErrors
                    ? "border-rose-400 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Filter className="size-3.5" />
                {filterOnlyErrors ? "Tampilkan Semua" : "Filter Error"}
              </button>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-xs text-blue-900 max-w-md">
              <strong>Siap diimpor?</strong> Pastikan data bertanda merah telah diperbaiki sebelum menekan konfirmasi penambahan.
            </div>
          </div>

          <div className="text-xs text-slate-400 italic">
            Klik pada sel untuk mengedit data secara langsung. Perubahan disimpan otomatis di pratinjau.
          </div>

          {/* Editable Preview Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">NISN</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Jurusan</th>
                  <th className="py-3 px-4">Jenis Kelamin</th>
                  <th className="py-3 px-4">Tempat Lahir</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedRows.map((r) => (
                  <tr key={r.index} className={`hover:bg-slate-50/80 ${!r.isValid ? "bg-rose-50/30" : ""}`}>
                    <td className="py-3 px-4 font-mono text-slate-400">{r.index}</td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={r.name}
                        onChange={(e) => handleCellChange(r.index, "name", e.target.value)}
                        className="w-full rounded border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent px-1.5 py-1 text-slate-900 font-medium"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={r.nisn}
                        onChange={(e) => handleCellChange(r.index, "nisn", e.target.value)}
                        className="w-28 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent px-1.5 py-1 font-mono text-slate-700"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={r.className}
                        onChange={(e) => handleCellChange(r.index, "className", e.target.value)}
                        className="w-24 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent px-1.5 py-1 text-slate-700"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700">{r.departmentCode}</span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={r.gender}
                        onChange={(e) => handleCellChange(r.index, "gender", e.target.value)}
                        className="rounded border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent px-1 py-1 text-slate-700"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={r.birthPlace || ""}
                        onChange={(e) => handleCellChange(r.index, "birthPlace", e.target.value)}
                        className="w-28 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent px-1.5 py-1 text-slate-700"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.isValid ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          <Check className="size-3" /> VALID
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-700"
                          title={r.errors.join(", ")}
                        >
                          <XCircle className="size-3" /> ERROR
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              Kembali ke Unggah
            </Button>
            <Button
              onClick={handleCommitImport}
              disabled={loading || validCount === 0}
              className="bg-blue-600 text-white hover:bg-blue-700 font-semibold"
            >
              {loading ? "Menyimpan ke Sistem..." : `Konfirmasi & Tambah (${validCount} Siswa Valid)`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Success Screen */}
      {step === 3 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">Impor Berhasil!</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Data siswa telah berhasil ditambahkan ke database sekolah dan akun login siswa telah otomatis dibuat.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/admin/students"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-xs"
            >
              Lihat Daftar Siswa
            </Link>
            <Button variant="outline" onClick={() => setStep(1)}>
              Impor File Lain
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
