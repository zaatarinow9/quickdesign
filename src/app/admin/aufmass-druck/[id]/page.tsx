import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings/server";
import { getMeasurement } from "@/lib/measure/server";
import { areaM2, defaultArrows, fmtCm, fmtM2, type Arrows } from "@/lib/measure/shared";
import { formatDateDE } from "@/lib/documents/format";
import { MeasureCanvas, H_COLOR, W_COLOR } from "@/components/admin/measure/MeasureCanvas";
import { PrintButton } from "@/components/admin/measure/PrintButton";

export const metadata = { title: "Aufmaß drucken" };

/** Druckansicht (A4) – im Browser „Als PDF speichern“ */
export default async function MeasurePrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [data, s] = await Promise.all([getMeasurement(id), getSettings()]);
  if (!data) notFound();
  const { m, customer, items } = data;
  const total = items.reduce((t, i) => t + areaM2(i), 0);
  return (
    <div className="min-h-dvh bg-[#e9e7e1] py-8 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 12mm; } @media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end gap-2 px-4">
        <PrintButton />
      </div>
      <article className="mx-auto max-w-[210mm] bg-white p-[12mm] text-[10.5pt] text-ink shadow-xl print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-ink pb-4">
          <div>
            <p className="text-[9pt] font-semibold uppercase tracking-widest text-accent">Aufmaß</p>
            <h1 className="text-[20pt] font-bold leading-tight">{m.title}</h1>
            <p className="mt-1 text-stone-dark">
              {m.number} · {formatDateDE(m.measured_at)}
              {m.created_by ? ` · aufgenommen von ${m.created_by}` : ""}
            </p>
          </div>
          <div className="text-right text-[9pt] leading-snug">
            <p className="font-bold">{s.company.name}</p>
            <p>{s.company.street}</p>
            <p>
              {s.company.postalCode} {s.company.city}
            </p>
            <p>{s.company.phone}</p>
          </div>
        </header>
        <section className="mt-4 grid grid-cols-2 gap-6">
          <div>
            <p className="text-[8.5pt] uppercase tracking-wide text-stone-dark">Kunde</p>
            <p className="font-semibold">{customer ? customer.company_name || customer.name : "–"}</p>
            {customer?.company_name ? <p>{customer.name}</p> : null}
            {customer?.phone ? <p>{customer.phone}</p> : null}
          </div>
          <div>
            <p className="text-[8.5pt] uppercase tracking-wide text-stone-dark">Ort</p>
            <p>{m.site_address || "–"}</p>
          </div>
        </section>
        <table className="mt-5 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-ink/30 text-[8.5pt] uppercase tracking-wide text-stone-dark">
              <th className="py-1.5 pr-2">Pos.</th>
              <th className="py-1.5 pr-2">Bezeichnung</th>
              <th className="py-1.5 pr-2 text-right" style={{ color: W_COLOR }}>
                Breite
              </th>
              <th className="py-1.5 pr-2 text-right" style={{ color: H_COLOR }}>
                Höhe
              </th>
              <th className="py-1.5 pr-2 text-right">Stk.</th>
              <th className="py-1.5 text-right">Fläche</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-ink/10 align-top">
                <td className="py-1.5 pr-2 font-semibold">{i.position}</td>
                <td className="py-1.5 pr-2">
                  {i.label || "Position"}
                  {i.material ? <span className="block text-[9pt] text-stone-dark">{i.material}</span> : null}
                </td>
                <td className="py-1.5 pr-2 text-right font-semibold tabular-nums">{fmtCm(i.width_cm)}</td>
                <td className="py-1.5 pr-2 text-right font-semibold tabular-nums">{fmtCm(i.height_cm)}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{i.quantity}</td>
                <td className="py-1.5 text-right tabular-nums">{areaM2(i) ? fmtM2(areaM2(i)) : "–"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="pt-2 text-right font-semibold">
                Fläche gesamt
              </td>
              <td className="pt-2 text-right font-bold tabular-nums">{fmtM2(total)}</td>
            </tr>
          </tfoot>
        </table>
        {m.notes ? <p className="mt-4 whitespace-pre-line rounded-lg bg-ink/[0.04] p-3 text-[9.5pt]">{m.notes}</p> : null}
        <section className="mt-6 grid grid-cols-2 gap-5">
          {items.map((i) => (
            <figure key={i.id} className="break-inside-avoid">
              <MeasureCanvas
                photoUrl={i.photo_url}
                aspect={i.photo_width && i.photo_height ? i.photo_width / i.photo_height : 4 / 3}
                arrows={{ ...defaultArrows(), ...(i.arrows ?? {}) } as Required<Arrows>}
                width={i.width_cm}
                height={i.height_cm}
                readOnly
                className="relative w-full overflow-hidden rounded-lg bg-[#eef1f5]"
              />
              <figcaption className="mt-1.5 text-[9pt]">
                <b>Pos. {i.position}</b> {i.label} – {fmtCm(i.width_cm)} × {fmtCm(i.height_cm)}
                {i.quantity > 1 ? ` · ${i.quantity} Stk.` : ""}
                {i.notes ? <span className="block text-stone-dark">{i.notes}</span> : null}
              </figcaption>
            </figure>
          ))}
        </section>
      </article>
    </div>
  );
}
