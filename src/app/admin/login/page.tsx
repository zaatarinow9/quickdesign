"use client"

import { loginAdmin } from "@/app/actions/auth";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const hasError = searchParams.get("error");

  return (
    <div className="max-w-md w-full bg-white p-10 border border-neutral-200 shadow-sm">
      <h1 className="text-2xl font-bold text-neutral-950 mb-8 text-center uppercase tracking-widest">Admin Login</h1>
      
      {hasError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-widest text-center">
          Ungültige Anmeldedaten
        </div>
      )}

      <form action={loginAdmin} className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-neutral-950 mb-2 uppercase tracking-widest">Benutzername</label>
          <input 
            type="text" 
            name="username" 
            required 
            className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-950 mb-2 uppercase tracking-widest">Passwort</label>
          <input 
            type="password" 
            name="password" 
            required 
            className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors" 
          />
        </div>
        <button 
          type="submit" 
          className="w-full bg-neutral-950 text-white p-4 font-bold uppercase tracking-widest text-sm hover:bg-neutral-800 transition-colors mt-4"
        >
          Anmelden
        </button>
      </form>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
      <Suspense fallback={<div className="text-sm font-bold uppercase tracking-widest text-neutral-500">Lade...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}