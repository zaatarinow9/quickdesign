import Link from "next/link";
import { DeleteButton } from "@/components/admin/DeleteControls";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Receipt } from "lucide-react";
import { hasFullAccess, requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings/server";
import { formatDateTime, formatEuro, formatQty, statusLabels, type DocItem } from "@/lib/documents/format";
import { db } from "@/lib/supabase/admin";
import { financeByOffer, getProject, offerShareUrl, planSentDates, projectEvents, teamInbox } from "@/lib/projects/server";
import { addDays, todayBerlin } from "@/lib/documents/format";
import { TaskDone } from "@/components/admin/projects/TaskDone";
import { listFiles, teamMembers, thumbnailUrls } from "@/lib/files/server";
import { isR2Configured } from "@/lib/files/r2";
import { normalizeFolder } from "@/lib/files/shared";
import { FileUploader } from "@/components/admin/files/FileUploader";
import { FileList } from "@/components/admin/files/FileList";
import { Notice } from "@/components/admin/ui";
import { customerLabel, formatAppointment, appointmentInfo, projectHeading, projectStatusInfo } from "@/lib/projects/shared";
import { convertToInvoice } from "@/app/admin/document-actions";
import { StageControl } from "@/components/admin/projects/StageControl";
import { ProjectForm } from "@/components/admin/projects/ProjectForm";
import { Badge, Card, PageHeader, statusTone } from "@/components/admin/ui";

export const metadata = { title: "Auftrag / Termin" };

const eventLabels: Record<string, string> = {
  angelegt: "Angelegt",
  status: "Status geändert",
  termin: "Termin",
  "e-mail": "E-Mail",
  bearbeitet: "Bearbeitet",
};

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ neu?: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const isNew = (await searchParams).neu === "1";
  const today = todayBerlin();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const project = await getProject(id);
  if (!project) notFound();
  const [settings, events, finance, shareUrl, offerRow, sentFor] = await Promise.all([
    getSettings(),
    projectEvents(id),
    financeByOffer(project.offer_id ? [project.offer_id] : []),
    offerShareUrl(project.offer_id),
    project.offer_id ? db().from("documents").select("number, items, gross_total").eq("id", project.offer_id).maybeSingle() : Promise.resolve({ data: null }),
    planSentDates([today, addDays(today, 1), ...(project.appointment_date ? [project.appointment_date] : [])]),
  ]);
  const isTask = project.kind === "aufgabe";
  const [files, team] = await Promise.all([listFiles({ projectId: project.id }), teamMembers()]);
  const thumbs = await thumbnailUrls(files);
  const f = project.offer_id ? finance.get(project.offer_id) : undefined;
  const items = (Array.isArray(offerRow.data?.items) ? offerRow.data.items : []) as DocItem[];
  const openAmount = f ? f.open : null;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/admin/projekte" className="inline-flex items-center gap-1.5 hover:text-accent">
            <ArrowLeft className="size-4" aria-hidden /> Aufträge & Termine
          </Link>
        }
        title={projectHeading(project)}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge tone={projectStatusInfo[project.status].tone}>{projectStatusInfo[project.status].label}</Badge>
            <span>
              {project.number} · {formatEuro(project.value_gross)}
            </span>
            {project.appointment_date && project.appointment_type ? (
              <Badge tone="pink">
                {appointmentInfo[project.appointment_type].label}: {formatAppointment(project, { short: true })}
              </Badge>
            ) : null}
            {project.customer_id ? (
              <Link href={`/admin/kunden/${project.customer_id}`} className="text-accent hover:underline">
                Kundenakte
              </Link>
            ) : null}
          </span>
        }
        actions={
          <>
            {project.offer_id ? (
              <Link href={`/admin/angebote/${project.offer_id}`} className="adm-btn adm-btn-ghost">
                <FileText className="size-4" aria-hidden /> Angebot {offerRow.data?.number ?? ""}
              </Link>
            ) : null}
            {project.offer_id ? (
              <form action={convertToInvoice}>
                <input type="hidden" name="id" value={project.offer_id} />
                <button className="adm-btn adm-btn-primary" type="submit">
                  <Receipt className="size-4" aria-hidden /> Rechnung erstellen
                </button>
              </form>
            ) : null}
          </>
        }
      />

      {isNew ? (
        <div className="mb-6">
          <Notice tone="success">Termin angelegt. Ergänzen Sie bei Bedarf Ort und Hinweise – er kommt automatisch in den Einsatzplan.</Notice>
        </div>
      ) : null}

      {isTask ? (
        <Card className="mb-6">
          <TaskDone id={project.id} done={project.status === "abgeschlossen"} />
        </Card>
      ) : (
      <Card className="mb-6" title="Fortschritt">
        <StageControl
          id={project.id}
          status={project.status}
          stamps={{ angenommen: project.accepted_at, in_arbeit: project.started_at, fertig: project.ready_at, abgeschlossen: project.completed_at }}
          hasEmail={!!project.email}
          notifyDefault={settings.notifications.customerStageMails}
        />
      </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <ProjectForm project={project} openAmount={openAmount} teamInbox={teamInbox(settings)} today={today} planSentFor={sentFor} />

        <aside className="space-y-6">
          {isTask ? null : (
          <Card title="Rechnungen & Zahlungen">
            <dl className="space-y-1.5 text-sm">
              <Row label="Auftragswert (Angebot)" value={formatEuro(project.value_gross)} />
              <Row label="Berechnet" value={formatEuro(f?.invoiced ?? 0)} />
              <Row label="Bezahlt" value={formatEuro(f?.paid ?? 0)} />
              <Row label="Offen" value={formatEuro(f?.open ?? 0)} strong />
            </dl>
            {f?.invoices.length ? (
              <ul className="mt-4 space-y-1.5 border-t border-ink/[0.06] pt-3">
                {f.invoices.map((inv) => (
                  <li key={inv.id}>
                    <Link href={`/admin/rechnungen/${inv.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-ink/[0.03]">
                      <span>{inv.number ?? "Entwurf"}</span>
                      <span className="flex items-center gap-2">
                        <Badge tone={statusTone[inv.status] ?? "gray"}>{statusLabels[inv.status as keyof typeof statusLabels] ?? inv.status}</Badge>
                        <span className="tabular-nums">{formatEuro(inv.gross)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-stone-dark">Noch keine Rechnung – über „Rechnung erstellen“ wird sie aus dem Angebot übernommen.</p>
            )}
          </Card>
          )}

          {items.length ? (
            <Card title="Positionen" padded={false}>
              <ul className="divide-y divide-ink/[0.06] text-sm">
                {items.map((it, i) => (
                  <li key={i} className="flex gap-3 px-5 py-2.5">
                    <span className="w-16 shrink-0 text-right tabular-nums text-stone-dark">
                      {formatQty(Number(it.quantity) || 0)} {it.unit}
                    </span>
                    <span className="min-w-0">
                      <span className="block">{it.description}</span>
                      {it.details ? <span className="block whitespace-pre-line text-xs text-stone-dark">{it.details}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {shareUrl ? (
            <Card title="Für den Kunden">
              <p className="text-sm text-stone-dark">Der Kunde sieht den aktuellen Auftragsstatus und Termin auf seiner Angebotsseite.</p>
              <a href={shareUrl} target="_blank" rel="noopener" className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
                <ExternalLink className="size-4" aria-hidden /> Kundenansicht öffnen
              </a>
            </Card>
          ) : null}

          <Card title="Verlauf" padded={false}>
            <ol className="max-h-96 divide-y divide-ink/[0.06] overflow-y-auto">
              {events.map((e) => (
                <li key={e.id} className="px-5 py-2.5 text-sm">
                  <p className="font-medium">
                    {eventLabels[e.type] ?? e.type}
                    {e.note ? <span className="font-normal text-stone-dark"> – {e.note}</span> : null}
                  </p>
                  <p className="text-xs text-stone-dark">
                    {formatDateTime(e.created_at)}
                    {e.actor ? ` · ${e.actor}` : ""}
                  </p>
                </li>
              ))}
              {!events.length ? <li className="px-5 py-4 text-sm text-stone-dark">Noch keine Einträge.</li> : null}
            </ol>
          </Card>

          {hasFullAccess(admin.role) ? (
            <DeleteButton kind="auftrag" id={project.id} name={`${project.number} ${project.title}`} redirectTo="/admin/projekte" variant="button" label="Auftrag löschen" className="adm-btn-sm" />
          ) : null}
        </aside>
      </div>

      <Card className="mt-6" title={`Dateien${files.length ? ` (${files.length})` : ""}`} padded={false}>
        <div className="p-5">
          <FileUploader
            projects={[]}
            team={team}
            defaultProjectId={project.id}
            folder={
              customerLabel(project)?.trim()
                ? normalizeFolder(`Kunden/${customerLabel(project).replace(/\//g, "-")}/${project.number} ${project.title.replace(/\//g, "-")}`)
                : normalizeFolder(`${isTask ? "Termine" : "Aufträge"}/${project.number} ${project.title.replace(/\//g, "-")}`)
            }
            compact
            configured={isR2Configured()}
          />
        </div>
        {files.length ? (
          <div className="border-t border-ink/[0.06]">
            <FileList files={files} showProject={false} showFolder team={team} thumbs={thumbs} />
          </div>
        ) : null}
      </Card>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-stone-dark">{label}</dt>
      <dd className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</dd>
    </div>
  );
}
