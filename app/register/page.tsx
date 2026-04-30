"use client";

import { useState } from "react";
import Link from "next/link";
import type { FormEvent } from "react";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const data = {
      fullName: String(formData.get("fullName")),
      moncashNumber: String(formData.get("moncashNumber")),
      whatsappNumber: String(formData.get("whatsappNumber")),
      age: String(formData.get("age")),
      email: String(formData.get("email")), // ✅ ajouté
      password: String(formData.get("password")),
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      alert(result.message || "Compte créé ! Allez dans votre email pour confirmer le lien");
    } catch (error) {
      alert("Erreur lors de l'inscription");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">
      <header className="border-b border-yellow-400/20 bg-black/70">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-xl font-black text-yellow-400">
            QuizArena
          </Link>

          <a
            href="/login"
            className="rounded-xl border border-yellow-400/30 px-4 py-2 text-sm font-semibold text-yellow-400"
          >
            Connexion
          </a>
        </nav>
      </header>

      <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-5">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-5 rounded-2xl border border-yellow-400/20 bg-zinc-950 p-6"
        >
          <h1 className="text-2xl font-black text-yellow-400">
            Créer un compte
          </h1>

          <input name="fullName" placeholder="Nom complet" required className="w-full rounded-xl bg-black border border-zinc-700 p-3" />

          {/* ✅ EMAIL AJOUTÉ */}
          <input name="email" type="email" placeholder="Email" required className="w-full rounded-xl bg-black border border-zinc-700 p-3" />

          <input name="moncashNumber" placeholder="Numéro MonCash" required className="w-full rounded-xl bg-black border border-zinc-700 p-3" />

          <input name="whatsappNumber" placeholder="Numéro WhatsApp" required className="w-full rounded-xl bg-black border border-zinc-700 p-3" />

          <input name="age" type="number" placeholder="Âge" required className="w-full rounded-xl bg-black border border-zinc-700 p-3" />

          <input name="password" type="password" placeholder="Mot de passe" required className="w-full rounded-xl bg-black border border-zinc-700 p-3" />

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-yellow-400 p-3 font-black text-black">
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>
      </section>
    </main>
  );
}