import { hasFullAccess, requireAdmin, roleLabels } from "@/lib/auth";
import { countNewInquiries } from "@/lib/admin/stats";
import { myOpenTaskCount } from "@/lib/tasks/server";
import { signOut } from "@/app/admin/auth-actions";
import { Sidebar } from "@/components/admin/Sidebar";
import { AdminLive } from "@/components/admin/AdminLive";
import { FeedbackProvider } from "@/components/admin/feedback";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { NavProgress } from "@/components/admin/NavProgress";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function PanelLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const [admin, newInquiries] = await Promise.all([requireAdmin(), countNewInquiries()]);
  const openTasks = await myOpenTaskCount(admin.email);
  return (
    <FeedbackProvider>
      <div className="min-h-dvh lg:pl-[17rem] print:pl-0">
        <Sidebar
          fullAccess={hasFullAccess(admin.role)}
          newInquiries={newInquiries}
          openTasks={openTasks}
          user={{
            name: admin.name ?? admin.email,
            email: admin.email,
            role: roleLabels[admin.role],
          }}
          signOut={signOut}
        />
        <AdminLive
          url={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
          anonKey={process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ""}
        />
        <main className="w-full max-w-[120rem] px-4 py-6 sm:px-6 lg:px-7 lg:py-7 print:max-w-none print:p-0">
          {children}
        </main>
        {modal}
        <CommandPalette />
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
      </div>
    </FeedbackProvider>
  );
}
