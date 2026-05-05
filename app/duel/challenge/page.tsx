"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Step = "form" | "sending" | "waiting";

export default function DuelChallengePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const duelIdRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

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

      const { data: existingDuel } = await supabase
        .from("duels")
        .select("id")
        .or(
          `and(player_a.eq.${user.id},player_b.eq.${opponent.id}),and(player_a.eq.${opponent.id},player_b.eq.${user.id})`
        )
        .in("status", ["negotiating", "playing"])
        .maybeSingle();

      if (existingDuel) {
        setError("Tu as déjà un duel en cours avec ce joueur.");
        setStep("form");
        return;
      }

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

      duelIdRef.current = duel.id;
      setOpponentName(opponent.full_name);
      setCountdown(60);
      setStep("waiting");

      // ── Countdown visuel 60s ──
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // ── Auto cancel après 60s ──
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
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

          if (channelRef.current) supabase.removeChannel(channelRef.current);
          clearInterval(countdownRef.current!);
          setError("Aucune réponse, défi expiré.");
          setStep("form");
        }
      }, 60000);

      // ── Realtime : écoute les changements du duel ──
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const channel = supabase
        .channel(`challenge-${duel.id}`)
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

            if (updated.status === "negotiating" || updated.status === "ready") {
              clearTimeout(timerRef.current!);
              clearInterval(countdownRef.current!);
              supabase.removeChannel(channel);
              router.push(`/duel/${duel.id}/negotiate`);
            } else if (updated.status === "cancelled") {
              clearTimeout(timerRef.current!);
              clearInterval(countdownRef.current!);
              supabase.removeChannel(channel);
              setError("Ton adversaire a refusé le duel.");
              setStep("form");
            }
          }
        )
        .subscribe((status) => {
          console.log("Channel status:", status);
        });

      channelRef.current = channel;

    } catch {
      setError("Une erreur inattendue.");
      setStep("form");
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-500/5 blur-[100px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-5 py-16 flex flex-col items-center justify-center min-h-screen">

        {step === "waiting" ? (
          /* ── ÉTAT ATTENTE ── */
          <div className="w-full text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-white/25 mb-8">Défi envoyé</p>

            {/* Spinner + timer */}
            <div className="relative w-28 h-28 mx-auto mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112">
                <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                <circle
                  cx="56" cy="56" r="48"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 48}`}
                  strokeDashoffset={`${2 * Math.PI * 48 * (1 - countdown / 60)}`}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-orange-400">{countdown}</span>
                <span className="text-xs text-white/30">sec</span>
              </div>
            </div>

            <h2 className="text-xl font-black mb-2">
              En attente de{" "}
              <span className="text-orange-400">{opponentName}</span>
            </h2>
            <p className="text-white/35 text-sm mb-10">
              Il a {countdown} seconde{countdown > 1 ? "s" : ""} pour accepter ton défi
            </p>

            {/* Pulse dots */}
            <div className="flex justify-center gap-2 mb-10">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-orange-500/50"
                  style={{ animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite` }}
                />
              ))}
            </div>

            <button
              onClick={async () => {
                if (duelIdRef.current) {
                  await supabase.from("duels").update({ status: "cancelled" }).eq("id", duelIdRef.current);
                }
                if (channelRef.current) supabase.removeChannel(channelRef.current);
                clearTimeout(timerRef.current!);
                clearInterval(countdownRef.current!);
                setStep("form");
                setName("");
              }}
              className="text-xs text-white/20 hover:text-white/40 transition-colors"
            >
              Annuler le défi
            </button>
          </div>

        ) : (
          /* ── FORMULAIRE ── */
          <div className="w-full">
            <p className="text-xs uppercase tracking-[0.4em] text-white/25 mb-4">Duel 1v1</p>
            <h1 className="text-3xl font-black mb-2">
              Défier un <span className="text-orange-400">joueur</span>
            </h1>
            <p className="text-white/35 text-sm mb-10">Entre le nom exact de ton adversaire</p>

            <div className="space-y-3">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-sm">👤</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleChallenge()}
                  placeholder="Nom de l'adversaire"
                  className="w-full pl-10 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-orange-500/50 transition-colors font-medium"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleChallenge}
                disabled={step === "sending"}
                className="w-full group relative rounded-2xl bg-orange-500 px-8 py-5 font-black text-lg text-black transition-all duration-300 hover:bg-orange-400 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {step === "sending" ? (
                    <>
                      <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                      <span>Recherche...</span>
                    </>
                  ) : (
                    <>
                      <span>Envoyer le défi</span>
                      <span className="group-hover:translate-x-1 transition-transform">⚔️</span>
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </main>
  );
}