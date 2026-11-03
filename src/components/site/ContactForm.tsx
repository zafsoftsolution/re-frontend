"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { storefront, StorefrontError } from "@/lib/storefront";

const INPUT =
  "w-full bg-transparent border-b border-navy/20 focus:border-navy outline-none py-2.5 text-navy placeholder:text-ink/35 transition-colors";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setErrorMsg(null);
    setState("loading");
    try {
      await storefront.contact.submit({ name, email, subject, message });
      setState("done");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      const e = err as StorefrontError;
      if (e.fields && Object.keys(e.fields).length) setErrors(e.fields);
      else setErrorMsg(e.message ?? "Couldn’t send — please try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-md bg-emerald-50 border border-emerald-200 px-6 py-8 text-emerald-900"
      >
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 size={22} className="text-emerald-700" />
          <p className="font-display text-2xl">Message received.</p>
        </div>
        <p className="text-sm text-emerald-900/80 max-w-md">
          Thank you — the atelier reads every note. We’ll reply within two
          working days.
        </p>
        <button
          onClick={() => setState("idle")}
          className="mt-6 text-[11px] tracking-[0.25em] uppercase text-emerald-900 hover:underline"
        >
          Send another →
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <Field label="Name" error={errors.name?.[0]}>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={INPUT}
        />
      </Field>
      <Field label="Email" error={errors.email?.[0]}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT}
        />
      </Field>
      <Field label="Subject" full error={errors.subject?.[0]}>
        <input
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={INPUT}
        />
      </Field>
      <Field label="Message" full error={errors.message?.[0]}>
        <textarea
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-transparent border border-navy/15 focus:border-navy/40 outline-none p-3 text-sm text-navy placeholder:text-ink/35 transition-colors resize-none"
        />
      </Field>

      {errorMsg && (
        <p className="sm:col-span-2 text-sm text-rose-700">{errorMsg}</p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={state === "loading"}
          className="btn-primary disabled:opacity-50"
        >
          {state === "loading" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <ArrowRight size={14} />
          )}
          Send
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  error,
  full,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="block text-[10px] tracking-[0.25em] uppercase text-ink/55 mb-1.5">
        {label}
      </span>
      {children}
      {error && (
        <span className="block mt-1 text-xs text-rose-700">{error}</span>
      )}
    </label>
  );
}
