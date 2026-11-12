import { hasFullAccess, requireAdmin, roleLabels } from "@/lib/auth";
import { countNewInquiries } from "@/lib/admin/stats";
import { signOut } from "@/app/admin/auth-actions";
import { Sidebar } from "@/components/admin/Sidebar";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const newInquiries = await countNewInquiries();
  return (
    <div className="min-h-dvh lg:pl-[17rem] print:pl-0">
      <Sidebar
        fullAccess={hasFullAccess(admin.role)}
        newInquiries={newInquiries}
        user={{ name: admin.name ?? admin.email, email: admin.email, role: roleLabels[admin.role] }}
        signOut={signOut}
      />
      <main className="mx-auto w-full max-w-[88rem] px-4 py-7 sm:px-7 lg:px-10 lg:py-10 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
