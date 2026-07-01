"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import flagsQuestions from "@/data/flags.json";

type GameStatus =
  | "checking"
  | "ready"
  | "playing"
  | "submitting"
  | "finished"
  | "error";

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
  correctAnswer: string;
  correct: boolean;
  pointsWon: number;
  timeBonus: number;
  comboBonus: number;
  timedOut?: boolean;
};

const QUESTION_LIMIT = 10;
const TIME_PER_QUESTION = 7;

const BASE_POINTS = 100;
const TIME_BONUS_MULTIPLIER = 10;
const COMBO_BONUS = 15;

function fisherYates<T>(array: T[]): T[] {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function prepareQuestions(): Question[] {
  return fisherYates(flagsQuestions as Question[])
    .slice(0, QUESTION_LIMIT)
    .map((q) => ({
      ...q,
      options: fisherYates(q.options),
    }));
}
export default function ProFlagsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
          <div className="rounded-3xl border border-yellow-400/30 bg-zinc-950 p-8 text-center">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-yellow-400/20 border-t-yellow-400" />
            <p className="font-black text-zinc-300">Chargement du challenge...</p>
          </div>
        </main>
      }
    >
      <ProFlagsGame />
    </Suspense>
  );
}
function ProFlagsGame() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tournamentId = searchParams.get("tournamentId") || "";
  const gameToken = searchParams.get("token") || "";

  const [status, setStatus] = useState<GameStatus>("checking");
  const [error, setError] = useState("");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answers, setAnswers] = useState<AnswerState[]>([]);

  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const [finalScore, setFinalScore] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [floatingText, setFloatingText] = useState("");

  const submittedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length
    ? ((currentIndex + (selectedAnswer ? 1 : 0)) / questions.length) * 100
    : 0;

  const danger = timeLeft <= 3;

  function beep(type: "click" | "correct" | "wrong" | "tick" | "finish") {
    if (!soundOn || typeof window === "undefined") return;

    const AudioClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioClass) return;

    const audio = audioRef.current || new AudioClass();
    audioRef.current = audio;

    const osc = audio.createOscillator();
    const gain = audio.createGain();

    const config = {
      click: { freq: 520, gain: 0.04, duration: 0.08, type: "sine" as OscillatorType },
      correct: { freq: 980, gain: 0.08, duration: 0.16, type: "triangle" as OscillatorType },
      wrong: { freq: 170, gain: 0.09, duration: 0.18, type: "sawtooth" as OscillatorType },
      tick: { freq: 760, gain: 0.035, duration: 0.07, type: "sine" as OscillatorType },
      finish: { freq: 1120, gain: 0.1, duration: 0.28, type: "triangle" as OscillatorType },
    }[type];

    osc.type = config.type;
    osc.frequency.value = config.freq;
    gain.gain.value = config.gain;

    osc.connect(gain);
    gain.connect(audio.destination);

    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + config.duration);
    osc.stop(audio.currentTime + config.duration + 0.02);
  }

  useEffect(() => {
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

        if (tournament.game_type !== "drapeaux") {
          setError("Ce challenge n'est pas un jeu de drapeaux.");
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
          setError("Jeton de challenge invalide.");
          setStatus("error");
          return;
        }

        if (!entry.game_started_at) {
          setError("Challenge non démarré.");
          setStatus("error");
          return;
        }

        startedAtRef.current = entry.game_started_at;
        setQuestions(prepareQuestions());
        setStatus("ready");
      } catch (err) {
        console.error(err);
        setError("Erreur pendant la vérification du challenge.");
        setStatus("error");
      }
    };

    checkAccess();
  }, [router, tournamentId, gameToken]);

  useEffect(() => {
    if (status !== "playing" || selectedAnswer) return;

    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }

    timerRef.current = setTimeout(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 3) beep("tick");
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status, timeLeft, selectedAnswer]);

  useEffect(() => {
    const blockExit = (e: BeforeUnloadEvent) => {
      if (status === "playing") {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", blockExit);
    return () => window.removeEventListener("beforeunload", blockExit);
  }, [status]);

  function startGame() {
    setCurrentIndex(0);
    setSelectedAnswer("");
    setAnswers([]);
    setTimeLeft(TIME_PER_QUESTION);
    setScore(0);
    setCombo(0);
    setCorrectCount(0);
    setFloatingText("");
    beep("click");
    setStatus("playing");
  }

  async function submitScore(scoreToSubmit: number, totalCorrect: number) {
    if (submittedRef.current) return;
    submittedRef.current = true;

    setStatus("submitting");

    const completionTimeMs = Math.max(
      0,
      (QUESTION_LIMIT * TIME_PER_QUESTION - timeLeft) * 1000
    );

    try {
      const res = await fetch("/api/tournaments/pro/submit-score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          tournamentId,
          gameToken,
          score: scoreToSubmit,
          completionTimeMs,
          correctAnswers: totalCorrect,
          totalQuestions: QUESTION_LIMIT,
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

  function finishGame(scoreToSubmit: number, totalCorrect: number) {
    if (timerRef.current) clearTimeout(timerRef.current);
    beep("finish");
    submitScore(scoreToSubmit, totalCorrect);
  }

  function nextQuestion(
    nextScore: number,
    nextCombo: number,
    nextCorrectCount: number,
    newAnswers: AnswerState[]
  ) {
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer("");
        setTimeLeft(TIME_PER_QUESTION);
        setFloatingText("");
      } else {
        finishGame(nextScore, nextCorrectCount);
      }

      setAnswers(newAnswers);
      setScore(nextScore);
      setCombo(nextCombo);
      setCorrectCount(nextCorrectCount);
    }, 850);
  }

  function handleAnswer(option: string) {
    if (status !== "playing" || selectedAnswer || !currentQuestion) return;

    beep("click");
    setSelectedAnswer(option);

    const correct = option === currentQuestion.answer;

    let pointsWon = 0;
    let timeBonus = 0;
    let comboBonus = 0;
    let nextCombo = 0;
    let nextCorrectCount = correctCount;

    if (correct) {
      nextCombo = combo + 1;
      nextCorrectCount = correctCount + 1;

      timeBonus = timeLeft * TIME_BONUS_MULTIPLIER;
      comboBonus = nextCombo > 1 ? nextCombo * COMBO_BONUS : 0;
      pointsWon = BASE_POINTS + timeBonus + comboBonus;

      beep("correct");
      setFloatingText(`+${pointsWon}`);
    } else {
      nextCombo = 0;
      beep("wrong");
      setFloatingText("Faux");
    }

    const nextScore = score + pointsWon;

    const newAnswers: AnswerState[] = [
      ...answers,
      {
        questionId: currentQuestion.id,
        selected: option,
        correctAnswer: currentQuestion.answer,
        correct,
        pointsWon,
        timeBonus,
        comboBonus,
      },
    ];

    nextQuestion(nextScore, nextCombo, nextCorrectCount, newAnswers);
  }

  function handleTimeout() {
    if (!currentQuestion || selectedAnswer) return;

    beep("wrong");
    setSelectedAnswer("timeout");
    setFloatingText("Temps écoulé");

    const newAnswers: AnswerState[] = [
      ...answers,
      {
        questionId: currentQuestion.id,
        selected: "Temps écoulé",
        correctAnswer: currentQuestion.answer,
        correct: false,
        pointsWon: 0,
        timeBonus: 0,
        comboBonus: 0,
        timedOut: true,
      },
    ];

    nextQuestion(score, 0, correctCount, newAnswers);
  }

  if (status === "checking") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <ArenaBackground />
        <div className="relative z-10 rounded-3xl border border-yellow-400/30 bg-zinc-950/95 p-8 text-center">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-yellow-400/20 border-t-yellow-400" />
          <h1 className="text-2xl font-black">Vérification du challenge...</h1>
          <p className="mt-3 text-zinc-400">Tournoi, jeton et participation en validation.</p>
        </div>
      </main>
    );
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

        <div className="relative z-10 w-full max-w-2xl rounded-[2rem] border border-yellow-400/30 bg-zinc-950/95 p-8 text-center shadow-2xl shadow-yellow-400/10">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-yellow-400/10 text-6xl shadow-lg shadow-yellow-400/20 animate-pulse">
            🌍
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-green-400/30 bg-green-400/10 px-4 py-2 text-xs font-black text-green-400">
            ✅ Accès Pro validé · Bonne chance !
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
            Flag Battle Pro
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-6xl">
            Drapeaux <span className="text-yellow-400">Arena</span>
          </h1>

          <p className="mt-4 text-zinc-400">
            10 questions. 7 secondes chacune. Réponds vite, garde ton combo et vise le top.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <InfoCard title="Réponse juste" value="+100" icon="✅" />
            <InfoCard title="Bonus temps" value="+10/s" icon="⚡" />
            <InfoCard title="Combo" value="+15x" icon="🔥" />
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-5 text-left">
            <h3 className="font-black text-yellow-400">Objectif du challenge</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              <li>🌍 Identifie le pays du drapeau.</li>
              <li>⚡ Réponds vite pour maximiser le bonus temps.</li>
              <li>🔥 Enchaîne les bonnes réponses pour augmenter ton combo.</li>
              <li>🏆 Ton score est envoyé automatiquement à la fin.</li>
            </ul>
          </div>

          <button
            onClick={startGame}
            className="mt-7 w-full rounded-xl bg-yellow-400 py-4 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:scale-[1.03] hover:bg-yellow-300"
          >
            Commencer Flag Battle 🚀
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
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <ArenaBackground />
        <div className="relative z-10 w-full max-w-lg rounded-3xl border border-green-400/30 bg-zinc-950/95 p-8 text-center">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-green-400/20 border-t-green-400" />
          <h1 className="text-2xl font-black text-green-400">Envoi sécurisé...</h1>
          <p className="mt-3 text-zinc-400">Ton score est envoyé au classement Pro.</p>
        </div>
      </main>
    );
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
            Belle tentative ! Ton score est maintenant dans le classement du tournoi.
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

  if (!currentQuestion) return null;

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6 overflow-hidden">
      <ArenaBackground />

      <section className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat title="Temps" value={`${timeLeft}s`} danger={danger} />
          <Stat title="Score" value={score.toString()} />
          <Stat title="Question" value={`${currentIndex + 1}/${questions.length}`} />
          <Stat title="Combo" value={combo > 0 ? `x${combo}` : "—"} danger={combo >= 3} />
        </div>

        <div className="mb-5 h-3 overflow-hidden rounded-full bg-zinc-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-400 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className={`relative overflow-hidden rounded-[2rem] border p-5 md:p-8 shadow-2xl transition ${
          danger ? "border-red-400/40 bg-red-950/20" : "border-yellow-400/25 bg-zinc-950/95"
        }`}>
          <div className="absolute -right-24 -top-24 h-60 w-60 rounded-full bg-yellow-400/10 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 h-60 w-60 rounded-full bg-red-500/10 blur-3xl" />

          {floatingText && (
            <div className={`pointer-events-none absolute left-1/2 top-8 z-20 -translate-x-1/2 rounded-full px-5 py-2 text-2xl font-black animate-bounce ${
              floatingText.startsWith("+")
                ? "bg-green-400 text-black"
                : "bg-red-500 text-white"
            }`}>
              {floatingText}
            </div>
          )}

          <div className="relative z-10">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
                🌍 Flag Battle Pro
              </p>

              <h1 className="mt-3 text-2xl font-black md:text-4xl">
                Quel pays correspond à ce drapeau ?
              </h1>
            </div>

            <div className="mt-6 flex justify-center">
              <div className="rounded-[2rem] border border-yellow-400/25 bg-black p-4 shadow-[0_0_50px_rgba(250,204,21,0.12)]">
                <img
                  src={`https://flagcdn.com/w320/${currentQuestion.flag}.png`}
                  alt={currentQuestion.question}
                  className="h-40 w-auto rounded-2xl object-cover md:h-52"
                />
              </div>
            </div>

            <div className="mt-8 grid gap-3">
              {currentQuestion.options.map((option) => {
                const showResult = !!selectedAnswer;
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentQuestion.answer;

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
                    disabled={!!selectedAnswer}
                    className={`rounded-2xl border px-5 py-4 text-left font-black transition hover:scale-[1.01] disabled:cursor-not-allowed ${classes}`}
                  >
                    <span className="flex items-center justify-between gap-4">
                      <span>{option}</span>
                      <span className="text-xs uppercase tracking-[0.2em] opacity-70">
                        {showResult && isCorrect
                          ? "Juste"
                          : showResult && isSelected
                          ? "Faux"
                          : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ArenaBackground() {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,#450a0a_0%,#111827_35%,#020617_75%,#000_100%)]" />
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:46px_46px]" />
      <div className="fixed left-10 top-20 h-52 w-52 rounded-full bg-red-500/10 blur-3xl" />
      <div className="fixed bottom-20 right-10 h-52 w-52 rounded-full bg-yellow-400/10 blur-3xl" />
    </>
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

function Stat({ title, value, danger }: { title: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{title}</p>
      <p className={`mt-1 text-3xl font-black ${danger ? "text-red-400 animate-pulse" : "text-yellow-400"}`}>
        {value}
      </p>
    </div>
  );
}