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

  const sanitizeName = (value: string) => {
    return value
      .replace(/[<>/{}[\]$`"'\\]/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 60);
  };

  const sanitizePhone = (value: string) => {
    return value.replace(/[^\d+]/g, "").slice(0, 15);
  };

  const sanitizeAmount = (value: string) => {
    return value.replace(/[^\d]/g, "").slice(0, 7);
  };

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

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
    const fullName = sanitizeName(form.fullName).trim();
    const moncashNumber = sanitizePhone(form.moncashNumber).trim();

    if (!fullName || !moncashNumber || !form.amount) {
      return setError("Tous les champs sont obligatoires");
    }

    if (fullName.length < 3) {
      return setError("Nom complet invalide");
    }

    if (moncashNumber.length < 8) {
      return setError("Numéro MonCash invalide");
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
          fullName,
          moncashNumber,
          amount,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Erreur lors de la demande");
        return;
      }

      setSuccess(true);
      setForm({ fullName: "", moncashNumber: "", amount: "" });

      const {
        data: { session },
      } = await supabase.auth.getSession();

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
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-pink-400/20 bg-zinc-950 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-pink-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-pink-400/10 blur-3xl" />

        <div className="relative">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-pink-400/30 bg-pink-400/10 px-4 py-2 text-xs font-black text-pink-300">
            💸 Retrait sécurisé via MonCash
          </div>

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

          <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm text-yellow-200">
            ⏳ Les demandes de retrait sont généralement traitées dans un délai de{" "}
            <span className="font-black text-yellow-400">10 à 20 minutes</span>. Merci de patienter.
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 animate-pulse rounded-2xl border border-green-500/30 bg-green-500/10 p-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-400 text-2xl text-black">
                ✅
              </div>
              <h2 className="text-lg font-black text-green-400">
                Félicitations !
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-green-200">
                Votre demande de retrait a été envoyée avec succès.
                Elle sera traitée dans environ{" "}
                <span className="font-black">10 à 20 minutes</span>.
              </p>
              <p className="mt-3 text-xs font-bold text-zinc-400">
                Merci de patienter et à bientôt sur{" "}
                <span className="text-pink-400">ZonArena</span>.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="text"
              placeholder="Nom complet"
              value={form.fullName}
              maxLength={60}
              autoComplete="name"
              onChange={(e) =>
                setForm({ ...form, fullName: sanitizeName(e.target.value) })
              }
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none transition focus:border-pink-400"
            />

            <input
              type="tel"
              placeholder="Numéro MonCash"
              value={form.moncashNumber}
              maxLength={15}
              inputMode="tel"
              autoComplete="tel"
              onChange={(e) =>
                setForm({
                  ...form,
                  moncashNumber: sanitizePhone(e.target.value),
                })
              }
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none transition focus:border-pink-400"
            />

            <input
              type="text"
              placeholder="Montant (min 250)"
              value={form.amount}
              maxLength={7}
              inputMode="numeric"
              onChange={(e) =>
                setForm({ ...form, amount: sanitizeAmount(e.target.value) })
              }
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none transition focus:border-pink-400"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-pink-500 py-3 font-black text-black transition hover:bg-pink-400 disabled:opacity-50"
            >
              {loading ? "Envoi..." : "Demander retrait"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-zinc-500">
            ZonArena vérifie les retraits pour protéger les joueurs et éviter les fraudes.
          </p>
        </div>
      </div>
    </main>
  );
}