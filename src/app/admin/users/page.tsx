"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import {
  ActionToolbar,
  Badge,
  Button,
  DropdownMenu,
  Pagination,
  SearchInput,
  SortableHeader,
  Table,
  TableBody,
  TableCell,
  TableHeadCell,
  TableHeader,
  TableRow,
  Tabs,
  WorkspaceHeader,
} from "@/components/ui";

const users = [
  ["Admin Sekolah", "admin@sekolah.sch.id", "Admin", "Aktif"],
  ["Guru Matematika", "guru@sekolah.sch.id", "Guru", "Aktif"],
  ["Siswa Demo", "siswa@sekolah.sch.id", "Siswa", "Aktif"],
];

export default function AdminUsersPage() {
  return (
    <div className="space-y-4">
      <WorkspaceHeader
        eyebrow="Admin"
        title="Manajemen Pengguna"
        description="Kelola akun Admin, Guru, Kurikulum, Kepsek, dan Siswa."
        action={
          <Button leftIcon={<Plus className="size-4" />}>
            Tambah Pengguna
          </Button>
        }
      />
      <Tabs
        items={[
          { value: "all", label: "Semua", count: 248 },
          { value: "guru", label: "Guru", count: 32 },
          { value: "siswa", label: "Siswa", count: 216 },
          { value: "staf", label: "Staf", count: 5 },
        ]}
        value="all"
      />
      <ActionToolbar
        search={<SearchInput placeholder="Cari nama atau email..." />}
        filters={
          <>
            <Button variant="outline" size="sm">Role</Button>
            <Button variant="outline" size="sm">Status</Button>
          </>
        }
      />
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader sorted="asc">Nama</SortableHeader>
              <TableHeadCell>Email</TableHeadCell>
              <TableHeadCell>Role</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell className="text-right">Aksi</TableHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(([name, email, role, status]) => (
              <TableRow key={email} interactive>
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell>{email}</TableCell>
                <TableCell>{role}</TableCell>
                <TableCell>
                  <Badge variant="green">{status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu
                    trigger={
                      <Button variant="icon" aria-label={`Aksi ${name}`}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    }
                    items={[
                      {
                        label: "Edit pengguna",
                        description: "Ubah profil dan role",
                      },
                      { label: "Nonaktifkan", danger: true },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination page={1} pageCount={12} />
      </div>
    </div>
  );
}
