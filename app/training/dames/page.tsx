"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ── DONNÉES ──────────────────────────────────────────────────────────────────

type Category = "prix" | "poids" | "taille" | "vitesse" | "population";

type Comparison = {
  question: string;         // "Lequel est plus cher ?"
  emoji: string;            // icône de la catégorie
  itemA: string;            // "iPhone 15 Pro"
  itemB: string;            // "Samsung Galaxy S24"
  valueA: number;           // valeur numérique pour comparer
  valueB: number;
  unitA: string;            // "1 199 €"
  unitB: string;            // "899 €"
  category: Category;
};

const DATA: Comparison[] = [
  // Prix
  { question: "Lequel est plus cher ?", emoji: "💰", category: "prix",
    itemA: "iPhone 15 Pro", itemB: "iPhone 15", valueA: 1199, valueB: 969, unitA: "1 199 €", unitB: "969 €" },
  { question: "Lequel est plus cher ?", emoji: "💰", category: "prix",
    itemA: "Tesla Model S", itemB: "Tesla Model 3", valueA: 94990, valueB: 42990, unitA: "94 990 €", unitB: "42 990 €" },
  { question: "Lequel est plus cher ?", emoji: "💰", category: "prix",
    itemA: "MacBook Pro M3", itemB: "MacBook Air M2", valueA: 2499, valueB: 1299, unitA: "2 499 €", unitB: "1 299 €" },
  { question: "Lequel est plus cher ?", emoji: "💰", category: "prix",
    itemA: "Nike Air Max", itemB: "Crocs Classic", valueA: 180, valueB: 50, unitA: "180 €", unitB: "50 €" },
  { question: "Lequel est plus cher ?", emoji: "💰", category: "prix",
    itemA: "Billet Paris-NYC", itemB: "Billet Paris-Madrid", valueA: 800, valueB: 120, unitA: "~800 €", unitB: "~120 €" },
  { question: "Lequel est plus cher ?", emoji: "💰", category: "prix",
    itemA: "PS5", itemB: "Nintendo Switch", valueA: 550, valueB: 320, unitA: "550 €", unitB: "320 €" },
  { question: "Lequel est plus cher ?", emoji: "💰", category: "prix",
    itemA: "Rolex Submariner", itemB: "Apple Watch Ultra", valueA: 10000, valueB: 899, unitA: "~10 000 €", unitB: "899 €" },

  // Poids
  { question: "Lequel est plus lourd ?", emoji: "⚖️", category: "poids",
    itemA: "Éléphant d'Afrique", itemB: "Hippopotame", valueA: 6000, valueB: 3000, unitA: "6 000 kg", unitB: "3 000 kg" },
  { question: "Lequel est plus lourd ?", emoji: "⚖️", category: "poids",
    itemA: "Boeing 747 (vide)", itemB: "Airbus A320 (vide)", valueA: 178756, valueB: 42400, unitA: "178 756 kg", unitB: "42 400 kg" },
  { question: "Lequel est plus lourd ?", emoji: "⚖️", category: "poids",
    itemA: "Baleine bleue", itemB: "Requin blanc", valueA: 150000, valueB: 1100, unitA: "150 000 kg", unitB: "1 100 kg" },
  { question: "Lequel est plus lourd ?", emoji: "⚖️", category: "poids",
    itemA: "iPhone 15 Pro", itemB: "Samsung Galaxy S24", valueA: 187, valueB: 167, unitA: "187 g", unitB: "167 g" },
  { question: "Lequel est plus lourd ?", emoji: "⚖️", category: "poids",
    itemA: "Brique de lait 1L", itemB: "Canette de soda 33cl", valueA: 1030, valueB: 370, unitA: "1 030 g", unitB: "370 g" },
  { question: "Lequel est plus lourd ?", emoji: "⚖️", category: "poids",
    itemA: "Vélo de route", itemB: "Trottinette électrique", valueA: 8, valueB: 15, unitA: "~8 kg", unitB: "~15 kg" },
  { question: "Lequel est plus lourd ?", emoji: "⚖️", category: "poids",
    itemA: "Piano à queue", itemB: "Moto Harley Davidson", valueA: 500, valueB: 360, unitA: "~500 kg", unitB: "~360 kg" },

  // Taille / hauteur
  { question: "Lequel est plus grand ?", emoji: "📏", category: "taille",
    itemA: "Tour Eiffel", itemB: "Statue de la Liberté", valueA: 330, valueB: 93, unitA: "330 m", unitB: "93 m" },
  { question: "Lequel est plus grand ?", emoji: "📏", category: "taille",
    itemA: "Burj Khalifa", itemB: "Empire State Building", valueA: 828, valueB: 443, unitA: "828 m", unitB: "443 m" },
  { question: "Lequel est plus grand ?", emoji: "📏", category: "taille",
    itemA: "Mont Blanc", itemB: "Mont Fuji", valueA: 4808, valueB: 3776, unitA: "4 808 m", unitB: "3 776 m" },
  { question: "Lequel est plus grand ?", emoji: "📏", category: "taille",
    itemA: "Russie", itemB: "Canada", valueA: 17098242, valueB: 9984670, unitA: "17 M km²", unitB: "9,9 M km²" },
  { question: "Lequel est plus grand ?", emoji: "📏", category: "taille",
    itemA: "Écran iPhone 15 Pro", itemB: "Écran Galaxy S24 Ultra", valueA: 6.1, valueB: 6.8, unitA: "6,1 pouces", unitB: "6,8 pouces" },
  { question: "Lequel est plus grand ?", emoji: "📏", category: "taille",
    itemA: "Girafe", itemB: "Éléphant d'Afrique", valueA: 5.5, valueB: 4, unitA: "~5,5 m", unitB: "~4 m" },
  { question: "Lequel est plus grand ?", emoji: "📏", category: "taille",
    itemA: "Amazone (longueur)", itemB: "Nil (longueur)", valueA: 6400, valueB: 6650, unitA: "6 400 km", unitB: "6 650 km" },

  // Vitesse
  { question: "Lequel est plus rapide ?", emoji: "⚡", category: "vitesse",
    itemA: "Guépard", itemB: "Autruche", valueA: 112, valueB: 70, unitA: "112 km/h", unitB: "70 km/h" },
  { question: "Lequel est plus rapide ?", emoji: "⚡", category: "vitesse",
    itemA: "TGV Duplex", itemB: "Eurostar", valueA: 320, valueB: 300, unitA: "320 km/h", unitB: "300 km/h" },
  { question: "Lequel est plus rapide ?", emoji: "⚡", category: "vitesse",
    itemA: "Formule 1", itemB: "MotoGP", valueA: 360, valueB: 300, unitA: "~360 km/h", unitB: "~300 km/h" },
  { question: "Lequel est plus rapide ?", emoji: "⚡", category: "vitesse",
    itemA: "Tesla Model S Plaid", itemB: "Bugatti Chiron", valueA: 322, valueB: 420, unitA: "322 km/h", unitB: "420 km/h" },
  { question: "Lequel est plus rapide ?", emoji: "⚡", category: "vitesse",
    itemA: "Requin blanc", itemB: "Dauphin", valueA: 56, valueB: 60, unitA: "56 km/h", unitB: "60 km/h" },
  { question: "Lequel est plus rapide ?", emoji: "⚡", category: "vitesse",
    itemA: "Son (air)", itemB: "Lumière (vide)", valueA: 1235, valueB: 1079252848, unitA: "1 235 km/h", unitB: "1 Md km/h" },

  // Population
  { question: "Lequel est plus peuplé ?", emoji: "🌍", category: "population",
    itemA: "Brésil", itemB: "Russie", valueA: 215, valueB: 144, unitA: "215 M hab.", unitB: "144 M hab." },
  { question: "Lequel est plus peuplé ?", emoji: "🌍", category: "population",
    itemA: "Lagos (Nigeria)", itemB: "Paris", valueA: 15, valueB: 2.1, unitA: "~15 M hab.", unitB: "~2,1 M hab." },
  { question: "Lequel est plus peuplé ?", emoji: "🌍", category: "population",
    itemA: "Tokyo", itemB: "New York", valueA: 14, valueB: 8.3, unitA: "14 M hab.", unitB: "8,3 M hab." },
  { question: "Lequel est plus peuplé ?", emoji: "🌍", category: "population",
    itemA: "Inde", itemB: "Chine", valueA: 1428, valueB: 1412, unitA: "1,43 Md", unitB: "1,41 Md" },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────

function seededShuffle<T>(array: T[], seed: string): T[] {
  const arr = [...array];
  let s = 0;
  for (let i = 0; i < seed.length; i++) s += seed.charCodeAt(i);
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function prepareRounds(seed?: string): Comparison[] {
  const arr = seed ? seededShuffle(DATA, seed) : [...DATA].sort(() => Math.random() - 0.5);
  return arr.slice(0, 10);
}

function playSound(type: "correct" | "wrong" | "finish") {
  if (typeof window === "undefined") return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    if (type === "correct") { o.type = "sine"; o.frequency.value = 660; g.gain.value = 0.08; }
    else if (type === "wrong") { o.type = "sawtooth"; o.frequency.value = 180; g.gain.value = 0.08; }
    else { o.type = "triangle"; o.frequency.value = 880; g.gain.value = 0.06; }
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    o.stop(ctx.currentTime + 0.22);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

const CATEGORY_COLORS: Record<Category, { bg: string; text: string; border: string }> = {
  prix:       { bg: "#fbbf2415", text: "#fbbf24", border: "#fbbf2440" },
  poids:      { bg: "#3b82f615", text: "#3b82f6", border: "#3b82f640" },
  taille:     { bg: "#10b98115", text: "#10b981", border: "#10b98140" },
  vitesse:    { bg: "#f9731615", text: "#f97316", border: "#f9731640" },
  population: { bg: "#8b5cf615", text: "#8b5cf6", border: "#8b5cf640" },
};

// ── TYPES ÉTAT ────────────────────────────────────────────────────────────────

type Phase = "menu" | "playing" | "reveal" | "waiting" | "finished";

// ── COMPOSANT INTERNE ─────────────────────────────────────────────────────────

function BiggerGamePage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const duelId   = searchParams.get("duelId");
  const duelRole = searchParams.get("role") as "a" | "b" | null;
  const isDuel   = !!duelId && !!duelRole;

  const [phase, setPhase]               = useState<Phase>("menu");
  const [rounds, setRounds]             = useState<Comparison[]>([]);
  const [index, setIndex]               = useState(0);
  const [score, setScore]               = useState(0);
  const [selected, setSelected]         = useState<"A" | "B" | null>(null);
  const [timeLeft, setTimeLeft]         = useState(8);
  const [history, setHistory]           = useState<boolean[]>([]);
  const [bestScore, setBestScore]       = useState(0);
  const [opponentDone, setOpponentDone] = useState(false);
  const [shake, setShake]               = useState(false);

  const scoreRef      = useRef(0);
  const indexRef      = useRef(0);
  const historyRef    = useRef<boolean[]>([]);
  const duelStarted   = useRef(false);
  const channelRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef      = useRef<NodeJS.Timeout | null>(null);

  // ── Init
  useEffect(() => {
    const saved = localStorage.getItem("training_score_bigger");
    if (saved) { try { setBestScore(JSON.parse(saved).points || 0); } catch {} }

    if (isDuel && duelId && !duelStarted.current) {
      duelStarted.current = true;
      channelRef.current = supabase
        .channel(`bigger-duel-${duelId}`)
        .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "duels", filter: `id=eq.${duelId}` },
          (payload) => {
            const u = payload.new as { score_a: number | null; score_b: number | null; status: string };
            const opp = duelRole === "a" ? u.score_b : u.score_a;
            if (opp !== null) setOpponentDone(true);
            if (u.status === "finished") router.push(`/duel/${duelId}/play`);
          }
        ).subscribe();
      setTimeout(() => startGame(), 150);
    }

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []); // eslint-disable-line

  const finishGame = useCallback(async (finalScore: number, finalHistory: boolean[]) => {
    playSound("finish");
    const best = Math.max(bestScore, finalScore);
    setBestScore(best);
    localStorage.setItem("training_score_bigger", JSON.stringify({
      score: `${finalScore}/10`, points: finalScore,
      success: finalScore >= 7, updatedAt: new Date().toISOString(),
    }));

    if (isDuel && duelId && duelRole) {
      const col = duelRole === "a" ? "score_a" : "score_b";
      await supabase.from("duels").update({ [col]: finalScore }).eq("id", duelId);
      const { data: updated } = await supabase.from("duels").select("*").eq("id", duelId).single();
      if (updated) {
        const opp = duelRole === "a" ? updated.score_b : updated.score_a;
        if (opp !== null) {
          const { data: { user } } = await supabase.auth.getUser();
          const myId = user?.id;
          const winnerId = finalScore > opp ? myId
            : opp > finalScore ? (duelRole === "a" ? updated.player_b : updated.player_a)
            : null;
          await supabase.from("duels").update({ status: "finished", winner: winnerId }).eq("id", duelId);
          if (updated.bet_a && updated.bet_b && updated.bet_confirmed_a && updated.bet_confirmed_b && winnerId) {
            const gain = Math.floor((updated.bet_a + updated.bet_b) * 0.9);
            await supabase.rpc("transfer_bet_coins", {
              winner_id: winnerId, amount: gain,
              loser_a: updated.player_a, loser_b: updated.player_b,
              bet_a: updated.bet_a, bet_b: updated.bet_b,
            });
          }
          router.push(`/duel/${duelId}/play`);
          return;
        }
        setPhase("waiting");
        setHistory(finalHistory);
        return;
      }
    }
    setHistory(finalHistory);
    setPhase("finished");
  }, [bestScore, isDuel, duelId, duelRole, router]);

  function startGame() {
    const r = prepareRounds(duelId ?? undefined);
    scoreRef.current = 0;
    indexRef.current = 0;
    historyRef.current = [];
    setRounds(r);
    setScore(0);
    setIndex(0);
    setHistory([]);
    setSelected(null);
    setTimeLeft(8);
    setPhase("playing");
  }

  // ── Timer
  useEffect(() => {
    if (phase !== "playing" || selected !== null) return;
    if (timeLeft <= 0) { handleAnswer(null); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, timeLeft, selected]);

  const handleAnswer = useCallback((choice: "A" | "B" | null) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const round = rounds[indexRef.current];
    if (!round) return;

    let correct = false;
    if (choice === "A") correct = round.valueA >= round.valueB;
    if (choice === "B") correct = round.valueB >= round.valueA;
    // null = timeout → faux

    if (correct) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      playSound("correct");
    } else {
      playSound("wrong");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }

    const newHistory = [...historyRef.current, correct];
    historyRef.current = newHistory;
    setSelected(choice ?? "A"); // montrer la révélation
    setPhase("reveal");

    // Passer à la suivante après 1.4s
    setTimeout(() => {
      const next = indexRef.current + 1;
      if (next >= rounds.length) {
        finishGame(scoreRef.current, newHistory);
      } else {
        indexRef.current = next;
        setIndex(next);
        setSelected(null);
        setTimeLeft(8);
        setPhase("playing");
      }
    }, 1400);
  }, [rounds, finishGame]);

  const currentRound = rounds[index];
  const timerPct = (timeLeft / 8) * 100;
  const timerColor = timeLeft > 4 ? "#10b981" : timeLeft > 2 ? "#f97316" : "#ef4444";
  const catColor = currentRound ? CATEGORY_COLORS[currentRound.category] : null;

  // ── MENU
  if (phase === "menu") {
    return (
      <main className="min-h-screen bg-[#09090f] text-white flex items-center justify-center px-5 py-12">
        <div className="max-w-sm w-full text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">🆚</div>
            <h1 className="text-4xl font-black tracking-tight mb-2">
              Qui est <span style={{ color: "#fbbf24" }}>plus</span> ?
            </h1>
            <p className="text-white/40 text-sm leading-relaxed">
              Deux éléments s&apos;affichent. Clique sur celui qui correspond à la question.
              10 rounds · 8 secondes par question.
            </p>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-8">
            {(["💰","⚖️","📏","⚡","🌍"] as const).map((e, i) => (
              <div key={i} className="aspect-square rounded-xl flex items-center justify-center text-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {e}
              </div>
            ))}
          </div>

          <div className="mb-8 rounded-2xl p-4 text-left space-y-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {[["✅ Bonne réponse","+ 1 point"],["⏱ Timeout (8s)","0 point"],["❌ Mauvaise réponse","0 point"]].map(([l,v]) => (
              <div key={l} className="flex justify-between text-sm">
                <span className="text-white/50">{l}</span>
                <span className="font-bold text-white">{v}</span>
              </div>
            ))}
          </div>

          <button onClick={startGame}
            className="w-full py-4 rounded-2xl font-black text-lg text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #fbbf24, #f97316)" }}>
            Commencer
          </button>

          {bestScore > 0 && (
            <p className="mt-4 text-white/30 text-sm">Meilleur : {bestScore}/10</p>
          )}
        </div>
      </main>
    );
  }

  // ── ATTENTE ADVERSAIRE
  if (phase === "waiting") {
    return (
      <main className="min-h-screen bg-[#09090f] text-white flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full border-2 border-yellow-500/30 border-t-yellow-400 animate-spin" />
          <h2 className="text-2xl font-black mb-2">Terminé ! <span style={{ color: "#fbbf24" }}>{score}/10</span></h2>
          <p className="text-white/40 text-sm mb-2">En attente de ton adversaire...</p>
          {opponentDone && <p className="text-yellow-400 text-sm animate-pulse mt-4">L&apos;adversaire a fini ! Calcul...</p>}
        </div>
      </main>
    );
  }

  // ── RÉSULTAT SOLO
  if (phase === "finished") {
    const pct = Math.round((score / 10) * 100);
    return (
      <main className="min-h-screen bg-[#09090f] text-white flex items-center justify-center px-5 py-12">
        <div className="max-w-sm w-full text-center">
          <div className="text-6xl mb-4">{score >= 8 ? "🏆" : score >= 5 ? "🎯" : "😅"}</div>
          <h2 className="text-5xl font-black mb-1">{score}<span className="text-white/30 text-3xl">/10</span></h2>
          <p className="text-white/40 text-sm mb-8">{pct}% de bonnes réponses</p>

          {/* Recap */}
          <div className="flex justify-center gap-1.5 mb-8 flex-wrap">
            {history.map((correct, i) => (
              <div key={i} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
                style={{
                  background: correct ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                  border: `1px solid ${correct ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
                  color: correct ? "#10b981" : "#ef4444",
                }}>
                {correct ? "✓" : "✗"}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={startGame}
              className="w-full py-4 rounded-2xl font-black text-black transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #fbbf24, #f97316)" }}>
              Rejouer
            </button>
            <a href="/training"
              className="w-full py-3 rounded-2xl font-bold text-sm text-white/40 hover:text-white/70 transition-colors text-center"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              Retour
            </a>
          </div>
        </div>
      </main>
    );
  }

  // ── JEU
  if (!currentRound) return null;
  const isReveal = phase === "reveal";
  const correctSide = currentRound.valueA >= currentRound.valueB ? "A" : "B";

  return (
    <main
      className="min-h-screen bg-[#09090f] text-white flex flex-col px-4 py-6 select-none"
      style={{ animation: shake ? "shake 0.4s ease" : undefined }}
    >
      <style jsx>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
        @keyframes popIn {
          0%{transform:scale(0.85);opacity:0}
          100%{transform:scale(1);opacity:1}
        }
        @keyframes slideUp {
          0%{transform:translateY(16px);opacity:0}
          100%{transform:translateY(0);opacity:1}
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30 font-mono">{index + 1}/10</span>
          <div className="flex gap-1">
            {history.map((c, i) => (
              <div key={i} className="w-2 h-2 rounded-full"
                style={{ background: c ? "#10b981" : "#ef4444" }} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-white/70">{score} pts</span>
          {/* Timer ring */}
          <div className="relative w-10 h-10">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
              <circle cx="20" cy="20" r="16" fill="none" stroke={timerColor} strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - timerPct / 100)}`}
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black" style={{ color: timerColor }}>{timeLeft}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="text-center mb-6" key={index} style={{ animation: "slideUp 0.3s ease" }}>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-3"
          style={{ background: catColor?.bg, color: catColor?.text, border: `1px solid ${catColor?.border}` }}>
          <span>{currentRound.emoji}</span>
          <span>{currentRound.question}</span>
        </div>
      </div>

      {/* Cards A vs B */}
      <div className="flex-1 flex flex-col gap-4 justify-center max-w-lg mx-auto w-full">
        {(["A", "B"] as const).map((side) => {
          const item  = side === "A" ? currentRound.itemA : currentRound.itemB;
          const value = side === "A" ? currentRound.unitA : currentRound.unitB;
          const isSelected = selected === side;
          const isCorrect  = correctSide === side;

          let borderColor = "rgba(255,255,255,0.10)";
          let bgColor     = "rgba(255,255,255,0.04)";
          let labelColor  = "rgba(255,255,255,0.5)";
          let scale       = "1";

          if (isReveal) {
            if (isCorrect) {
              borderColor = "rgba(16,185,129,0.7)";
              bgColor     = "rgba(16,185,129,0.12)";
              labelColor  = "#10b981";
              scale       = "1.02";
            } else {
              borderColor = "rgba(239,68,68,0.4)";
              bgColor     = "rgba(239,68,68,0.06)";
              labelColor  = "rgba(239,68,68,0.7)";
            }
          } else if (!isReveal) {
            borderColor = "rgba(255,255,255,0.10)";
          }

          return (
            <button
              key={side}
              onClick={() => { if (phase === "playing" && !selected) handleAnswer(side); }}
              disabled={phase !== "playing"}
              className="w-full rounded-2xl p-6 text-left transition-all duration-200 disabled:cursor-default"
              style={{
                background: bgColor,
                border: `2px solid ${borderColor}`,
                transform: `scale(${scale})`,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-black text-white leading-tight">{item}</p>
                  {isReveal && (
                    <p className="text-sm mt-1 font-bold" style={{ color: labelColor }}>
                      {value}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
                  style={{
                    background: isReveal && isCorrect ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)",
                    color: isReveal && isCorrect ? "#10b981" : "rgba(255,255,255,0.4)",
                    border: `1px solid ${isReveal && isCorrect ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.1)"}`,
                  }}>
                  {isReveal ? (isCorrect ? "✓" : "✗") : side}
                </div>
              </div>
            </button>
          );
        })}

        {/* VS badge */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="text-xs font-black text-white/20 tracking-widest">VS</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
      </div>

      {/* Hint timeout */}
      {phase === "playing" && timeLeft <= 3 && (
        <p className="text-center text-xs text-red-400 animate-pulse mt-4">Dépêche-toi !</p>
      )}
    </main>
  );
}

export default function BiggerGameWrapper() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#09090f] text-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-yellow-400/30 border-t-yellow-400 animate-spin" />
      </main>
    }>
      <BiggerGamePage />
    </Suspense>
  );
}