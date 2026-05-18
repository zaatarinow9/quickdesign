import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateService } from "@/app/actions/service";
import ServicePricingEditor from "@/components/admin/ServicePricingEditor";
import ServiceUploadFieldsEditor from "@/components/admin/ServiceUploadFieldsEditor";
import { requireAdminPermission } from "@/lib/admin/auth";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPermission("canManageServices");
  const { id } = await params;
  const service = await prisma.service.findUnique({ where: { id } });

  if (!service) return notFound();
  const updateServiceWithId = updateService.bind(null, id);

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-neutral-950 mb-10 uppercase tracking-tighter">
        Leistung bearbeiten
      </h1>

      <form
        action={updateServiceWithId}
        className="bg-white border border-neutral-200 p-10 space-y-10 shadow-sm"
      >
        <section className="space-y-8">
          <div className="pb-4 border-b border-neutral-100">
            <h2 className="text-sm font-bold text-neutral-950 uppercase tracking-widest">
              Basisdaten
            </h2>
            <p className="text-sm text-neutral-500 mt-2">
              Diese Angaben bestimmen Name, URL und Grunddarstellung der
              Leistung im Admin und Store.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                Name der Leistung
              </label>
              <input
                type="text"
                name="name"
                defaultValue={service.name}
                required
                className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                Slug (URL-Pfad)
              </label>
              <input
                type="text"
                name="slug"
                defaultValue={service.slug}
                required
                className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                Bild URL
              </label>
              <input
                type="url"
                name="image"
                defaultValue={service.image}
                required
                className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                Grundpreis (EUR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="basePrice"
                defaultValue={service.basePrice}
                required
                className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
              Beschreibung
            </label>
            <textarea
              name="description"
              defaultValue={service.description}
              required
              rows={5}
              className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors resize-none text-sm"
            />
          </div>
        </section>

        <section className="space-y-8">
          <div className="pb-4 border-b border-neutral-100">
            <h2 className="text-sm font-bold text-neutral-950 uppercase tracking-widest">
              Konfiguration
            </h2>
            <p className="text-sm text-neutral-500 mt-2">
              Diese Legacy-Felder speisen aktuell die normalisierte
              Konfigurationsschicht aus Phase 1.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                Design-Modus
              </label>
              <select
                name="designerType"
                defaultValue={service.designerType}
                className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm bg-white"
              >
                <option value="none">Standard (Nur Bild)</option>
                <option value="tshirt">T-Shirt Designer (Live)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-950 mb-3 uppercase tracking-widest">
                Datei-Limit
              </label>
              <input
                type="number"
                min="0"
                step="1"
                name="fileLimit"
                defaultValue={service.fileLimit}
                className="w-full border border-neutral-300 p-4 outline-none focus:border-neutral-950 transition-colors text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <label className="flex items-center gap-4 min-h-[54px] px-4 border border-neutral-200 bg-neutral-50">
              <input
                type="checkbox"
                name="hasDesigner"
                defaultChecked={service.hasDesigner}
                className="w-5 h-5 accent-neutral-950"
              />
              <span className="text-xs font-bold text-neutral-950 uppercase tracking-widest">
                Designer aktiv
              </span>
            </label>

            <label className="flex items-center gap-4 min-h-[54px] px-4 border border-neutral-200 bg-neutral-50">
              <input
                type="checkbox"
                name="hasColorPicker"
                defaultChecked={service.hasColorPicker}
                className="w-5 h-5 accent-neutral-950"
              />
              <span className="text-xs font-bold text-neutral-950 uppercase tracking-widest">
                Farbwahl aktiv
              </span>
            </label>

            <label className="flex items-center gap-4 min-h-[54px] px-4 border border-neutral-200 bg-neutral-50">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={service.isActive}
                className="w-5 h-5 accent-neutral-950"
              />
              <span className="text-xs font-bold text-neutral-950 uppercase tracking-widest">
                Als aktiv markieren
              </span>
            </label>
          </div>
        </section>

        <ServicePricingEditor
          initialPricingMode={service.pricingMode}
          initialConfigJson={service.configJson}
        />
        <ServiceUploadFieldsEditor initialConfigJson={service.configJson} />

        <div className="pt-4 border-t border-neutral-100">
          <button
            type="submit"
            className="bg-neutral-950 text-white px-10 py-4 font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors"
          >
            Anderungen speichern
          </button>
        </div>
      </form>
    </div>
  );
}
