"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleUpdate() {
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Mot de passe mis à jour !");
      router.push("/login");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-blue-400/20 bg-zinc-950 p-6">
        <h1 className="text-2xl font-black text-blue-400">
          Nouveau mot de passe
        </h1>

        <input
          type="password"
          placeholder="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl bg-black border border-zinc-700 p-3 outline-none focus:border-blue-400"
        />

        <button
          onClick={handleUpdate}
          disabled={loading}
          className="w-full rounded-xl bg-blue-500 p-3 font-black text-black"
        >
          {loading ? "Mise à jour..." : "Changer le mot de passe"}
        </button>
      </div>
    </main>
  );
}