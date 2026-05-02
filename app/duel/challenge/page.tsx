"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Step = "form" | "sending" | "waiting";

export default function DuelChallengePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);

  const handleChallenge = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Entre le nom de ton adversaire.");
      return;
    }

    setStep("sending");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Tu dois être connecté.");
        setStep("form");
        return;
      }

      // 🔍 Recherche adversaire
      const { data: opponents, error: opponentError } = await supabase
        .from("users")
        .select("id, full_name, coins")
        .ilike("full_name", name.trim());

      if (opponentError || !opponents || opponents.length === 0) {
        setError("Aucun joueur trouvé avec ce nom.");
        setStep("form");
        return;
      }

      if (opponents.length > 1) {
        setError("Plusieurs joueurs trouvés, sois plus précis.");
        setStep("form");
        return;
      }

      const opponent = opponents[0];

      if (opponent.id === user.id) {
        setError("Tu ne peux pas te défier toi-même !");
        setStep("form");
        return;
      }

      // 🔥 FIX : ne bloque plus avec pending
      const { data: existingDuel } = await supabase
        .from("duels")
        .select("id")
        .or(
          `and(player_a.eq.${user.id},player_b.eq.${opponent.id}),and(player_a.eq.${opponent.id},player_b.eq.${user.id})`
        )
        .in("status", ["negotiating", "playing"]) // ✅ FIX ICI
        .maybeSingle();

      if (existingDuel) {
        setError("Tu as déjà un duel en cours avec ce joueur.");
        setStep("form");
        return;
      }

      // 🆕 Création duel
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
        setError("Erreur lors de la création du duel.");
        setStep("form");
        return;
      }

      setOpponentName(opponent.full_name);
      setStep("waiting");

      // ⏱️ AUTO CANCEL (60s)
      setTimeout(async () => {
        const { data } = await supabase
          .from("duels")
          .select("status")
          .eq("id", duel.id)
          .single();

        if (data?.status === "pending") {
          await supabase
            .from("duels")
            .update({ status: "cancelled" })
            .eq("id", duel.id);

          setError("Aucune réponse, défi expiré.");
          setStep("form");
        }
      }, 60000);

      // 🔴 Realtime écoute
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
              supabase.removeChannel(channel);
              router.push(`/duel/${duel.id}/negotiate`);
            } else if (updated.status === "cancelled") {
              supabase.removeChannel(channel);
              setError("Ton adversaire a refusé le duel.");
              setStep("form");
            }
          }
        )
        .subscribe();

    } catch {
      setError("Une erreur inattendue.");
      setStep("form");
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="max-w-md w-full px-5">
        <h1 className="text-2xl mb-4">Défier un joueur</h1>

        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="Nom de l'adversaire"
          className="w-full p-3 rounded text-black"
        />

        {error && <p className="text-red-400 mt-2">{error}</p>}

        <button
          onClick={handleChallenge}
          disabled={step === "sending"}
          className="mt-4 w-full bg-orange-500 p-3 rounded text-black"
        >
          {step === "sending" ? "Envoi..." : "Envoyer le défi"}
        </button>

        {/* ✅ État attente */}
        {step === "waiting" && (
          <p className="mt-4 text-orange-400 text-sm text-center">
            En attente de {opponentName}...
          </p>
        )}
      </div>
    </main>
  );
}