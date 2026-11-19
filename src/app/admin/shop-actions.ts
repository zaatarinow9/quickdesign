"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";

const statuses = ["bezahlt", "in_produktion", "versendet", "abholbereit", "abgeschlossen", "storniert"] as const;

export async function setShopOrderStatus(fd: FormData) {
  await assertAdmin();
  const id = z.uuid().safeParse(fd.get("id"));
  const status = z.enum(statuses).safeParse(fd.get("status"));
  if (!id.success || !status.success) return;
  await db().from("shop_orders").update({ status: status.data }).eq("id", id.data);
  revalidatePath("/admin/shop");
}
