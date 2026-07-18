"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";

const inputCls =
  "w-full rounded-xl bg-[#09090b] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-yellow-400/50 transition";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const acceptTerms = formData.get("acceptTerms");

    if (!acceptTerms) {
      setError("Tu dois accepter les conditions d'utilisation pour continuer.");
      return;
    }

    setLoading(true);

    const data = {
      fullName: String(formData.get("fullName")),
      moncashNumber: String(formData.get("moncashNumber")),
      whatsappNumber: String(formData.get("whatsappNumber")),
      age: String(formData.get("age")),
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || "Erreur lors de l'inscription");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Erreur de connexion. Vérifie ta connexion internet et réessaie.");
    }

    setLoading(false);
  }

  return (
    <>
      {/* Animation CSS injectée globalement */}
      <style>{`
        @keyframes borderRun {
          0%   { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -1600; }
        }
        .border-light {
          animation: borderRun 3s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .border-light {
            animation: none !important;
          }
        }
      `}</style>

      <main className="min-h-screen bg-[#09090b] text-white">

        {/* NAV */}
        <header className="border-b border-yellow-400/20 px-5 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-black text-yellow-400">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-black font-black text-base">
              Z
            </span>
            Zonarena
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-yellow-400/30 px-4 py-2 text-sm font-semibold text-yellow-400"
          >
            Connexion
          </Link>
        </header>

        {/* PAGE */}
        <div className="flex min-h-[calc(100vh-65px)] items-start justify-center px-4 py-10">

          {/* CARD WRAPPER — position relative pour que le SVG se cale dessus */}
          <div className="relative w-full max-w-[460px]">

            {/* ── SVG ANIMATED BORDER ── */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ borderRadius: 20, overflow: "visible" }}
            >
              {/* Piste statique très subtile */}
              <rect
                x="1" y="1"
                width="calc(100% - 2px)"
                height="calc(100% - 2px)"
                rx="19" ry="19"
                fill="none"
                stroke="rgba(250,204,21,0.12)"
                strokeWidth="1.5"
              />
              {/* Lumière qui court */}
              <rect
                x="1" y="1"
                width="calc(100% - 2px)"
                height="calc(100% - 2px)"
                rx="19" ry="19"
                fill="none"
                stroke="#facc15"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="100 9999"
                strokeDashoffset="0"
                className="border-light"
              />
            </svg>

            {/* CARD CONTENT */}
            <div className="relative z-10 rounded-[18px] bg-[#111113] p-6 sm:p-8">

              {/* ── FORM ── */}
              {!success && (
                <form onSubmit={handleSubmit} noValidate>
                  <h1 className="text-2xl font-black text-yellow-400">Créer un compte</h1>
                  <p className="mt-1 mb-6 text-sm text-zinc-500">
                    Rejoins d'autres joueurs et commence à gagner
                  </p>

                  {/* Bandeau d'erreur inline — remplace l'ancien alert() */}
                  {error && (
                    <div
                      role="alert"
                      className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-3 text-[13px] leading-relaxed text-red-400"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16" height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mt-0.5 shrink-0"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <Field label="Nom complet">
                    <input name="fullName" placeholder="Jean Baptiste" required className={inputCls} />
                  </Field>

                  <Field label="Adresse email">
                    <input name="email" type="email" placeholder="jean@exemple.com" required className={inputCls} />
                  </Field>

                  <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-3">
                    <Field label="Numéro MonCash">
                      <input name="moncashNumber" placeholder="+509 ..." required className={inputCls} />
                    </Field>
                    <Field label="Numéro WhatsApp">
                      <input name="whatsappNumber" placeholder="+509 ..." required className={inputCls} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-3">
                    <Field label="Âge min +18">
                      <input name="age" type="number" placeholder="25" min="18" required className={inputCls} />
                    </Field>
                    <Field label="Mot de passe">
                      <input
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        minLength={6}
                        required
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  {/* Case CGU obligatoire — nécessaire dès qu'il y a de l'argent réel en jeu (MonCash, gains) */}
                  <label className="mb-5 mt-1 flex items-start gap-2.5 text-[13px] leading-relaxed text-zinc-400">
                    <input
                      type="checkbox"
                      name="acceptTerms"
                      required
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-[#09090b] accent-yellow-400"
                    />
                    <span>
                      J'accepte les{" "}
                      <Link href="/conditions" className="font-semibold text-yellow-400 underline">
                        conditions d'utilisation
                      </Link>{" "}
                      et la{" "}
                      <Link href="/confidentialite" className="font-semibold text-yellow-400 underline">
                        politique de confidentialité
                      </Link>
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full rounded-xl bg-yellow-400 py-3 text-[15px] font-black text-black transition hover:bg-yellow-300 disabled:opacity-60"
                  >
                    {loading ? "Création..." : "Créer mon compte"}
                  </button>

                  <p className="mt-4 text-center text-sm text-zinc-500">
                    Déjà inscrit ?{" "}
                    <Link href="/login" className="font-semibold text-yellow-400">
                      Connecte-toi
                    </Link>
                  </p>
                </form>
              )}

              {/* ── SUCCESS ── */}
              {success && (
                <div className="py-2 text-center">

                  {/* Icône */}
                  <div className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full border border-yellow-400/25 bg-yellow-400/8">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32" height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m2 7 10 7 10-7"/>
                      <path d="m9 13-2 2.5M15 13l2 2.5"/>
                    </svg>
                  </div>

                  <h2 className="mb-2 text-2xl font-black text-white">
                    Compte créé avec succès !
                  </h2>
                  <p className="mb-6 text-sm leading-relaxed text-zinc-500">
                    Bienvenue sur{" "}
                    <span className="font-semibold text-yellow-400">Zonarena</span> !
                    <br />
                    Il ne reste plus qu&apos;une étape.
                  </p>

                  {/* Encadré email */}
                  <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 text-left">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22" height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-0.5 shrink-0"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m2 7 10 7 10-7"/>
                    </svg>
                    <div>
                      <p className="mb-1 text-sm font-semibold text-white">
                        Quiz-Arena
                      </p>
                      <p className="text-[13px] leading-relaxed text-zinc-400">
                        Merci d’avoir choisi Zonarena !
Amusez-vous tout en gagnant des pièces et des récompenses.

Défiez vos amis, participez à des tournois épiques et grimpez au sommet du classement.

Êtes-vous prêt à devenir le champion de l’arène ?
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push("/login")}
                    className="block w-full rounded-xl border border-yellow-400/30 py-3 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-400/5"
                  >
                    Aller à la connexion →
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
    </>
  );
}