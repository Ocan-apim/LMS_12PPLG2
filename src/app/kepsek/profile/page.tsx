import { RoleProfileView } from "@/components/profile/RoleProfileView";

export const metadata = {
  title: "Profil Pengguna - Kepala Sekolah | Learnix LMS",
  description: "Informasi profil resmi Kepala Sekolah (Hanya-Baca)",
};

export default function KepsekProfilePage() {
  return <RoleProfileView role="kepsek" />;
}
