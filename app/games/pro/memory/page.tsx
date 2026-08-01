"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Status =
  | "checking"
  | "ready"
  | "memorize"
  | "answer"
  | "submitting"
  | "finished"
  | "error";

type Round = {
  id: number;
  items: string[];
  target: string;
  options: string[];
};

const ROUNDS = 5;
const MEMORIZE_TIME = 4;
const ANSWER_TIME = 7;

const EMOJIS = [
  "🍎", "🍌", "🍇", "🍉", "🍓", "🍍",
  "🚗", "✈️", "🚀", "🚲", "🛵", "🚁",
  "🐶", "🐱", "🦁", "🐼", "🐸", "🦊",
  "⭐", "🔥", "💎", "⚡", "🎯", "🏆",
];

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function createRounds(): Round[] {
  return Array.from({ length: ROUNDS }, (_, index) => {
    const items = shuffle(EMOJIS).slice(0, 6);
    const target = items[Math.floor(Math.random() * items.length)];
    const wrongOptions = shuffle(EMOJIS.filter((e) => !items.includes(e))).slice(0, 3);
    const options = shuffle([target, ...wrongOptions]);

    return {
      id: index + 1,
      items,
      target,
      options,
    };
  });
}

export default function ProMemoryPage() {
  const router = useRouter();

  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState("");

  const [tournamentId, setTournamentId] = useState("");
  const [gameToken, setGameToken] = useState("");
  const [paramsReady, setParamsReady] = useState(false);

  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [memorizeLeft, setMemorizeLeft] = useState(MEMORIZE_TIME);
  const [answerLeft, setAnswerLeft] = useState(ANSWER_TIME);

  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState("");
  const [floatingText, setFloatingText] = useState("");
  const [soundOn, setSoundOn] = useState(true);

  const submittedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const currentRound = rounds[roundIndex];
  const progress = rounds.length ? ((roundIndex + 1) / rounds.length) * 100 : 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTournamentId(params.get("tournamentId") || "");
    setGameToken(params.get("token") || "");
    setParamsReady(true);
  }, []);

  useEffect(() => {
    if (!paramsReady) return;

    const checkAccess = async () => {
      try {
        if (!tournamentId || !gameToken) {
          setError("Lien de challenge invalide.");
          setStatus("error");
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/login");
          return;
        }

        const { data: tournament, error: tournamentError } = await supabase
          .from("tournaments_pro")
          .select("id,status,game_type")
          .eq("id", tournamentId)
          .single();

        if (tournamentError || !tournament) {
          setError("Tournoi introuvable.");
          setStatus("error");
          return;
        }

        if (tournament.status !== "active") {
          setError("Ce tournoi n'est plus actif.");
          setStatus("error");
          return;
        }

        if (tournament.game_type !== "memory") {
          setError("Ce challenge n'est pas un tournoi Memory.");
          setStatus("error");
          return;
        }

        const { data: entry, error: entryError } = await supabase
          .from("tournament_pro_entries")
          .select("id,game_token,game_started_at,score_submitted_at,score")
          .eq("tournament_id", tournamentId)
          .eq("user_id", session.user.id)
          .single();

        if (entryError || !entry) {
          setError("Participation introuvable.");
          setStatus("error");
          return;
        }

        if (entry.score_submitted_at) {
          setFinalScore(Number(entry.score) || 0);
          setStatus("finished");
          return;
        }

        if (entry.game_token !== gameToken) {
          setError("Jeton invalide.");
          setStatus("error");
          return;
        }

        if (!entry.game_started_at) {
          setError("Challenge non démarré.");
          setStatus("error");
          return;
        }

        setRounds(createRounds());
        setStatus("ready");
      } catch (err) {
        console.error(err);
        setError("Erreur pendant la vérification.");
        setStatus("error");
      }
    };

    checkAccess();
  }, [paramsReady, tournamentId, gameToken, router]);

  function beep(type: "start" | "correct" | "wrong" | "tick" | "finish") {
    if (!soundOn || typeof window === "undefined") return;

    const AudioClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioClass) return;

    const audio = audioRef.current || new AudioClass();
    audioRef.current = audio;

    const osc = audio.createOscillator();
    const gain = audio.createGain();

    const config = {
      start: { freq: 620, gain: 0.05, duration: 0.12, type: "sine" as OscillatorType },
      correct: { freq: 980, gain: 0.08, duration: 0.18, type: "triangle" as OscillatorType },
      wrong: { freq: 160, gain: 0.08, duration: 0.2, type: "sawtooth" as OscillatorType },
      tick: { freq: 760, gain: 0.035, duration: 0.07, type: "sine" as OscillatorType },
      finish: { freq: 1100, gain: 0.1, duration: 0.28, type: "triangle" as OscillatorType },
    }[type];

    osc.type = config.type;
    osc.frequency.value = config.freq;
    gain.gain.value = config.gain;

    osc.connect(gain);
    gain.connect(audio.destination);

    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + config.duration);
    osc.stop(audio.currentTime + config.duration + 0.03);
  }

  function startGame() {
    setRoundIndex(0);
    setScore(0);
    setFinalScore(0);
    setCombo(0);
    setCorrectCount(0);
    setSelected("");
    setFloatingText("");
    setMemorizeLeft(MEMORIZE_TIME);
    setAnswerLeft(ANSWER_TIME);
    beep("start");
    setStatus("memorize");
  }

  useEffect(() => {
    if (status !== "memorize") return;

    if (memorizeLeft <= 0) {
      setAnswerLeft(ANSWER_TIME);
      setStatus("answer");
      return;
    }

    timerRef.current = setTimeout(() => {
      setMemorizeLeft((prev) => {
        const next = prev - 1;
        if (next <= 2) beep("tick");
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status, memorizeLeft]);

  useEffect(() => {
    if (status !== "answer" || selected) return;

    if (answerLeft <= 0) {
      handleAnswer("timeout");
      return;
    }

    timerRef.current = setTimeout(() => {
      setAnswerLeft((prev) => {
        const next = prev - 1;
        if (next <= 3) beep("tick");
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status, answerLeft, selected]);

  async function submitScore(scoreToSubmit: number) {
    if (submittedRef.current) return;
    submittedRef.current = true;

    setStatus("submitting");

    try {
      const res = await fetch("/api/tournaments/pro/submit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tournamentId,
          gameToken,
          score: scoreToSubmit,
          completionTimeMs: null,
          correctAnswers: correctCount,
          totalRounds: ROUNDS,
          combo,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Impossible d'enregistrer le score.");
        setStatus("error");
        return;
      }

      setFinalScore(scoreToSubmit);
      setStatus("finished");
    } catch (err) {
      console.error(err);
      setError("Erreur serveur pendant l'envoi du score.");
      setStatus("error");
    }
  }

  function finishGame(nextScore: number) {
    if (timerRef.current) clearTimeout(timerRef.current);
    beep("finish");
    submitScore(Math.max(0, Math.floor(nextScore)));
  }

  function goNextRound(nextScore: number, nextCombo: number, nextCorrect: number) {
    setTimeout(() => {
      if (roundIndex + 1 < ROUNDS) {
        setRoundIndex((i) => i + 1);
        setSelected("");
        setFloatingText("");
        setMemorizeLeft(MEMORIZE_TIME);
        setAnswerLeft(ANSWER_TIME);
        setScore(nextScore);
        setCombo(nextCombo);
        setCorrectCount(nextCorrect);
        setStatus("memorize");
      } else {
        setScore(nextScore);
        setCombo(nextCombo);
        setCorrectCount(nextCorrect);
        finishGame(nextScore);
      }
    }, 900);
  }

  function handleAnswer(answer: string) {
    if (!currentRound || selected || status !== "answer") return;

    const isCorrect = answer === currentRound.target;
    setSelected(answer);

    let points = 0;
    let nextCombo = 0;
    let nextCorrect = correctCount;

    if (isCorrect) {
      nextCombo = combo + 1;
      nextCorrect = correctCount + 1;

      const speedBonus = answerLeft * 10;
      const comboBonus = nextCombo > 1 ? nextCombo * 15 : 0;
      points = 100 + speedBonus + comboBonus;

      beep("correct");
      setFloatingText(`+${points}`);
    } else {
      nextCombo = 0;
      beep("wrong");
      setFloatingText(answer === "timeout" ? "Temps écoulé" : "Raté");
    }

    const nextScore = score + points;
    goNextRound(nextScore, nextCombo, nextCorrect);
  }

  if (status === "checking") {
    return <Loading text="Vérification du Memory Challenge..." />;
  }

  if (status === "error") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <ArenaBackground />
        <div className="relative z-10 w-full max-w-lg rounded-3xl border border-red-500/30 bg-zinc-950/95 p-8 text-center">
          <div className="text-5xl">🚫</div>
          <h1 className="mt-5 text-2xl font-black text-red-400">Challenge indisponible</h1>
          <p className="mt-3 text-zinc-400">{error}</p>
          <button
            onClick={() => router.push("/tournaments/pro")}
            className="mt-6 rounded-xl bg-yellow-400 px-6 py-3 font-black text-black"
          >
            Retour aux tournois
          </button>
        </div>
      </main>
    );
  }

  if (status === "ready") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5 py-8 overflow-hidden">
        <ArenaBackground />

        <div className="relative z-10 w-full max-w-2xl rounded-[2rem] border border-purple-400/30 bg-zinc-950/95 p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-purple-400/10 text-6xl shadow-lg shadow-purple-400/20 animate-pulse">
            🧠
          </div>

          <div className="mt-5 inline-flex rounded-full border border-green-400/30 bg-green-400/10 px-4 py-2 text-xs font-black text-green-400">
            ✅ Accès Pro validé · Bonne chance !
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-purple-300">
            Memory Rush Pro
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-6xl">
            Mind <span className="text-yellow-400">Arena</span>
          </h1>

          <p className="mt-4 text-zinc-400">
            Mémorise les symboles, retrouve la bonne réponse et garde ton combo.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <InfoCard icon="🧠" title="Mémoire" value="3 sec" />
            <InfoCard icon="⚡" title="Réponse" value="7 sec" />
            <InfoCard icon="🔥" title="Combo" value="+15x" />
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-5 text-left">
            <h3 className="font-black text-yellow-400">Objectif</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              <li>👀 Observe les 6 symboles pendant 3 secondes.</li>
              <li>🎯 Retrouve le symbole demandé.</li>
              <li>⚡ Réponds vite pour gagner un bonus.</li>
              <li>🏆 Ton score est envoyé automatiquement à la fin.</li>
            </ul>
          </div>

          <button
            onClick={startGame}
            className="mt-7 w-full rounded-xl bg-yellow-400 py-4 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:scale-[1.03] hover:bg-yellow-300"
          >
            Commencer Mind Arena 🚀
          </button>

          <button
            onClick={() => setSoundOn((v) => !v)}
            className="mt-3 rounded-xl border border-zinc-700 px-5 py-2 text-xs font-bold text-zinc-400 transition hover:border-yellow-400 hover:text-yellow-400"
          >
            {soundOn ? "🔊 Ambiance activée" : "🔇 Ambiance désactivée"}
          </button>
        </div>
      </main>
    );
  }

  if (status === "submitting") {
    return <Loading text="Envoi sécurisé du score..." />;
  }

  if (status === "finished") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <ArenaBackground />

        <div className="relative z-10 w-full max-w-xl rounded-3xl border border-green-400/30 bg-zinc-950/95 p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-400 text-4xl text-black">
            ✅
          </div>

          <h1 className="mt-6 text-3xl font-black">Score enregistré</h1>

          <p className="mt-6 text-6xl font-black text-yellow-400">
            {finalScore} pts
          </p>

          <p className="mt-3 text-zinc-400">
            Belle mémoire ! Ton score est maintenant dans le classement du tournoi.
          </p>

          <button
            onClick={() => router.push(`/tournaments/pro/${tournamentId}/results`)}
            className="mt-8 w-full rounded-xl bg-yellow-400 py-4 font-black text-black transition hover:bg-yellow-300"
          >
            Voir mon résultat 🏆
          </button>
        </div>
      </main>
    );
  }

  if (!currentRound) return null;

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6 overflow-hidden">
      <ArenaBackground />

      <section className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat title="Round" value={`${roundIndex + 1}/${ROUNDS}`} />
          <Stat
            title={status === "memorize" ? "Mémoire" : "Réponse"}
            value={`${status === "memorize" ? memorizeLeft : answerLeft}s`}
            danger={(status === "memorize" ? memorizeLeft : answerLeft) <= 2}
          />
          <Stat title="Score" value={score.toString()} />
          <Stat title="Combo" value={combo > 0 ? `x${combo}` : "—"} danger={combo >= 3} />
        </div>

        <div className="mb-5 h-3 overflow-hidden rounded-full bg-zinc-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-400 to-yellow-400 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-purple-400/30 bg-zinc-950/95 p-5 md:p-8 shadow-2xl">
          <div className="absolute -right-24 -top-24 h-60 w-60 rounded-full bg-purple-400/10 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 h-60 w-60 rounded-full bg-yellow-400/10 blur-3xl" />

          {floatingText && (
            <div
              className={`pointer-events-none absolute left-1/2 top-8 z-20 -translate-x-1/2 rounded-full px-5 py-2 text-2xl font-black animate-bounce ${
                floatingText.startsWith("+")
                  ? "bg-green-400 text-black"
                  : "bg-red-500 text-white"
              }`}
            >
              {floatingText}
            </div>
          )}

          <div className="relative z-10 text-center">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-purple-300">
              🧠 Memory Rush Pro
            </p>

            {status === "memorize" ? (
              <>
                <h1 className="mt-3 text-3xl font-black md:text-5xl">
                  Mémorise maintenant
                </h1>

                <div className="mt-8 grid grid-cols-3 gap-3 md:grid-cols-6">
                  {currentRound.items.map((item) => (
                    <div
                      key={item}
                      className="flex h-24 items-center justify-center rounded-2xl border border-yellow-400/30 bg-black text-5xl shadow-[0_0_25px_rgba(250,204,21,0.12)]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h1 className="mt-3 text-3xl font-black md:text-5xl">
                  Quel symbole était présent ?
                </h1>

               

                <div className="mt-8 grid gap-3 md:grid-cols-4">
                  {currentRound.options.map((option) => {
                    const showResult = !!selected;
                    const isSelected = selected === option;
                    const isCorrect = option === currentRound.target;

                    let classes =
                      "border-zinc-800 bg-black hover:border-yellow-400/40 hover:bg-yellow-400/5";

                    if (showResult && isCorrect) {
                      classes =
                        "border-green-400 bg-green-400 text-black shadow-[0_0_30px_rgba(74,222,128,0.25)]";
                    } else if (showResult && isSelected && !isCorrect) {
                      classes =
                        "border-red-400 bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.25)]";
                    }

                    return (
                      <button
                        key={option}
                        onClick={() => handleAnswer(option)}
                        disabled={!!selected}
                        className={`rounded-2xl border px-5 py-6 text-5xl font-black transition hover:scale-[1.02] disabled:cursor-not-allowed ${classes}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <p className="mt-6 text-sm text-zinc-500">
              Bonne réponse : +100 · Bonus rapidité · Combo mémoire
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function ArenaBackground() {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,#2e1065_0%,#111827_35%,#020617_75%,#000_100%)]" />
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:46px_46px]" />
      <div className="fixed left-10 top-20 h-52 w-52 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="fixed bottom-20 right-10 h-52 w-52 rounded-full bg-yellow-400/10 blur-3xl" />
    </>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
      <ArenaBackground />
      <div className="relative z-10 rounded-3xl border border-purple-400/30 bg-zinc-950/95 p-8 text-center">
        <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-purple-400/20 border-t-purple-400" />
        <p className="font-black text-zinc-300">{text}</p>
      </div>
    </main>
  );
}

function InfoCard({ icon, title, value }: { icon: string; title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black p-4">
      <div className="text-3xl">{icon}</div>
      <p className="mt-2 text-xs text-zinc-500">{title}</p>
      <p className="mt-1 text-xl font-black text-yellow-400">{value}</p>
    </div>
  );
}

function Stat({
  title,
  value,
  danger,
}: {
  title: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
        {title}
      </p>
      <p
        className={`mt-1 text-3xl font-black ${
          danger ? "text-red-400 animate-pulse" : "text-yellow-400"
        }`}
      >
        {value}
      </p>
    </div>
  );
}