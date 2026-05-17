"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

const inputCls =
  "w-full rounded-xl bg-[#09090b] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-yellow-400/50 transition";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Erreur de connexion");
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes borderRun {
          0%   { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -1600; }
        }
        .border-light { animation: borderRun 3s linear infinite; }
      `}</style>

      <main className="min-h-screen bg-[#09090b] text-white">

        {/* NAV */}
        <header className="border-b border-yellow-400/20 px-5 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-black text-yellow-400">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-black font-black text-base">
              Q
            </span>
            QuizArena
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-yellow-400/30 px-4 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-400/10"
          >
            Inscription
          </Link>
        </header>

        {/* PAGE */}
        <div className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4 py-10">

          <div className="relative w-full max-w-[420px]">

            {/* SVG ANIMATED BORDER */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ borderRadius: 20, overflow: "visible" }}
            >
              <rect
                x="1" y="1"
                width="calc(100% - 2px)" height="calc(100% - 2px)"
                rx="19" ry="19"
                fill="none"
                stroke="rgba(250,204,21,0.12)"
                strokeWidth="1.5"
              />
              <rect
                x="1" y="1"
                width="calc(100% - 2px)" height="calc(100% - 2px)"
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

            {/* CARD */}
            <div className="relative z-10 rounded-[18px] bg-[#111113] px-6 py-8 sm:px-8">

              <h1 className="text-2xl font-black text-yellow-400">Connexion</h1>
              <p className="mt-1 mb-6 text-sm text-zinc-500">
                Content de te revoir sur QuizArena
              </p>

              {error && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jean@exemple.com"
                    required
                    className={inputCls}
                  />
                </div>

                <div className="mb-6">
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={inputCls}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-yellow-400 py-3 text-[15px] font-black text-black transition hover:bg-yellow-300 disabled:opacity-60"
                >
                  {loading ? "Connexion..." : "Se connecter"}
                </button>
              </form>

              <div className="mt-4 text-center text-sm">
                <Link href="/forgot-password" className="text-zinc-500 hover:text-yellow-400 transition">
                  Mot de passe oublié ?
                </Link>
              </div>

              <p className="mt-4 text-center text-sm text-zinc-500">
                Pas encore de compte ?{" "}
                <Link href="/register" className="font-semibold text-yellow-400">
                  Crée-en un
                </Link>
              </p>

            </div>
          </div>
        </div>
      </main>
    </>
  );
}