/** Sofortige Anzeige beim Seitenwechsel – der Inhalt folgt in Bruchteilen einer Sekunde */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Wird geladen">
      <div className="h-3 w-28 rounded-full bg-ink/[0.07]" />
      <div className="mt-3 h-8 w-64 max-w-full rounded-xl bg-ink/[0.08]" />
      <div className="mt-2 h-3 w-96 max-w-full rounded-full bg-ink/[0.05]" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-white ring-1 ring-ink/[0.05]" />
        ))}
      </div>
      <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-ink/[0.05]">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b border-ink/[0.04] py-3.5 last:border-0">
            <div className="size-9 rounded-xl bg-ink/[0.06]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded-full bg-ink/[0.07]" />
              <div className="h-2.5 w-1/2 rounded-full bg-ink/[0.04]" />
            </div>
            <div className="h-3 w-16 rounded-full bg-ink/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  );
}
