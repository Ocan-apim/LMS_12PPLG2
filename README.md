# LMS Sekolah (Next.js + MongoDB)

Fondasi aplikasi E-Learning dengan **5 peran**: Admin, Guru, Kurikulum, Kepala Sekolah (Kepsek), dan Siswa.

Figma referensi: [E-learning Design](https://www.figma.com/design/5RQynqLyfWzbxm1BHf11nV/E-learning?node-id=0-1)

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- MongoDB + Mongoose
- Auth session JWT (cookie `lms_session`) via `jose`
- Validasi input dengan Zod

## Struktur utama

```text
src/
  app/
    login/                 # Halaman login
    admin/                 # Dashboard & halaman Admin
    guru/                  # Dashboard & halaman Guru
    kurikulum/             # Dashboard & halaman Kurikulum
    kepsek/                # Dashboard & halaman Kepsek
    siswa/                 # Dashboard & halaman Siswa
    api/auth/              # login, logout, me
  components/              # Layout, auth form, UI dasar
  lib/                     # mongodb, auth, roles, session helpers
  models/                  # User, Class, Subject, Material, Assignment, Submission
  middleware.ts            # Proteksi route per role
scripts/seed.ts            # Akun demo per role
```

## Setup

1. Pastikan MongoDB berjalan di lokal (atau ubah URI).
2. Salin env:

```bash
cp .env.example .env.local
```

3. Install & jalankan:

```bash
npm install
npm run seed
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Akun seed

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sekolah.sch.id | password123 |
| Guru | guru@sekolah.sch.id | password123 |
| Kurikulum | kurikulum@sekolah.sch.id | password123 |
| Kepsek | kepsek@sekolah.sch.id | password123 |
| Siswa | siswa@sekolah.sch.id | password123 |

## Yang sudah disiapkan

- Koneksi MongoDB (`src/lib/mongodb.ts`)
- Model data dasar LMS
- Login / logout / session
- Middleware proteksi path `/admin`, `/guru`, `/kurikulum`, `/kepsek`, `/siswa`
- Halaman HTML/UI skeleton per role (siap diisi logic & styling Figma)
- Komponen shell: sidebar, header, tabel placeholder, empty state

## Langkah development berikutnya

1. Samakan visual page dengan Figma (warna, spacing, komponen).
2. Tambah API CRUD (users, classes, materials, assignments).
3. Hubungkan dashboard stats ke query MongoDB.
4. Upload file materi/tugas (local storage atau S3/Cloudinary).
