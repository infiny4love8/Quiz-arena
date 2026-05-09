"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import flagsQuestions from "@/data/flags.json";

const QUESTION_LIMIT = 10;
const TIME_PER_QUESTION = 10;

type Question = {
  id: string | number;
  question: string;
  flag: string;
  answer: string;
  options: string[];
};

type AnswerState = {
  questionId: string | number;
  selected: string;
  correct: boolean;
  timedOut?: boolean;
};

type DuelData = {
  id: string;
  player_a: string;
  player_b: string;
  status: string;
  theme: string | null;
  score_a: number | null;
  score_b: number | null;
  winner: string | null;
  bet_a: number | null;
  bet_b: number | null;
  bet_confirmed_a: boolean | null;
  bet_confirmed_b: boolean | null;
};

type GamePhase = "countdown" | "playing" | "waiting" | "result" | "redirecting";

function fisherYates<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

function prepareQuestions(duelId: string): Question[] {
  const shuffled = seededShuffle(flagsQuestions as Question[], duelId).slice(0, QUESTION_LIMIT);
  return shuffled.map((q) => ({ ...q, options: fisherYates(q.options) }));
}

function playSound(type: "correct" | "wrong" | "timeout") {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  if (type === "correct") { osc.frequency.value = 520; gain.gain.value = 0.04; }
  else if (type === "wrong") { osc.frequency.value = 220; gain.gain.value = 0.04; }
  else { osc.frequency.value = 180; gain.gain.value = 0.03; }
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
  osc.stop(ctx.currentTime + 0.16);
  osc.onended = () => ctx.close();
}

export default function DuelPlayPage() {
  const router = useRouter();
  const params = useParams();
  const duelId = params.id as string;

  const [duel, setDuel]                   = useState<DuelData | null>(null);
  const [myId, setMyId]                   = useState<string | null>(null);
  const [myRole, setMyRole]               = useState<"a" | "b" | null>(null);
  const [opponentName, setOpponentName]   = useState("Adversaire");
  const [myName, setMyName]               = useState("Toi");
  const [phase, setPhase]                 = useState<GamePhase>("countdown");
  const [countdown, setCountdown]         = useState(3);
  const [questions, setQuestions]         = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answers, setAnswers]             = useState<AnswerState[]>([]);
  const [timeLeft, setTimeLeft]           = useState(TIME_PER_QUESTION);
  const [combo, setCombo]                 = useState(0);
  const [animKey, setAnimKey]             = useState(0);
  const [opponentDone, setOpponentDone]   = useState(false);
  const [resultData, setResultData]       = useState<{ myScore: number; opponentScore: number; winner: string | null } | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef   = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);

      const { data: duelData, error } = await supabase
        .from("duels").select("*").eq("id", duelId).single();
      if (error || !duelData) { router.push("/dashboard"); return; }
      if (!["playing", "finished"].includes(duelData.status)) {
        router.push(`/duel/${duelId}/negotiate`); return;
      }

      setDuel(duelData);
      const role = duelData.player_a === user.id ? "a" : "b";
      setMyRole(role);

      const opponentId = role === "a" ? duelData.player_b : duelData.player_a;
      const [{ data: me }, { data: opp }] = await Promise.all([
        supabase.from("users").select("full_name").eq("id", user.id).single(),
        supabase.from("users").select("full_name").eq("id", opponentId).single(),
      ]);
      if (me) setMyName(me.full_name);
      if (opp) setOpponentName(opp.full_name);

      // ── ROUTING PAR THÈME
      const theme = duelData.theme ?? "drapeaux";

      if (theme === "memoire") {
        setPhase("redirecting");
        router.push(`/training/memory?duelId=${duelId}&role=${role}`);
        return;
      }
      if (theme === "tankarena") {
        setPhase("redirecting");
        router.push(`/training/tankarena?duelId=${duelId}&role=${role}`);
        return;
      }

      // ── DRAPEAUX
      setQuestions(prepareQuestions(duelId));

      if (duelData.status === "finished") {
        const myScore = role === "a" ? (duelData.score_a ?? 0) : (duelData.score_b ?? 0);
        const opponentScore = role === "a" ? (duelData.score_b ?? 0) : (duelData.score_a ?? 0);
        setResultData({ myScore, opponentScore, winner: duelData.winner });
        setPhase("result"); return;
      }

      const oppScore = role === "a" ? duelData.score_b : duelData.score_a;
      if (oppScore !== null) setOpponentDone(true);

      channelRef.current = supabase
        .channel(`play-${duelId}`)
        .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "duels", filter: `id=eq.${duelId}` },
          (payload) => {
            const updated = payload.new as DuelData;
            setDuel(updated);
            if (updated.status === "finished") {
              const myScore = role === "a" ? (updated.score_a ?? 0) : (updated.score_b ?? 0);
              const opponentScore = role === "a" ? (updated.score_b ?? 0) : (updated.score_a ?? 0);
              setResultData({ myScore, opponentScore, winner: updated.winner });
              setPhase("result"); return;
            }
            const oppScoreUpdated = role === "a" ? updated.score_b : updated.score_a;
            if (oppScoreUpdated !== null) setOpponentDone(true);
          }
        ).subscribe();

      setPhase("countdown");
    };

    init();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duelId, router]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) { setPhase("playing"); setTimeLeft(TIME_PER_QUESTION); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== "playing" || selectedAnswer || !questions.length) return;
    if (timeLeft <= 0) { handleTimeout(); return; }
    const t = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, selectedAnswer, questions]);

  const handleAnswer = useCallback((option: string) => {
    if (selectedAnswer || phase !== "playing") return;
    const q = questions[currentIndex];
    if (!q) return;
    const correct = option === q.answer;
    playSound(correct ? "correct" : "wrong");
    setSelectedAnswer(option);
    setCombo((c) => correct ? c + 1 : 0);
    const newAnswers = [...answers, { questionId: q.id, selected: option, correct }];
    setAnswers(newAnswers);
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((i) => i + 1); setSelectedAnswer(""); setTimeLeft(TIME_PER_QUESTION); setAnimKey((k) => k + 1);
      } else { finishGame(newAnswers); }
    }, 900);
  }, [selectedAnswer, phase, questions, currentIndex, answers]);

  const handleTimeout = useCallback(() => {
    const q = questions[currentIndex];
    if (!q || selectedAnswer) return;
    playSound("timeout"); setCombo(0); setSelectedAnswer("timeout");
    const newAnswers = [...answers, { questionId: q.id, selected: "timeout", correct: false, timedOut: true }];
    setAnswers(newAnswers);
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((i) => i + 1); setSelectedAnswer(""); setTimeLeft(TIME_PER_QUESTION); setAnimKey((k) => k + 1);
      } else { finishGame(newAnswers); }
    }, 900);
  }, [questions, currentIndex, selectedAnswer, answers]);

  const finishGame = async (finalAnswers: AnswerState[]) => {
    if (!myRole || !myId) return;
    const correct = finalAnswers.filter((a) => a.correct).length;
    const scoreCol = myRole === "a" ? "score_a" : "score_b";
    await supabase.from("duels").update({ [scoreCol]: correct }).eq("id", duelId);
    const { data: updated } = await supabase.from("duels").select("*").eq("id", duelId).single();
    if (!updated) { setPhase("waiting"); return; }
    const oppScore = myRole === "a" ? updated.score_b : updated.score_a;
    if (oppScore !== null) {
      const myScore = correct;
      const winnerId = myScore > oppScore ? myId : oppScore > myScore
        ? (myRole === "a" ? updated.player_b : updated.player_a) : null;
      await supabase.from("duels").update({ status: "finished", winner: winnerId }).eq("id", duelId);
      if (updated.bet_a && updated.bet_b && updated.bet_confirmed_a && updated.bet_confirmed_b && winnerId) {
        const gain = Math.floor((updated.bet_a + updated.bet_b) * 0.9);
        await supabase.rpc("transfer_bet_coins", {
          winner_id: winnerId, amount: gain,
          loser_a: updated.player_a, loser_b: updated.player_b,
          bet_a: updated.bet_a, bet_b: updated.bet_b,
        });
      }
      setResultData({ myScore, opponentScore: oppScore, winner: winnerId });
      setPhase("result");
    } else {
      setPhase("waiting");
    }
  };

  const currentQuestion = questions[currentIndex];
  const correctCount    = answers.filter((a) => a.correct).length;
  const progress        = questions.length ? ((currentIndex + (selectedAnswer ? 1 : 0)) / questions.length) * 100 : 0;
  const timerColor      = timeLeft > 6 ? "#22c55e" : timeLeft > 3 ? "#f59e0b" : "#ef4444";
  const timerPercent    = (timeLeft / TIME_PER_QUESTION) * 100;
  const isWinner        = resultData?.winner === myId;
  const isDraw          = resultData?.winner === null;

  if (phase === "redirecting") {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Chargement du jeu...</p>
        </div>
      </main>
    );
  }

  if (phase === "countdown") {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/8 blur-[120px] rounded-full" />
        </div>
        <div className="relative text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-white/25 mb-8">Duel vs {opponentName}</p>
          <div key={countdown} className="text-[10rem] font-black leading-none"
            style={{ animation: "countPop 0.6s cubic-bezier(0.34,1.56,0.64,1)", color: countdown === 0 ? "#f97316" : "white" }}>
            {countdown === 0 ? "GO!" : countdown}
          </div>
          <p className="text-white/30 mt-6 text-sm">Mêmes questions, chacun de son côté</p>
        </div>
        <style jsx>{`@keyframes countPop { 0%{transform:scale(0.5);opacity:0} 100%{transform:scale(1);opacity:1} }`}</style>
      </main>
    );
  }

  if (phase === "waiting") {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center max-w-sm px-5">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
          <h2 className="text-2xl font-black mb-3">Tu as fini ! <span className="text-orange-400">{correctCount}/{questions.length}</span></h2>
          <p className="text-white/40 text-sm mb-2">En attente de {opponentName}...</p>
          <p className="text-white/20 text-xs">Le résultat s&apos;affichera dès qu&apos;il aura terminé</p>
          {opponentDone && <p className="mt-4 text-orange-400 text-sm animate-pulse">{opponentName} vient de finir ! Calcul...</p>}
        </div>
      </main>
    );
  }

  if (phase === "result" && resultData) {
    const { myScore, opponentScore } = resultData;
    const phrases = {
      win:  ["Incroyable ! Tu les as dominés 🔥", "Champion ! Personne ne t'arrête 💪", "Trop fort(e) ⚡"],
      lose: ["Bien joué, mais c'est pas fini... 💀", "Revanche ? 🎯", "L'adversaire était solide 🤝"],
      draw: ["Égalité parfaite 🤝", "Match nul ⚖️", "Deux champions 🏆"],
    };
    const cat   = isDraw ? "draw" : isWinner ? "win" : "lose";
    const phrase = phrases[cat][Math.floor(Math.random() * 3)];
    const hasBet = duel?.bet_a && duel?.bet_b && duel?.bet_confirmed_a && duel?.bet_confirmed_b;
    const pot    = hasBet ? (duel!.bet_a! + duel!.bet_b!) : 0;
    const gain   = hasBet ? Math.floor(pot * 0.9) : 0;

    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] blur-[120px] rounded-full opacity-20"
            style={{ backgroundColor: isDraw ? "#f59e0b" : isWinner ? "#22c55e" : "#ef4444" }} />
        </div>
        <div className="relative z-10 max-w-lg mx-auto px-5 py-12">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.4em] text-white/25 mb-4">Résultat du duel</p>
            <div className="inline-block text-7xl mb-4" style={{ animation: "popIn 0.6s cubic-bezier(0.34,1.56,0.64,1)" }}>
              {isDraw ? "🤝" : isWinner ? "🏆" : "💀"}
            </div>
            <h1 className="text-4xl font-black mb-2" style={{ color: isDraw ? "#f59e0b" : isWinner ? "#22c55e" : "#ef4444" }}>
              {isDraw ? "Match Nul" : isWinner ? "Victoire !" : "Défaite"}
            </h1>
            <p className="text-white/40 text-sm">{phrase}</p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 mb-6">
            <div className="grid grid-cols-3 items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-white/30 mb-2 truncate">{myName}</p>
                <p className="text-5xl font-black" style={{ color: isDraw ? "#f59e0b" : isWinner ? "#22c55e" : "white" }}>{myScore}</p>
              </div>
              <div className="text-center"><p className="text-2xl font-black text-white/20">VS</p></div>
              <div className="text-center">
                <p className="text-xs text-white/30 mb-2 truncate">{opponentName}</p>
                <p className="text-5xl font-black" style={{ color: isDraw ? "#f59e0b" : !isWinner ? "#22c55e" : "white" }}>{opponentScore}</p>
              </div>
            </div>
          </div>

          {hasBet && (
            <div className="rounded-2xl border p-5 mb-6 text-center"
              style={{
                borderColor: isDraw ? "rgba(245,158,11,0.3)" : isWinner ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)",
                backgroundColor: isDraw ? "rgba(245,158,11,0.05)" : isWinner ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)",
              }}>
              <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Pari</p>
              {isDraw ? <p className="text-white/60 text-sm">Match nul — mises restituées</p>
                : isWinner ? <><p className="text-3xl font-black text-green-400">+{gain} 🪙</p><p className="text-xs text-white/30 mt-1">90% du pot de {pot} coins</p></>
                : <><p className="text-3xl font-black text-red-400">-{myRole === "a" ? duel!.bet_a : duel!.bet_b} 🪙</p><p className="text-xs text-white/30 mt-1">Mise perdue</p></>}
            </div>
          )}

          {answers.length > 0 && (
            <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-5 mb-8">
              <p className="text-xs text-white/30 uppercase tracking-widest mb-4">Tes réponses</p>
              <div className="grid grid-cols-5 gap-2">
                {answers.map((a, i) => (
                  <div key={i} className="aspect-square rounded-xl flex items-center justify-center text-sm font-black"
                    style={{ backgroundColor: a.correct ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${a.correct ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, color: a.correct ? "#22c55e" : "#ef4444" }}>
                    {a.correct ? "✓" : "✗"}
                  </div>
                ))}
              </div>
              <p className="text-white/30 text-xs mt-3 text-center">{correctCount} bonne{correctCount > 1 ? "s" : ""} réponse{correctCount > 1 ? "s" : ""} sur {questions.length}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button onClick={() => router.push("/duel")}
              className="w-full rounded-2xl bg-orange-500 py-4 font-black text-black text-lg hover:bg-orange-400 transition-all hover:scale-[1.01] active:scale-[0.99]">
              Nouveau duel ⚔️
            </button>
            <button onClick={() => router.push("/dashboard")}
              className="w-full rounded-2xl border border-white/8 py-4 font-bold text-white/50 text-sm hover:text-white/70 hover:border-white/15 transition-all">
              Retour au dashboard
            </button>
          </div>
        </div>
        <style jsx>{`@keyframes popIn{0%{transform:scale(0.3);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
      </main>
    );
  }

  if (!currentQuestion) return null;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30 font-mono">{currentIndex + 1}/{questions.length}</span>
            {combo > 1 && <span className="text-xs px-2 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 font-black animate-pulse">🔥 x{combo}</span>}
          </div>
          <div className="relative w-12 h-12">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              <circle cx="24" cy="24" r="20" fill="none" stroke={timerColor} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={`${2 * Math.PI * 20 * (1 - timerPercent / 100)}`}
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black" style={{ color: timerColor }}>{timeLeft}</span>
            </div>
          </div>
        </div>

        <div className="mb-6 h-1 w-full rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full bg-orange-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-center justify-between mb-6 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
          <div className="text-center"><p className="text-xs text-white/25 mb-0.5">Toi</p><p className="font-black text-green-400">{correctCount}</p></div>
          <div className="text-white/15 font-black">VS</div>
          <div className="text-center"><p className="text-xs text-white/25 mb-0.5">{opponentName}</p><p className="font-black text-white/40">{opponentDone ? "✓ fini" : "..."}</p></div>
        </div>

        <div key={animKey} className="rounded-3xl border border-white/8 bg-white/[0.03] p-6 mb-5" style={{ animation: "slideUp 0.3s ease" }}>
          <div className="flex justify-center mb-5">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3 shadow-2xl">
              <img src={`https://flagcdn.com/w320/${currentQuestion.flag}.png`} alt="Drapeau" className="h-36 w-auto rounded-xl object-cover" />
            </div>
          </div>
          <h2 className="text-center text-xl font-black mb-1">{currentQuestion.question}</h2>
        </div>

        <div className="space-y-3">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedAnswer === option;
            const isCorrect  = option === currentQuestion.answer;
            const showResult = !!selectedAnswer && selectedAnswer !== "timeout";
            let borderColor = "rgba(255,255,255,0.08)", bgColor = "rgba(255,255,255,0.02)", textColor = "white";
            if (showResult && isCorrect) { borderColor = "rgba(34,197,94,0.6)"; bgColor = "rgba(34,197,94,0.12)"; textColor = "#22c55e"; }
            else if (showResult && isSelected && !isCorrect) { borderColor = "rgba(239,68,68,0.6)"; bgColor = "rgba(239,68,68,0.12)"; textColor = "#ef4444"; }
            return (
              <button key={option} onClick={() => handleAnswer(option)} disabled={!!selectedAnswer}
                className="w-full rounded-2xl border p-4 text-left font-bold text-sm transition-all duration-250 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                style={{ borderColor, backgroundColor: bgColor, color: textColor }}>
                <span className="flex items-center justify-between">
                  <span>{option}</span>
                  {showResult && isCorrect && <span className="text-xs">✓</span>}
                  {showResult && isSelected && !isCorrect && <span className="text-xs">✗</span>}
                </span>
              </button>
            );
          })}
        </div>

        {selectedAnswer === "timeout" && (
          <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/8 px-4 py-3 text-center">
            <p className="text-yellow-400 text-sm font-bold">Temps écoulé !</p>
            <p className="text-white/40 text-xs mt-1">Bonne réponse : {currentQuestion.answer}</p>
          </div>
        )}
      </div>
      <style jsx>{`@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </main>
  );
}