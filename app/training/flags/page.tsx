"use client";

import { useEffect, useMemo, useState } from "react";
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
  question: string;
  selected: string;
  correctAnswer: string;
  correct: boolean;
  timedOut?: boolean;
};

type StoredScore = {
  id: string;
  date: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  points: number;
};

function fisherYates<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function prepareQuestions(): Question[] {
  return fisherYates(flagsQuestions)
    .slice(0, QUESTION_LIMIT)
    .map((q: Question) => ({
      ...q,
      options: fisherYates(q.options),
    }));
}

function getStars(correctAnswers: number, total: number) {
  const pct = total ? (correctAnswers / total) * 100 : 0;
  if (pct >= 90) return 3;
  if (pct >= 70) return 2;
  if (pct >= 50) return 1;
  return 0;
}

function getRank(correctAnswers: number, total: number) {
  const pct = total ? (correctAnswers / total) * 100 : 0;
  if (pct >= 90) return "Diamond";
  if (pct >= 70) return "Gold";
  if (pct >= 50) return "Silver";
  return "Bronze";
}

function playClickSound() {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = 440;
  gain.gain.value = 0.03;

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();

  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
  osc.stop(ctx.currentTime + 0.09);

  osc.onended = () => ctx.close();
}

export default function FlagsTrainingPage() {
  const [hasStarted, setHasStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [combo, setCombo] = useState(0);
  const [scoresHistory, setScoresHistory] = useState<StoredScore[]>([]);
  const [animKey, setAnimKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // ✅ clé historique détaillé
    const raw = localStorage.getItem("flags-training-history");
    if (raw) {
      try {
        setScoresHistory(JSON.parse(raw));
      } catch {
        setScoresHistory([]);
      }
    }
  }, []);

  useEffect(() => {
    if (hasStarted) setQuestions(prepareQuestions());
  }, [hasStarted]);

  const currentQuestion = questions[currentIndex];

  const correctAnswers = useMemo(
    () => answers.filter((a) => a.correct).length,
    [answers]
  );

  const points = correctAnswers * 100 + combo * 25;
  const stars = getStars(correctAnswers, questions.length);

  const progress = questions.length
    ? ((currentIndex + (selectedAnswer ? 1 : 0)) / questions.length) * 100
    : 0;

  useEffect(() => {
    if (!questions.length || selectedAnswer || isFinished) return;

    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }

    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, questions, selectedAnswer, isFinished]);

  function saveScore() {
    if (typeof window === "undefined") return;

    // ✅ sauvegarde pour la page training principale
    localStorage.setItem(
      "training_score_flags",
      JSON.stringify({
        score: `${correctAnswers}/${questions.length}`,
        points,
      })
    );

    // ✅ historique détaillé séparé
    const raw = localStorage.getItem("flags-training-history");
    const existing: StoredScore[] = raw ? JSON.parse(raw) : [];

    const newScore: StoredScore = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      score: questions.length
        ? Math.round((correctAnswers / questions.length) * 100)
        : 0,
      correctAnswers,
      totalQuestions: questions.length,
      points,
    };

    const updated = [newScore, ...existing].slice(0, 20);
    localStorage.setItem("flags-training-history", JSON.stringify(updated));
    setScoresHistory(updated);
  }

  function finishQuiz() {
    setIsFinished(true);
    saveScore();
  }

  function goNext() {
    setIsTransitioning(true);
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer("");
        setTimeLeft(TIME_PER_QUESTION);
        setAnimKey((k) => k + 1);
        setIsTransitioning(false);
      } else {
        finishQuiz();
      }
    }, 250);
  }

  function handleAnswer(option: string) {
    if (selectedAnswer || !currentQuestion) return;

    playClickSound();
    setSelectedAnswer(option);

    const correct = option === currentQuestion.answer;
    setCombo((prev) => (correct ? prev + 1 : 0));

    const newAnswers = [
      ...answers,
      {
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        selected: option,
        correctAnswer: currentQuestion.answer,
        correct,
      },
    ];

    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer("");
        setTimeLeft(TIME_PER_QUESTION);
        setAnimKey((k) => k + 1);
      } else {
        finishQuiz();
      }
    }, 850);
  }

  function handleTimeout() {
    if (!currentQuestion || selectedAnswer) return;

    const newAnswers = [
      ...answers,
      {
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        selected: "Temps écoulé",
        correctAnswer: currentQuestion.answer,
        correct: false,
        timedOut: true,
      },
    ];

    setCombo(0);
    setAnswers(newAnswers);
    setSelectedAnswer("timeout");

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer("");
        setTimeLeft(TIME_PER_QUESTION);
        setAnimKey((k) => k + 1);
      } else {
        finishQuiz();
      }
    }, 850);
  }

  function restart() {
    setQuestions(prepareQuestions());
    setCurrentIndex(0);
    setSelectedAnswer("");
    setAnswers([]);
    setIsFinished(false);
    setTimeLeft(TIME_PER_QUESTION);
    setCombo(0);
    setAnimKey((k) => k + 1);
  }

  if (!hasStarted) {
    return (
      <main className="min-h-screen bg-black text-white overflow-hidden flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%),linear-gradient(180deg,#050505_0%,#000_100%)]" />
        <div className="relative z-10 w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white/5 p-8 md:p-12 text-center shadow-[0_0_120px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10 border border-red-500/20 shadow-[0_0_60px_rgba(239,68,68,0.25)]">
            <div className="h-8 w-8 rounded-full bg-red-500 animate-pulse" />
          </div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            Flag Arena
          </p>
          <h1 className="mt-4 text-4xl md:text-6xl font-black tracking-tight">
            Défi des drapeaux
          </h1>
          <p className="mt-4 text-white/60 max-w-md mx-auto">
            Mode rapide, score, combo, animations et sauvegarde locale.
          </p>
          <button
            onClick={() => setHasStarted(true)}
            className="mt-8 rounded-2xl bg-white px-8 py-4 font-black text-black transition hover:scale-[1.03] hover:bg-red-500 hover:text-white shadow-[0_0_30px_rgba(255,255,255,0.12)]"
          >
            Lancer la partie
          </button>
        </div>
      </main>
    );
  }

  if (isFinished) {
    const total = questions.length;
    const pct = total ? Math.round((correctAnswers / total) * 100) : 0;

    return (
      <main className="min-h-screen bg-black text-white px-4 py-10 flex items-center justify-center">
        <div className="w-full max-w-5xl rounded-[2rem] border border-white/10 bg-zinc-950/90 p-6 md:p-10 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-white/50 text-sm uppercase tracking-[0.4em]">
                Score final
              </p>
              <h1 className="mt-2 text-5xl md:text-7xl font-black">
                {correctAnswers}/{total}
              </h1>
              <div className="mt-3 flex items-center gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-2xl ${i < stars ? "text-yellow-400" : "text-white/20"}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <p className="mt-3 text-white/70">
                {pct}% · {points} points · Rank {getRank(correctAnswers, total)}
              </p>
            </div>
            <button
              onClick={restart}
              className="rounded-2xl bg-white px-6 py-3 font-bold text-black transition hover:bg-red-500 hover:text-white"
            >
              Rejouer
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {answers.map((a, index) => (
              <div
                key={a.questionId}
                className={`rounded-2xl border p-4 ${
                  a.correct
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-red-500/30 bg-red-500/10"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/50">Question {index + 1}</p>
                    <h3 className="mt-1 font-semibold">{a.question}</h3>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      a.correct ? "bg-emerald-500 text-black" : "bg-red-500 text-white"
                    }`}
                  >
                    {a.correct ? "Bonne" : "Fausse"}
                  </span>
                </div>
                <div className="mt-4 text-sm space-y-2">
                  <p>
                    <span className="text-white/50">Ta réponse :</span>{" "}
                    <span className={a.correct ? "text-emerald-300" : "text-red-300"}>
                      {a.selected}
                    </span>
                  </p>
                  <p>
                    <span className="text-white/50">Bonne réponse :</span>{" "}
                    <span className="text-emerald-300">{a.correctAnswer}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-5">
            <h2 className="text-lg font-bold">Historique des scores</h2>
            <div className="mt-4 grid gap-3">
              {scoresHistory.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm"
                >
                  <span>{new Date(s.date).toLocaleString("fr-FR")}</span>
                  <span className="font-semibold">
                    {s.correctAnswers}/{s.totalQuestions} · {s.points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!currentQuestion) return null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_40%),linear-gradient(180deg,#050505_0%,#000_100%)] text-white px-4 py-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-white/50">
            Question {currentIndex + 1} / {questions.length}
          </span>
          <div className="flex items-center gap-3">
            {combo > 1 && (
              <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-sm font-bold text-yellow-300 animate-pulse">
                Combo x{combo}
              </span>
            )}
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm">
              {timeLeft}s
            </span>
          </div>
        </div>

        <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-500 via-pink-500 to-yellow-400 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div
          key={animKey}
          className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-5 md:p-8 shadow-[0_20px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl transition-all duration-300 ${
            isTransitioning
              ? "opacity-0 translate-y-4 scale-[0.985]"
              : "opacity-100 translate-y-0 scale-100"
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.14),transparent_35%)]" />
          <div className="relative z-10">
            <div className="flex justify-center">
              <div className="rounded-3xl border border-white/10 bg-black/40 p-3 shadow-2xl">
                <img
                  src={`https://flagcdn.com/w320/${currentQuestion.flag}.png`}
                  alt={currentQuestion.question}
                  className="h-40 w-auto rounded-2xl object-cover md:h-48"
                />
              </div>
            </div>

            <h2 className="mt-6 text-center text-2xl md:text-4xl font-black tracking-tight">
              {currentQuestion.question}
            </h2>

            <div className="mt-8 grid gap-3">
              {currentQuestion.options.map((o) => {
                const isSelected = selectedAnswer === o;
                const isCorrect = o === currentQuestion.answer;
                const showResult = !!selectedAnswer;

                let stateClasses =
                  "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20";

                if (showResult && isCorrect) {
                  stateClasses =
                    "border-emerald-400 bg-emerald-500 text-black shadow-[0_0_25px_rgba(16,185,129,0.25)]";
                } else if (showResult && isSelected && !isCorrect) {
                  stateClasses =
                    "border-red-400 bg-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.25)]";
                }

                return (
                  <button
                    key={o}
                    onClick={() => handleAnswer(o)}
                    disabled={!!selectedAnswer}
                    className={`rounded-2xl border px-5 py-4 text-left font-semibold transition-all duration-300 ${stateClasses} disabled:cursor-not-allowed ${
                      !selectedAnswer ? "hover:scale-[1.01]" : ""
                    }`}
                  >
                    <span className="flex items-center justify-between gap-4">
                      <span>{o}</span>
                      <span className="text-xs uppercase tracking-[0.25em] opacity-70">
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
      </div>
    </main>
  );
}