"use server";

import { revalidatePath } from "next/cache";
import { assertFullAccess } from "@/lib/auth";
import { logActivity } from "@/lib/admin/log";
import { getSettings, saveSettings } from "@/lib/settings/server";
import { settingsSchema } from "@/lib/settings/schema";
import type { ActionState } from "./document-actions";

export async function updateSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertFullAccess();
  const current = await getSettings();
  const str = (k: string) => String(fd.get(k) ?? "");
  const int = (k: string, fallback: number) => {
    const n = Number.parseInt(str(k), 10);
    return Number.isFinite(n) ? n : fallback;
  };
  const next = settingsSchema.safeParse({
    company: {
      name: str("company.name"),
      owner: str("company.owner"),
      street: str("company.street"),
      postalCode: str("company.postalCode"),
      city: str("company.city"),
      country: str("company.country") || "Deutschland",
      phone: str("company.phone"),
      email: str("company.email"),
      website: str("company.website"),
      vatId: str("company.vatId"),
      taxNumber: str("company.taxNumber"),
      register: str("company.register"),
    },
    bank: { holder: str("bank.holder"), bankName: str("bank.bankName"), iban: str("bank.iban").toUpperCase(), bic: str("bank.bic").toUpperCase() },
    tax: { smallBusiness: fd.get("tax.smallBusiness") === "on", defaultVatRate: Number(str("tax.defaultVatRate") || 19) },
    offers: {
      validityDays: int("offers.validityDays", current.offers.validityDays),
      intro: str("offers.intro"),
      notes: str("offers.notes"),
      paymentTerms: str("offers.paymentTerms"),
      closing: str("offers.closing"),
    },
    invoices: {
      dueDays: int("invoices.dueDays", current.invoices.dueDays),
      intro: str("invoices.intro"),
      notes: str("invoices.notes"),
      paymentTerms: str("invoices.paymentTerms"),
      closing: str("invoices.closing"),
    },
    notifications: {
      inbox: str("notifications.inbox"),
      notifyOnInquiry: fd.get("notifications.notifyOnInquiry") === "on",
      notifyOnAcceptance: fd.get("notifications.notifyOnAcceptance") === "on",
    },
    security: { require2fa: fd.get("security.require2fa") === "on" },
  });
  if (!next.success) return { error: `Ungültige Eingabe: ${next.error.issues[0]?.path.join(".")} – ${next.error.issues[0]?.message}` };
  if (next.data.bank.iban && !/^[A-Z]{2}\d{2}[A-Z0-9 ]{10,32}$/.test(next.data.bank.iban)) return { error: "Die IBAN sieht ungültig aus." };
  const { error } = await saveSettings(next.data, admin.email);
  if (error) return { error: "Speichern fehlgeschlagen." };
  await logActivity(admin.email, "einstellungen", "einstellungen", null, "Einstellungen geändert");
  revalidatePath("/admin", "layout");
  return { ok: "Einstellungen gespeichert." };
}
