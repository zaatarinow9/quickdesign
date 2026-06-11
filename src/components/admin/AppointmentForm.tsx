import { formatDateTimeLocalInput } from "@/lib/appointments/format";
import { getAdminButtonClassName } from "@/components/admin/AdminUI";

type AppointmentFormAction = (formData: FormData) => Promise<void>;

type AppointmentFormOption = {
  id: string;
  label: string;
};

type AppointmentFormValues = {
  id?: string;
  title?: string;
  description?: string | null;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  startAt?: Date;
  endAt?: Date | null;
  reminderAt?: Date | null;
  customerId?: string | null;
  orderId?: string | null;
  assignedUserId?: string | null;
  location?: string | null;
  notes?: string | null;
};

export type AppointmentFormProps = {
  action: AppointmentFormAction;
  submitLabel: string;
  customers: AppointmentFormOption[];
  orders: AppointmentFormOption[];
  employees: AppointmentFormOption[];
  values?: AppointmentFormValues;
  showStatusField?: boolean;
};

export function AppointmentForm({
  action,
  submitLabel,
  customers,
  orders,
  employees,
  values,
  showStatusField = false,
}: AppointmentFormProps) {
  return (
    <form action={action} className="grid gap-5 md:grid-cols-2">
      {values?.id ? <input type="hidden" name="appointmentId" value={values.id} /> : null}

      <div className="md:col-span-2">
        <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
          Titel
        </label>
        <input
          name="title"
          required
          defaultValue={values?.title ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
          Beschreibung
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={values?.description ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
        />
      </div>

      <div>
        <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
          Kunde
        </label>
        <select
          name="customerId"
          defaultValue={values?.customerId ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
        >
          <option value="">Kein Kunde</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
          Auftrag
        </label>
        <select
          name="orderId"
          defaultValue={values?.orderId ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
        >
          <option value="">Kein Auftrag</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
          Mitarbeiter
        </label>
        <select
          name="assignedUserId"
          defaultValue={values?.assignedUserId ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
        >
          <option value="">Nicht zugewiesen</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.label}
            </option>
          ))}
        </select>
      </div>

      {showStatusField ? (
        <div>
          <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
            Status
          </label>
          <select
            name="status"
            defaultValue={values?.status ?? "SCHEDULED"}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
          >
            <option value="SCHEDULED">Geplant</option>
            <option value="COMPLETED">Erledigt</option>
            <option value="CANCELLED">Storniert</option>
            <option value="NO_SHOW">Nicht erschienen</option>
          </select>
        </div>
      ) : null}

      <div>
        <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
          Beginn
        </label>
        <input
          name="startAt"
          type="datetime-local"
          required
          defaultValue={formatDateTimeLocalInput(values?.startAt)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
        />
      </div>

      <div>
        <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
          Ende
        </label>
        <input
          name="endAt"
          type="datetime-local"
          defaultValue={formatDateTimeLocalInput(values?.endAt)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
        />
      </div>

      <div>
        <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
          Erinnerung
        </label>
        <input
          name="reminderAt"
          type="datetime-local"
          defaultValue={formatDateTimeLocalInput(values?.reminderAt)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
        />
      </div>

      <div>
        <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
          Ort
        </label>
        <input
          name="location"
          defaultValue={values?.location ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
          Notizen
        </label>
        <textarea
          name="notes"
          rows={4}
          defaultValue={values?.notes ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
        />
      </div>

      <div className="md:col-span-2 flex flex-wrap gap-3">
        <button type="submit" className={getAdminButtonClassName("primary")}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
