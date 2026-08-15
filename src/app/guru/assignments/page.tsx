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
  Tabs,
  WorkspaceHeader,
} from "@/components/ui";

const assignments = [
  ["Latihan Bab 3", "Tugas", "X-A", "10 Agu 2026", "24/32"],
  ["Quiz Trigonometri", "Quiz", "X-A", "12 Agu 2026", "18/32"],
];

export default function GuruAssignmentsPage() {
  return (
    <div className="space-y-4">
      <WorkspaceHeader
        eyebrow="Guru"
        title="Tugas & Quiz"
        description="Buat tugas, quiz, dan nilai pengumpulan siswa."
        action={
          <Button leftIcon={<Plus className="size-4" />}>
            Buat Tugas
          </Button>
        }
      />
      <Tabs
        value="aktif"
        items={[
          { value: "aktif", label: "Aktif", count: 2 },
          { value: "draft", label: "Draft", count: 1 },
          { value: "selesai", label: "Selesai", count: 8 },
        ]}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeadCell>Judul</TableHeadCell>
            <TableHeadCell>Tipe</TableHeadCell>
            <TableHeadCell>Kelas</TableHeadCell>
            <TableHeadCell>Deadline</TableHeadCell>
            <TableHeadCell>Pengumpulan</TableHeadCell>
            <TableHeadCell className="text-right">Aksi</TableHeadCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map(([title, type, className, deadline, submitted]) => (
            <TableRow key={title} interactive>
              <TableCell className="font-medium">{title}</TableCell>
              <TableCell><Badge variant={type === "Quiz" ? "purple" : "orange"}>{type}</Badge></TableCell>
              <TableCell>{className}</TableCell>
              <TableCell>{deadline}</TableCell>
              <TableCell>{submitted}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu
                  trigger={
                    <Button variant="icon" aria-label={`Aksi ${title}`}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  }
                  items={[
                    { label: "Edit" },
                    { label: "Lihat pengumpulan" },
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
