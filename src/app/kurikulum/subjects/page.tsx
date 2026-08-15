"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  Table,
  TableBody,
  TableCell,
  TableHeadCell,
  TableHeader,
  TableRow,
  WorkspaceHeader,
} from "@/components/ui";

const subjects = [
  ["MAT", "Matematika", "Pak Budi", "Aktif"],
  ["FIS", "Fisika", "Bu Sari", "Aktif"],
];

export default function KurikulumSubjectsPage() {
  return (
    <div>
      <WorkspaceHeader
        eyebrow="Kurikulum"
        title="Mata Pelajaran"
        description="Kelola daftar mapel dan penugasan guru."
        action={
          <Button leftIcon={<Plus className="size-4" />}>
            Tambah Mapel
          </Button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeadCell>Kode</TableHeadCell>
            <TableHeadCell>Nama</TableHeadCell>
            <TableHeadCell>Guru</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell className="text-right">Aksi</TableHeadCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map(([code, name, teacher, status]) => (
            <TableRow key={code} interactive>
              <TableCell className="font-medium">{code}</TableCell>
              <TableCell>{name}</TableCell>
              <TableCell>{teacher}</TableCell>
              <TableCell><Badge variant="green">{status}</Badge></TableCell>
              <TableCell className="text-right">
                <DropdownMenu
                  trigger={
                    <Button variant="icon" aria-label={`Aksi ${name}`}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  }
                  items={[
                    { label: "Edit mapel" },
                    { label: "Atur guru" },
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
