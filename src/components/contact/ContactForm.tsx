"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { sendContactRequest, type ContactFormState } from "@/app/kontakt/actions";
import { services } from "@/content/services";
import { cn } from "@/lib/utils";

const initialState: ContactFormState = { status: "idle" };

function Field({
  id,
  label,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <label htmlFor={id} className="eyebrow block text-stone-dark">
        {label}
        {required ? <span className="text-accent"> *</span> : null}
      </label>
      {children}
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-ink transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-focus-within:scale-x-100"
      />
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-sm text-[#c2360f]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  "mt-2 block w-full border-0 border-b border-ink/20 bg-transparent px-0 py-3 text-lg text-ink placeholder:text-stone-light focus:border-ink/20 focus:outline-none focus:ring-0";

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContactRequest, initialState);
  const [startedAt] = useState(() => Date.now());
  const errors = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-[420px] flex-col items-start justify-center rounded-[1.75rem] bg-ink p-10 text-paper"
        role="status"
      >
        <motion.span
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
          className="grid h-16 w-16 place-items-center rounded-full bg-accent text-ink"
        >
          <Check className="h-7 w-7" />
        </motion.span>
        <p className="mt-8 font-[family-name:var(--font-display)] text-3xl font-medium sm:text-4xl">Nachricht gesendet.</p>
        <p className="mt-4 max-w-md text-paper/65">{state.message}</p>
      </motion.div>
    );
  }

  return (
    <form
      action={formAction}
      // Submit via a transition so React does not reset the fields when validation fails.
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      noValidate
      className="relative space-y-10"
    >
      <input type="hidden" name="startedAt" value={startedAt} />
      <div aria-hidden className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset>
        <legend className="eyebrow text-stone-dark">Worum geht es?</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {services.map((service) => (
            <label key={service.slug} className="cursor-pointer">
              <input type="checkbox" name="interest" value={service.slug} className="peer sr-only" />
              <span className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm ring-1 ring-ink/15 transition-all duration-300 hover:ring-ink/40 peer-checked:bg-ink peer-checked:text-paper peer-checked:ring-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                {service.short}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-10 sm:grid-cols-2">
        <Field id="name" label="Name" required error={errors.name}>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            className={inputClass}
            placeholder="Vor- und Nachname"
          />
        </Field>
        <Field id="company" label="Firma">
          <input id="company" name="company" autoComplete="organization" className={inputClass} placeholder="Optional" />
        </Field>
        <Field id="email" label="E-Mail" required error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={inputClass}
            placeholder="name@firma.de"
          />
        </Field>
        <Field id="phone" label="Telefon">
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={inputClass} placeholder="Optional" />
        </Field>
      </div>

      <Field id="message" label="Ihre Nachricht" required error={errors.message}>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
          className={cn(inputClass, "resize-none")}
          placeholder="Was möchten Sie umsetzen? Gern mit Maßen, Stückzahlen und Wunschtermin."
        />
      </Field>

      <div>
        <label className="flex cursor-pointer items-start gap-4">
          <input
            type="checkbox"
            name="consent"
            required
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? "consent-error" : undefined}
            className="peer sr-only"
          />
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md ring-1 ring-ink/30 transition-colors peer-checked:bg-ink peer-checked:text-paper peer-checked:ring-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
            <Check className="h-4 w-4" />
          </span>
          <span className="text-sm leading-relaxed text-stone-dark">
            Ich bin einverstanden, dass meine Angaben zur Bearbeitung meiner Anfrage verwendet werden. Details in der{" "}
            <Link href="/datenschutz" className="text-ink underline underline-offset-4">
              Datenschutzerklärung
            </Link>
            .<span className="text-accent"> *</span>
          </span>
        </label>
        {errors.consent ? (
          <p id="consent-error" className="mt-2 text-sm text-[#c2360f]">
            {errors.consent}
          </p>
        ) : null}
      </div>

      <AnimatePresence>
        {state.status === "error" && state.message ? (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="rounded-2xl bg-[#c2360f]/10 px-5 py-4 text-sm text-[#8f2709]"
          >
            {state.message}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <button
        type="submit"
        disabled={pending}
        className="group/btn relative isolate inline-flex h-14 items-center gap-3 overflow-hidden rounded-full bg-ink pl-7 pr-2 font-medium text-paper transition-colors disabled:opacity-70"
      >
        <span
          aria-hidden
          className="absolute inset-0 -z-10 translate-y-full rounded-full bg-accent transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:translate-y-0"
        />
        <span className="transition-colors duration-500 group-hover/btn:text-ink">{pending ? "Wird gesendet …" : "Anfrage senden"}</span>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-paper text-ink">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />}
        </span>
      </button>
    </form>
  );
}
