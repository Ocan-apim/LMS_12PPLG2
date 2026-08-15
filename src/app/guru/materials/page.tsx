"use client";

import { Download, MoreHorizontal, Plus } from "lucide-react";
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

const materials = [
  ["Bab 3 - Trigonometri.pdf", "X-A", "Matematika", "2.4 MB"],
  ["Slide Presentasi.pptx", "XI-IPA 1", "Fisika", "5.1 MB"],
];

export default function GuruMaterialsPage() {
  return (
    <div>
      <WorkspaceHeader
        eyebrow="Guru"
        title="File Kelas"
        description="Upload dan kelola materi pembelajaran."
        action={
          <Button leftIcon={<Plus className="size-4" />}>
            Upload Materi
          </Button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeadCell>Judul</TableHeadCell>
            <TableHeadCell>Kelas</TableHeadCell>
            <TableHeadCell>Mapel</TableHeadCell>
            <TableHeadCell>Ukuran</TableHeadCell>
            <TableHeadCell className="text-right">Aksi</TableHeadCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.map(([title, className, subject, size]) => (
            <TableRow key={title} interactive>
              <TableCell className="font-medium">{title}</TableCell>
              <TableCell><Badge variant="blue">{className}</Badge></TableCell>
              <TableCell>{subject}</TableCell>
              <TableCell>{size}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu
                  trigger={
                    <Button variant="icon" aria-label={`Aksi ${title}`}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  }
                  items={[
                    { label: "Download", icon: <Download className="size-4" /> },
                    { label: "Edit materi" },
                    { label: "Hapus", danger: true },
                  ]}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" leftIcon={<Download className="size-4" />}>
          Unduh Semua
        </Button>
      </div>
    </div>
  );
}
