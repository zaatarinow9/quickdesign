import { redirect } from "next/navigation";

/** Fallback ohne Proxy: auf Deutsch weiterleiten */
export default function ShopIndex() {
  redirect("/shop/de");
}
