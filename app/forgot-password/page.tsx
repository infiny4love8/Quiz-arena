"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/update-password",
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Email envoyé !");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-blue-400/20 bg-zinc-950 p-6">
        <h1 className="text-2xl font-black text-blue-400">
          Mot de passe oublié
        </h1>

        <input
          type="email"
          placeholder="Ton email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl bg-black border border-zinc-700 p-3"
        />

        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full rounded-xl bg-blue-500 p-3 font-black text-black"
        >
          {loading ? "Envoi..." : "Envoyer"}
        </button>

        <div className="text-center text-sm">
          <Link href="/login" className="text-blue-400">
            Retour connexion
          </Link>
        </div>
      </div>
    </main>
  );
}