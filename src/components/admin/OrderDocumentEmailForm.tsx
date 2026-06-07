"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Mail, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { sendOrderDocumentEmail } from "@/app/actions/order-document";
import {
  ORDER_DOCUMENT_EMAIL_INITIAL_STATE,
  type OrderDocumentEmailActionState,
} from "@/lib/orders/document-email";
import {
  ORDER_DOCUMENT_LINKS,
  parseOrderDocumentQueryType,
  type OrderDocumentQueryType,
} from "@/lib/orders/documents";

const DEFAULT_MESSAGE_BY_TYPE: Record<OrderDocumentQueryType, string> = {
  invoice: "Guten Tag,\n\nanbei erhalten Sie Ihre Rechnung.",
  offer: "Guten Tag,\n\nanbei erhalten Sie Ihr Angebot.",
  order: "Guten Tag,\n\nanbei erhalten Sie Ihren Auftrag.",
};

const FIELD_CLASS_NAME =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-200 dark:focus:ring-slate-200/10";

function OrderDocumentEmailSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-white dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
    >
      <Send className="h-4 w-4" />
      {pending ? "Wird gesendet" : "Per E-Mail senden"}
    </button>
  );
}

function isDefaultMessage(
  value: string,
  documentType: OrderDocumentQueryType,
): boolean {
  return value.trim() === DEFAULT_MESSAGE_BY_TYPE[documentType].trim();
}

export function OrderDocumentEmailForm({
  orderId,
  defaultRecipient,
  defaultDocumentType,
  defaultSubjectByType,
  compact = false,
}: {
  orderId: string;
  defaultRecipient: string;
  defaultDocumentType: OrderDocumentQueryType;
  defaultSubjectByType: Record<OrderDocumentQueryType, string>;
  compact?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<OrderDocumentEmailActionState, FormData>(
    sendOrderDocumentEmail,
    ORDER_DOCUMENT_EMAIL_INITIAL_STATE,
  );
  const [documentType, setDocumentType] =
    useState<OrderDocumentQueryType>(defaultDocumentType);
  const [subject, setSubject] = useState<string>(
    defaultSubjectByType[defaultDocumentType],
  );
  const [message, setMessage] = useState<string>(
    DEFAULT_MESSAGE_BY_TYPE[defaultDocumentType],
  );
  const previousStatusRef = useRef<OrderDocumentEmailActionState["status"]>("idle");

  useEffect(() => {
    if (
      state.status === "success" &&
      previousStatusRef.current !== "success"
    ) {
      startTransition(() => {
        router.refresh();
      });
    }

    previousStatusRef.current = state.status;
  }, [router, state.status]);

  const handleDocumentTypeChange = (nextDocumentType: OrderDocumentQueryType) => {
    const previousDocumentType = documentType;
    const previousDefaultSubject = defaultSubjectByType[previousDocumentType];
    const nextDefaultSubject = defaultSubjectByType[nextDocumentType];

    if (!subject.trim() || subject.trim() === previousDefaultSubject.trim()) {
      setSubject(nextDefaultSubject);
    }

    if (!message.trim() || isDefaultMessage(message, previousDocumentType)) {
      setMessage(DEFAULT_MESSAGE_BY_TYPE[nextDocumentType]);
    }

    setDocumentType(nextDocumentType);
  };

  return (
    <div className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
          <Mail className="h-4 w-4" />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Dokument versenden
          </p>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Der Versand nutzt einen sicheren Dokumentlink. Der PDF-Download erfolgt
            weiterhin ueber die Browser-Druckansicht.
          </p>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="orderId" value={orderId} />

        <div
          className={
            compact
              ? "grid grid-cols-1 gap-3"
              : "grid grid-cols-1 gap-4 md:grid-cols-2"
          }
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Dokumenttyp
            </label>
            <select
              name="documentType"
              value={documentType}
              onChange={(event) => {
                const nextDocumentType = parseOrderDocumentQueryType(
                  event.target.value,
                );

                if (nextDocumentType) {
                  handleDocumentTypeChange(nextDocumentType);
                }
              }}
              className={FIELD_CLASS_NAME}
            >
              {ORDER_DOCUMENT_LINKS.map((documentLink) => (
                <option key={documentLink.type} value={documentLink.type}>
                  {documentLink.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Empfaenger
            </label>
            <input
              name="recipient"
              type="email"
              required
              defaultValue={defaultRecipient}
              className={FIELD_CLASS_NAME}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Betreff
          </label>
          <input
            name="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className={FIELD_CLASS_NAME}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Nachricht
          </label>
          <textarea
            name="message"
            rows={compact ? 4 : 5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className={`${FIELD_CLASS_NAME} resize-none`}
          />
        </div>

        {state.status !== "idle" ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              state.status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-200"
            }`}
          >
            {state.message}
          </div>
        ) : null}

        <OrderDocumentEmailSubmitButton />
      </form>
    </div>
  );
}
