import type { Metadata } from "next";
import { db } from "@/lib/supabase/admin";
import { isToken } from "@/lib/security";
import { unsubscribe } from "@/app/marketing-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Abmelden", robots: { index: false, follow: false } };

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const customer = isToken(token) ? (await db().from("customers").select("email, marketing_status").eq("unsubscribe_token", token).maybeSingle()).data : null;
  const done = customer?.marketing_status === "abgemeldet";
  return (
    <section className="flex min-h-[80svh] items-center bg-paper pt-[var(--header-h)]">
      <div className="container-x">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="display-md">{!customer ? "Link ungültig" : done ? "Sie sind abgemeldet" : "Von E-Mails abmelden"}</h1>
          <p className="mt-5 text-lg text-stone-dark">
            {!customer
              ? "Dieser Abmeldelink ist ungültig."
              : done
                ? "Sie erhalten keine Werbe-E-Mails mehr von uns. Schade, dass Sie gehen!"
                : `Möchten Sie für ${customer.email} keine Informationen und Angebote mehr per E-Mail erhalten?`}
          </p>
          {customer && !done ? (
            <form action={unsubscribe} className="mt-8">
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="inline-flex h-14 items-center rounded-full bg-ink px-8 font-medium text-paper transition-colors hover:bg-accent">
                Jetzt abmelden
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
