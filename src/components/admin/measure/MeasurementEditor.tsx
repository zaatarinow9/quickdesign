"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, ChevronLeft, FileText, MapPin, Plus, Printer, Ruler, Trash2, UserRound } from "lucide-react";
import { deleteMeasurement, updateMeasurement } from "@/app/admin/measure-actions";
import { areaM2, defaultArrows, fmtCm, fmtM2, type Arrows, type MeasureItem, type Measurement } from "@/lib/measure/shared";
import { useFeedback } from "@/components/admin/feedback";
import { cn } from "@/lib/utils";
import { ItemEditor } from "./ItemEditor";
import { H_COLOR, MeasureCanvas, W_COLOR } from "./MeasureCanvas";

type Customer = { id: string; name: string; company_name: string | null; customer_number: string | null; phone: string | null } | null;

export function MeasurementEditor({ m, customer, items }: { m: Measurement; customer: Customer; items: MeasureItem[] }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [editing, setEditing] = useState<MeasureItem | "neu" | null>(null);
  const [title, setTitle] = useState(m.title);
  const [address, setAddress] = useState(m.site_address ?? "");
  const [date, setDate] = useState(m.measured_at);
  const [notes, setNotes] = useState(m.notes ?? "");
  const [pending, start] = useTransition();
  const total = items.reduce((s, i) => s + areaM2(i), 0);
  const who = customer ? customer.company_name || customer.name : "Ohne Kunde";

  const saveHead = (patch: Parameters<typeof updateMeasurement>[0]) =>
    start(async () => {
      const r = await updateMeasurement(patch);
      if (r.error) toast(r.error, { tone: "error" });
    });

  return (
    <div className="space-y-5">
      {/* Kopf */}
      <div className="flex flex-wrap items-start gap-3">
        <Link href={customer ? `/admin/kunden/${customer.id}?tab=aufmass` : "/admin/aufmass"} className="grid size-10 place-items-center rounded-xl bg-white ring-1 ring-ink/10 hover:bg-ink/[0.03]" aria-label="Zurück">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">Aufmaß {m.number}</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== m.title && saveHead({ id: m.id, title })}
            className="w-full truncate rounded-lg bg-transparent text-2xl font-bold outline-none focus:bg-white focus:ring-2 focus:ring-accent/30 sm:text-3xl"
            aria-label="Titel"
          />
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-dark">
            {customer ? (
              <Link href={`/admin/kunden/${customer.id}`} className="inline-flex items-center gap-1.5 hover:text-accent">
                <UserRound className="size-4" aria-hidden /> {who}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-4" aria-hidden /> Ohne Kunde
              </span>
            )}
            <label className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden />
              <input type="date" value={date} onChange={(e) => (setDate(e.target.value), saveHead({ id: m.id, date: e.target.value }))} className="bg-transparent outline-none" aria-label="Datum" />
            </label>
            <label className="inline-flex min-w-[14rem] flex-1 items-center gap-1.5">
              <MapPin className="size-4 shrink-0" aria-hidden />
              <input value={address} onChange={(e) => setAddress(e.target.value)} onBlur={() => address !== (m.site_address ?? "") && saveHead({ id: m.id, address })} placeholder="Adresse vor Ort" className="w-full bg-transparent outline-none" aria-label="Adresse" />
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => saveHead({ id: m.id, status: m.status === "fertig" ? "offen" : "fertig" })}
            className={cn("adm-btn", m.status === "fertig" ? "bg-emerald-600 text-white hover:bg-emerald-500" : "adm-btn-ghost")}
          >
            <Check className="size-4" aria-hidden /> {m.status === "fertig" ? "Abgeschlossen" : "Abschließen"}
          </button>
          <a href={`/admin/aufmass-druck/${m.id}`} target="_blank" rel="noopener" className="adm-btn adm-btn-ghost">
            <Printer className="size-4" aria-hidden /> Drucken / PDF
          </a>
          {customer ? (
            <Link href={`/admin/angebote/neu?kunde=${customer.id}&aufmass=${m.id}`} className="adm-btn adm-btn-ghost">
              <FileText className="size-4" aria-hidden /> Angebot
            </Link>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              const ok = await confirm({ title: `Aufmaß ${m.number} löschen?`, text: `Mit ${items.length} Position(en).`, danger: true });
              if (!ok.ok) return;
              const r = await deleteMeasurement(m.id);
              if (r.error) return toast(r.error, { tone: "error" });
              toast(r.ok ?? "Gelöscht.", { undo: r.trashIds });
              router.push(customer ? `/admin/kunden/${customer.id}?tab=aufmass` : "/admin/aufmass");
            }}
            className="grid size-10 place-items-center rounded-xl text-stone-dark ring-1 ring-ink/10 hover:bg-red-50 hover:text-red-600"
            aria-label="Aufmaß löschen"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Summe */}
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Positionen" value={String(items.length)} />
        <Kpi label="Stück gesamt" value={String(items.reduce((s, i) => s + (i.quantity || 1), 0))} />
        <Kpi label="Fläche gesamt" value={total ? fmtM2(total) : "–"} accent />
      </div>

      {/* Positionen */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((i) => (
          <button key={i.id} type="button" onClick={() => setEditing(i)} className="group overflow-hidden rounded-3xl bg-white text-left shadow-sm ring-1 ring-ink/[0.07] transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="pointer-events-none">
              <MeasureCanvas
                photoUrl={i.photo_url}
                aspect={i.photo_width && i.photo_height ? i.photo_width / i.photo_height : 4 / 3}
                arrows={{ ...defaultArrows(), ...(i.arrows ?? {}) } as Required<Arrows>}
                width={i.width_cm}
                height={i.height_cm}
                readOnly
                className="relative w-full overflow-hidden bg-[#eef1f5]"
              />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">{i.position}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{i.label || "Position"}</span>
                {i.quantity > 1 ? <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-xs font-semibold">× {i.quantity}</span> : null}
              </div>
              <p className="mt-2 flex flex-wrap items-baseline gap-x-3 text-[0.95rem] font-bold tabular-nums">
                <span style={{ color: W_COLOR }}>↔ {fmtCm(i.width_cm)}</span>
                <span style={{ color: H_COLOR }}>↕ {fmtCm(i.height_cm)}</span>
                {areaM2(i) ? <span className="text-sm font-medium text-stone-dark">{fmtM2(areaM2(i))}</span> : null}
              </p>
              {i.material || i.notes ? <p className="mt-1 line-clamp-2 text-sm text-stone-dark">{[i.material, i.notes].filter(Boolean).join(" · ")}</p> : null}
            </div>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setEditing("neu")}
          className="grid min-h-56 place-items-center rounded-3xl border-2 border-dashed border-ink/15 bg-white/60 p-6 text-center transition hover:border-accent hover:bg-accent/[0.04]"
        >
          <span>
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/30">
              <Plus className="size-7" aria-hidden />
            </span>
            <span className="mt-3 block font-semibold">Position hinzufügen</span>
            <span className="mt-0.5 block text-sm text-stone-dark">Foto aufnehmen, Breite × Höhe eintragen</span>
          </span>
        </button>
      </div>

      {/* Notizen */}
      <div className="rounded-3xl bg-white p-4 ring-1 ring-ink/[0.07]">
        <label className="adm-label" htmlFor="m-notes-all">
          <Ruler className="mr-1 inline size-4" aria-hidden /> Notizen zum Aufmaß
        </label>
        <textarea id="m-notes-all" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (m.notes ?? "") && saveHead({ id: m.id, notes })} placeholder="Zugang, Ansprechpartner vor Ort, Parkmöglichkeit, Gerüst nötig …" className="adm-input" />
      </div>

      {editing ? (
        <ItemEditor
          measurementId={m.id}
          item={editing === "neu" ? null : editing}
          nextPosition={items.length + 1}
          title={`${m.number} ${who}`}
          onClose={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl px-4 py-3 ring-1", accent ? "bg-accent text-white ring-accent" : "bg-white ring-ink/[0.07]")}>
      <p className={cn("text-xs", accent ? "text-white/80" : "text-stone-dark")}>{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
