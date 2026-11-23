"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Settings2, Trash2, X } from "lucide-react";
import { deleteCategory, saveCategory, setCustomerTags } from "@/app/admin/customer-actions";
import { useFeedback } from "./feedback";
import { cn } from "@/lib/utils";

export type Category = { name: string; color: string };
const palette = ["#2563eb", "#059669", "#ea580c", "#7c3aed", "#d97706", "#dc2626", "#0891b2", "#db2777", "#65a30d", "#64748b"];

/** Farbige Kategorie-Plakette */
export function CategoryChip({ name, color, active = true, onClick, small }: { name: string; color?: string; active?: boolean; onClick?: () => void; small?: boolean }) {
  const c = color ?? "#64748b";
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn("inline-flex items-center gap-1.5 rounded-full font-medium transition", small ? "h-6 px-2 text-[0.72rem]" : "h-8 px-3 text-sm", onClick && "cursor-pointer")}
      style={active ? { background: `${c}1a`, color: c, boxShadow: `inset 0 0 0 1px ${c}40` } : { background: "transparent", color: "#78716c", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)" }}
    >
      <span className="size-2 rounded-full" style={{ background: active ? c : "#d6d3d1" }} />
      {name}
      {onClick && active ? <Check className="size-3.5" aria-hidden /> : null}
    </Tag>
  );
}

/** Kategorien eines Kunden mit einem Klick umschalten (sofort gespeichert) */
export function CategoryPicker({ customerId, value, categories, name = "tags" }: { customerId?: string; value: string[]; categories: Category[]; name?: string }) {
  const [tags, setTags] = useState<string[]>(value);
  const [adding, setAdding] = useState("");
  const [, start] = useTransition();
  const { toast } = useFeedback();
  const all = [...categories, ...tags.filter((t) => !categories.some((c) => c.name === t)).map((t) => ({ name: t, color: "#64748b" }))];
  const commit = (next: string[]) => {
    setTags(next);
    if (customerId)
      start(async () => {
        const r = await setCustomerTags(customerId, next);
        if (r.error) toast(r.error, { tone: "error" });
      });
  };
  return (
    <div>
      <input type="hidden" name={name} value={tags.join(", ")} />
      <div className="flex flex-wrap gap-2">
        {all.map((c) => (
          <CategoryChip key={c.name} name={c.name} color={c.color} active={tags.includes(c.name)} onClick={() => commit(tags.includes(c.name) ? tags.filter((t) => t !== c.name) : [...tags, c.name])} />
        ))}
        <form
          className="inline-flex"
          onSubmit={(e) => {
            e.preventDefault();
            const v = adding.trim().slice(0, 40);
            if (!v) return;
            setAdding("");
            if (!tags.includes(v)) commit([...tags, v]);
            start(async () => {
              await saveCategory({ name: v, color: palette[all.length % palette.length] });
            });
          }}
        >
          <input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="+ Neue Kategorie" className="h-8 w-36 rounded-full border-0 bg-ink/[0.04] px-3 text-sm outline-none ring-1 ring-ink/10 focus:ring-accent" aria-label="Neue Kategorie" />
        </form>
      </div>
    </div>
  );
}

/** Kategorien verwalten (Name, Farbe, löschen) */
export function CategoryManager({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<{ previous?: string; name: string; color: string } | null>(null);
  const [pending, start] = useTransition();
  const { confirm, toast } = useFeedback();
  const save = () => {
    if (!edit) return;
    start(async () => {
      const r = await saveCategory(edit);
      if (r.error) toast(r.error, { tone: "error" });
      else setEdit(null);
    });
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="adm-btn adm-btn-ghost">
        <Settings2 className="size-4" aria-hidden /> Kategorien
      </button>
      {open ? (
        <div className="qd-fade-in fixed inset-0 z-[80] grid place-items-end bg-ink/45 backdrop-blur-[3px] sm:place-items-center sm:p-4" onMouseDown={() => setOpen(false)}>
          <div className="qd-pop-in w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Kategorien">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Kundenkategorien</h2>
              <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg hover:bg-ink/[0.06]" aria-label="Schließen">
                <X className="size-4" />
              </button>
            </div>
            <ul className="max-h-[55vh] space-y-1 overflow-y-auto">
              {categories.map((c) => (
                <li key={c.name} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-ink/[0.03]">
                  <CategoryChip name={c.name} color={c.color} small />
                  <span className="text-xs text-stone-dark">{counts[c.name] ?? 0} Kunden</span>
                  <button type="button" onClick={() => setEdit({ previous: c.name, name: c.name, color: c.color })} className="ml-auto grid size-8 place-items-center rounded-lg text-stone-dark hover:bg-ink/[0.06]" aria-label={`${c.name} bearbeiten`}>
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({ title: `Kategorie „${c.name}“ entfernen?`, text: "Die Kunden bleiben erhalten – nur die Kategorie wird entfernt.", danger: true, confirm: "Entfernen" });
                      if (!ok.ok) return;
                      start(async () => {
                        const r = await deleteCategory(c.name);
                        toast(r.error ?? r.ok ?? "", { tone: r.error ? "error" : "ok" });
                      });
                    }}
                    className="grid size-8 place-items-center rounded-lg text-stone-dark hover:bg-red-50 hover:text-red-600"
                    aria-label={`${c.name} entfernen`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            {edit ? (
              <div className="mt-4 space-y-3 rounded-2xl bg-ink/[0.03] p-3">
                <input autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && save()} className="adm-input" placeholder="Name der Kategorie" maxLength={40} />
                <div className="flex flex-wrap gap-2">
                  {palette.map((p) => (
                    <button key={p} type="button" onClick={() => setEdit({ ...edit, color: p })} className={cn("size-7 rounded-full ring-2 ring-offset-2", edit.color === p ? "ring-ink" : "ring-transparent")} style={{ background: p }} aria-label={`Farbe ${p}`} />
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEdit(null)} className="adm-btn adm-btn-ghost adm-btn-sm">
                    Abbrechen
                  </button>
                  <button type="button" disabled={pending} onClick={save} className="adm-btn adm-btn-primary adm-btn-sm">
                    Speichern
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setEdit({ name: "", color: palette[categories.length % palette.length] })} className="adm-btn adm-btn-ghost mt-4 w-full">
                <Plus className="size-4" aria-hidden /> Neue Kategorie
              </button>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
