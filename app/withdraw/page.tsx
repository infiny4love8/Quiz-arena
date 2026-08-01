"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type FormType = {
  fullName: string;
  moncashNumber: string;
  amount: string;
};

export default function WithdrawPage() {
  const router = useRouter();
  const [coins, setCoins] = useState<number>(0);
  const [loadingCoins, setLoadingCoins] = useState(true);
  const [form, setForm] = useState<FormType>({
    fullName: "",
    moncashNumber: "",
    amount: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const sanitizeName = (value: string) =>
    value
      .normalize("NFKC")
      .replace(/[<>/{}[\]$`"\\]/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 60);

  const sanitizePhone = (value: string) =>
    value.replace(/[^\d+]/g, "").slice(0, 15);

  const sanitizeAmount = (value: string) =>
    value.replace(/[^\d]/g, "").slice(0, 7);

  useEffect(() => {
    let active = true;

    const fetchCoins = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data, error: userError } = await supabase
          .from("users")
          .select("coins")
          .eq("id", user.id)
          .single();

        if (userError) throw userError;
        if (active) setCoins(Number(data?.coins) || 0);
      } catch (fetchError) {
        console.error("Error fetching coins:", fetchError);
        if (active) setCoins(0);
      } finally {
        if (active) setLoadingCoins(false);
      }
    };

    fetchCoins();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    const amount = Number(form.amount);
    const fullName = sanitizeName(form.fullName).trim();
    const moncashNumber = sanitizePhone(form.moncashNumber).trim();

    if (!fullName || !moncashNumber || !form.amount) {
      setError("Tous les champs sont obligatoires");
      return;
    }
    if (fullName.length < 3) {
      setError("Nom complet invalide");
      return;
    }
    if (moncashNumber.replace(/\D/g, "").length < 8) {
      setError("Numéro MonCash invalide");
      return;
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError("Montant invalide");
      return;
    }
    if (amount < 250) {
      setError("Minimum retrait = 250 GDS");
      return;
    }
    if (amount > coins) {
      setError("Solde insuffisant");
      return;
    }

    setError("");
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ fullName, moncashNumber, amount }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.error || "Erreur lors de la demande");
        return;
      }

      setSuccess(true);
      setForm({ fullName: "", moncashNumber: "", amount: "" });
      setCoins(Number(data.newBalance) || 0);
    } catch (submitError) {
      console.error(submitError);
      setError("Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black px-5 py-10 text-white">
      <button
        type="button"
        onClick={() => router.replace("/dashboard")}
        aria-label="Retourner au dashboard"
        className="fixed left-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/90 text-xl text-zinc-300 shadow-lg backdrop-blur transition hover:border-pink-400/40 hover:text-pink-400 active:scale-95"
      >
        ←
      </button>

      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-pink-400/20 bg-zinc-950 p-6 shadow-2xl sm:p-8">
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-pink-500/10 blur-3xl" />
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
            <span className="font-black text-yellow-400">10 à 20 minutes</span>.
            Merci de patienter.
          </div>

          {error && (
            <div role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div role="status" className="mt-4 rounded-2xl border border-green-500/30 bg-green-500/10 p-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-400 text-2xl text-black">✅</div>
              <h2 className="text-lg font-black text-green-400">Félicitations !</h2>
              <p className="mt-2 text-sm leading-relaxed text-green-200">
                Votre demande de retrait a été envoyée avec succès. Elle sera traitée dans environ{" "}
                <span className="font-black">10 à 20 minutes</span>.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="text"
              name="fullName"
              placeholder="Nom complet"
              value={form.fullName}
              minLength={3}
              maxLength={60}
              required
              autoComplete="name"
              onChange={(e) => setForm({ ...form, fullName: sanitizeName(e.target.value) })}
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none transition focus:border-pink-400"
            />

            <input
              type="tel"
              name="moncashNumber"
              placeholder="Numéro MonCash"
              value={form.moncashNumber}
              minLength={8}
              maxLength={15}
              required
              inputMode="tel"
              autoComplete="tel"
              onChange={(e) => setForm({ ...form, moncashNumber: sanitizePhone(e.target.value) })}
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none transition focus:border-pink-400"
            />

            <input
              type="text"
              name="amount"
              placeholder="Montant (min 250)"
              value={form.amount}
              maxLength={7}
              required
              inputMode="numeric"
              autoComplete="off"
              onChange={(e) => setForm({ ...form, amount: sanitizeAmount(e.target.value) })}
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none transition focus:border-pink-400"
            />

            <button
              type="submit"
              disabled={loading || loadingCoins}
              className="w-full rounded-xl bg-pink-500 py-3 font-black text-black transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
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