"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type DuelData = {
  id: string;
  player_a: string;
  player_b: string;
  status: string;
  player_a_info: {
    full_name: string;
    coins: number;
  };
};

type Step = "loading" | "view" | "accepting" | "refusing" | "error";

export default function DuelRespondPage() {
  const router = useRouter();
  const params = useParams();
  const duelId = params.id as string;

  const [step, setStep] = useState<Step>("loading");
  const [duel, setDuel] = useState<DuelData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadDuel = async () => {
      // 1. Vérifier que l'utilisateur connecté est bien B
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 2. Charger le duel
      const { data: duelData, error } = await supabase
        .from("duels")
        .select("id, player_a, player_b, status")
        .eq("id", duelId)
        .single();

      if (error || !duelData) {
        setErrorMsg("Ce duel n'existe pas ou a expiré.");
        setStep("error");
        return;
      }

      // 3. Vérifier que c'est bien B qui consulte cette page
      if (duelData.player_b !== user.id) {
        setErrorMsg("Tu n'es pas concerné par ce duel.");
        setStep("error");
        return;
      }

      // 4. Vérifier que le duel est encore en attente
      if (duelData.status !== "pending") {
        setErrorMsg("Ce duel a déjà été traité.");
        setStep("error");
        return;
      }

      // 5. Charger les infos de A
      const { data: playerA } = await supabase
        .from("users")
        .select("full_name, coins")
        .eq("id", duelData.player_a)
        .single();

      setDuel({
        ...duelData,
        player_a_info: playerA ?? { full_name: "Inconnu", coins: 0 },
      });
      setStep("view");
    };

    loadDuel();
  }, [duelId, router]);

  const handleAccept = async () => {
    if (!duel) return;
    setStep("accepting");

    const { error } = await supabase
      .from("duels")
      .update({ status: "negotiating" })
      .eq("id", duel.id);

    if (error) {
      setErrorMsg("Erreur lors de l'acceptation. Réessaie.");
      setStep("view");
      return;
    }

    // Redirection vers la négociation du thème
    router.push(`/duel/${duel.id}/negotiate`);
  };

  const handleRefuse = async () => {
    if (!duel) return;
    setStep("refusing");

    await supabase
      .from("duels")
      .update({ status: "cancelled" })
      .eq("id", duel.id);

    router.push("/dashboard");
  };

  // ── LOADING ───────────────────────────────────────────
  if (step === "loading") {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-white/30 text-sm">Chargement du défi...</p>
        </div>
      </main>
    );
  }

  // ── ERREUR ────────────────────────────────────────────
  if (step === "error") {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-6">😶</p>
          <h2 className="text-xl font-black mb-3">Oups</h2>
          <p className="text-white/40 text-sm mb-8">{errorMsg}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-white/20 px-6 py-3 text-sm font-bold text-white/60 hover:text-white hover:border-white/40 transition-all"
          >
            Retour au dashboard
          </button>
        </div>
      </main>
    );
  }

  // ── VUE PRINCIPALE ────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-5 py-16">

        {/* Label */}
        <p className="text-xs uppercase tracking-[0.4em] text-white/30 mb-10 text-center">
          Défi reçu
        </p>

        {/* Card défi */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 mb-6 text-center">
          {/* Avatar initiales de A */}
          <div className="w-16 h-16 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mx-auto mb-5">
            <span className="text-orange-400 font-black text-xl">
              {duel?.player_a_info.full_name?.charAt(0).toUpperCase() ?? "?"}
            </span>
          </div>

          <h2 className="text-2xl font-black mb-1">
            {duel?.player_a_info.full_name}
          </h2>
          <p className="text-white/40 text-sm mb-8">
            te lance un défi en duel 1v1
          </p>

          {/* Infos du duel */}
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="rounded-xl bg-white/5 border border-white/5 p-3">
              <p className="text-lg font-black text-orange-400">⚔️</p>
              <p className="text-xs text-white/30 mt-1">Duel 1v1</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/5 p-3">
              <p className="text-lg font-black text-orange-400">90s</p>
              <p className="text-xs text-white/30 mt-1">Négociation</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/5 p-3">
              <p className="text-lg font-black text-orange-400">🎯</p>
              <p className="text-xs text-white/30 mt-1">Thème à choisir</p>
            </div>
          </div>
        </div>

        {/* Rappel règles */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 mb-8 space-y-2">
          {[
            "Vous choisirez le thème ensemble (90s max)",
            "Le pari est optionnel — min. 50 coins",
            "Le gagnant empoche 90% du pot",
          ].map((rule) => (
            <div key={rule} className="flex items-start gap-2">
              <span className="text-orange-400/50 text-xs mt-0.5">▸</span>
              <p className="text-white/30 text-xs leading-relaxed">{rule}</p>
            </div>
          ))}
        </div>

        {/* Boutons accepter / refuser */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleAccept}
            disabled={step === "accepting" || step === "refusing"}
            className="w-full group relative rounded-2xl bg-orange-500 px-8 py-5 font-black text-lg text-black transition-all duration-300 hover:bg-orange-400 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              {step === "accepting" ? (
                <>
                  <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                  <span>Acceptation...</span>
                </>
              ) : (
                <>
                  <span>Accepter le défi</span>
                  <span>⚔️</span>
                </>
              )}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>

          <button
            onClick={handleRefuse}
            disabled={step === "accepting" || step === "refusing"}
            className="w-full rounded-2xl border border-white/10 px-8 py-4 font-bold text-sm text-white/50 transition-all hover:border-red-400/30 hover:text-red-400/70 hover:bg-red-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === "refusing" ? "Refus en cours..." : "Refuser"}
          </button>
        </div>

      </div>
    </main>
  );
}