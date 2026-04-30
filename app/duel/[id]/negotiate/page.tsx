"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Theme = "drapeaux" | "marques" | "films";
type Role = "a" | "b";

const THEMES: { id: Theme; label: string; icon: string; desc: string }[] = [
  { id: "drapeaux", label: "Drapeaux", icon: "🌍", desc: "Reconnais les drapeaux du monde" },
  { id: "marques",  label: "Marques",  icon: "🏷️", desc: "Identifie les logos de marques" },
  { id: "films",    label: "Films & Séries", icon: "🎬", desc: "Quiz cinéma et séries" },
];

type DuelData = {
  id: string;
  player_a: string;
  player_b: string;
  status: string;
  theme: Theme | null;
  theme_proposed_by: string | null;
  theme_expires_at: string | null;
};

export default function DuelNegotiatePage() {
  const router = useRouter();
  const params = useParams();
  const duelId = params.id as string;

  const [duel, setDuel] = useState<DuelData | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [timeLeft, setTimeLeft] = useState(90);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [opponentName, setOpponentName] = useState("Adversaire");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Calcule le temps restant depuis theme_expires_at
  const calcTimeLeft = useCallback((expiresAt: string | null) => {
    if (!expiresAt) return 90;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  }, []);

  // Lance le countdown local
  const startTimer = useCallback((expiresAt: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const left = calcTimeLeft(expiresAt);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(timerRef.current!);
      }
    }, 1000);
  }, [calcTimeLeft]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);

      // Charger le duel
      const { data: duelData, error } = await supabase
        .from("duels")
        .select("id, player_a, player_b, status, theme, theme_proposed_by, theme_expires_at")
        .eq("id", duelId)
        .single();

      if (error || !duelData) { router.push("/dashboard"); return; }
      if (!["negotiating", "pending"].includes(duelData.status)) {
        router.push(`/duel/${duelId}/bet`);
        return;
      }

      setDuel(duelData);
      const myRole = duelData.player_a === user.id ? "a" : "b";
      setRole(myRole);

      // Charger le nom de l'adversaire
      const opponentId = myRole === "a" ? duelData.player_b : duelData.player_a;
      const { data: opp } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", opponentId)
        .single();
      if (opp) setOpponentName(opp.full_name);

      // Démarrer le timer si déjà en cours
      if (duelData.theme_expires_at) {
        setTimeLeft(calcTimeLeft(duelData.theme_expires_at));
        startTimer(duelData.theme_expires_at);
      }

      setLoading(false);

      // Écouter les mises à jour Realtime
      channelRef.current = supabase
        .channel(`negotiate-${duelId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "duels", filter: `id=eq.${duelId}` },
          (payload) => {
            const updated = payload.new as DuelData;
            setDuel(updated);

            if (updated.status === "cancelled") {
              router.push("/dashboard");
              return;
            }
            if (updated.status === "ready") {
              // Accord trouvé → on va au pari
              router.push(`/duel/${duelId}/bet`);
              return;
            }
            // Nouveau thème proposé → démarrer/relancer le timer
            if (updated.theme_expires_at) {
              setTimeLeft(calcTimeLeft(updated.theme_expires_at));
              startTimer(updated.theme_expires_at);
            }
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [duelId, router, calcTimeLeft, startTimer]);

  // Timeout → annuler le duel
  useEffect(() => {
    if (timeLeft === 0 && duel && duel.status === "negotiating") {
      supabase
        .from("duels")
        .update({ status: "cancelled" })
        .eq("id", duelId)
        .then(() => router.push("/dashboard"));
    }
  }, [timeLeft, duel, duelId, router]);

  const proposeTheme = async (theme: Theme) => {
    if (!myId || proposing) return;
    setProposing(true);

    // Calcule le nouveau expires_at (maintenant + 90s)
    const expiresAt = new Date(Date.now() + 90 * 1000).toISOString();

    await supabase
      .from("duels")
      .update({
        theme,
        theme_proposed_by: myId,
        theme_expires_at: expiresAt,
        status: "negotiating",
      })
      .eq("id", duelId);

    setProposing(false);
  };

  const acceptTheme = async () => {
    if (!duel?.theme || proposing) return;
    setProposing(true);

    await supabase
      .from("duels")
      .update({ status: "ready" })
      .eq("id", duelId);

    setProposing(false);
  };

  const cancelDuel = async () => {
    await supabase
      .from("duels")
      .update({ status: "cancelled" })
      .eq("id", duelId);
    router.push("/dashboard");
  };

  // États dérivés
  const iProposed = duel?.theme_proposed_by === myId;
  const theyProposed = duel?.theme && !iProposed;
  const hasProposal = !!duel?.theme;

  const timerColor =
    timeLeft > 30 ? "#f97316" : timeLeft > 10 ? "#eab308" : "#ef4444";

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-white/30 text-sm">Connexion au duel...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-5 py-12">

        {/* Header + Timer */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/30 mb-1">
              Négociation
            </p>
            <h1 className="text-2xl font-black">
              vs <span className="text-orange-400">{opponentName}</span>
            </h1>
          </div>

          {/* Timer circulaire */}
          {hasProposal && (
            <div className="relative w-16 h-16">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3"/>
                <circle
                  cx="28" cy="28" r="24"
                  fill="none"
                  stroke={timerColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - timeLeft / 90)}`}
                  style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
                />
              </svg>
              <span
                className="absolute inset-0 flex items-center justify-center text-sm font-black"
                style={{ color: timerColor }}
              >
                {timeLeft}s
              </span>
            </div>
          )}
        </div>

        {/* Statut de la négociation */}
        <div className="mb-6 rounded-xl border border-white/8 bg-white/[0.03] px-5 py-4 text-center">
          {!hasProposal && (
            <p className="text-white/50 text-sm">
              Propose un thème pour commencer la négociation.
            </p>
          )}
          {iProposed && (
            <p className="text-white/50 text-sm">
              Tu as proposé{" "}
              <span className="text-orange-400 font-bold">
                {THEMES.find(t => t.id === duel?.theme)?.label}
              </span>
              . En attente de {opponentName}...
            </p>
          )}
          {theyProposed && (
            <p className="text-white/50 text-sm">
              <span className="text-orange-400 font-bold">{opponentName}</span>{" "}
              propose{" "}
              <span className="text-white font-bold">
                {THEMES.find(t => t.id === duel?.theme)?.label}
              </span>
              . Accepte ou contre-propose !
            </p>
          )}
        </div>

        {/* Bouton accepter (visible seulement si l'autre a proposé) */}
        {theyProposed && (
          <button
            onClick={acceptTheme}
            disabled={proposing}
            className="w-full mb-4 group relative rounded-2xl bg-orange-500 px-8 py-4 font-black text-black transition-all hover:bg-orange-400 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {proposing ? (
                <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span>✓ Accepter</span>
                  <span className="font-normal">
                    {THEMES.find(t => t.id === duel?.theme)?.label}
                  </span>
                </>
              )}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>
        )}

        {/* Thèmes */}
        <p className="text-xs text-white/30 uppercase tracking-widest mb-3">
          {theyProposed ? "Ou contre-propose" : "Choisis un thème"}
        </p>

        <div className="space-y-3 mb-8">
          {THEMES.map((theme) => {
            const isSelected = duel?.theme === theme.id;
            const isMyProposal = isSelected && iProposed;
            const isTheirProposal = isSelected && theyProposed;

            return (
              <button
                key={theme.id}
                onClick={() => proposeTheme(theme.id)}
                disabled={proposing || isMyProposal}
                className={`w-full rounded-xl border p-4 text-left transition-all duration-200 flex items-center gap-4
                  ${isMyProposal
                    ? "border-orange-400/50 bg-orange-500/10 cursor-default"
                    : isTheirProposal
                    ? "border-white/20 bg-white/5 hover:border-orange-400/40 hover:bg-orange-500/5"
                    : "border-white/8 bg-white/[0.02] hover:border-orange-400/30 hover:bg-orange-500/5"
                  }
                  disabled:cursor-not-allowed
                `}
              >
                <span style={{ fontSize: "24px" }}>{theme.icon}</span>
                <div className="flex-1">
                  <p className={`font-bold text-sm ${isMyProposal ? "text-orange-400" : "text-white"}`}>
                    {theme.label}
                    {isMyProposal && (
                      <span className="ml-2 text-xs font-normal text-orange-400/60">
                        ta proposition
                      </span>
                    )}
                    {isTheirProposal && (
                      <span className="ml-2 text-xs font-normal text-white/40">
                        proposition adverse
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">{theme.desc}</p>
                </div>
                {isMyProposal && (
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Annuler */}
        <button
          onClick={cancelDuel}
          className="w-full text-sm text-white/20 hover:text-red-400/60 transition-colors underline underline-offset-4"
        >
          Abandonner le duel
        </button>

      </div>
    </main>
  );
}