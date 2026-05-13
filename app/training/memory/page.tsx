"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Level = "normal" | "hard";
type GameStatus = "menu" | "memorize" | "question" | "feedback" | "finished" | "waiting";

type EmojiItem = {
  emoji: string;
  category: "fruit" | "transport" | "animal" | "symbol";
  color: "red" | "orange" | "yellow" | "green" | "blue" | "other";
};

type QuestionType =
  | "position-of-emoji"
  | "emoji-at-position"
  | "count-category"
  | "missing-emoji"
  | "rebuild-order";

type Round = {
  id: number;
  sequence: EmojiItem[];
  questionType: QuestionType;
  question: string;
  options: string[];
  answer: string;
};

type AnswerHistory = {
  round: number;
  question: string;
  selected: string;
  answer: string;
  correct: boolean;
  points: number;
};

const EMOJIS: EmojiItem[] = [
  { emoji: "🍎", category: "fruit", color: "red" },
  { emoji: "🍓", category: "fruit", color: "red" },
  { emoji: "🍒", category: "fruit", color: "red" },
  { emoji: "🍉", category: "fruit", color: "green" },
  { emoji: "🍊", category: "fruit", color: "orange" },
  { emoji: "🥭", category: "fruit", color: "orange" },
  { emoji: "🍌", category: "fruit", color: "yellow" },
  { emoji: "🍇", category: "fruit", color: "other" },
  { emoji: "🥝", category: "fruit", color: "green" },
  { emoji: "🍍", category: "fruit", color: "yellow" },
  { emoji: "🚗", category: "transport", color: "red" },
  { emoji: "🚌", category: "transport", color: "yellow" },
  { emoji: "🚕", category: "transport", color: "yellow" },
  { emoji: "🚀", category: "transport", color: "red" },
  { emoji: "✈️", category: "transport", color: "blue" },
  { emoji: "🚲", category: "transport", color: "other" },
  { emoji: "🛵", category: "transport", color: "other" },
  { emoji: "🚢", category: "transport", color: "blue" },
  { emoji: "🚁", category: "transport", color: "red" },
  { emoji: "🚂", category: "transport", color: "other" },
  { emoji: "🐶", category: "animal", color: "other" },
  { emoji: "🐱", category: "animal", color: "other" },
  { emoji: "🦁", category: "animal", color: "yellow" },
  { emoji: "🐵", category: "animal", color: "other" },
  { emoji: "🐸", category: "animal", color: "green" },
  { emoji: "🐼", category: "animal", color: "other" },
  { emoji: "🐯", category: "animal", color: "orange" },
  { emoji: "🐰", category: "animal", color: "other" },
  { emoji: "🐢", category: "animal", color: "green" },
  { emoji: "🦊", category: "animal", color: "orange" },
  { emoji: "⭐", category: "symbol", color: "yellow" },
  { emoji: "❤️", category: "symbol", color: "red" },
  { emoji: "🔥", category: "symbol", color: "orange" },
  { emoji: "⚡", category: "symbol", color: "yellow" },
  { emoji: "💎", category: "symbol", color: "blue" },
  { emoji: "🎯", category: "symbol", color: "red" },
  { emoji: "🧠", category: "symbol", color: "other" },
  { emoji: "🏆", category: "symbol", color: "yellow" },
  { emoji: "🎲", category: "symbol", color: "other" },
  { emoji: "🎵", category: "symbol", color: "blue" },
];

const LEVEL_CONFIG = {
  normal: { label: "Normal", rounds: 10, sequenceSize: 5, memorizeSeconds: 2.5, answerSeconds: 6, target: 70, wrongPenalty: 0 },
  hard:   { label: "Difficile", rounds: 10, sequenceSize: 6, memorizeSeconds: 2.5, answerSeconds: 5, target: 90, wrongPenalty: -3 },
};

function shuffleArray<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

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

function getCategoryLabel(category: EmojiItem["category"]) {
  return { fruit: "fruits", transport: "transports", animal: "animaux", symbol: "symboles" }[category];
}

function playSound(type: "start" | "tick" | "correct" | "wrong" | "finish") {
  if (typeof window === "undefined") return;
  const AC = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  const audio = new AC();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.connect(gain); gain.connect(audio.destination);
  if (type === "start")   { osc.frequency.value = 520; gain.gain.value = 0.08; osc.type = "triangle"; }
  if (type === "tick")    { osc.frequency.value = 880; gain.gain.value = 0.04; osc.type = "sine"; }
  if (type === "correct") { osc.frequency.value = 900; gain.gain.value = 0.09; osc.type = "sine"; }
  if (type === "wrong")   { osc.frequency.value = 160; gain.gain.value = 0.12; osc.type = "sawtooth"; }
  if (type === "finish")  { osc.frequency.value = 720; gain.gain.value = 0.09; osc.type = "triangle"; }
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.2);
  osc.stop(audio.currentTime + 0.22);
}

function buildRound(roundId: number, level: Level, seedId?: string): Round {
  const config = LEVEL_CONFIG[level];
  const sequence = seedId
    ? seededShuffle(EMOJIS, `${seedId}-${roundId}`).slice(0, config.sequenceSize)
    : shuffleArray(EMOJIS).slice(0, config.sequenceSize);

  const possibleTypes: QuestionType[] = level === "normal"
    ? ["position-of-emoji", "emoji-at-position", "count-category", "missing-emoji"]
    : ["position-of-emoji", "emoji-at-position", "count-category", "missing-emoji", "rebuild-order"];

  const typeIndex = seedId
    ? Math.abs(seedId.split("").reduce((a, c) => a + c.charCodeAt(0), roundId)) % possibleTypes.length
    : Math.floor(Math.random() * possibleTypes.length);
  const questionType = possibleTypes[typeIndex];

  if (questionType === "position-of-emoji") {
    const ti = seedId ? Math.abs(seedId.charCodeAt(0) + roundId) % sequence.length : Math.floor(Math.random() * sequence.length);
    return { id: roundId, sequence, questionType, question: `Où était placé ${sequence[ti].emoji} ?`, options: Array.from({ length: sequence.length }, (_, i) => String(i + 1)), answer: String(ti + 1) };
  }
  if (questionType === "emoji-at-position") {
    const ti = seedId ? Math.abs(seedId.charCodeAt(1) + roundId) % sequence.length : Math.floor(Math.random() * sequence.length);
    const correct = sequence[ti].emoji;
    const wrong = shuffleArray(EMOJIS.filter(i => i.emoji !== correct).map(i => i.emoji)).slice(0, 3);
    return { id: roundId, sequence, questionType, question: `Quel emoji était en position ${ti + 1} ?`, options: shuffleArray([correct, ...wrong]), answer: correct };
  }
  if (questionType === "count-category") {
    const cats: EmojiItem["category"][] = ["fruit", "transport", "animal", "symbol"];
    const ci = seedId ? Math.abs(seedId.charCodeAt(2) + roundId) % cats.length : Math.floor(Math.random() * cats.length);
    const cat = cats[ci];
    const count = sequence.filter(i => i.category === cat).length;
    const opts = shuffleArray(["0","1","2","3","4","5","6"]).filter((v,_,a) => v === String(count) || a.indexOf(v) < 3).slice(0,4);
    if (!opts.includes(String(count))) opts[0] = String(count);
    return { id: roundId, sequence, questionType, question: `Combien de ${getCategoryLabel(cat)} étaient affichés ?`, options: shuffleArray(opts), answer: String(count) };
  }
  if (questionType === "missing-emoji") {
    const mi = seedId ? Math.abs(seedId.charCodeAt(3) + roundId) % sequence.length : Math.floor(Math.random() * sequence.length);
    const missing = sequence[mi].emoji;
    const wrong = shuffleArray(EMOJIS.filter(i => i.emoji !== missing).map(i => i.emoji)).slice(0, 3);
    return { id: roundId, sequence, questionType, question: "Quel emoji faisait partie de la séquence ?", options: shuffleArray([missing, ...wrong]), answer: missing };
  }
  const answer = sequence.map(i => i.emoji).join(" ");
  return { id: roundId, sequence, questionType: "rebuild-order", question: "Remets la séquence dans le bon ordre.", options: shuffleArray(sequence.map(i => i.emoji)), answer };
}

// ── Composant interne ──────────────────────────────────────
function MemoryRushPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const duelId   = searchParams.get("duelId");
  const duelRole = searchParams.get("role") as "a" | "b" | null;
  const isDuelMode = !!duelId && !!duelRole;

  const [level, setLevel]                       = useState<Level>("normal");
  const [status, setStatus]                     = useState<GameStatus>("menu");
  const [roundIndex, setRoundIndex]             = useState(0);
  const [currentRound, setCurrentRound]         = useState<Round | null>(null);
  const [score, setScore]                       = useState(0);
  const [answerTimeLeft, setAnswerTimeLeft]     = useState(6);
  const [memorizeProgress, setMemorizeProgress] = useState(100);
  const [selectedAnswer, setSelectedAnswer]     = useState("");
  const [rebuildSelection, setRebuildSelection] = useState<string[]>([]);
  const [history, setHistory]                   = useState<AnswerHistory[]>([]);
  const [bestScore, setBestScore]               = useState(0);
  const [feedback, setFeedback]                 = useState<"correct" | "wrong" | null>(null);
  const [opponentDone, setOpponentDone]         = useState(false);

  const memorizeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef       = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const scoreRef      = useRef(0);
  const roundIndexRef = useRef(0);
  const historyRef    = useRef<AnswerHistory[]>([]);

  const config      = LEVEL_CONFIG[level];
  const target      = config.target;
  const gameProgress = Math.min((score / target) * 100, 100);

  // ── Init
  useEffect(() => {
    const saved = localStorage.getItem("training_score_memory");
    if (saved) { try { setBestScore(JSON.parse(saved).points || 0); } catch {} }

    if (isDuelMode && duelId) {
      channelRef.current = supabase
        .channel(`memory-duel-${duelId}`)
        .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "duels", filter: `id=eq.${duelId}` },
          (payload) => {
            const updated = payload.new as { score_a: number | null; score_b: number | null; status: string };
            const oppScore = duelRole === "a" ? updated.score_b : updated.score_a;
            if (oppScore !== null) setOpponentDone(true);
            if (updated.status === "finished") router.push(`/duel/${duelId}/play`);
          }
        ).subscribe();
    }

    // ── BUG 2 FIX : en mode duel, sauter le menu et lancer directement
    if (isDuelMode) {
      setTimeout(() => startGame(), 100);
    }

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startGame() {
    playSound("start");
    scoreRef.current = 0;
    roundIndexRef.current = 0;
    historyRef.current = [];
    setScore(0);
    setRoundIndex(0);
    setHistory([]);
    setSelectedAnswer("");
    setRebuildSelection([]);
    setFeedback(null);
    setOpponentDone(false);
    startRound(0);
  }

  function startRound(nextRoundIndex: number) {
    const round = buildRound(nextRoundIndex + 1, level, duelId ?? undefined);
    setCurrentRound(round);
    roundIndexRef.current = nextRoundIndex;
    setRoundIndex(nextRoundIndex);
    setSelectedAnswer("");
    setRebuildSelection([]);
    setFeedback(null);
    setMemorizeProgress(100);
    setStatus("memorize");

    if (memorizeTimerRef.current) clearInterval(memorizeTimerRef.current);
    const totalMs = LEVEL_CONFIG[level].memorizeSeconds * 1000;
    const startedAt = Date.now();

    memorizeTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.max(0, 100 - (elapsed / totalMs) * 100);
      setMemorizeProgress(pct);
      if (elapsed >= totalMs) {
        if (memorizeTimerRef.current) clearInterval(memorizeTimerRef.current);
        setAnswerTimeLeft(LEVEL_CONFIG[level].answerSeconds);
        setStatus("question");
        playSound("tick");
      }
    }, 50);
  }

  const finishGame = useCallback(async (finalScore: number, finalHistory: AnswerHistory[]) => {
    playSound("finish");
    const newBest = Math.max(bestScore, finalScore);
    setBestScore(newBest);
    localStorage.setItem("training_score_memory", JSON.stringify({
      score: `${finalScore}/${target}`, points: finalScore, level,
      success: finalScore >= target, updatedAt: new Date().toISOString(),
    }));

    // ── Mode duel : sauvegarder dans Supabase
    if (isDuelMode && duelId && duelRole) {
      const scoreCol = duelRole === "a" ? "score_a" : "score_b";
      await supabase.from("duels").update({ [scoreCol]: finalScore }).eq("id", duelId);

      const { data: updated } = await supabase.from("duels").select("*").eq("id", duelId).single();
      if (updated) {
        const oppScore = duelRole === "a" ? updated.score_b : updated.score_a;
        if (oppScore !== null) {
          // Les deux ont fini → calculer le gagnant
          const { data: { user } } = await supabase.auth.getUser();
          const myId = user?.id;
          const winnerId = finalScore > oppScore
            ? myId
            : oppScore > finalScore
            ? (duelRole === "a" ? updated.player_b : updated.player_a)
            : null;

          await supabase.from("duels").update({ status: "finished", winner: winnerId }).eq("id", duelId);

          // ── BUG 1 FIX : transférer les coins si pari
          if (updated.bet_a && updated.bet_b && updated.bet_confirmed_a && updated.bet_confirmed_b && winnerId) {
            const gain = Math.floor((updated.bet_a + updated.bet_b) * 0.9);
            await supabase.rpc("transfer_bet_coins", {
              winner_id: winnerId,
              amount: gain,
              loser_a: updated.player_a,
              loser_b: updated.player_b,
              bet_a: updated.bet_a,
              bet_b: updated.bet_b,
            });
          }

          router.push(`/duel/${duelId}/play`);
          return;
        }
        // Adversaire pas encore fini
        setStatus("waiting");
        setHistory(finalHistory);
        return;
      }
    }

    setStatus("finished");
    setHistory(finalHistory);
  }, [bestScore, target, level, isDuelMode, duelId, duelRole, router]);

  function goNextRound(updatedHistory: AnswerHistory[], updatedScore: number) {
    const currentRoundIndex = roundIndexRef.current;
    setTimeout(() => {
      if (currentRoundIndex + 1 < config.rounds) startRound(currentRoundIndex + 1);
      else finishGame(updatedScore, updatedHistory);
    }, 900);
  }

  function submitAnswer(answer: string) {
    if (!currentRound || status !== "question") return;
    const isCorrect = answer === currentRound.answer;
    const gained = isCorrect ? (answerTimeLeft >= 4 ? 12 : 10) : config.wrongPenalty;
    const nextScore = Math.max(0, scoreRef.current + gained);
    scoreRef.current = nextScore;
    const item: AnswerHistory = { round: roundIndexRef.current + 1, question: currentRound.question, selected: answer || "Aucune réponse", answer: currentRound.answer, correct: isCorrect, points: gained };
    const updatedHistory = [...historyRef.current, item];
    historyRef.current = updatedHistory;
    setSelectedAnswer(answer); setFeedback(isCorrect ? "correct" : "wrong"); setScore(nextScore); setHistory(updatedHistory);
    playSound(isCorrect ? "correct" : "wrong");
    setStatus("feedback");
    goNextRound(updatedHistory, nextScore);
  }

  function handleRebuildSelect(emoji: string) {
    if (!currentRound || status !== "question" || rebuildSelection.includes(emoji)) return;
    const next = [...rebuildSelection, emoji];
    setRebuildSelection(next);
    if (next.length === currentRound.sequence.length) submitAnswer(next.join(" "));
  }

  useEffect(() => {
    if (status !== "question") return;
    if (answerTimeLeft <= 0) { submitAnswer(""); return; }
    const t = setTimeout(() => { setAnswerTimeLeft(p => p - 1); if (answerTimeLeft <= 3) playSound("tick"); }, 1000);
    return () => clearTimeout(t);
  }, [status, answerTimeLeft]);

  if (!currentRound && status !== "menu" && status !== "waiting" && status !== "finished") {
    return <main className="flex min-h-screen items-center justify-center bg-black text-white"><p className="text-red-400">Chargement...</p></main>;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute right-[-140px] top-[-140px] h-[420px] w-[420px] rounded-full bg-red-600/25 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[-140px] h-[460px] w-[460px] rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-red-500/20 bg-black/70 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500 text-xl font-black text-black shadow-lg shadow-red-500/30">🧠</div>
            <div>
              <h1 className="text-xl font-black">Memory<span className="text-red-400">Rush</span></h1>
              <p className="text-xs text-zinc-400">{isDuelMode ? "⚔️ Mode Duel" : "Mémoire · vitesse · réflexe"}</p>
            </div>
          </div>
          {!isDuelMode && (
            <a href="/training" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-white transition hover:border-red-400 hover:text-red-400">
              Retour
            </a>
          )}
        </nav>
      </header>

      {/* ── MENU (solo seulement) ── */}
      {status === "menu" && !isDuelMode && (
        <section className="relative z-10 mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <h2 className="text-4xl font-black leading-tight md:text-6xl">
              Mémorise vite.<br />Réponds juste.<br /><span className="text-red-400">Bats l&apos;objectif.</span>
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">Memory Rush affiche une séquence d&apos;emojis pendant 2.5 secondes.</p>
            <div className="mt-8 grid max-w-xl gap-4 sm:grid-cols-3">
              {[["Affichage","2.5s"],["Rounds","10"],["Best",String(bestScore)]].map(([l,v]) => (
                <div key={l} className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                  <p className="text-sm text-zinc-400">{l}</p>
                  <h3 className="mt-2 text-3xl font-black text-red-400">{v}</h3>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-red-500/20 blur-2xl" />
            <div className="relative rounded-[2rem] border border-red-400/20 bg-zinc-950 p-6 shadow-2xl">
              <h3 className="text-3xl font-black">Choisis ton niveau</h3>
              <div className="mt-8 grid gap-4">
                {(["normal","hard"] as Level[]).map(l => (
                  <button key={l} onClick={() => setLevel(l)}
                    className={`rounded-3xl border p-5 text-left transition ${level === l ? "border-red-400 bg-red-500/10 text-red-400" : "border-zinc-800 bg-black text-zinc-300 hover:border-red-400"}`}>
                    <p className="text-xl font-black">{LEVEL_CONFIG[l].label}</p>
                    <p className="mt-2 text-sm text-zinc-500">{l === "normal" ? "5 objets · 6 sec · objectif 70 pts" : "6 objets · 5 sec · objectif 90 pts · pénalité -3"}</p>
                  </button>
                ))}
              </div>
              <button onClick={startGame} className="mt-6 w-full rounded-2xl bg-red-500 px-6 py-4 font-black text-black shadow-xl shadow-red-500/20 transition hover:scale-[1.01] hover:bg-red-400">
                Commencer Memory Rush
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── LOADING duel (entre menu et memorize) ── */}
      {status === "menu" && isDuelMode && (
        <section className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
            <p className="text-zinc-400 text-sm">Lancement du duel...</p>
          </div>
        </section>
      )}

      {/* ── ATTENTE ADVERSAIRE ── */}
      {status === "waiting" && (
        <section className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center px-5">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 mx-auto mb-8 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
            <h2 className="text-2xl font-black mb-3">Tu as fini ! <span className="text-red-400">{score} pts</span></h2>
            <p className="text-zinc-400 text-sm mb-2">En attente de ton adversaire...</p>
            <p className="text-zinc-600 text-xs">Le résultat s&apos;affichera dès qu&apos;il aura terminé</p>
            {opponentDone && <p className="mt-4 text-red-400 text-sm animate-pulse">L&apos;adversaire vient de finir ! Calcul du résultat...</p>}
          </div>
        </section>
      )}

      {/* ── JEU ── */}
      {(status === "memorize" || status === "question" || status === "feedback") && currentRound && (
        <section className="relative z-10 mx-auto max-w-6xl px-5 py-8">
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            {[["Round",`${roundIndex+1}/${config.rounds}`],["Score",String(score)],["Objectif",String(target)],[status==="memorize"?"Mémoire":"Réponse",status==="memorize"?"2.5s":`${answerTimeLeft}s`]].map(([l,v]) => (
              <div key={l} className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <p className="text-sm text-zinc-400">{l}</p>
                <h3 className="mt-2 text-3xl font-black text-red-400">{v}</h3>
              </div>
            ))}
          </div>

          <div className="mb-6 h-3 overflow-hidden rounded-full bg-zinc-900">
            <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: status === "memorize" ? `${memorizeProgress}%` : `${gameProgress}%` }} />
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-red-500/20 blur-2xl" />
            <div className="relative min-h-[540px] rounded-[2rem] border border-red-400/20 bg-zinc-950 p-6 text-center shadow-2xl md:p-10">
              {status === "memorize" && (
                <div>
                  <p className="font-bold text-red-400">Mémorise la séquence</p>
                  <h2 className="mt-3 text-2xl font-black md:text-4xl">La consigne arrive après.</h2>
                  <div className="mt-12 flex flex-wrap items-center justify-center gap-5">
                    {currentRound.sequence.map((item, i) => (
                      <div key={`${item.emoji}-${i}`} className="animate-pulse rounded-[2rem] border border-red-400/20 bg-black px-7 py-6 text-6xl shadow-xl md:text-7xl">{item.emoji}</div>
                    ))}
                  </div>
                </div>
              )}

              {(status === "question" || status === "feedback") && (
                <div>
                  <p className="font-bold text-red-400">Question {roundIndex + 1}</p>
                  <h2 className="mx-auto mt-4 max-w-3xl text-2xl font-black md:text-4xl">{currentRound.question}</h2>

                  {currentRound.questionType !== "rebuild-order" && (
                    <div className="mt-10 grid gap-4 md:grid-cols-2">
                      {currentRound.options.map((option) => {
                        const isCorrect = option === currentRound.answer;
                        const isSelected = option === selectedAnswer;
                        let cls = "border-zinc-800 bg-black hover:border-red-400 hover:text-red-400";
                        if (status === "feedback") {
                          if (isCorrect) cls = "border-green-400 bg-green-500/10 text-green-400";
                          else if (isSelected) cls = "border-red-400 bg-red-500/10 text-red-400";
                          else cls = "border-zinc-800 bg-black text-zinc-500";
                        }
                        return (
                          <button key={option} disabled={status !== "question"} onClick={() => submitAnswer(option)}
                            className={`rounded-2xl border px-5 py-5 text-center text-3xl font-black transition ${cls}`}>
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {currentRound.questionType === "rebuild-order" && (
                    <div className="mt-10">
                      <div className="rounded-3xl border border-zinc-800 bg-black p-5">
                        <p className="text-sm text-zinc-400">Ta sélection</p>
                        <div className="mt-4 flex min-h-[80px] flex-wrap items-center justify-center gap-3">
                          {rebuildSelection.length === 0
                            ? <p className="text-sm text-zinc-600">Clique les emojis dans l&apos;ordre.</p>
                            : rebuildSelection.map((e, i) => <div key={`${e}-${i}`} className="rounded-2xl bg-red-500/10 px-5 py-4 text-4xl">{e}</div>)}
                        </div>
                      </div>
                      <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        {currentRound.options.map((o) => (
                          <button key={o} disabled={status !== "question" || rebuildSelection.includes(o)} onClick={() => handleRebuildSelect(o)}
                            className={`rounded-2xl border px-5 py-5 text-4xl font-black transition ${rebuildSelection.includes(o) ? "border-zinc-800 bg-zinc-950 text-zinc-700" : "border-zinc-800 bg-black hover:border-red-400 hover:text-red-400"}`}>
                            {o}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {feedback && (
                    <div className={`mt-8 rounded-3xl border p-5 ${feedback === "correct" ? "border-green-400/30 bg-green-500/10 text-green-400" : "border-red-400/30 bg-red-500/10 text-red-400"}`}>
                      <p className="text-xl font-black">{feedback === "correct" ? "Correct !" : "Faux / temps écoulé"}</p>
                      <p className="mt-2 text-sm">Réponse : {currentRound.answer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── RÉSULTAT SOLO ── */}
      {status === "finished" && (
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-4xl items-center justify-center px-5 py-12">
          <div className="w-full rounded-[2rem] border border-red-400/20 bg-zinc-950 p-6 text-center shadow-2xl md:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-red-500 text-4xl shadow-lg shadow-red-500/30">
              {score >= target ? "🏆" : "🧠"}
            </div>
            <p className="mt-6 font-bold text-red-400">Memory Rush terminé</p>
            <h2 className="mt-3 text-4xl font-black md:text-6xl">{score >= target ? "Objectif réussi !" : "Presque !"}</h2>
            <p className="mt-4 text-lg text-zinc-400">
              Ton score : <span className="font-black text-red-400">{score} pts</span> / objectif : <span className="font-black text-red-400">{target} pts</span>
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={startGame} className="flex-1 rounded-2xl bg-red-500 px-6 py-4 font-black text-black shadow-lg shadow-red-500/20 transition hover:bg-red-400">Rejouer</button>
              <button onClick={() => setStatus("menu")} className="flex-1 rounded-2xl border border-zinc-700 px-6 py-4 font-bold text-white transition hover:border-red-400 hover:text-red-400">Changer niveau</button>
              <a href="/training" className="flex-1 rounded-2xl border border-red-400/30 px-6 py-4 text-center font-bold text-red-400 transition hover:bg-red-500 hover:text-black">Retour training</a>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default function MemoryRushPageWrapper() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-red-400">Chargement...</p>
      </main>
    }>
      <MemoryRushPage />
    </Suspense>
  );
}