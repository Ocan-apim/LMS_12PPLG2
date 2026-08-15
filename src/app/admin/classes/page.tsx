"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import {
  ActionToolbar,
  Badge,
  Button,
  DropdownMenu,
  SearchInput,
  SortableHeader,
  Table,
  TableBody,
  TableCell,
  TableHeadCell,
  TableHeader,
  TableRow,
  WorkspaceHeader,
} from "@/components/ui";

const classes = [
  ["X-A", "X", "2025/2026", "Bu Sari", "32"],
  ["XI-IPA 1", "XI", "2025/2026", "Pak Budi", "28"],
];

export default function AdminClassesPage() {
  return (
    <div>
      <WorkspaceHeader
        eyebrow="Admin"
        title="Kelas"
        description="Kelola data kelas, wali kelas, dan tahun ajaran."
        action={
          <Button leftIcon={<Plus className="size-4" />}>
            Tambah Kelas
          </Button>
        }
      />
      <ActionToolbar
        search={<SearchInput placeholder="Cari kelas..." />}
        filters={<Button variant="outline" size="sm">Tahun Ajaran</Button>}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader sorted="asc">Nama Kelas</SortableHeader>
            <TableHeadCell>Tingkat</TableHeadCell>
            <TableHeadCell>Tahun Ajaran</TableHeadCell>
            <TableHeadCell>Wali Kelas</TableHeadCell>
            <TableHeadCell>Siswa</TableHeadCell>
            <TableHeadCell className="text-right">Aksi</TableHeadCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map(([name, grade, year, teacher, students]) => (
            <TableRow key={name} interactive>
              <TableCell className="font-medium">{name}</TableCell>
              <TableCell>{grade}</TableCell>
              <TableCell>{year}</TableCell>
              <TableCell>{teacher}</TableCell>
              <TableCell><Badge variant="blue">{students} siswa</Badge></TableCell>
              <TableCell className="text-right">
                <DropdownMenu
                  trigger={
                    <Button variant="icon" aria-label={`Aksi ${name}`}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  }
                  items={[
                    { label: "Edit kelas" },
                    { label: "Lihat siswa" },
                  ]}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
