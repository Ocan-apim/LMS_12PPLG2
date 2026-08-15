"use client";

import {
  ActionToolbar,
  Badge,
  SearchInput,
  Table,
  TableBody,
  TableCell,
  TableHeadCell,
  TableHeader,
  TableRow,
  WorkspaceHeader,
} from "@/components/ui";

const teachers = [
  ["Pak Budi", "GRU001", "Matematika", "X-A, XI-IPA 1", "Aktif"],
  ["Bu Sari", "GRU002", "Fisika", "XI-IPA 1", "Aktif"],
];

export default function KepsekTeachersPage() {
  return (
    <div>
      <WorkspaceHeader
        eyebrow="Kepsek"
        title="Guru"
        description="Daftar guru dan beban mengajar."
      />
      <ActionToolbar search={<SearchInput placeholder="Cari guru..." />} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeadCell>Nama</TableHeadCell>
            <TableHeadCell>NIP</TableHeadCell>
            <TableHeadCell>Mapel</TableHeadCell>
            <TableHeadCell>Kelas</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teachers.map(([name, nip, subject, classes, status]) => (
            <TableRow key={nip} interactive>
              <TableCell className="font-medium">{name}</TableCell>
              <TableCell>{nip}</TableCell>
              <TableCell>{subject}</TableCell>
              <TableCell>{classes}</TableCell>
              <TableCell><Badge variant="green">{status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
