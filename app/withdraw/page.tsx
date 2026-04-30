"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type FormType = {
  fullName: string;
  moncashNumber: string;
  amount: string;
};

export default function WithdrawPage() {
  const [coins, setCoins] = useState<number>(0);
  const [loadingCoins, setLoadingCoins] = useState(true);

  const [form, setForm] = useState<FormType>({
    fullName: "",
    moncashNumber: "",
    amount: "",
  });

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // ✅ fetch coins directement via Supabase (comme le dashboard)
  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setLoadingCoins(false);
          return;
        }

        const { data } = await supabase
          .from("users")
          .select("coins")
          .eq("id", session.user.id)
          .single();

        setCoins(Number(data?.coins) || 0);
      } catch (err) {
        console.error("Error fetching coins:", err);
        setCoins(0);
      } finally {
        setLoadingCoins(false);
      }
    };

    fetchCoins();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const amount = Number(form.amount);

    if (!form.fullName || !form.moncashNumber || !form.amount) {
      return setError("Tous les champs sont obligatoires");
    }

    if (!amount || isNaN(amount)) {
      return setError("Montant invalide");
    }

    if (amount < 250) {
      return setError("Minimum retrait = 250 GDS");
    }

    if (amount > coins) {
      return setError("Solde insuffisant");
    }

    setError("");
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fullName: form.fullName,
          moncashNumber: form.moncashNumber,
          amount,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Erreur lors de la demande");
        return;
      }

      setSuccess(true);

      // reset form
      setForm({ fullName: "", moncashNumber: "", amount: "" });

      // ✅ refresh coins après retrait via Supabase directement
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: refreshed } = await supabase
          .from("users")
          .select("coins")
          .eq("id", session.user.id)
          .single();

        setCoins(Number(refreshed?.coins) || 0);
      }

    } catch (err) {
      console.error(err);
      setError("Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
      <div className="w-full max-w-xl rounded-3xl border border-pink-400/20 bg-zinc-950 p-8 shadow-2xl">

        <h1 className="text-3xl font-black">
          Retrait <span className="text-pink-400">MonCash</span>
        </h1>

        <p className="mt-2 text-sm text-zinc-400">
          Solde disponible :{" "}
          {loadingCoins ? (
            <span className="text-zinc-500">Chargement...</span>
          ) : (
            <span className="font-bold text-pink-400">{coins} GDS</span>
          )}
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
            Demande envoyée avec succès ✅
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">

          <input
            type="text"
            placeholder="Nom complet"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-pink-400"
          />

          <input
            type="tel"
            placeholder="Numéro MonCash"
            value={form.moncashNumber}
            onChange={(e) => setForm({ ...form, moncashNumber: e.target.value })}
            className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-pink-400"
          />

          <input
            type="number"
            placeholder="Montant (min 250)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-pink-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-pink-500 py-3 font-black text-black transition hover:bg-pink-400 disabled:opacity-50"
          >
            {loading ? "Envoi..." : "Demander retrait"}
          </button>

        </form>
      </div>
    </main>
  );
}