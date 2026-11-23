import { hasFullAccess, requireAdmin, roleLabels } from "@/lib/auth";
import { countNewInquiries } from "@/lib/admin/stats";
import { taskBadge } from "@/lib/tasks/server";
import { getNotifications } from "@/lib/admin/notifications";
import { db } from "@/lib/supabase/admin";
import { runningEntry } from "@/lib/time/server";
import { customerOptionsForFolders } from "@/lib/files/server";
import { TimerDock } from "@/components/admin/time/TimerDock";
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
  const [tasks, running, customers, notifications, { data: profile }] = await Promise.all([
    taskBadge(admin.email),
    runningEntry(admin.email),
    customerOptionsForFolders(),
    getNotifications(admin.email),
    db().from("staff_profiles").select("avatar_url, display_name").eq("email", admin.email.toLowerCase()).maybeSingle(),
  ]);
  return (
    <FeedbackProvider>
      <div className="min-h-dvh lg:pl-[17rem] print:pl-0">
        <Sidebar
          fullAccess={hasFullAccess(admin.role)}
          newInquiries={newInquiries}
          openTasks={tasks.open}
          unreadTasks={tasks.unread.length}
          notifications={notifications}
          user={{ name: profile?.display_name || admin.name || admin.email, email: admin.email, role: roleLabels[admin.role], avatar: profile?.avatar_url ?? null }}
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
        <TimerDock running={running} customers={customers} />
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
      </div>
    </FeedbackProvider>
  );
}
