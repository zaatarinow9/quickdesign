"use server";

import { revalidatePath } from "next/cache";
import { isToken } from "@/lib/security";
import { unsubscribeByToken } from "@/lib/marketing/server";

/** Öffentlich: Abmeldung von E-Mail-Werbung (Widerruf der Einwilligung) */
export async function unsubscribe(fd: FormData): Promise<void> {
  const token = String(fd.get("token") ?? "");
  if (!isToken(token)) return;
  await unsubscribeByToken(token, "abmeldelink");
  revalidatePath(`/abmelden/${token}`);
}

