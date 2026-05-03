"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Level = "normal" | "hard";
type GameStatus = "menu" | "memorize" | "question" | "feedback" | "finished";

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
  // Fruits
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

  // Transport
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

  // Animals
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

  // Symbols
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
  normal: {
    label: "Normal",
    rounds: 10,
    sequenceSize: 5,
    memorizeSeconds: 2.5,
    answerSeconds: 6,
    target: 70,
    wrongPenalty: 0,
  },
  hard: {
    label: "Difficile",
    rounds: 10,
    sequenceSize: 6,
    memorizeSeconds: 2.5,
    answerSeconds: 5,
    target: 90,
    wrongPenalty: -3,
  },
};

function shuffleArray<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

function getCategoryLabel(category: EmojiItem["category"]) {
  const labels = {
    fruit: "fruits",
    transport: "transports",
    animal: "animaux",
    symbol: "symboles",
  };

  return labels[category];
}

function playSound(type: "start" | "tick" | "correct" | "wrong" | "finish") {
  if (typeof window === "undefined") return;

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) return;

  const audio = new AudioContextClass();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.connect(gain);
  gain.connect(audio.destination);

  if (type === "start") {
    oscillator.frequency.value = 520;
    gain.gain.value = 0.08;
    oscillator.type = "triangle";
  }

  if (type === "tick") {
    oscillator.frequency.value = 880;
    gain.gain.value = 0.04;
    oscillator.type = "sine";
  }

  if (type === "correct") {
    oscillator.frequency.value = 900;
    gain.gain.value = 0.09;
    oscillator.type = "sine";
  }

  if (type === "wrong") {
    oscillator.frequency.value = 160;
    gain.gain.value = 0.12;
    oscillator.type = "sawtooth";
  }

  if (type === "finish") {
    oscillator.frequency.value = 720;
    gain.gain.value = 0.09;
    oscillator.type = "triangle";
  }

  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.2);
  oscillator.stop(audio.currentTime + 0.22);
}

function buildRound(roundId: number, level: Level): Round {
  const config = LEVEL_CONFIG[level];
  const sequence = shuffleArray(EMOJIS).slice(0, config.sequenceSize);

  const possibleTypes: QuestionType[] =
    level === "normal"
      ? [
          "position-of-emoji",
          "emoji-at-position",
          "count-category",
          "missing-emoji",
        ]
      : [
          "position-of-emoji",
          "emoji-at-position",
          "count-category",
          "missing-emoji",
          "rebuild-order",
        ];

  const questionType =
    possibleTypes[Math.floor(Math.random() * possibleTypes.length)];

  if (questionType === "position-of-emoji") {
    const targetIndex = Math.floor(Math.random() * sequence.length);
    const targetEmoji = sequence[targetIndex];

    return {
      id: roundId,
      sequence,
      questionType,
      question: `Où était placé ${targetEmoji.emoji} ?`,
      options: Array.from({ length: sequence.length }, (_, i) =>
        String(i + 1)
      ),
      answer: String(targetIndex + 1),
    };
  }

  if (questionType === "emoji-at-position") {
    const targetIndex = Math.floor(Math.random() * sequence.length);
    const correctEmoji = sequence[targetIndex].emoji;
    const wrongOptions = shuffleArray(
      EMOJIS.filter((item) => item.emoji !== correctEmoji).map(
        (item) => item.emoji
      )
    ).slice(0, 3);

    return {
      id: roundId,
      sequence,
      questionType,
      question: `Quel emoji était en position ${targetIndex + 1} ?`,
      options: shuffleArray([correctEmoji, ...wrongOptions]),
      answer: correctEmoji,
    };
  }

  if (questionType === "count-category") {
    const categories: EmojiItem["category"][] = [
      "fruit",
      "transport",
      "animal",
      "symbol",
    ];
    const category =
      categories[Math.floor(Math.random() * categories.length)];
    const count = sequence.filter((item) => item.category === category).length;

    return {
      id: roundId,
      sequence,
      questionType,
      question: `Combien de ${getCategoryLabel(category)} étaient affichés ?`,
      options: shuffleArray(["0", "1", "2", "3", "4", "5", "6"]).slice(0, 4).includes(String(count))
        ? shuffleArray(["0", "1", "2", "3", "4", "5", "6"]).slice(0, 4)
        : shuffleArray([String(count), "0", "1", "2", "3", "4", "5", "6"]).slice(0, 4),
      answer: String(count),
    };
  }

  if (questionType === "missing-emoji") {
    const missingIndex = Math.floor(Math.random() * sequence.length);
    const missingEmoji = sequence[missingIndex].emoji;

    const wrongOptions = shuffleArray(
      EMOJIS.filter((item) => item.emoji !== missingEmoji).map(
        (item) => item.emoji
      )
    ).slice(0, 3);

    return {
      id: roundId,
      sequence,
      questionType,
      question: "Quel emoji faisait partie de la séquence ?",
      options: shuffleArray([missingEmoji, ...wrongOptions]),
      answer: missingEmoji,
    };
  }

  const answer = sequence.map((item) => item.emoji).join(" ");

  return {
    id: roundId,
    sequence,
    questionType: "rebuild-order",
    question: "Remets la séquence dans le bon ordre.",
    options: shuffleArray(sequence.map((item) => item.emoji)),
    answer,
  };
}

export default function MemoryRushPage() {
  const [level, setLevel] = useState<Level>("normal");
  const [status, setStatus] = useState<GameStatus>("menu");
  const [roundIndex, setRoundIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [score, setScore] = useState(0);
  const [answerTimeLeft, setAnswerTimeLeft] = useState(6);
  const [memorizeProgress, setMemorizeProgress] = useState(100);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [rebuildSelection, setRebuildSelection] = useState<string[]>([]);
  const [history, setHistory] = useState<AnswerHistory[]>([]);
  const [bestScore, setBestScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const memorizeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const config = LEVEL_CONFIG[level];
  const target = config.target;
  const gameProgress = Math.min((score / target) * 100, 100);

  useEffect(() => {
    const saved = localStorage.getItem("training_score_memoryrush");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBestScore(parsed.points || 0);
      } catch {
        setBestScore(0);
      }
    }
  }, []);

  function startGame() {
    playSound("start");
    setStatus("memorize");
    setScore(0);
    setRoundIndex(0);
    setHistory([]);
    setSelectedAnswer("");
    setRebuildSelection([]);
    setFeedback(null);
    startRound(0);
  }

  function startRound(nextRoundIndex: number) {
    const round = buildRound(nextRoundIndex + 1, level);

    setCurrentRound(round);
    setRoundIndex(nextRoundIndex);
    setSelectedAnswer("");
    setRebuildSelection([]);
    setFeedback(null);
    setMemorizeProgress(100);
    setStatus("memorize");

    if (memorizeTimerRef.current) {
      clearInterval(memorizeTimerRef.current);
    }

    const totalMs = LEVEL_CONFIG[level].memorizeSeconds * 1000;
    const startedAt = Date.now();

    memorizeTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const percentage = Math.max(0, 100 - (elapsed / totalMs) * 100);
      setMemorizeProgress(percentage);

      if (elapsed >= totalMs) {
        if (memorizeTimerRef.current) {
          clearInterval(memorizeTimerRef.current);
        }

        setAnswerTimeLeft(LEVEL_CONFIG[level].answerSeconds);
        setStatus("question");
        playSound("tick");
      }
    }, 50);
  }

  function finishGame(finalScore: number, finalHistory: AnswerHistory[]) {
    playSound("finish");
    setStatus("finished");

    const newBest = Math.max(bestScore, finalScore);
    setBestScore(newBest);

    localStorage.setItem(
      "training_score_memoryrush",
      JSON.stringify({
        score: `${finalScore}/${target}`,
        points: finalScore,
        level,
        success: finalScore >= target,
        updatedAt: new Date().toISOString(),
      })
    );

    setHistory(finalHistory);
  }

  function goNextRound(updatedHistory: AnswerHistory[], updatedScore: number) {
    setTimeout(() => {
      if (roundIndex + 1 < config.rounds) {
        startRound(roundIndex + 1);
      } else {
        finishGame(updatedScore, updatedHistory);
      }
    }, 900);
  }

  function submitAnswer(answer: string) {
    if (!currentRound || status !== "question") return;

    const isCorrect = answer === currentRound.answer;
    const gainedPoints = isCorrect
      ? answerTimeLeft >= 4
        ? 12
        : 10
      : config.wrongPenalty;

    const nextScore = Math.max(0, score + gainedPoints);

    const newHistoryItem: AnswerHistory = {
      round: roundIndex + 1,
      question: currentRound.question,
      selected: answer || "Aucune réponse",
      answer: currentRound.answer,
      correct: isCorrect,
      points: gainedPoints,
    };

    const updatedHistory = [...history, newHistoryItem];

    setSelectedAnswer(answer);
    setFeedback(isCorrect ? "correct" : "wrong");
    setScore(nextScore);
    setHistory(updatedHistory);

    playSound(isCorrect ? "correct" : "wrong");
    setStatus("feedback");

    goNextRound(updatedHistory, nextScore);
  }

  function handleRebuildSelect(emoji: string) {
    if (!currentRound || status !== "question") return;
    if (rebuildSelection.includes(emoji)) return;

    const nextSelection = [...rebuildSelection, emoji];
    setRebuildSelection(nextSelection);

    if (nextSelection.length === currentRound.sequence.length) {
      submitAnswer(nextSelection.join(" "));
    }
  }

  useEffect(() => {
    if (status !== "question") return;

    if (answerTimeLeft <= 0) {
      submitAnswer("");
      return;
    }

    const timer = setTimeout(() => {
      setAnswerTimeLeft((prev) => prev - 1);
      if (answerTimeLeft <= 3) playSound("tick");
    }, 1000);

    return () => clearTimeout(timer);
  }, [status, answerTimeLeft]);

  if (!currentRound && status !== "menu") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-red-400">Chargement...</p>
      </main>
    );
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
          <a href="/training" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500 text-xl font-black text-black shadow-lg shadow-red-500/30">
              🧠
            </div>
            <div>
              <h1 className="text-xl font-black">
                Memory<span className="text-red-400">Rush</span>
              </h1>
              <p className="text-xs text-zinc-400">Mémoire · vitesse · réflexe</p>
            </div>
          </a>

          <a
            href="/training"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-white transition hover:border-red-400 hover:text-red-400"
          >
            Retour
          </a>
        </nav>
      </header>

      {status === "menu" && (
        <section className="relative z-10 mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300">
              Nouveau mode training
            </div>

            <h2 className="text-4xl font-black leading-tight md:text-6xl">
              Mémorise vite. <br />
              Réponds juste. <br />
              <span className="text-red-400">Bats l’objectif.</span>
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">
              Memory Rush affiche une séquence d’emojis pendant 2.5 secondes.
              Ensuite, une question change à chaque round : position, ordre,
              élément manquant ou catégorie. Simple, rapide, mais pas facile.
            </p>

            <div className="mt-8 grid max-w-xl gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <p className="text-sm text-zinc-400">Affichage</p>
                <h3 className="mt-2 text-3xl font-black text-red-400">2.5s</h3>
              </div>
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <p className="text-sm text-zinc-400">Rounds</p>
                <h3 className="mt-2 text-3xl font-black text-red-400">10</h3>
              </div>
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <p className="text-sm text-zinc-400">Best</p>
                <h3 className="mt-2 text-3xl font-black text-red-400">
                  {bestScore}
                </h3>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-red-500/20 blur-2xl" />

            <div className="relative rounded-[2rem] border border-red-400/20 bg-zinc-950 p-6 shadow-2xl">
              <h3 className="text-3xl font-black">Choisis ton niveau</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Normal pour apprendre. Difficile pour tester ta vraie mémoire.
              </p>

              <div className="mt-8 grid gap-4">
                <button
                  onClick={() => setLevel("normal")}
                  className={`rounded-3xl border p-5 text-left transition ${
                    level === "normal"
                      ? "border-red-400 bg-red-500/10 text-red-400"
                      : "border-zinc-800 bg-black text-zinc-300 hover:border-red-400"
                  }`}
                >
                  <p className="text-xl font-black">Normal</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    5 objets · 6 sec pour répondre · objectif 70 pts
                  </p>
                </button>

                <button
                  onClick={() => setLevel("hard")}
                  className={`rounded-3xl border p-5 text-left transition ${
                    level === "hard"
                      ? "border-red-400 bg-red-500/10 text-red-400"
                      : "border-zinc-800 bg-black text-zinc-300 hover:border-red-400"
                  }`}
                >
                  <p className="text-xl font-black">Difficile</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    6 objets · 5 sec pour répondre · objectif 90 pts · pénalité
                    -3
                  </p>
                </button>
              </div>

              <div className="mt-6 rounded-3xl border border-red-400/20 bg-red-500/10 p-5">
                <p className="text-sm text-zinc-400">Objectif sélectionné</p>
                <h4 className="mt-2 text-4xl font-black text-red-400">
                  {LEVEL_CONFIG[level].target} pts
                </h4>
                <p className="mt-2 text-sm text-zinc-300">
                  {LEVEL_CONFIG[level].rounds} rounds ·{" "}
                  {LEVEL_CONFIG[level].memorizeSeconds}s de mémorisation
                </p>
              </div>

              <button
                onClick={startGame}
                className="mt-6 w-full rounded-2xl bg-red-500 px-6 py-4 font-black text-black shadow-xl shadow-red-500/20 transition hover:scale-[1.01] hover:bg-red-400"
              >
                Commencer Memory Rush
              </button>
            </div>
          </div>
        </section>
      )}

      {(status === "memorize" ||
        status === "question" ||
        status === "feedback") &&
        currentRound && (
          <section className="relative z-10 mx-auto max-w-6xl px-5 py-8">
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <p className="text-sm text-zinc-400">Round</p>
                <h3 className="mt-2 text-3xl font-black text-red-400">
                  {roundIndex + 1}/{config.rounds}
                </h3>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <p className="text-sm text-zinc-400">Score</p>
                <h3 className="mt-2 text-3xl font-black text-red-400">
                  {score}
                </h3>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <p className="text-sm text-zinc-400">Objectif</p>
                <h3 className="mt-2 text-3xl font-black text-red-400">
                  {target}
                </h3>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <p className="text-sm text-zinc-400">
                  {status === "memorize" ? "Mémoire" : "Réponse"}
                </p>
                <h3 className="mt-2 text-3xl font-black text-red-400">
                  {status === "memorize" ? "2.5s" : `${answerTimeLeft}s`}
                </h3>
              </div>
            </div>

            <div className="mb-6 h-3 overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-red-500 transition-all"
                style={{
                  width:
                    status === "memorize"
                      ? `${memorizeProgress}%`
                      : `${gameProgress}%`,
                }}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-[2rem] bg-red-500/20 blur-2xl" />

              <div className="relative min-h-[540px] rounded-[2rem] border border-red-400/20 bg-zinc-950 p-6 text-center shadow-2xl md:p-10">
                {status === "memorize" && (
                  <div>
                    <p className="font-bold text-red-400">
                      Mémorise la séquence
                    </p>
                    <h2 className="mt-3 text-2xl font-black md:text-4xl">
                      La consigne arrive après.
                    </h2>

                    <div className="mt-12 flex flex-wrap items-center justify-center gap-5">
                      {currentRound.sequence.map((item, index) => (
                        <div
                          key={`${item.emoji}-${index}`}
                          className="animate-pulse rounded-[2rem] border border-red-400/20 bg-black px-7 py-6 text-6xl shadow-xl md:text-7xl"
                        >
                          {item.emoji}
                        </div>
                      ))}
                    </div>

                    <p className="mt-10 text-sm text-zinc-500">
                      Retiens les objets, les positions et l’ordre.
                    </p>
                  </div>
                )}

                {(status === "question" || status === "feedback") && (
                  <div>
                    <p className="font-bold text-red-400">
                      Question {roundIndex + 1}
                    </p>

                    <h2 className="mx-auto mt-4 max-w-3xl text-2xl font-black md:text-4xl">
                      {currentRound.question}
                    </h2>

                    {currentRound.questionType !== "rebuild-order" && (
                      <div className="mt-10 grid gap-4 md:grid-cols-2">
                        {currentRound.options.map((option) => {
                          const isCorrect = option === currentRound.answer;
                          const isSelected = option === selectedAnswer;

                          let buttonClass =
                            "border-zinc-800 bg-black hover:border-red-400 hover:text-red-400";

                          if (status === "feedback") {
                            if (isCorrect) {
                              buttonClass =
                                "border-green-400 bg-green-500/10 text-green-400";
                            } else if (isSelected && !isCorrect) {
                              buttonClass =
                                "border-red-400 bg-red-500/10 text-red-400";
                            } else {
                              buttonClass =
                                "border-zinc-800 bg-black text-zinc-500";
                            }
                          }

                          return (
                            <button
                              key={option}
                              disabled={status !== "question"}
                              onClick={() => submitAnswer(option)}
                              className={`rounded-2xl border px-5 py-5 text-center text-3xl font-black transition ${buttonClass}`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {currentRound.questionType === "rebuild-order" && (
                      <div className="mt-10">
                        <div className="rounded-3xl border border-zinc-800 bg-black p-5">
                          <p className="text-sm text-zinc-400">
                            Ta sélection
                          </p>

                          <div className="mt-4 flex min-h-[80px] flex-wrap items-center justify-center gap-3">
                            {rebuildSelection.length === 0 ? (
                              <p className="text-sm text-zinc-600">
                                Clique les emojis dans l’ordre.
                              </p>
                            ) : (
                              rebuildSelection.map((emoji, index) => (
                                <div
                                  key={`${emoji}-${index}`}
                                  className="rounded-2xl bg-red-500/10 px-5 py-4 text-4xl"
                                >
                                  {emoji}
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-3">
                          {currentRound.options.map((option) => {
                            const used = rebuildSelection.includes(option);

                            return (
                              <button
                                key={option}
                                disabled={status !== "question" || used}
                                onClick={() => handleRebuildSelect(option)}
                                className={`rounded-2xl border px-5 py-5 text-4xl font-black transition ${
                                  used
                                    ? "border-zinc-800 bg-zinc-950 text-zinc-700"
                                    : "border-zinc-800 bg-black hover:border-red-400 hover:text-red-400"
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {feedback && (
                      <div
                        className={`mt-8 rounded-3xl border p-5 ${
                          feedback === "correct"
                            ? "border-green-400/30 bg-green-500/10 text-green-400"
                            : "border-red-400/30 bg-red-500/10 text-red-400"
                        }`}
                      >
                        <p className="text-xl font-black">
                          {feedback === "correct"
                            ? "Correct !"
                            : "Faux / temps écoulé"}
                        </p>
                        <p className="mt-2 text-sm">
                          Réponse : {currentRound.answer}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

      {status === "finished" && (
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-4xl items-center justify-center px-5 py-12">
          <div className="w-full rounded-[2rem] border border-red-400/20 bg-zinc-950 p-6 text-center shadow-2xl md:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-red-500 text-4xl shadow-lg shadow-red-500/30">
              {score >= target ? "🏆" : "🧠"}
            </div>

            <p className="mt-6 font-bold text-red-400">Memory Rush terminé</p>

            <h2 className="mt-3 text-4xl font-black md:text-6xl">
              {score >= target ? "Objectif réussi !" : "Presque !"}
            </h2>

            <p className="mt-4 text-lg text-zinc-400">
              Ton score :{" "}
              <span className="font-black text-red-400">{score} pts</span> /
              objectif :{" "}
              <span className="font-black text-red-400">{target} pts</span>
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-zinc-800 bg-black p-5">
                <p className="text-sm text-zinc-400">Meilleur score</p>
                <h3 className="mt-2 text-3xl font-black text-red-400">
                  {bestScore}
                </h3>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-black p-5">
                <p className="text-sm text-zinc-400">Niveau</p>
                <h3 className="mt-2 text-3xl font-black text-red-400">
                  {config.label}
                </h3>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-black p-5">
                <p className="text-sm text-zinc-400">Rounds</p>
                <h3 className="mt-2 text-3xl font-black text-red-400">
                  {config.rounds}
                </h3>
              </div>
            </div>

            {score < target && (
              <div className="mt-8 rounded-3xl border border-red-400/20 bg-red-500/10 p-5">
                <p className="font-bold text-red-300">
                  Il te manque {target - score} points pour réussir le challenge.
                </p>
              </div>
            )}

            <div className="mt-8 rounded-3xl border border-zinc-800 bg-black p-5 text-left">
              <h3 className="text-xl font-black">Résumé</h3>

              <div className="mt-5 max-h-[300px] space-y-3 overflow-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.round}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold">Round {item.round}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          item.correct
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {item.correct ? "Correct" : "Faux"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">
                      {item.question}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Ta réponse : {item.selected} · Réponse : {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={startGame}
                className="flex-1 rounded-2xl bg-red-500 px-6 py-4 font-black text-black shadow-lg shadow-red-500/20 transition hover:bg-red-400"
              >
                Rejouer
              </button>

              <button
                onClick={() => setStatus("menu")}
                className="flex-1 rounded-2xl border border-zinc-700 px-6 py-4 font-bold text-white transition hover:border-red-400 hover:text-red-400"
              >
                Changer niveau
              </button>

              <a
                href="/training"
                className="flex-1 rounded-2xl border border-red-400/30 px-6 py-4 text-center font-bold text-red-400 transition hover:bg-red-500 hover:text-black"
              >
                Retour training
              </a>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}