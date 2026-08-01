"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Theme = "drapeaux" | "memoire" | "tankarena";
type Role = "a" | "b";
type Phase = "theme" | "bet";

const THEMES: { id: Theme; label: string; icon: string; desc: string; color: string }[] = [
  { id: "drapeaux", label: "Drapeaux", icon: "🌍", desc: "Reconnais les drapeaux du monde", color: "#3b82f6" },
  { id: "memoire", label: "Mémoire", icon: "🧠", desc: "Teste ta mémoire en un temps limité", color: "#8b5cf6" },
  { id: "tankarena", label: "Tank Arena", icon: "🎮", desc: "Affronte ton adversaire dans l'arène", color: "#f59e0b" },
];

type DuelData = {
  id: string;
  player_a: string;
  player_b: string;
  status: string;
  theme: Theme | null;
  theme_proposed_by: string | null;
  theme_expires_at: string | null;
  bet_a: number | null;
  bet_b: number | null;
  bet_confirmed_a: boolean | null;
  bet_confirmed_b: boolean | null;
};

export default function DuelNegotiatePage() {
  const router = useRouter();
  const params = useParams();
  const duelId = params.id as string;

  const [duel, setDuel] = useState<DuelData | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [myCoins, setMyCoins] = useState<number>(0);
  const [role, setRole] = useState<Role | null>(null);
  const [phase, setPhase] = useState<Phase>("theme");
  const [timeLeft, setTimeLeft] = useState(90);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [opponentName, setOpponentName] = useState("Adversaire");
  const [betInput, setBetInput] = useState("50");
  const [betError, setBetError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [iConfirmed, setIConfirmed] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const calcTimeLeft = useCallback((expiresAt: string | null) => {
    if (!expiresAt) return 90;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  }, []);

  const startTimer = useCallback(
    (expiresAt: string) => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const left = calcTimeLeft(expiresAt);
        setTimeLeft(left);
        if (left <= 0) clearInterval(timerRef.current!);
      }, 1000);
    },
    [calcTimeLeft]
  );

  useEffect(() => {
    let cancelled = false;
    let localChannel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      // En développement, React peut exécuter l'effet deux fois.
      // On supprime donc toujours l'ancien channel avant d'en créer un nouveau.
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      setMyId(user.id);

      const { data: userData } = await supabase
        .from("users")
        .select("coins")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      if (userData) {
        setMyCoins(Number(userData.coins) || 0);
      }

      const { data: duelData, error } = await supabase
        .from("duels")
        .select("*")
        .eq("id", duelId)
        .single();

      if (cancelled) return;

      if (error || !duelData) {
        router.replace("/dashboard");
        return;
      }

      if (duelData.status === "pending") {
        router.replace(`/duel/${duelId}/respond`);
        return;
      }

      if (duelData.status === "playing") {
        router.replace(`/duel/${duelId}/play`);
        return;
      }

      if (!["negotiating", "ready"].includes(duelData.status)) {
        router.replace("/dashboard");
        return;
      }

      if (duelData.status === "ready") {
        setPhase("bet");
      }

      setDuel(duelData);

      const myRole: Role =
        duelData.player_a === user.id ? "a" : "b";

      setRole(myRole);

      const opponentId =
        myRole === "a" ? duelData.player_b : duelData.player_a;

      const { data: opp } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", opponentId)
        .single();

      if (cancelled) return;

      if (opp?.full_name) {
        setOpponentName(opp.full_name);
      }

      const expiresAt = duelData.theme_expires_at;

      if (expiresAt) {
        setTimeLeft(calcTimeLeft(expiresAt));
        startTimer(expiresAt);
      } else {
        const localExpiry = new Date(
          Date.now() + 90 * 1000
        ).toISOString();

        startTimer(localExpiry);
        setTimeLeft(90);
      }

      setLoading(false);

      if (cancelled) return;

      // Nom unique : évite qu'un ancien channel déjà abonné soit réutilisé.
      const channelName = `negotiate-${duelId}-${user.id}-${Date.now()}`;

      localChannel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "duels",
            filter: `id=eq.${duelId}`,
          },
          (payload) => {
            if (cancelled) return;

            const updated = payload.new as DuelData;
            setDuel(updated);

            if (updated.status === "cancelled") {
              router.replace("/dashboard");
              return;
            }

            if (updated.status === "playing") {
              router.replace(`/duel/${duelId}/play`);
              return;
            }

            if (updated.status === "ready") {
              setPhase("bet");
              setTimeLeft(90);
              return;
            }

            if (updated.theme_expires_at) {
              setTimeLeft(
                calcTimeLeft(updated.theme_expires_at)
              );
              startTimer(updated.theme_expires_at);
            }
          }
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            console.error(
              "Erreur de connexion Realtime pour le duel",
              duelId
            );
          }
        });

      channelRef.current = localChannel;
    };

    void init();

    return () => {
      cancelled = true;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const channelToRemove =
        localChannel ?? channelRef.current;

      if (channelToRemove) {
        void supabase.removeChannel(channelToRemove);
      }

      if (channelRef.current === channelToRemove) {
        channelRef.current = null;
      }
    };
  }, [duelId, router, calcTimeLeft, startTimer]);

  useEffect(() => {
    if (timeLeft === 0 && duel && ["negotiating", "ready"].includes(duel.status)) {
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
    setStatusMsg(`Tu proposes : ${THEMES.find((t) => t.id === theme)?.label}`);
    const expiresAt = new Date(Date.now() + 90 * 1000).toISOString();
    await supabase
      .from("duels")
      .update({ theme, theme_proposed_by: myId, theme_expires_at: expiresAt, status: "negotiating" })
      .eq("id", duelId);
    setProposing(false);
  };

  const acceptTheme = async () => {
    if (!duel?.theme || proposing) return;
    setProposing(true);
    await supabase.from("duels").update({ status: "ready" }).eq("id", duelId);
    setProposing(false);
  };

  const proposeBet = async () => {
    setBetError(null);
    const amount = parseInt(betInput);
    if (isNaN(amount) || amount < 50) {
      setBetError("Mise minimum : 50 coins");
      return;
    }
    if (amount > myCoins) {
      setBetError("Tu n'as pas assez de coins");
      return;
    }
    if (!myId || !role || proposing) return;
    setProposing(true);
    setStatusMsg(`Tu proposes une mise de ${amount} coins`);
    // Chaque joueur écrit dans sa propre colonne bet_a ou bet_b
    const col = role === "a" ? "bet_a" : "bet_b";
    const confirmCol = role === "a" ? "bet_confirmed_a" : "bet_confirmed_b";
    await supabase
      .from("duels")
      .update({ [col]: amount, [confirmCol]: true })
      .eq("id", duelId);
    setIConfirmed(true);
    setProposing(false);
  };

  // L'adversaire "accepte" en entrant la même mise et confirmant
  const matchAndConfirmBet = async () => {
    if (!role || !duel || proposing) return;
    const opponentBet = role === "a" ? duel.bet_b : duel.bet_a;
    if (!opponentBet) return;
    if (opponentBet > myCoins) {
      setBetError("Tu n'as pas assez de coins");
      return;
    }
    setProposing(true);
    const col = role === "a" ? "bet_a" : "bet_b";
    const confirmCol = role === "a" ? "bet_confirmed_a" : "bet_confirmed_b";
    await supabase
      .from("duels")
      .update({ [col]: opponentBet, [confirmCol]: true })
      .eq("id", duelId);

    // Vérifie si l'autre a déjà confirmé → lancer le jeu
    const otherConfirmed = role === "a" ? duel.bet_confirmed_b : duel.bet_confirmed_a;
    if (otherConfirmed) {
      await supabase.from("duels").update({ status: "playing" }).eq("id", duelId);
      router.push(`/duel/${duelId}/play`);
    }
    setIConfirmed(true);
    setProposing(false);
  };

  const skipBet = async () => {
    if (proposing) return;
    setProposing(true);
    await supabase
      .from("duels")
      .update({ status: "playing", bet_a: null, bet_b: null, bet_confirmed_a: false, bet_confirmed_b: false })
      .eq("id", duelId);
    router.push(`/duel/${duelId}/play`);
  };

  const cancelDuel = async () => {
    await supabase.from("duels").update({ status: "cancelled" }).eq("id", duelId);
    router.push("/dashboard");
  };

  const iProposed = duel?.theme_proposed_by === myId;
  const selectedTheme = THEMES.find((t) => t.id === duel?.theme);

  // Pari: ma mise et celle de l'adversaire
  const myBet = role === "a" ? duel?.bet_a : duel?.bet_b;
  const opponentBet = role === "a" ? duel?.bet_b : duel?.bet_a;
  const opponentConfirmed = role === "a" ? duel?.bet_confirmed_b : duel?.bet_confirmed_a;

  const timerColor =
    timeLeft > 60 ? "#22c55e" : timeLeft > 30 ? "#f59e0b" : "#ef4444";
  const timerPercent = Math.round((timeLeft / 90) * 100);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Connexion au duel...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-500/6 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-purple-500/5 blur-[80px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/25 mb-1">
              {phase === "theme" ? "Étape 1 · Choix du thème" : "Étape 2 · Paris optionnel"}
            </p>
            <h1 className="text-2xl font-black tracking-tight">
              VS{" "}
              <span className="text-orange-400">{opponentName}</span>
            </h1>
          </div>

          {/* Timer ring */}
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke={timerColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - timerPercent / 100)}`}
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-black" style={{ color: timerColor }}>
                {timeLeft}
              </span>
            </div>
          </div>
        </div>

        {/* Phase indicator */}
        <div className="flex gap-2 mb-8">
          {["theme", "bet"].map((p, i) => (
            <div key={p} className="flex-1 flex items-center gap-2">
              <div
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  phase === p
                    ? "bg-orange-500"
                    : i < ["theme", "bet"].indexOf(phase)
                    ? "bg-orange-500/40"
                    : "bg-white/8"
                }`}
              />
            </div>
          ))}
        </div>

        {/* ── PHASE THÈME ── */}
        {phase === "theme" && (
          <div>
            {/* State banner */}
            {duel?.theme && (
              <div
                className="mb-6 rounded-2xl border p-4 flex items-center gap-3"
                style={{
                  borderColor: selectedTheme?.color + "40",
                  backgroundColor: selectedTheme?.color + "10",
                }}
              >
                <span className="text-2xl">{selectedTheme?.icon}</span>
                <div className="flex-1">
                  <p className="font-bold text-sm">{selectedTheme?.label}</p>
                  <p className="text-xs text-white/40">
                    {iProposed
                      ? `Tu attends la réponse de ${opponentName}...`
                      : `${opponentName} propose ce thème`}
                  </p>
                </div>
                {!iProposed && (
                  <button
                    onClick={acceptTheme}
                    disabled={proposing}
                    className="px-4 py-2 rounded-xl bg-orange-500 text-black text-sm font-black hover:bg-orange-400 transition-colors disabled:opacity-50"
                  >
                    ✓ Accepter
                  </button>
                )}
              </div>
            )}

            {/* Theme cards */}
            <p className="text-xs text-white/30 uppercase tracking-widest mb-4">
              {duel?.theme
                ? iProposed
                  ? "Proposes un autre thème"
                  : "Ou propose un autre"
                : "Choisis un thème"}
            </p>

            <div className="space-y-3">
              {THEMES.map((theme) => {
                const isSelected = duel?.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => proposeTheme(theme.id)}
                    disabled={proposing || (isSelected && iProposed)}
                    className="w-full group relative rounded-2xl border p-4 text-left transition-all duration-300 disabled:opacity-60"
                    style={{
                      borderColor: isSelected ? theme.color + "60" : "rgba(255,255,255,0.07)",
                      backgroundColor: isSelected ? theme.color + "12" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl transition-all duration-300 group-hover:scale-110"
                        style={{ backgroundColor: theme.color + "20" }}
                      >
                        {theme.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-sm text-white">{theme.label}</p>
                        <p className="text-xs text-white/35 mt-0.5">{theme.desc}</p>
                      </div>
                      {isSelected && iProposed && (
                        <span className="text-xs px-2 py-1 rounded-lg font-bold" style={{ backgroundColor: theme.color + "30", color: theme.color }}>
                          Proposé
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={cancelDuel}
              className="mt-8 w-full py-3 rounded-xl border border-white/6 text-white/30 text-sm hover:text-white/50 hover:border-white/10 transition-all duration-200"
            >
              Abandonner le duel
            </button>
          </div>
        )}

        {/* ── PHASE PARI ── */}
        {phase === "bet" && (
          <div>
            {/* Thème confirmé */}
            {selectedTheme && (
              <div
                className="mb-6 rounded-2xl border p-4 flex items-center gap-3"
                style={{ borderColor: selectedTheme.color + "40", backgroundColor: selectedTheme.color + "10" }}
              >
                <span className="text-2xl">{selectedTheme.icon}</span>
                <div>
                  <p className="text-xs text-white/40 mb-0.5">Thème confirmé</p>
                  <p className="font-black">{selectedTheme.label}</p>
                </div>
                <span
                  className="ml-auto text-xs px-2 py-1 rounded-lg font-bold"
                  style={{ backgroundColor: selectedTheme.color + "30", color: selectedTheme.color }}
                >
                  ✓ OK
                </span>
              </div>
            )}

            {/* Coins dispo */}
            <div className="mb-6 rounded-xl border border-white/6 bg-white/[0.02] p-3 flex items-center justify-between">
              <span className="text-xs text-white/35">Tes coins</span>
              <span className="font-black text-orange-400">🪙 {myCoins}</span>
            </div>

            {/* L'adversaire a proposé une mise → je peux matcher */}
            {opponentBet && !iConfirmed && (
              <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/8 p-5">
                <p className="text-xs text-yellow-400/70 uppercase tracking-widest mb-1">Mise proposée par {opponentName}</p>
                <p className="text-3xl font-black text-yellow-400 mb-1">🪙 {opponentBet}</p>
                <p className="text-xs text-white/35 mb-4">
                  Accepte cette mise pour que les deux joueurs parient {opponentBet} coins chacun.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={matchAndConfirmBet}
                    disabled={proposing || myCoins < opponentBet}
                    className="flex-1 py-3 rounded-xl bg-yellow-500 text-black font-black text-sm hover:bg-yellow-400 transition-colors disabled:opacity-40"
                  >
                    ✓ Accepter {opponentBet} coins
                  </button>
                  <button
                    onClick={skipBet}
                    disabled={proposing}
                    className="px-4 py-3 rounded-xl border border-white/10 text-white/50 text-sm hover:border-white/20 hover:text-white/70 transition-all"
                  >
                    Refuser
                  </button>
                </div>
                {myCoins < opponentBet && (
                  <p className="text-xs text-red-400 mt-2">Pas assez de coins pour accepter</p>
                )}
              </div>
            )}

            {/* J'ai confirmé → en attente de l'adversaire */}
            {iConfirmed && !opponentConfirmed && (
              <div className="mb-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <p className="text-sm text-yellow-400/80">
                  Tu as misé 🪙 {myBet} — en attente de {opponentName}...
                </p>
              </div>
            )}

            {/* Proposer ma mise (si l'adversaire n'a pas encore proposé et que je n'ai pas confirmé) */}
            {!opponentBet && !iConfirmed && (
              <div className="mb-4">
                <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Proposer une mise</p>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">🪙</span>
                    <input
                      type="number"
                      value={betInput}
                      onChange={(e) => { setBetInput(e.target.value); setBetError(null); }}
                      min={50}
                      max={myCoins}
                      className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                  </div>
                  <button
                    onClick={proposeBet}
                    disabled={proposing}
                    className="px-5 py-3.5 rounded-xl bg-orange-500 text-black font-black text-sm hover:bg-orange-400 transition-colors disabled:opacity-50"
                  >
                    Proposer
                  </button>
                </div>
                {betError && <p className="text-red-400 text-xs mt-2">{betError}</p>}
                <div className="flex gap-2 mt-3">
                  {[50, 100, 250, 500].filter((v) => v <= myCoins).map((v) => (
                    <button
                      key={v}
                      onClick={() => setBetInput(String(v))}
                      className="px-3 py-1.5 rounded-lg border border-white/8 bg-white/3 text-xs text-white/40 hover:text-white/70 hover:border-white/15 transition-all"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Jouer sans pari */}
            {!iConfirmed && (
            <button
              onClick={skipBet}
              disabled={proposing}
              className="w-full group relative rounded-2xl border border-white/8 bg-white/[0.02] px-6 py-4 text-center transition-all duration-300 hover:border-orange-500/30 hover:bg-orange-500/5 disabled:opacity-50"
            >
              <p className="font-black text-sm text-white group-hover:text-orange-300 transition-colors">
                Jouer sans parier →
              </p>
              <p className="text-xs text-white/30 mt-0.5">Juste pour le fun, aucun coin requis</p>
            </button>
            )}

            <button
              onClick={cancelDuel}
              className="mt-4 w-full py-3 rounded-xl border border-white/5 text-white/20 text-xs hover:text-white/40 transition-all"
            >
              Abandonner
            </button>
          </div>
        )}

        {/* Status message */}
        {statusMsg && (
          <div className="mt-4 text-center text-xs text-orange-400/70 animate-pulse">
            {statusMsg}
          </div>
        )}
      </div>
    </main>
  );
}