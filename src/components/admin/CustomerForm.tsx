type CustomerFormValues = {
  name?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  taxId?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

type CustomerFormAction = (formData: FormData) => void | Promise<void>;

export default function CustomerForm({
  action,
  initialValues,
  submitLabel,
}: {
  action: CustomerFormAction;
  initialValues?: CustomerFormValues;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-8 border border-neutral-200 bg-white p-8 shadow-sm">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
            Ansprechpartner
          </label>
          <input
            name="name"
            required
            defaultValue={initialValues?.name ?? ""}
            className="w-full border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          />
        </div>

        <div>
          <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
            Firmenname optional
          </label>
          <input
            name="companyName"
            defaultValue={initialValues?.companyName ?? ""}
            className="w-full border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          />
        </div>

        <div>
          <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
            E-Mail optional
          </label>
          <input
            name="email"
            type="email"
            defaultValue={initialValues?.email ?? ""}
            className="w-full border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          />
        </div>

        <div>
          <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
            Telefon optional
          </label>
          <input
            name="phone"
            defaultValue={initialValues?.phone ?? ""}
            className="w-full border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
            Adresse optional
          </label>
          <input
            name="address"
            defaultValue={initialValues?.address ?? ""}
            className="w-full border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          />
        </div>

        <div>
          <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
            Stadt optional
          </label>
          <input
            name="city"
            defaultValue={initialValues?.city ?? ""}
            className="w-full border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          />
        </div>

        <div>
          <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
            PLZ optional
          </label>
          <input
            name="postalCode"
            defaultValue={initialValues?.postalCode ?? ""}
            className="w-full border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          />
        </div>

        <div>
          <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
            Land optional
          </label>
          <input
            name="country"
            defaultValue={initialValues?.country ?? ""}
            className="w-full border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          />
        </div>

        <div>
          <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
            Steuer-ID optional
          </label>
          <input
            name="taxId"
            defaultValue={initialValues?.taxId ?? ""}
            className="w-full border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
            Notizen
          </label>
          <textarea
            name="notes"
            rows={5}
            defaultValue={initialValues?.notes ?? ""}
            className="w-full resize-none border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
          />
        </div>
      </div>

      <label className="inline-flex items-center gap-3 border border-neutral-200 bg-neutral-50 px-4 py-3">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initialValues?.isActive ?? true}
          className="h-4 w-4 accent-neutral-950"
        />
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-950">
          Aktiv
        </span>
      </label>

      <button
        type="submit"
        className="bg-neutral-950 px-8 py-4 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
      >
        {submitLabel}
      </button>
    </form>
  );
}
