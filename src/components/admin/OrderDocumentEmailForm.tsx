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

function OrderDocumentEmailSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 bg-neutral-950 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      <Send className="h-4 w-4" /> {pending ? "Wird gesendet" : "Per E-Mail senden"}
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
    <div className="space-y-4 border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-10 w-10 items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-700">
          <Mail className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Dokument versenden
          </p>
          <p className="text-sm text-neutral-600">
            Der Versand nutzt in Phase 8B einen sicheren Dokumentlink. PDF-Anhaenge
            werden spaeter serverseitig nachgezogen.
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
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
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
              className="w-full border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-neutral-950"
            >
              {ORDER_DOCUMENT_LINKS.map((documentLink) => (
                <option key={documentLink.type} value={documentLink.type}>
                  {documentLink.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Empfaenger
            </label>
            <input
              name="recipient"
              type="email"
              required
              defaultValue={defaultRecipient}
              className="w-full border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-neutral-950"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            Betreff
          </label>
          <input
            name="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="w-full border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-neutral-950"
          />
        </div>

        <div>
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            Nachricht optional
          </label>
          <textarea
            name="message"
            rows={compact ? 4 : 5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="w-full resize-none border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-neutral-950"
          />
        </div>

        {state.status !== "idle" ? (
          <div
            className={`border px-4 py-3 text-sm ${
              state.status === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
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
