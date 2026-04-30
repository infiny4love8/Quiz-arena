"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Step = "form" | "sending" | "waiting";

export default function DuelChallengePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);

  const handleChallenge = async () => {
    setError(null);

    if (!email.trim()) {
      setError("Entre l'email de ton adversaire.");
      return;
    }

    setStep("sending");

    try {
      // 1. Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Tu dois être connecté.");
        setStep("form");
        return;
      }

      // 2. Vérifier que A ne se défie pas lui-même
      if (user.email === email.trim().toLowerCase()) {
        setError("Tu ne peux pas te défier toi-même !");
        setStep("form");
        return;
      }

      // 3. Chercher B par email dans la table users
      const { data: opponent, error: opponentError } = await supabase
        .from("users")
        .select("id, full_name, coins")
        .eq("email", email.trim().toLowerCase())
        .single();

      if (opponentError || !opponent) {
        setError("Aucun joueur trouvé avec cet email. Vérifie et réessaie.");
        setStep("form");
        return;
      }

      // 4. Vérifier qu'il n'y a pas déjà un duel en cours entre ces deux joueurs
      const { data: existingDuel } = await supabase
        .from("duels")
        .select("id")
        .or(
          `and(player_a.eq.${user.id},player_b.eq.${opponent.id}),and(player_a.eq.${opponent.id},player_b.eq.${user.id})`
        )
        .in("status", ["pending", "negotiating", "playing"])
        .maybeSingle();

      if (existingDuel) {
        setError("Tu as déjà un duel en cours avec ce joueur.");
        setStep("form");
        return;
      }

      // 5. Créer le duel dans Supabase
      const { data: duel, error: duelError } = await supabase
        .from("duels")
        .insert({
          player_a: user.id,
          player_b: opponent.id,
          status: "pending",
        })
        .select()
        .single();

      if (duelError || !duel) {
        setError("Erreur lors de la création du duel. Réessaie.");
        setStep("form");
        return;
      }

      // 6. Succès — on affiche l'écran d'attente
      setOpponentName(opponent.full_name);
      setStep("waiting");

      // 7. Écouter en temps réel la réponse de B (Supabase Realtime)
      const channel = supabase
        .channel(`duel-${duel.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "duels",
            filter: `id=eq.${duel.id}`,
          },
          (payload) => {
            const updated = payload.new as { status: string; id: string };
            if (updated.status === "negotiating") {
              // B a accepté → on va sur la page de négociation
              supabase.removeChannel(channel);
              router.push(`/duel/${duel.id}/negotiate`);
            } else if (updated.status === "cancelled") {
              // B a refusé
              supabase.removeChannel(channel);
              setError("Ton adversaire a refusé le duel.");
              setStep("form");
            }
          }
        )
        .subscribe();

    } catch {
      setError("Une erreur inattendue s'est produite.");
      setStep("form");
    }
  };

  // ── ÉCRAN D'ATTENTE ───────────────────────────────────
  if (step === "waiting") {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-5">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/5 blur-[120px] rounded-full" />
        </div>
        <div className="relative z-10 text-center max-w-sm">
          {/* Animation pulse */}
          <div className="relative mx-auto mb-8 w-24 h-24">
            <div className="absolute inset-0 rounded-full border-2 border-orange-500/30 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-orange-500/50 animate-ping [animation-delay:0.3s]" />
            <div className="relative w-24 h-24 rounded-full border border-orange-500/70 bg-orange-500/10 flex items-center justify-center">
              <span style={{ fontSize: "32px" }}>⚔️</span>
            </div>
          </div>

          <h2 className="text-2xl font-black mb-2">Défi envoyé !</h2>
          <p className="text-white/50 text-sm mb-1">
            En attente de la réponse de
          </p>
          <p className="text-orange-400 font-bold text-lg mb-8">
            {opponentName}
          </p>
          <p className="text-white/25 text-xs">
            Cette page se met à jour automatiquement dès qu'il accepte.
          </p>

          <button
            onClick={() => router.push("/duel")}
            className="mt-10 text-sm text-white/30 hover:text-white/60 transition-colors underline underline-offset-4"
          >
            Annuler et revenir
          </button>
        </div>
      </main>
    );
  }

  // ── FORMULAIRE ────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-5 py-16">

        {/* Retour */}
        <button
          onClick={() => router.push("/duel")}
          className="flex items-center gap-2 text-white/30 hover:text-white/70 transition-colors mb-12 text-sm"
        >
          <span>←</span>
          <span>Retour</span>
        </button>

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.4em] text-white/30 mb-3">
            Nouveau duel
          </p>
          <h1 className="text-4xl font-black tracking-tight">
            Défie un <span className="text-orange-400">ami</span>
          </h1>
          <p className="mt-3 text-white/40 text-sm leading-relaxed">
            Entre son email pour lui envoyer un défi. Il recevra une
            notification directement dans l'app.
          </p>
        </div>

        {/* Champ email */}
        <div className="mb-6">
          <label className="block text-xs text-white/40 uppercase tracking-widest mb-3">
            Email de l'adversaire
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleChallenge()}
            placeholder="adversaire@email.com"
            disabled={step === "sending"}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-white placeholder:text-white/20 text-sm outline-none focus:border-orange-400/50 focus:bg-orange-500/5 transition-all disabled:opacity-50"
          />
          {error && (
            <p className="mt-3 text-red-400 text-xs flex items-center gap-2">
              <span>⚠</span>
              <span>{error}</span>
            </p>
          )}
        </div>

        {/* Rappel rapide des règles */}
        <div className="mb-8 rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
          <p className="text-xs text-white/25 uppercase tracking-widest mb-3">
            Rappel
          </p>
          {[
            "Ton ami doit avoir un compte sur la plateforme",
            "Vous aurez 90s pour vous mettre d'accord sur le thème",
            "Le pari est optionnel — min. 50 coins",
          ].map((rule) => (
            <div key={rule} className="flex items-start gap-2">
              <span className="text-orange-400/60 text-xs mt-0.5">▸</span>
              <p className="text-white/35 text-xs leading-relaxed">{rule}</p>
            </div>
          ))}
        </div>

        {/* Bouton envoyer */}
        <button
          onClick={handleChallenge}
          disabled={step === "sending" || !email.trim()}
          className="w-full group relative rounded-2xl bg-orange-500 px-8 py-5 font-black text-lg text-black transition-all duration-300 hover:bg-orange-400 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            {step === "sending" ? (
              <>
                <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                <span>Envoi en cours...</span>
              </>
            ) : (
              <>
                <span>Envoyer le défi</span>
                <span className="text-xl group-hover:translate-x-1 transition-transform duration-200">
                  ⚔️
                </span>
              </>
            )}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </button>
      </div>
    </main>
  );
}