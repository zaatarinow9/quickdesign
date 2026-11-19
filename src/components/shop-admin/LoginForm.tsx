"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { shopSignIn, type Result } from "@/app/shop-admin/actions";
import { Notice } from "@/components/admin/ui";

export function ShopLoginForm() {
  const [state, action, pending] = useActionState<Result | null, FormData>(shopSignIn, null);
  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}
      <div>
        <label className="adm-label" htmlFor="email">البريد الإلكتروني</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="adm-input h-11" dir="ltr" />
      </div>
      <div>
        <label className="adm-label" htmlFor="password">كلمة السر</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="adm-input h-11" />
      </div>
      <button type="submit" className="adm-btn h-11 w-full bg-[#054239] text-white hover:bg-[#0b6456]" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        دخول
      </button>
    </form>
  );
}
