import { Suspense } from "react";
import { LoginGateway } from "@/components/auth/LoginGateway";

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Memuat...</p>}>
      <LoginGateway />
    </Suspense>
  );
}
