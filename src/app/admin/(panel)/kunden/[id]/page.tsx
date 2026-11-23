import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, ListChecks, CalendarPlus, ChevronRight, FileDown, FileText, FolderOpen, Hammer, History, Inbox, LayoutGrid, Mail, Phone, Receipt, Ruler, ShieldCheck } from "lucide-react";
import { hasFullAccess, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings/server";
import { displayStatus, formatDateDE, formatDateTime, formatEuro, kindLabels, statusLabels, todayBerlin, type DocumentKind } from "@/lib/documents/format";
import { marketingAction } from "@/app/admin/customer-actions";
import { CustomerForm } from "@/components/admin/CustomerForm";
import { CategoryChip, CategoryPicker } from "@/components/admin/CustomerCategories";
import { ConfirmSubmit } from "@/components/admin/documents/panels";
import { DeleteButton } from "@/components/admin/DeleteControls";
import { NavLink } from "@/components/admin/NavLink";
import { FileUploader } from "@/components/admin/files/FileUploader";
import { FileBrowser } from "@/components/admin/files/FileBrowser";
import { Badge, Card, EmptyState, PageHeader, Stat, statusTone } from "@/components/admin/ui";
import { customerCategories, ensureCustomerFolder } from "@/lib/customers/folder";
import { isR2Configured } from "@/lib/files/r2";
import { allFolderPaths, customerOptionsForFolders, listFiles, projectOptions, subfolders, teamMembers, thumbnailUrls } from "@/lib/files/server";
import { isSortKey, normalizeFolder } from "@/lib/files/shared";
import { formatAppointment, projectStatusInfo, type ProjectStatus } from "@/lib/projects/shared";
import { cn } from "@/lib/utils";

export const metadata = { title: "Kunde" };

const mkt: Record<string, { label: string; text: string }> = {
  keine: { label: "Keine Einwilligung", text: "Keine Werbe-E-Mails erlaubt." },
  ausstehend: { label: "Bestätigung ausstehend", text: "Double-Opt-in-E-Mail wurde gesendet – noch nicht bestätigt." },
  bestaetigt: { label: "Einwilligung bestätigt", text: "Werbe-E-Mails erlaubt (Nachweis im Verlauf)." },
  abgemeldet: { label: "Abgemeldet", text: "Einwilligung widerrufen – keine Werbung senden." },
};
const actionLabel: Record<string, string> = {
  angefragt: "Einwilligung erteilt (Formular)",
  bestaetigt: "Per Double-Opt-in bestätigt",
  widerrufen: "Widerrufen",
  manuell_erfasst: "Manuell mit Nachweis erfasst",
  manuell_entfernt: "Manuell entfernt",
};

const TABS = [
  ["uebersicht", "Übersicht", LayoutGrid],
  ["dateien", "Dateien", FolderOpen],
  ["aufgaben", "Aufgaben", ListChecks],
  ["aufmass", "Aufmaße", Ruler],
  ["auftraege", "Aufträge", Hammer],
  ["dokumente", "Angebote & Rechnungen", FileText],
  ["verlauf", "Verlauf", History],
] as const;
type Tab = (typeof TABS)[number][0];

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; ordner?: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const tab: Tab = (TABS.map((t) => t[0]) as string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "uebersicht";
  const client = db();
  const [{ data: c }, { data: docs }, { data: inquiries }, { data: consents }, { data: projects }, { count: measureCount }, categories] = await Promise.all([
    client.from("customers").select("*").eq("id", id).maybeSingle(),
    client.from("documents").select("id, kind, number, status, title, gross_total, paid_amount, doc_date, valid_until, due_date, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(100),
    client.from("inquiries").select("id, reference, status, message, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
    client.from("consent_events").select("id, action, source, text_version, created_at, actor").eq("customer_id", id).order("created_at", { ascending: false }).limit(30),
    client.from("projects").select("id, number, title, status, kind, value_gross, appointment_date, appointment_time, duration_hours, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(100),
    client.from("measurements").select("id", { count: "exact", head: true }).eq("customer_id", id),
    customerCategories(),
  ]);
  if (!c) notFound();
  const today = todayBerlin();
  const invoices = (docs ?? []).filter((d) => d.kind === "rechnung" && d.number && d.status !== "storniert");
  const revenue = invoices.reduce((s, d) => s + Number(d.gross_total), 0);
  const open = invoices.filter((d) => d.status === "offen" || d.status === "teilbezahlt").reduce((s, d) => s + Number(d.gross_total) - Number(d.paid_amount), 0);
  const offers = (docs ?? []).filter((d) => d.kind === "angebot");
  const accepted = offers.filter((d) => d.status === "angenommen").length;
  const m = mkt[c.marketing_status] ?? mkt.keine;
  const counts: Partial<Record<Tab, number>> = { aufmass: measureCount ?? 0, auftraege: projects?.length ?? 0, dokumente: docs?.length ?? 0 };
  const tabHref = (t: Tab) => (t === "uebersicht" ? `/admin/kunden/${c.id}` : `/admin/kunden/${c.id}?tab=${t}`);

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/admin/kunden" className="inline-flex items-center gap-1.5 hover:text-accent">
            <ArrowLeft className="size-4" aria-hidden /> Kunden
          </Link>
        }
        title={c.company_name || c.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>{c.customer_number}</span>
            <Badge tone={statusTone[c.status]}>{c.status === "lead" ? "Interessent" : c.status === "kunde" ? "Kunde" : "Inaktiv"}</Badge>
            {(c.tags ?? []).map((t: string) => (
              <Link key={t} href={`/admin/kunden?tag=${encodeURIComponent(t)}`}>
                <CategoryChip name={t} color={categories.find((x) => x.name === t)?.color} small />
              </Link>
            ))}
          </span>
        }
        actions={
          <>
            <Link href={`/admin/kunden/${c.id}?tab=dateien`} className="adm-btn adm-btn-ghost">
              <FolderOpen className="size-4" aria-hidden /> Dateien
            </Link>
            {c.email ? (
              <a href={`mailto:${c.email}`} className="adm-btn adm-btn-ghost">
                <Mail className="size-4" aria-hidden /> E-Mail
              </a>
            ) : null}
            {c.phone ? (
              <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="adm-btn adm-btn-ghost">
                <Phone className="size-4" aria-hidden /> Anrufen
              </a>
            ) : null}
            <Link href={`/admin/rechnungen/neu?kunde=${c.id}`} className="adm-btn adm-btn-ghost">
              <Receipt className="size-4" aria-hidden /> Rechnung
            </Link>
            <Link href={`/admin/angebote/neu?kunde=${c.id}`} className="adm-btn adm-btn-primary">
              <FileText className="size-4" aria-hidden /> Angebot erstellen
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Umsatz gesamt" value={formatEuro(revenue)} hint={`${invoices.length} Rechnungen`} tone="accent" />
        <Stat label="Offen" value={formatEuro(open)} tone={open > 0 ? "amber" : "green"} />
        <Stat label="Angebote" value={offers.length} hint={`${accepted} angenommen`} />
        <Stat label="Kunde seit" value={formatDateDE(c.created_at)} hint={`Quelle: ${c.source}`} />
      </div>


      <nav className="sticky top-0 z-20 -mx-4 mt-6 overflow-x-auto bg-paper/85 px-4 py-2 backdrop-blur sm:-mx-7 sm:px-7 lg:-mx-10 lg:px-10" aria-label="Kundenakte">
        <div className="flex w-max gap-1 rounded-2xl bg-ink/[0.05] p-1">
          {TABS.map(([key, label, Icon]) => (
            <NavLink
              key={key}
              href={tabHref(key)}
              eager
              scroll={false}
              className={cn("inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-sm transition", tab === key ? "bg-white font-semibold shadow-sm" : "text-stone-dark hover:text-ink")}
              aria-current={tab === key ? "page" : undefined}
            >
              <Icon className="size-4" aria-hidden /> {label}
              {counts[key] ? <span className="rounded-full bg-ink/[0.07] px-1.5 text-[0.7rem] tabular-nums">{counts[key]}</span> : null}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="mt-5">
        {tab === "uebersicht" ? (
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <Card title="Kategorien">
                <CategoryPicker customerId={c.id} value={c.tags ?? []} categories={categories} name="_tags_live" />
              </Card>
              <Card title="Stammdaten & Firma">
                <CustomerForm customer={c} categories={categories} />
              </Card>
            </div>
            <div className="space-y-6">
          <Card title={<span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-accent" aria-hidden /> E-Mail-Werbung</span>}>
            <Badge tone={statusTone[c.marketing_status]}>{m.label}</Badge>
            <p className="mt-2 text-sm text-stone-dark">{m.text}</p>
            {c.email ? (
              <div className="mt-4 space-y-2">
                {c.marketing_status !== "bestaetigt" ? (
                  <form action={marketingAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="action" value="doi" />
                    <button className="adm-btn adm-btn-ghost adm-btn-sm w-full">Bestätigungs-E-Mail (Double-Opt-in) senden</button>
                  </form>
                ) : (
                  <form action={marketingAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="action" value="revoke" />
                    <ConfirmSubmit className="adm-btn adm-btn-danger adm-btn-sm w-full" message="Einwilligung als widerrufen markieren?">
                      Als abgemeldet markieren
                    </ConfirmSubmit>
                  </form>
                )}
                {c.marketing_status !== "bestaetigt" ? (
                  <details className="rounded-lg bg-ink/[0.03] p-3 text-sm">
                    <summary className="cursor-pointer text-stone-dark">Schriftliche Einwilligung liegt vor?</summary>
                    <form action={marketingAction} className="mt-3 space-y-2">
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="action" value="manual" />
                      <input name="proof" required maxLength={80} placeholder="Nachweis, z. B. „Formular vom 12.11.2026, Ordner A“" className="adm-input" />
                      <p className="text-xs text-stone-dark">Nur erfassen, wenn eine nachweisbare ausdrückliche Einwilligung vorliegt.</p>
                      <button className="adm-btn adm-btn-ghost adm-btn-sm">Einwilligung erfassen</button>
                    </form>
                  </details>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-xs text-stone-dark">Keine E-Mail-Adresse hinterlegt.</p>
            )}
            {consents?.length ? (
              <ol className="mt-5 space-y-2 border-t border-ink/[0.06] pt-4">
                {consents.map((e) => (
                  <li key={e.id} className="text-xs">
                    <span className="font-medium">{actionLabel[e.action] ?? e.action}</span>
                    <span className="block text-stone-dark">
                      {formatDateTime(e.created_at)} · {e.source}
                      {e.text_version ? ` · Text v${e.text_version}` : ""}
                      {e.actor ? ` · ${e.actor}` : ""}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
          </Card>

          <Card title={<span className="inline-flex items-center gap-2"><Inbox className="size-4" aria-hidden /> Anfragen</span>} padded={false}>
            {inquiries?.length ? (
              <ul className="divide-y divide-ink/[0.05]">
                {inquiries.map((q) => (
                  <li key={q.id}>
                    <Link href={`/admin/anfragen/${q.id}`} className="block px-5 py-3 hover:bg-ink/[0.02]">
                      <span className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium">{q.reference}</span>
                        <span className="text-xs text-stone">{formatDateDE(q.created_at)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-stone-dark">{q.message}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-sm text-stone-dark">Keine Anfragen.</p>
            )}
          </Card>

          {Object.keys(c.utm ?? {}).length ? (
            <Card title="Herkunft (Kampagne)">
              <dl className="space-y-1 text-sm">
                {Object.entries(c.utm as Record<string, string>).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-stone-dark">{k}</dt>
                    <dd className="truncate">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : null}

          <Card title="Datenschutz (DSGVO)">
            <div className="space-y-2">
              <a href={`/admin/kunden/${c.id}/auskunft`} className="adm-btn adm-btn-ghost adm-btn-sm w-full">
                <FileDown className="size-4" aria-hidden /> Datenauskunft (Art. 15) herunterladen
              </a>
              {hasFullAccess(admin.role) ? (
                <DeleteButton kind="kunde" id={c.id} name={c.company_name || c.name} redirectTo="/admin/kunden" variant="button" label="Kunde löschen" className="adm-btn-sm w-full justify-center" />
              ) : null}
            </div>
          </Card>
        </div>

          </div>
        ) : null}

        {tab === "dateien" ? <CustomerFiles customer={c} folderParam={sp.ordner} /> : null}

        {tab === "aufmass" ? <CustomerMeasurements customerId={c.id} /> : null}

        {tab === "aufgaben" ? <CustomerTasks customerId={c.id} me={admin.email.toLowerCase()} /> : null}

        {tab === "auftraege" ? (
          <Card
            title="Aufträge & Termine"
            padded={false}
            action={
              <Link href={`/admin/projekte/neu?kunde=${c.id}`} className="adm-btn adm-btn-ghost adm-btn-sm">
                <CalendarPlus className="size-4" aria-hidden /> Neuer Termin
              </Link>
            }
          >
            {projects?.length ? (
              <ul className="divide-y divide-ink/[0.05]">
                {projects.map((p) => (
                  <li key={p.id} className="group flex items-center pr-3">
                    <Link href={`/admin/projekte/${p.id}`} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-ink/[0.02]">
                      <span className="w-24 text-xs tabular-nums text-stone-dark">{p.number}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
                      {p.appointment_date ? <span className="text-xs text-stone-dark">{formatAppointment(p as never, { short: true })}</span> : null}
                      <Badge tone={projectStatusInfo[p.status as ProjectStatus]?.tone ?? "gray"}>{projectStatusInfo[p.status as ProjectStatus]?.label ?? p.status}</Badge>
                      <span className="text-sm tabular-nums">{formatEuro(Number(p.value_gross ?? 0))}</span>
                    </Link>
                    <DeleteButton kind="auftrag" id={p.id} name={`${p.number} ${p.title}`} className="opacity-50 group-hover:opacity-100" />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Hammer} title="Noch keine Aufträge" text="Aus einem angenommenen Angebot oder als freier Termin." />
            )}
          </Card>
        ) : null}

        {tab === "dokumente" ? (
          <Card title="Angebote & Rechnungen" padded={false}>
            {docs?.length ? (
              <table className="adm-table">
                <tbody>
                  {docs.map((d) => {
                    const ds = displayStatus(d as never, today);
                    const k = d.kind as DocumentKind;
                    return (
                      <tr key={d.id}>
                        <td className="whitespace-nowrap">
                          <Link href={`/admin/${kindLabels[k].path}/${d.id}`} className="font-medium hover:text-accent">
                            {kindLabels[k].one} {d.number ?? "(Entwurf)"}
                          </Link>
                        </td>
                        <td className="hidden max-w-[16rem] truncate text-stone-dark md:table-cell">{d.title}</td>
                        <td className="text-stone-dark">{formatDateDE(d.doc_date)}</td>
                        <td>
                          <Badge tone={statusTone[ds]}>{statusLabels[ds]}</Badge>
                        </td>
                        <td className="text-right font-semibold tabular-nums">{formatEuro(d.gross_total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="p-5 text-sm text-stone-dark">Noch keine Dokumente.</p>
            )}
          </Card>
        ) : null}

        {tab === "verlauf" ? <CustomerTimeline customerId={c.id} docs={docs ?? []} inquiries={inquiries ?? []} projects={projects ?? []} consents={consents ?? []} createdAt={c.created_at} /> : null}
      </div>
    </>
  );
}

/* ------------------------------ Dateien des Kunden ------------------------------ */

async function CustomerFiles({ customer, folderParam }: { customer: { id: string; name: string; company_name: string | null; customer_number: string | null; folder_path: string | null; created_at: string }; folderParam?: string }) {
  const root = await ensureCustomerFolder(customer);
  const wanted = normalizeFolder(folderParam);
  const folder = wanted && (wanted === root || wanted.startsWith(`${root}/`)) ? wanted : root;
  const jar = await cookies();
  const initialView = jar.get("qd_dateien_ansicht")?.value === "liste" ? "liste" : "raster";
  const sortCookie = jar.get("qd_dateien_sort")?.value;
  const [files, folders, allFolders, customers, team, projects, settings] = await Promise.all([
    listFiles({ folder }),
    subfolders(folder),
    allFolderPaths(),
    customerOptionsForFolders(),
    teamMembers(),
    projectOptions(),
    getSettings(),
  ]);
  const thumbs = await thumbnailUrls(files);
  const base = `/admin/kunden/${customer.id}?tab=dateien`;
  const rel = folder.slice(root.length).split("/").filter(Boolean);
  return (
    <div className="space-y-4">
      <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm" aria-label="Ordnerpfad">
        <Link href={base} className={rel.length ? "inline-flex items-center gap-1.5 text-stone-dark hover:text-accent" : "inline-flex items-center gap-1.5 font-semibold"}>
          <FolderOpen className="size-4" aria-hidden /> Kundenordner
        </Link>
        {rel.map((name, i) => {
          const path = [root, ...rel.slice(0, i + 1)].join("/");
          return (
            <span key={path} className="inline-flex min-w-0 items-center gap-1">
              <ChevronRight className="size-3.5 text-stone" aria-hidden />
              {i === rel.length - 1 ? <span className="truncate font-semibold">{name}</span> : <Link href={`${base}&ordner=${encodeURIComponent(path)}`} className="truncate text-stone-dark hover:text-accent">{name}</Link>}
            </span>
          );
        })}
        <Link href={`/admin/dateien?ordner=${encodeURIComponent(folder)}`} className="ml-auto text-xs text-stone-dark hover:text-accent">
          In der Dateiverwaltung öffnen →
        </Link>
      </nav>
      <FileUploader projects={projects} team={team} configured={isR2Configured()} folder={folder} allFolders={allFolders} compact />
      <Card padded={false}>
        <FileBrowser
          files={files}
          folders={folders}
          thumbs={thumbs}
          folder={folder}
          flat={false}
          initialView={initialView}
          initialSort={isSortKey(sortCookie) ? sortCookie : "name"}
          allFolders={allFolders}
          customers={customers}
          team={team}
          baseHref={base}
          quickFolders={settings.files.projectFolders}
        />
        {!files.length && !folders.length ? <p className="px-5 pb-8 text-center text-sm text-stone-dark">Noch leer – Dateien hineinziehen oder oben einen Projekt-Ordner anlegen (z. B. Speisekarte, Schaufensterfolie).</p> : null}
      </Card>
    </div>
  );
}

/* ------------------------------ Aufmaße (Platzhalter bis Modul) ------------------------------ */

async function CustomerMeasurements({ customerId }: { customerId: string }) {
  const { MeasurementList } = await import("@/components/admin/measure/MeasurementList");
  return <MeasurementList customerId={customerId} />;
}

/* ------------------------------ Aufgaben ------------------------------ */

async function CustomerTasks({ customerId, me }: { customerId: string; me: string }) {
  const [{ listTasks }, { TaskBoard }, { NewTaskButton }, team, customers] = await Promise.all([
    import("@/lib/tasks/server"),
    import("@/components/admin/tasks/TaskBoard"),
    import("@/components/admin/tasks/NewTaskButton"),
    teamMembers(),
    customerOptionsForFolders(),
  ]);
  const tasks = await listTasks({ customerId, includeDone: true });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-dark">{tasks.filter((t) => t.status !== "erledigt").length} offen · Klick öffnet die Aufgabe</p>
        <NewTaskButton team={team} customers={customers} me={me} customerId={customerId} />
      </div>
      <TaskBoard tasks={tasks} team={team} view="liste" />
    </div>
  );
}

/* ------------------------------ Verlauf ------------------------------ */

type Ev = { at: string; icon: typeof Inbox; title: string; text?: string; href?: string };
async function CustomerTimeline({
  customerId,
  docs,
  inquiries,
  projects,
  consents,
  createdAt,
}: {
  customerId: string;
  docs: { id: string; kind: string; number: string | null; title: string | null; created_at: string; gross_total: number }[];
  inquiries: { id: string; reference: string; message: string; created_at: string }[];
  projects: { id: string; number: string; title: string; created_at: string }[];
  consents: { id: number; action: string; created_at: string }[];
  createdAt: string;
}) {
  const { data: log } = await db().from("activity_log").select("id, actor, action, summary, created_at").eq("entity_id", customerId).order("created_at", { ascending: false }).limit(50);
  const ev: Ev[] = [
    { at: createdAt, icon: LayoutGrid, title: "Kunde angelegt" },
    ...inquiries.map((q) => ({ at: q.created_at, icon: Inbox, title: `Anfrage ${q.reference}`, text: q.message?.slice(0, 140), href: `/admin/anfragen/${q.id}` })),
    ...docs.map((d) => ({ at: d.created_at, icon: d.kind === "rechnung" ? Receipt : FileText, title: `${kindLabels[d.kind as DocumentKind].one} ${d.number ?? "(Entwurf)"}`, text: `${d.title ?? ""} · ${formatEuro(Number(d.gross_total))}`, href: `/admin/${kindLabels[d.kind as DocumentKind].path}/${d.id}` })),
    ...projects.map((p) => ({ at: p.created_at, icon: Hammer, title: `Auftrag ${p.number}`, text: p.title, href: `/admin/projekte/${p.id}` })),
    ...consents.map((e) => ({ at: e.created_at, icon: ShieldCheck, title: actionLabel[e.action] ?? e.action })),
    ...(log ?? []).map((l) => ({ at: l.created_at as string, icon: History, title: String(l.summary), text: l.actor ? `von ${l.actor}` : undefined })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  return (
    <Card padded={false}>
      <ol className="relative px-5 py-4">
        {ev.map((e, i) => (
          <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
            {i < ev.length - 1 ? <span className="absolute left-[1.05rem] top-9 h-[calc(100%-1.75rem)] w-px bg-ink/10" aria-hidden /> : null}
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink/[0.05] text-stone-dark">
              <e.icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 pt-1">
              {e.href ? (
                <Link href={e.href} className="font-medium hover:text-accent">
                  {e.title}
                </Link>
              ) : (
                <p className="font-medium">{e.title}</p>
              )}
              {e.text ? <p className="line-clamp-2 text-sm text-stone-dark">{e.text}</p> : null}
              <p className="text-xs text-stone">{formatDateTime(e.at)}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
