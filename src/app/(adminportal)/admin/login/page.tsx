"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await login(email, password);
    if (!res.ok) {
      setError(res.error ?? "Sign-in failed");
      setSubmitting(false);
      return;
    }
    router.replace("/admin");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-[#F4F5F7]">
      {/* Left: form */}
      <div className="flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-12">
            <Image
              src="/logo/rakib-enterprise.png"
              alt="Rakib Enterprise"
              width={434}
              height={240}
              priority
              className="h-11 w-auto"
            />
            <span className="font-display text-3xl tracking-[0.15em] text-navy">
              Rakib
            </span>
            <span className="h-5 w-px bg-navy/25" />
            <span className="text-[11px] tracking-[0.3em] uppercase text-gold">
              Console
            </span>
          </div>

          <h1 className="font-display text-3xl md:text-4xl text-navy tracking-tight">
            Sign in to <span className="italic">your console.</span>
          </h1>
          <p className="mt-3 text-sm text-ink/55">
            Operations dashboard for the Rakib Enterprise team.
          </p>

          <form onSubmit={submit} className="mt-10 space-y-5">
            <Field label="Email" icon={<Mail size={15} />}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent outline-none text-sm text-navy placeholder:text-ink/40"
                placeholder="you@rakibenterprise-bd.com"
                autoComplete="email"
              />
            </Field>

            <Field label="Password" icon={<Lock size={15} />}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none text-sm text-navy placeholder:text-ink/40"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>

            {error && (
              <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-md bg-navy text-cream text-sm tracking-[0.1em] uppercase font-medium hover:bg-navy-deep disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              Sign in
            </button>
          </form>
        </div>
      </div>

      {/* Right: brand panel */}
      <aside className="hidden lg:flex relative bg-navy text-cream overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full border border-gold/15"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-20 w-[360px] h-[360px] rounded-full border border-gold/10"
        />

        <div className="relative flex flex-col justify-between p-16 w-full">
          <div className="flex items-center gap-3">
            <ShieldCheck size={22} className="text-gold" />
            <span className="text-[11px] tracking-[0.3em] uppercase text-gold">
              Restricted access
            </span>
          </div>

          <div>
            <h2 className="font-display text-5xl xl:text-6xl leading-[0.95] tracking-tight">
              Operate the <span className="italic">house.</span>
            </h2>
            <p className="mt-6 max-w-md text-cream/65 text-sm leading-relaxed">
              Manage catalog, orders, customers, and the team — from the same
              console the atelier uses every day.
            </p>

            <ul className="mt-10 space-y-3 text-sm text-cream/75">
              {[
                "Live revenue, orders, and conversion telemetry",
                "Catalog and inventory across every channel",
                "Granular role-based permissions and audit trail",
                "Team accounts with MFA and SSO-ready hooks",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-2 h-1 w-3 bg-gold shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[10px] tracking-[0.3em] uppercase text-cream/35">
            © {new Date().getFullYear()} Rakib Enterprise · v1.0
          </p>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] tracking-[0.2em] uppercase text-ink/55 mb-2">
        {label}
      </span>
      <div className="flex items-center gap-3 px-3.5 h-11 rounded-md bg-white border border-[var(--jmn-line)] focus-within:border-navy/40 transition-colors">
        {icon && <span className="text-ink/40">{icon}</span>}
        {children}
      </div>
    </label>
  );
}
