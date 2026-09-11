import { FlavorTheme } from "~~/components/FlavorTheme";
import { AdminNav } from "~~/components/admin/AdminNav";

/** Flavor admin: operação da plataforma. Tema `admin-*`, sóbrio e denso. */
const AdminLayout = ({ children }: { children: React.ReactNode }) => (
  <FlavorTheme flavor="admin" className="flex flex-col min-h-[100dvh] bg-base-200">
    <AdminNav />
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">{children}</main>
  </FlavorTheme>
);

export default AdminLayout;
