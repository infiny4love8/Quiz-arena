"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";

const inputCls =
  "w-full bg-transparent border-0 border-b border-amber-400/25 px-1 py-2.5 text-base text-[#f5f0e6] placeholder:text-[#6b6455] outline-none focus:border-amber-300 transition";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <label className="mb-1.5 block text-sm font-semibold tracking-wide text-amber-300/90 font-serif">
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
  const [showPassword, setShowPassword] = useState(false);
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
      {/* Polices + animations injectées globalement */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Cormorant+Garamond:wght@500;600;700&display=swap');

        .font-serif-display { font-family: 'Playfair Display', serif; }
        .font-serif-body { font-family: 'Cormorant Garamond', serif; }

        @keyframes shimmerGold {
          0%, 100% { background-position: 200% 200%; }
          50% { background-position: 0% 0%; }
        }
        .gold-shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          background: linear-gradient(120deg, transparent 40%, rgba(255,215,0,0.09) 50%, transparent 60%);
          background-size: 250% 250%;
          animation: shimmerGold 6s ease-in-out infinite;
        }
        .gold-text {
          background: linear-gradient(120deg, #b8860b, #ffe27a, #d4af37);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .gold-btn {
          background: linear-gradient(120deg, #b8860b, #ffd700, #b8860b);
          background-size: 200% auto;
          transition: background-position .4s;
        }
        .gold-btn:hover { background-position: right center; }

        @media (prefers-reduced-motion: reduce) {
          .gold-shimmer::after { animation: none !important; }
        }
      `}</style>

      <main className="min-h-screen bg-[#08070a] text-white">

        {/* NAV */}
        <header className="border-b border-amber-400/15 px-5 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-black gold-text font-serif-display italic">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl gold-btn text-[#1a1400] font-black text-lg not-italic">
              Z
            </span>
            Zonarena
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-amber-400/30 px-4 py-2 text-base font-semibold text-amber-300"
          >
            Connexion
          </Link>
        </header>

        {/* PAGE */}
        <div className="flex min-h-[calc(100vh-73px)] items-start justify-center px-4 py-10">

          <div className="relative w-full max-w-[480px]">

            {/* CARD */}
            <div
              className="gold-shimmer relative rounded-sm border border-amber-400/30 p-7 sm:p-9"
              style={{
                background: "radial-gradient(ellipse at top, #17130a 0%, #08070a 70%)",
              }}
            >
              {/* Petits repères dorés aux coins */}
              <span className="absolute -top-1 -left-1 h-2 w-2 rotate-45 bg-amber-300 shadow-[0_0_8px_#ffd700]" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rotate-45 bg-amber-300 shadow-[0_0_8px_#ffd700]" />
              <span className="absolute -bottom-1 -left-1 h-2 w-2 rotate-45 bg-amber-300 shadow-[0_0_8px_#ffd700]" />
              <span className="absolute -bottom-1 -right-1 h-2 w-2 rotate-45 bg-amber-300 shadow-[0_0_8px_#ffd700]" />

              {/* ── FORM ── */}
              {!success && (
                <form onSubmit={handleSubmit} noValidate className="relative z-10">
                  <h1 className="text-center text-3xl sm:text-4xl font-serif-display italic font-semibold gold-text">
                    Créer un compte
                  </h1>
                  <p className="mt-2 mb-8 text-center text-lg font-serif-body text-[#a89f8c]">
                    L'excellence a une place. La tienne t'attend.
                  </p>

                  {error && (
                    <div
                      role="alert"
                      className="mb-6 flex items-start gap-2.5 rounded-md border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm leading-relaxed text-red-400"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18" height="18"
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
                    <input name="fullName" placeholder="Nom et prénom" required className={inputCls} />
                  </Field>

                  <Field label="Adresse email">
                    <input name="email" type="email" placeholder="jean@exemple.com" required className={inputCls} />
                  </Field>

                  <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                    <Field label="Numéro MonCash">
                      <input name="moncashNumber" placeholder="+509 ..." required className={inputCls} />
                    </Field>
                    <Field label="Numéro WhatsApp">
                      <input name="whatsappNumber" placeholder="+509 ..." required className={inputCls} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                    <Field label="Âge min +18">
                      <input name="age" type="number" placeholder="25" min="18" required className={inputCls} />
                    </Field>
                    <Field label="Mot de passe">
                      <div className="relative">
                        <input
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          minLength={6}
                          required
                          className={`${inputCls} pr-9`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-amber-300/80 hover:text-amber-300"
                          aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        >
                          {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.4 18.4 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </Field>
                  </div>

                  {/* Case CGU obligatoire — nécessaire dès qu'il y a de l'argent réel en jeu (MonCash, gains) */}
                  <label className="mb-6 mt-2 flex items-start gap-2.5 text-sm leading-relaxed text-[#a89f8c]">
                    <input
                      type="checkbox"
                      name="acceptTerms"
                      required
                      className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-amber-400/40 bg-transparent accent-amber-400"
                    />
                    <span>
                      J'accepte les{" "}
                      <Link href="/conditions" className="font-semibold text-amber-300 underline">
                        conditions d'utilisation
                      </Link>{" "}
                      et la{" "}
                      <Link href="/confidentialite" className="font-semibold text-amber-300 underline">
                        politique de confidentialité
                      </Link>
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="gold-btn mt-2 w-full rounded-sm py-3.5 text-lg font-serif-body font-semibold tracking-wide text-[#1a1400] transition disabled:opacity-60"
                  >
                    {loading ? "Création..." : "Créer mon compte"}
                  </button>

                  <p className="mt-5 text-center text-base text-[#a89f8c]">
                    Déjà inscrit ?{" "}
                    <Link href="/login" className="font-semibold text-amber-300">
                      Connecte-toi
                    </Link>
                  </p>
                </form>
              )}

              {/* ── SUCCESS ── */}
              {success && (
                <div className="relative z-10 py-2 text-center">

                  <div className="mx-auto mb-6 flex h-[76px] w-[76px] items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/8">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="34" height="34"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffd700"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>

                  <h2 className="mb-2 text-3xl font-serif-display italic font-semibold gold-text">
                    Compte créé avec succès !
                  </h2>
                  <p className="mb-7 text-lg font-serif-body leading-relaxed text-[#a89f8c]">
                    Bienvenue sur{" "}
                    <span className="font-semibold gold-text not-italic">Zonarena</span> !
                  </p>

                  <div className="mb-7 rounded-sm border border-amber-400/25 bg-amber-400/5 p-5 text-left">
                    <p className="mb-1.5 text-lg font-serif-display italic font-semibold gold-text">
                      Quiz-Arena
                    </p>
                    <p className="text-base leading-relaxed text-[#c9c2b2]">
                      Amusez-vous et gagnez de l'argent réellement sur Zonarena.
                    </p>
                  </div>

                  <button
                    onClick={() => router.push("/login")}
                    className="block w-full rounded-sm border border-amber-400/30 py-3.5 text-base font-serif-body font-semibold text-amber-300 transition hover:bg-amber-400/5"
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