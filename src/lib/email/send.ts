import "server-only";
import { isSmtpConfigured } from "@/lib/env";
import { sendSmtpMail } from "@/lib/email/smtp";
import { db } from "@/lib/supabase/admin";
import type { EmailContent } from "./templates";

export type SendResult = { ok: true } | { ok: false; error: string };

/** Versendet eine E-Mail über SMTP (info@quickdesign24.de) und protokolliert das Ergebnis. */
export async function sendMail(
  to: string,
  content: EmailContent,
  opts: { replyTo?: string | null; bcc?: string | null; kind: string; relatedId?: string | null },
): Promise<SendResult> {
  let result: SendResult;
  if (!isSmtpConfigured()) {
    result = { ok: false, error: "SMTP ist nicht konfiguriert (SMTP_* Umgebungsvariablen fehlen)." };
  } else {
    try {
      await sendSmtpMail({
        to,
        subject: content.subject,
        text: content.text,
        html: content.html,
        replyTo: opts.replyTo ?? null,
        bcc: opts.bcc ?? null,
        attachments: content.attachments,
        headers: content.headers,
      });
      result = { ok: true };
    } catch (error) {
      result = { ok: false, error: (error instanceof Error ? error.message : String(error)).slice(0, 900) };
    }
  }
  try {
    await db()
      .from("email_log")
      .insert({ recipient: to, subject: content.subject.slice(0, 200), kind: opts.kind, related_id: opts.relatedId ?? null, ok: result.ok, error: result.ok ? null : result.error });
  } catch {
    /* Protokoll ist optional */
  }
  return result;
}
