import { Logo, LogoMark } from "@/components/brand/Logo";

export function AuthShell({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink p-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <Logo withTagline className="w-[220px]" />
        <LogoMark className="pointer-events-none absolute -bottom-40 -right-40 w-[640px] text-paper/[0.05] motion-safe:animate-[spin_90s_linear_infinite]" title="" mono />
        <div className="relative">
          <p className="display-md max-w-md">Alles im Blick. Von der Anfrage bis zur Rechnung.</p>
          <p className="mt-5 max-w-sm text-paper/55">Kunden, Angebote, Rechnungen und Marketing – zentral in der QuickDesign-Verwaltung.</p>
        </div>
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
      </div>
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 w-[150px] lg:hidden" />
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight">{title}</h1>
          {text ? <p className="mt-2 text-stone-dark">{text}</p> : null}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
