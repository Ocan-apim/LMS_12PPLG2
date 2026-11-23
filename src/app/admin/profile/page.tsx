import { RoleProfileView } from "@/components/profile/RoleProfileView";

export const metadata = {
  title: "Profil Pengguna - Administrator | Learnix LMS",
  description: "Informasi profil dan pengaturan akun Administrator Sistem",
};

export default function AdminProfilePage() {
  return <RoleProfileView role="admin" />;
}
