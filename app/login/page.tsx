"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");

    } catch (err) {
      setError("Erreur de connexion");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-blue-500/20 bg-black/70">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-xl font-black text-blue-400">
            QuizArena
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-blue-400/30 px-4 py-2 text-sm font-semibold text-blue-400 hover:bg-blue-400 hover:text-black transition"
          >
            Inscription
          </Link>
        </nav>
      </header>

      <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-5">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-5 rounded-2xl border border-blue-400/20 bg-zinc-950 p-6"
        >
          <h1 className="text-2xl font-black text-blue-400">Connexion</h1>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-xl bg-black border border-zinc-700 p-3 outline-none focus:border-blue-400"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            required
            className="w-full rounded-xl bg-black border border-zinc-700 p-3 outline-none focus:border-blue-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-500 p-3 font-black text-black hover:bg-blue-400 transition disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <div className="text-center text-sm">
            <Link href="/forgot-password" className="text-blue-400 hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}