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

const students = [
  ["Andi Pratama", "SIS001", "X-A", "Aktif", "92%"],
  ["Siti Rahma", "SIS002", "X-A", "Aktif", "88%"],
];

export default function GuruStudentsPage() {
  return (
    <div>
      <WorkspaceHeader
        eyebrow="Guru"
        title="Manajemen Siswa"
        description="Daftar siswa per kelas yang Anda ampu."
      />
      <ActionToolbar
        search={<SearchInput placeholder="Cari siswa..." />}
        filters={<Badge variant="purple">Kelas X-A</Badge>}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeadCell>Nama</TableHeadCell>
            <TableHeadCell>NIS</TableHeadCell>
            <TableHeadCell>Kelas</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell>Aktivitas</TableHeadCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map(([name, nis, className, status, activity]) => (
            <TableRow key={nis} interactive>
              <TableCell className="font-medium">{name}</TableCell>
              <TableCell>{nis}</TableCell>
              <TableCell>{className}</TableCell>
              <TableCell><Badge variant="green">{status}</Badge></TableCell>
              <TableCell>{activity}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
