"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { changePassword, type Result } from "@/app/shop-admin/actions";
import { Notice } from "@/components/admin/ui";

export function PasswordForm() {
  const [state, action, pending] = useActionState<Result | null, FormData>(changePassword, null);
  return (
    <form action={action} className="max-w-sm space-y-4">
      {state ? <Notice tone={state.ok ? "success" : "error"}>{state.ok ? state.message : state.error}</Notice> : null}
      <div>
        <label className="adm-label" htmlFor="password">كلمة سر جديدة (12 حرفاً على الأقل)</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} className="adm-input h-11 w-full" />
      </div>
      <div>
        <label className="adm-label" htmlFor="password2">أعد كتابتها</label>
        <input id="password2" name="password2" type="password" autoComplete="new-password" required minLength={12} className="adm-input h-11 w-full" />
      </div>
      <button type="submit" className="adm-btn adm-btn-primary h-11" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null} تغيير كلمة السر
      </button>
    </form>
  );
}
