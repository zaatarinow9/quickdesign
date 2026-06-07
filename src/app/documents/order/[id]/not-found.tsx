export default function SharedOrderDocumentNotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-16 text-slate-900">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            QuickDesign Dokumente
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Dieser Link ist ungültig oder abgelaufen.
          </h1>
          <p className="max-w-xl text-sm leading-7 text-slate-600">
            Bitte fordern Sie bei Bedarf einen neuen Dokumentlink an oder wenden
            Sie sich direkt an QuickDesign.
          </p>
        </div>
      </div>
    </main>
  );
}
