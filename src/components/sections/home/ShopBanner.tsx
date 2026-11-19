/**
 * Kleiner Hinweis auf die Shop-Kollektion 8.12. – reines Server-Markup, kein Shop-JS.
 * TODO(Inhaber): Nach dem 8.12.2026 wieder aus src/app/(site)/page.tsx entfernen.
 */
const STAR = "M12 2.5l2.6 6.1 6.6.5-5 4.3 1.5 6.4L12 16.4 6.3 19.8l1.5-6.4-5-4.3 6.6-.5z";

export default function ShopBanner() {
  return (
    <section aria-label="Shop-Kollektion 8.12." className="relative overflow-hidden bg-[#0a0c0b] text-paper">
      <div aria-hidden className="absolute inset-x-0 top-0 flex h-1">
        <span className="flex-1 bg-[#007a3d]" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-black" />
      </div>
      <a
        href="https://shop.quickdesign24.de"
        className="group mx-auto flex max-w-7xl flex-col items-start gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8"
      >
        <div className="flex items-center gap-4">
          <span aria-hidden className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <svg key={i} viewBox="0 0 24 24" className="h-4 w-4 fill-[#ce1126]">
                <path d={STAR} />
              </svg>
            ))}
          </span>
          <p className="text-sm leading-snug sm:text-base">
            <span className="font-semibold text-[#e8cf8f]">Neu: Kollektion „Tag der Befreiung“ 8.12.</span>{" "}
            <span className="text-paper/70">T-Shirts &amp; Hoodies zum zweiten Jahrestag – bedruckt in Saarbrücken.</span>
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#c9a24f]/60 px-4 py-2 text-sm font-medium text-[#e8cf8f] transition group-hover:bg-[#c9a24f] group-hover:text-[#0a0c0b]">
          Zum Shop <span aria-hidden>→</span>
        </span>
      </a>
    </section>
  );
}
