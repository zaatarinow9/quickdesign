import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { db } from "@/lib/supabase/admin";
import { clientIpHash, isToken, userAgent } from "@/lib/security";
import { logConsent } from "@/lib/marketing/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anmeldung bestätigt", robots: { index: false, follow: false } };

async function confirm(token: string) {
  if (!isToken(token)) return false;
  const { data: c } = await db().from("customers").select("id, email, marketing_status, doi_sent_at").eq("doi_token", token).maybeSingle();
  if (!c) return false;
  // Bestätigungslinks sind 30 Tage gültig
  if (c.doi_sent_at && Date.now() - new Date(c.doi_sent_at).getTime() > 30 * 864e5) return false;
  await db().from("customers").update({ marketing_status: "bestaetigt", marketing_confirmed_at: new Date().toISOString(), doi_token: null }).eq("id", c.id);
  await logConsent(c.id, c.email, "bestaetigt", { source: "double_opt_in", ipHash: await clientIpHash(), userAgent: await userAgent() });
  return true;
}

export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ok = await confirm(token);
  return (
    <section className="flex min-h-[80svh] items-center bg-paper pt-[var(--header-h)]">
      <div className="container-x">
        <div className="mx-auto max-w-xl text-center">
          <span className={`mx-auto grid size-16 place-items-center rounded-full ${ok ? "bg-accent" : "bg-ink"} text-paper`}>
            {ok ? <Check className="size-7" aria-hidden /> : <X className="size-7" aria-hidden />}
          </span>
          <h1 className="display-md mt-8">{ok ? "Vielen Dank!" : "Link ungültig"}</h1>
          <p className="mt-5 text-lg text-stone-dark">
            {ok
              ? "Ihre Anmeldung ist bestätigt. Wir informieren Sie gelegentlich über Neuigkeiten und Aktionen. Sie können sich jederzeit über den Link in jeder E-Mail abmelden."
              : "Dieser Bestätigungslink ist ungültig, wurde bereits verwendet oder ist abgelaufen."}
          </p>
        </div>
      </div>
    </section>
  );
}
