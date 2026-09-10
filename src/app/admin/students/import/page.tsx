"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Filter,
  ChevronDown,
  AlertCircle,
  X,
} from "lucide-react";
import { Button, Spinner } from "@/components/ui";
import * as XLSX from "xlsx";

interface PreviewRow {
  index: number;
  name: string;
  nisn: string;
  kelas: string;
  jurusan: string;
  rombel: string;
  kelamin: string;
  tempatLahir: string;
  tanggalLahir: string;
  status: "VALID" | "ERROR";
  isValid: boolean;
  errors: string[];
  fieldErrors: {
    name?: string;
    nisn?: string;
    kelas?: string;
    jurusan?: string;
    rombel?: string;
    kelamin?: string;
    tempatLahir?: string;
    tanggalLahir?: string;
  };
}

function formatToDMY(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, "0");
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }
  if (typeof val === "number" && val > 20000 && val < 60000) {
    const date = new Date((val - (25567 + 2)) * 86400 * 1000);
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-");
    return `${d}/${m}/${y}`;
  }
  return str;
}

const FIELD_NAMES_ID: Record<string, string> = {
  name: "namasiswa",
  nisn: "nisn",
  kelas: "kelas",
  jurusan: "jurusan",
  rombel: "rombel",
  kelamin: "kelamin",
  tempatLahir: "tempatlahir",
  tanggalLahir: "tanggallahir",
};

function validateRowData(r: {
  name: string;
  nisn: string;
  kelas: string;
  jurusan: string;
  rombel: string;
  kelamin: string;
  tempatLahir: string;
  tanggalLahir: string;
}) {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};

  // 1. Nama
  if (!r.name?.trim()) {
    errors.push("Nama siswa wajib diisi");
    fieldErrors.name = "Nama wajib diisi";
  }

  // 2. NISN
  const cleanNisn = r.nisn?.toString().trim() || "";
  if (!cleanNisn) {
    errors.push("NISN wajib diisi");
    fieldErrors.nisn = "NISN wajib diisi";
  } else if (!/^\d{10}$/.test(cleanNisn)) {
    errors.push("NISN harus tepat 10 digit angka");
    fieldErrors.nisn = "NISN harus 10 digit";
  }

  // 3. Kelas (X, XI, XII)
  const k = r.kelas?.toString().trim().toUpperCase();
  if (!k) {
    errors.push("Kelas wajib diisi");
    fieldErrors.kelas = "Kelas wajib diisi";
  } else if (k !== "X" && k !== "XI" && k !== "XII") {
    errors.push("Kelas harus X, XI, atau XII");
    fieldErrors.kelas = "Harus X, XI, atau XII";
  }

  // 4. Jurusan
  if (!r.jurusan?.trim()) {
    errors.push("Jurusan wajib diisi");
    fieldErrors.jurusan = "Jurusan wajib diisi";
  }

  // 5. Rombel
  const rombelNum = parseInt(r.rombel?.toString().trim(), 10);
  if (!r.rombel?.toString().trim()) {
    errors.push("Rombel wajib diisi");
    fieldErrors.rombel = "Rombel wajib diisi";
  } else if (isNaN(rombelNum) || rombelNum < 1) {
    errors.push("Rombel harus berupa angka rombel");
    fieldErrors.rombel = "Harus berupa angka";
  }

  // 6. Kelamin
  const g = r.kelamin?.toString().trim();
  if (!g) {
    errors.push("Jenis kelamin wajib diisi");
    fieldErrors.kelamin = "Jenis kelamin wajib diisi";
  } else if (g !== "Laki-laki" && g !== "Perempuan") {
    errors.push("Jenis kelamin harus Laki-laki atau Perempuan");
    fieldErrors.kelamin = "Harus Laki-laki / Perempuan";
  }

  // 7. Tempat Lahir
  if (!r.tempatLahir?.trim()) {
    errors.push("Tempat lahir wajib diisi");
    fieldErrors.tempatLahir = "Tempat lahir wajib diisi";
  }

  // 8. Tanggal Lahir (day-month-year)
  const dmy = r.tanggalLahir?.toString().trim();
  if (!dmy) {
    errors.push("Tanggal lahir wajib diisi");
    fieldErrors.tanggalLahir = "Tanggal lahir wajib diisi";
  } else {
    const match = dmy.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (!match) {
      errors.push("Format tanggal lahir harus DD/MM/YYYY (contoh: 29/02/2000)");
      fieldErrors.tanggalLahir = "Format harus DD/MM/YYYY";
    } else {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1950 || year > 2030) {
        errors.push("Tanggal kalender tidak valid");
        fieldErrors.tanggalLahir = "Tanggal tidak valid";
      } else {
        const dt = new Date(Date.UTC(year, month - 1, day));
        if (dt.getUTCDate() !== day || dt.getUTCMonth() !== month - 1) {
          errors.push("Tanggal kalender tidak valid");
          fieldErrors.tanggalLahir = "Tanggal tidak valid";
        }
      }
    }
  }

  const isValid = errors.length === 0;
  return {
    isValid,
    status: isValid ? ("VALID" as const) : ("ERROR" as const),
    errors,
    fieldErrors,
  };
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
  const [showErrorAlertModal, setShowErrorAlertModal] = useState(false);

  // Drag state
  const [dragActive, setDragActive] = useState(false);

  // Template generators matching required format
  function downloadTemplate(type: "csv" | "xlsx") {
    if (type === "xlsx") {
      const templateData = [
        ["name", "nisn", "kelas", "jurusan", "rombel", "kelamin", "tempatLahir", "TanggalLahir"],
        ["Ahmad Dahlan", "0102938475", "XII", "PPLG", "2", "Laki-laki", "Yogyakarta", "29/02/2000"],
        ["Siti Nurbaya", "0098273651", "XI", "PPLG", "1", "Perempuan", "Padang", "20/08/2008"],
        ["Bambang Pamungkas", "0092837465", "XII", "PPLG", "2", "Laki-laki", "Salatiga", "15/11/2007"],
        ["Raden Ajeng Kartini", "0083746592", "X", "PPLG", "1", "Perempuan", "Jepara", "21/04/2009"],
      ];
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
      XLSX.writeFile(wb, "template_impor_siswa_learnix.xlsx");
    } else {
      const csvContent =
        "name;nisn;kelas;jurusan;rombel;kelamin;tempatLahir;TanggalLahir\n" +
        "Ahmad Dahlan;0102938475;XII;PPLG;2;Laki-laki;Yogyakarta;29/02/2000\n" +
        "Siti Nurbaya;0098273651;XI;PPLG;1;Perempuan;Padang;20/08/2008\n" +
        "Bambang Pamungkas;0092837465;XII;PPLG;2;Laki-laki;Salatiga;15/11/2007\n" +
        "Raden Ajeng Kartini;0083746592;X;PPLG;1;Perempuan;Jepara;21/04/2009\n";

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "template_impor_siswa_learnix.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  async function handleFileUpload(file: File) {
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];

      if (!rawData || rawData.length < 2) {
        alert("File kosong atau tidak memiliki baris data setelah baris header.");
        setLoading(false);
        return;
      }

      // Check if semicolon-separated CSV parsed into a single column
      let processedRows = rawData;
      if (
        processedRows.length > 0 &&
        processedRows[0].length === 1 &&
        typeof processedRows[0][0] === "string" &&
        processedRows[0][0].includes(";")
      ) {
        processedRows = processedRows.map((row) =>
          typeof row[0] === "string" ? row[0].split(";") : row
        );
      }

      // Filter out completely empty trailing lines (e.g. ;;;;;;;;;;;)
      processedRows = processedRows.filter((row) =>
        row.some((cell) => cell !== undefined && cell !== null && cell.toString().trim().length > 0)
      );

      if (processedRows.length < 2) {
        alert("File tidak memiliki baris data setelah header.");
        setLoading(false);
        return;
      }

      // Parse header row
      const headerCells = processedRows[0].map((h) =>
        (h || "").toString().toLowerCase().replace(/[\s_-]/g, "")
      );

      const findColIndex = (...aliases: string[]) => {
        for (const alias of aliases) {
          const idx = headerCells.findIndex((h: string) => h === alias || h.includes(alias));
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const nameIdx = findColIndex("name", "nama", "namalengkap");
      const nisnIdx = findColIndex("nisn");
      const kelasIdx = findColIndex("kelas", "tingkat", "grade");
      const jurusanIdx = findColIndex("jurusan", "department", "kejuruan", "dept");
      const rombelIdx = findColIndex("rombel", "parallel", "paralel");
      const kelaminIdx = findColIndex("kelamin", "gender", "jeniskelamin");
      const tempatLahirIdx = findColIndex("tempatlahir", "tempat", "birthplace");
      const tanggalLahirIdx = findColIndex("tanggallahir", "tanggal", "birthdate", "tgl");

      const parsedRows: Array<{
        name: string;
        nisn: string;
        kelas: string;
        jurusan: string;
        rombel: string;
        kelamin: string;
        tempatLahir: string;
        tanggalLahir: string;
      }> = [];

      for (let i = 1; i < processedRows.length; i++) {
        const row = processedRows[i];
        const getVal = (idx: number, fallbackCol: number) => {
          const val = idx !== -1 ? row[idx] : row[fallbackCol];
          return val !== undefined && val !== null ? val : "";
        };

        const rawKelas = getVal(kelasIdx, 2).toString().trim();
        let normalizedKelas = rawKelas.toUpperCase();
        if (normalizedKelas === "10") normalizedKelas = "X";
        else if (normalizedKelas === "11") normalizedKelas = "XI";
        else if (normalizedKelas === "12") normalizedKelas = "XII";

        const rawKelamin = getVal(kelaminIdx, 5).toString().trim();
        let normalizedKelamin = rawKelamin;
        const lowerKelamin = rawKelamin.toLowerCase();
        if (lowerKelamin === "laki-laki" || lowerKelamin === "l" || lowerKelamin === "pria" || lowerKelamin === "male") {
          normalizedKelamin = "Laki-laki";
        } else if (lowerKelamin === "perempuan" || lowerKelamin === "p" || lowerKelamin === "wanita" || lowerKelamin === "female") {
          normalizedKelamin = "Perempuan";
        }

        parsedRows.push({
          name: getVal(nameIdx, 0).toString().trim(),
          nisn: getVal(nisnIdx, 1).toString().trim(),
          kelas: normalizedKelas,
          jurusan: getVal(jurusanIdx, 3).toString().trim().toUpperCase(),
          rombel: getVal(rombelIdx, 4).toString().trim(),
          kelamin: normalizedKelamin,
          tempatLahir: getVal(tempatLahirIdx, 6).toString().trim(),
          tanggalLahir: formatToDMY(getVal(tanggalLahirIdx, 7)),
        });
      }

      // Call server validation API
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
        alert(json.message || "Gagal memproses validasi berkas.");
      }
    } catch (err) {
      console.error("Gagal membaca berkas:", err);
      alert("Terjadi kesalahan saat membaca berkas. Pastikan file menggunakan format Excel atau CSV yang valid.");
    } finally {
      setLoading(false);
    }
  }

  // Cell edit in preview table with instant dynamic re-validation
  function handleCellChange(index: number, field: keyof PreviewRow, val: string) {
    setRows((prev) => {
      const updated = prev.map((r) => {
        if (r.index === index) {
          let cleanVal = val;
          // Auto-normalize kelas if typed as 10/11/12
          if (field === "kelas") {
            const upper = val.trim().toUpperCase();
            if (upper === "10") cleanVal = "X";
            else if (upper === "11") cleanVal = "XI";
            else if (upper === "12") cleanVal = "XII";
            else cleanVal = upper;
          }

          const nextRow = { ...r, [field]: cleanVal };
          const validation = validateRowData(nextRow);
          return {
            ...nextRow,
            isValid: validation.isValid,
            status: validation.status,
            errors: validation.errors,
            fieldErrors: validation.fieldErrors,
          };
        }
        return r;
      });

      // Recalculate summary counts
      const valid = updated.filter((r) => r.isValid).length;
      setValidCount(valid);
      setErrorCount(updated.length - valid);

      return updated;
    });
  }

  async function handleCommitImport() {
    if (errorCount > 0) {
      setShowErrorAlertModal(true);
      return;
    }

    setLoading(true);
    try {
      const validRows = rows.filter((r) => r.isValid);
      if (validRows.length === 0) {
        alert("Tidak ada baris siswa yang berstatus VALID untuk disimpan.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows, mode: "commit" }),
      });
      const json = await res.json();
      if (json.success) {
        setStep(3);
      } else {
        alert(json.message || "Gagal menyimpan data impor.");
      }
    } catch {
      alert("Terjadi kesalahan saat menyimpan data ke sistem.");
    } finally {
      setLoading(false);
    }
  }

  const displayedRows = filterOnlyErrors ? rows.filter((r) => !r.isValid) : rows;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
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
        <p className="text-xs text-slate-500">
          Unggah data siswa menggunakan format Excel (.xlsx) atau CSV dengan validasi otomatis sesuai standar kurikulum.
        </p>
      </div>

      {/* Stepper */}
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

      {/* Step 1: Upload File */}
      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-800">Langkah 1: Unggah Berkas</h2>
              <p className="text-xs text-slate-500 mt-1">
                Pastikan file Anda menggunakan format yang didukung (.xlsx, .xls, atau .csv) agar data dapat divalidasi dengan baik oleh sistem.
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
                  Mendukung file Microsoft Excel (.xlsx, .xls) dan Comma/Semicolon Separated Values (.csv)
                </p>

                <label className="mt-5 cursor-pointer rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs transition">
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <Spinner size="sm" /> Memproses...
                    </span>
                  ) : (
                    "PILIH BERKAS"
                  )}
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    disabled={loading}
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
                  <div className="font-semibold text-slate-800">Ketentuan Tipe Data</div>
                  <p className="text-slate-500 mt-0.5">
                    <strong>Kelas:</strong> Menggunakan salah satu dari <code>X</code>, <code>XI</code>, <code>XII</code>.<br />
                    <strong>Tanggal Lahir:</strong> Menggunakan format hari-bulan-tahun (contoh: <code>29/02/2000</code>).
                  </p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3.5">
                  <div className="font-semibold text-amber-900">Validasi NISN & Kelamin</div>
                  <p className="text-amber-700 mt-0.5">
                    NISN harus tepat 10 digit angka unik. Kolom Jenis Kelamin harus berupa <code>Laki-laki</code> atau <code>Perempuan</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Help Box */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <HelpCircle className="size-4 text-blue-600" />
                <span>Template Resmi Impor</span>
              </div>
              <p className="text-xs text-slate-500">
                Unduh template resmi berikut untuk memastikan nama kolom dan tipe data sesuai standar sistem.
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
                      <div className="text-[11px] font-normal text-slate-400">Format pemisah titik-koma</div>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-slate-400" />
                </button>
              </div>

              <div className="rounded-lg bg-blue-50/70 p-3 text-xs text-blue-900 leading-relaxed border border-blue-100">
                <strong>Struktur Header:</strong><br />
                <code>name;nisn;kelas;jurusan;rombel;kelamin;tempatLahir;TanggalLahir</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview & Validation (Matching Mockup Screenshot) */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Summary Badges & Filter Bar */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-xs text-center min-w-[100px]">
                <div className="text-[10px] font-semibold text-slate-400 uppercase">TOTAL BARIS</div>
                <div className="text-lg font-bold text-slate-800">{rows.length}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 shadow-xs text-center min-w-[100px]">
                <div className="text-[10px] font-semibold text-emerald-600 uppercase">DATA VALID</div>
                <div className="text-lg font-bold text-emerald-700">{validCount}</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 shadow-xs text-center min-w-[100px]">
                <div className="text-[10px] font-semibold text-rose-600 uppercase">BUTUH PERBAIKAN</div>
                <div className="text-lg font-bold text-rose-700">{errorCount}</div>
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
                {filterOnlyErrors ? "Tampilkan Semua Baris" : "Filter Hanya Error"}
              </button>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 max-w-md">
              <strong>Koreksi Data Langsung:</strong> Klik pada sel yang berbingkai merah untuk mengoreksi data secara langsung di tabel. Status baris akan otomatis diperbarui.
            </div>
          </div>

          {/* Validation Table Matching Screenshot */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                  <th className="py-3.5 px-3 w-12 text-center">NO</th>
                  <th className="py-3.5 px-4 min-w-[180px]">NAMA LENGKAP</th>
                  <th className="py-3.5 px-3 min-w-[130px] text-center">NISN</th>
                  <th className="py-3.5 px-3 min-w-[90px] text-center">KELAS</th>
                  <th className="py-3.5 px-3 min-w-[100px]">JURUSAN</th>
                  <th className="py-3.5 px-3 min-w-[80px] text-center">ROMBEL</th>
                  <th className="py-3.5 px-4 min-w-[140px]">JENIS KELAMIN</th>
                  <th className="py-3.5 px-4 min-w-[130px]">TEMPAT LAHIR</th>
                  <th className="py-3.5 px-3 min-w-[120px] text-center">TANGGAL LAHIR</th>
                  <th className="py-3.5 px-4 min-w-[100px] text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedRows.map((r) => {
                  const hasNameError = Boolean(r.fieldErrors?.name);
                  const hasNisnError = Boolean(r.fieldErrors?.nisn);
                  const hasKelasError = Boolean(r.fieldErrors?.kelas);
                  const hasJurusanError = Boolean(r.fieldErrors?.jurusan);
                  const hasRombelError = Boolean(r.fieldErrors?.rombel);
                  const hasKelaminError = Boolean(r.fieldErrors?.kelamin);
                  const hasTempatError = Boolean(r.fieldErrors?.tempatLahir);
                  const hasTanggalError = Boolean(r.fieldErrors?.tanggalLahir);

                  return (
                    <tr
                      key={r.index}
                      className={`hover:bg-slate-50/80 transition ${
                        !r.isValid ? "bg-rose-50/20" : ""
                      }`}
                    >
                      {/* NO */}
                      <td className="py-3 px-3 font-mono text-slate-400 text-center font-medium">
                        {r.index}
                      </td>

                      {/* NAMA LENGKAP */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={r.name}
                          placeholder={hasNameError ? "INVALID" : ""}
                          onChange={(e) => handleCellChange(r.index, "name", e.target.value)}
                          className={`w-full rounded-md px-2 py-1 text-xs font-medium transition ${
                            hasNameError
                              ? "border border-rose-300 bg-rose-50/80 text-rose-700 font-semibold focus:outline-rose-500 placeholder-rose-400"
                              : "border border-transparent bg-transparent hover:border-slate-300 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                          }`}
                        />
                      </td>

                      {/* NISN */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="text"
                          maxLength={10}
                          value={r.nisn}
                          placeholder={hasNisnError ? "INVALID" : ""}
                          onChange={(e) =>
                            handleCellChange(r.index, "nisn", e.target.value.replace(/\D/g, ""))
                          }
                          className={`w-28 text-center rounded-md px-2 py-1 text-xs font-mono transition ${
                            hasNisnError
                              ? "border border-rose-300 bg-rose-50/80 text-rose-700 font-semibold focus:outline-rose-500 placeholder-rose-400"
                              : "border border-transparent bg-transparent hover:border-slate-300 text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                          }`}
                        />
                      </td>

                      {/* KELAS (X, XI, XII) */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="text"
                          value={r.kelas}
                          placeholder={hasKelasError ? "INVALID" : ""}
                          onChange={(e) => handleCellChange(r.index, "kelas", e.target.value)}
                          className={`w-20 text-center rounded-md px-2 py-1 text-xs uppercase font-medium transition ${
                            hasKelasError
                              ? "border border-rose-300 bg-rose-50/80 text-rose-700 font-semibold focus:outline-rose-500 placeholder-rose-400"
                              : "border border-transparent bg-transparent hover:border-slate-300 text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                          }`}
                        />
                      </td>

                      {/* JURUSAN */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={r.jurusan}
                          placeholder={hasJurusanError ? "INVALID" : ""}
                          onChange={(e) =>
                            handleCellChange(r.index, "jurusan", e.target.value.toUpperCase())
                          }
                          className={`w-20 rounded-md px-2 py-1 text-xs uppercase font-medium transition ${
                            hasJurusanError
                              ? "border border-rose-300 bg-rose-50/80 text-rose-700 font-semibold focus:outline-rose-500 placeholder-rose-400"
                              : "border border-transparent bg-transparent hover:border-slate-300 text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                          }`}
                        />
                      </td>

                      {/* ROMBEL */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="text"
                          maxLength={3}
                          value={r.rombel}
                          placeholder={hasRombelError ? "INVALID" : ""}
                          onChange={(e) =>
                            handleCellChange(r.index, "rombel", e.target.value.replace(/\D/g, ""))
                          }
                          className={`w-14 text-center rounded-md px-2 py-1 text-xs font-medium transition ${
                            hasRombelError
                              ? "border border-rose-300 bg-rose-50/80 text-rose-700 font-semibold focus:outline-rose-500 placeholder-rose-400"
                              : "border border-transparent bg-transparent hover:border-slate-300 text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                          }`}
                        />
                      </td>

                      {/* JENIS KELAMIN with dropdown indicator matching screenshot */}
                      <td className="py-3 px-4">
                        <div className="relative inline-block w-full">
                          <select
                            value={r.kelamin || ""}
                            onChange={(e) => handleCellChange(r.index, "kelamin", e.target.value)}
                            className={`w-full appearance-none rounded-md px-2.5 py-1 text-xs transition cursor-pointer pr-6 font-medium ${
                              hasKelaminError || !r.kelamin
                                ? "border border-rose-300 bg-rose-50/80 text-rose-700 font-semibold focus:outline-rose-500"
                                : "border border-transparent bg-transparent hover:border-slate-300 text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                            }`}
                          >
                            {(!r.kelamin ||
                              (r.kelamin !== "Laki-laki" && r.kelamin !== "Perempuan")) && (
                              <option value="" disabled className="text-rose-600 font-semibold">
                                INVALID
                              </option>
                            )}
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                        </div>
                      </td>

                      {/* TEMPAT LAHIR */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={r.tempatLahir}
                          placeholder={hasTempatError ? "INVALID" : ""}
                          onChange={(e) => handleCellChange(r.index, "tempatLahir", e.target.value)}
                          className={`w-28 rounded-md px-2 py-1 text-xs transition ${
                            hasTempatError
                              ? "border border-rose-300 bg-rose-50/80 text-rose-700 font-semibold focus:outline-rose-500 placeholder-rose-400"
                              : "border border-transparent bg-transparent hover:border-slate-300 text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                          }`}
                        />
                      </td>

                      {/* TANGGAL LAHIR */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="text"
                          value={r.tanggalLahir}
                          placeholder="DD/MM/YYYY"
                          onChange={(e) =>
                            handleCellChange(r.index, "tanggalLahir", e.target.value)
                          }
                          className={`w-28 text-center rounded-md px-2 py-1 text-xs font-mono transition ${
                            hasTanggalError
                              ? "border border-rose-300 bg-rose-50/80 text-rose-700 font-semibold focus:outline-rose-500 placeholder-rose-400"
                              : "border border-transparent bg-transparent hover:border-slate-300 text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                          }`}
                        />
                      </td>

                      {/* STATUS (Pill Badge matching screenshot) */}
                      <td className="py-3 px-4 text-center">
                        {r.status === "VALID" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 whitespace-nowrap">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            VALID
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 whitespace-nowrap cursor-help"
                            title={r.errors.join(" • ")}
                          >
                            <span className="size-1.5 rounded-full bg-rose-500" />
                            ERROR
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              Kembali ke Unggah
            </Button>
            <div className="flex items-center gap-3">
              {errorCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowErrorAlertModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 underline"
                >
                  <AlertCircle className="size-4" />
                  Lihat {errorCount} Peringatan Data Invalid
                </button>
              )}
              <Button
                onClick={handleCommitImport}
                disabled={loading || rows.length === 0}
                className={`font-semibold shadow-xs transition ${
                  errorCount > 0
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" /> Menyimpan ke Sistem...
                  </span>
                ) : errorCount > 0 ? (
                  `Periksa & Perbaiki (${errorCount} Error)`
                ) : (
                  `Konfirmasi & Tambah (${validCount} Siswa Valid)`
                )}
              </Button>
            </div>
          </div>

          {/* Centered Modal Peringatan Card Invalid */}
          {showErrorAlertModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                      <AlertCircle className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Peringatan Data Siswa Invalid
                      </h3>
                      <p className="text-xs text-slate-500">
                        Impor tidak dapat dilanjutkan sebelum seluruh data valid
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowErrorAlertModal(false)}
                    className="text-slate-400 hover:text-slate-600 transition"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-slate-600 mb-3">
                    Sistem mendeteksi <strong>{errorCount}</strong> baris data yang belum lengkap atau formatnya tidak sesuai ketentuan:
                  </p>

                  <div className="max-h-64 overflow-y-auto space-y-2 rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                    {rows
                      .filter((r) => !r.isValid)
                      .flatMap((r) => {
                        const errFields = Object.keys(r.fieldErrors || {});
                        const studentName = r.name?.trim() || `Baris ${r.index}`;
                        if (errFields.length === 0) {
                          return [`Data "${studentName}" bagian "data" invalid!`];
                        }
                        return errFields.map(
                          (f) => `Data "${studentName}" bagian "${FIELD_NAMES_ID[f] || f}" invalid!`
                        );
                      })
                      .map((msg, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-xs border border-rose-200"
                        >
                          <span className="size-2 shrink-0 rounded-full bg-rose-500" />
                          <span className="break-words">{msg}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-[11px] text-slate-400">
                    Klik pada sel merah di tabel untuk mengedit data langsung
                  </span>
                  <Button
                    onClick={() => {
                      setShowErrorAlertModal(false);
                      setFilterOnlyErrors(true);
                    }}
                    className="bg-blue-600 text-white hover:bg-blue-700 font-semibold text-xs"
                  >
                    Tutup & Perbaiki Data
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Success Screen */}
      {step === 3 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">Impor Data Siswa Berhasil!</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Semua data siswa yang valid telah berhasil ditambahkan ke dalam database sekolah, dan akun login siswa telah otomatis aktif.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/admin/students"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-xs transition"
            >
              Lihat Daftar Siswa
            </Link>
            <Button variant="outline" onClick={() => setStep(1)}>
              Impor Berkas Lain
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
