"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type GameStatus = "menu" | "playing" | "finished";
type ThemeKey = "arena" | "cyber" | "nature";

type CardFace = {
  key: string;
  name: string;
  colorA: string;
  colorB: string;
  symbol: "star" | "shield" | "bolt" | "gem" | "target" | "flame";
};

type Card = {
  id: number;
  pairId: string;
  face: CardFace;
  flipped: boolean;
  matched: boolean;
  wrong: boolean;
};

type FloatingPoint = {
  id: number;
  text: string;
};

const TOTAL_TIME = 50;
const TOTAL_LIVES = 5;
const POINTS_PER_PAIR = 10;

const THEMES: Record<ThemeKey, { name: string; cards: CardFace[] }> = {
  arena: {
    name: "Arena Pack",
    cards: [
      { key: "crown", name: "Crown", colorA: "#f59e0b", colorB: "#ef4444", symbol: "star" },
      { key: "shield", name: "Shield", colorA: "#ef4444", colorB: "#7f1d1d", symbol: "shield" },
      { key: "bolt", name: "Bolt", colorA: "#facc15", colorB: "#f97316", symbol: "bolt" },
      { key: "gem", name: "Gem", colorA: "#38bdf8", colorB: "#7c3aed", symbol: "gem" },
      { key: "target", name: "Target", colorA: "#fb7185", colorB: "#be123c", symbol: "target" },
      { key: "flame", name: "Flame", colorA: "#fb923c", colorB: "#dc2626", symbol: "flame" },
    ],
  },
  cyber: {
    name: "Cyber Pack",
    cards: [
      { key: "neon-star", name: "Neon Star", colorA: "#22d3ee", colorB: "#1d4ed8", symbol: "star" },
      { key: "neon-shield", name: "Neon Shield", colorA: "#a855f7", colorB: "#312e81", symbol: "shield" },
      { key: "neon-bolt", name: "Neon Bolt", colorA: "#84cc16", colorB: "#15803d", symbol: "bolt" },
      { key: "neon-gem", name: "Neon Gem", colorA: "#f0abfc", colorB: "#86198f", symbol: "gem" },
      { key: "neon-target", name: "Neon Target", colorA: "#60a5fa", colorB: "#0f172a", symbol: "target" },
      { key: "neon-flame", name: "Neon Flame", colorA: "#f97316", colorB: "#991b1b", symbol: "flame" },
    ],
  },
  nature: {
    name: "Nature Pack",
    cards: [
      { key: "sun", name: "Sun", colorA: "#fde047", colorB: "#f97316", symbol: "star" },
      { key: "leaf-shield", name: "Leaf", colorA: "#86efac", colorB: "#15803d", symbol: "shield" },
      { key: "storm", name: "Storm", colorA: "#93c5fd", colorB: "#1e40af", symbol: "bolt" },
      { key: "water-gem", name: "Water", colorA: "#67e8f9", colorB: "#0e7490", symbol: "gem" },
      { key: "rose-target", name: "Rose", colorA: "#fda4af", colorB: "#be123c", symbol: "target" },
      { key: "fire-nature", name: "Fire", colorA: "#fdba74", colorB: "#c2410c", symbol: "flame" },
    ],
  },
};

function shuffleArray<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

function createDeck(theme: ThemeKey): Card[] {
  const selected = THEMES[theme].cards;

  const pairs = selected.flatMap((face) => [
    {
      id: 0,
      pairId: face.key,
      face,
      flipped: false,
      matched: false,
      wrong: false,
    },
    {
      id: 0,
      pairId: face.key,
      face,
      flipped: false,
      matched: false,
      wrong: false,
    },
  ]);

  return shuffleArray(pairs).map((card, index) => ({
    ...card,
    id: index + 1,
  }));
}

function playSound(type: "start" | "flip" | "match" | "wrong" | "win" | "lose" | "tick") {
  if (typeof window === "undefined") return;

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) return;

  const audio = new AudioContextClass();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.connect(gain);
  gain.connect(audio.destination);

  const settings = {
    start: { freq: 520, gain: 0.08, type: "triangle" as OscillatorType, duration: 0.22 },
    flip: { freq: 680, gain: 0.045, type: "sine" as OscillatorType, duration: 0.12 },
    match: { freq: 940, gain: 0.09, type: "sine" as OscillatorType, duration: 0.18 },
    wrong: { freq: 150, gain: 0.11, type: "sawtooth" as OscillatorType, duration: 0.22 },
    win: { freq: 980, gain: 0.12, type: "triangle" as OscillatorType, duration: 0.35 },
    lose: { freq: 120, gain: 0.12, type: "sawtooth" as OscillatorType, duration: 0.25 },
    tick: { freq: 760, gain: 0.035, type: "sine" as OscillatorType, duration: 0.08 },
  }[type];

  oscillator.frequency.value = settings.freq;
  oscillator.type = settings.type;
  gain.gain.value = settings.gain;

  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + settings.duration);
  oscillator.stop(audio.currentTime + settings.duration + 0.02);
}

function CardSymbol({ face }: { face: CardFace }) {
  const stroke = "rgba(255,255,255,0.92)";

  return (
    <svg viewBox="0 0 100 100" className="h-16 w-16 md:h-20 md:w-20">
      <defs>
        <linearGradient id={`g-${face.key}`} x1="0" x2="1">
          <stop offset="0%" stopColor={face.colorA} />
          <stop offset="100%" stopColor={face.colorB} />
        </linearGradient>
      </defs>

      <circle cx="50" cy="50" r="44" fill={`url(#g-${face.key})`} opacity="0.25" />

      {face.symbol === "star" && (
        <path
          d="M50 14 L60 39 L87 39 L65 55 L74 82 L50 65 L26 82 L35 55 L13 39 L40 39 Z"
          fill={`url(#g-${face.key})`}
          stroke={stroke}
          strokeWidth="3"
        />
      )}

      {face.symbol === "shield" && (
        <path
          d="M50 10 L80 22 V45 C80 65 66 80 50 90 C34 80 20 65 20 45 V22 Z"
          fill={`url(#g-${face.key})`}
          stroke={stroke}
          strokeWidth="3"
        />
      )}

      {face.symbol === "bolt" && (
        <path
          d="M58 8 L25 55 H48 L40 92 L76 41 H53 Z"
          fill={`url(#g-${face.key})`}
          stroke={stroke}
          strokeWidth="3"
        />
      )}

      {face.symbol === "gem" && (
        <path
          d="M20 35 L35 15 H65 L80 35 L50 88 Z"
          fill={`url(#g-${face.key})`}
          stroke={stroke}
          strokeWidth="3"
        />
      )}

      {face.symbol === "target" && (
        <>
          <circle cx="50" cy="50" r="36" fill={`url(#g-${face.key})`} stroke={stroke} strokeWidth="3" />
          <circle cx="50" cy="50" r="22" fill="rgba(0,0,0,0.25)" stroke={stroke} strokeWidth="3" />
          <circle cx="50" cy="50" r="8" fill={stroke} />
        </>
      )}

      {face.symbol === "flame" && (
        <path
          d="M55 8 C65 28 82 38 75 62 C69 82 54 91 39 86 C24 81 18 63 25 48 C31 34 43 30 45 12 C50 19 52 25 52 34 C59 28 59 18 55 8 Z"
          fill={`url(#g-${face.key})`}
          stroke={stroke}
          strokeWidth="3"
        />
      )}
    </svg>
  );
}

function CardBack() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-[1.35rem] bg-[radial-gradient(circle_at_top,#7f1d1d_0%,#111827_38%,#020617_100%)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-400/40 bg-black/50 text-3xl font-black text-yellow-400 shadow-lg shadow-red-500/20 md:h-16 md:w-16">
        Z
      </div>
      <p className="mt-3 text-xs font-black tracking-[0.3em] text-yellow-300/80">
        ZONARENA
      </p>
    </div>
  );
}

export default function MemoryCardPage() {
  const [status, setStatus] = useState<GameStatus>("menu");
  const [theme, setTheme] = useState<ThemeKey>("arena");
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(TOTAL_LIVES);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [bestScore, setBestScore] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const floatingId = useRef(1);

  const totalPairs = THEMES[theme].cards.length;
  const progress = Math.min((matchedPairs / totalPairs) * 100, 100);
  const gameWon = matchedPairs === totalPairs;
  const finalScore = gameWon ? score + timeLeft : score;

  useEffect(() => {
    const saved = localStorage.getItem("training_score_cards");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBestScore(parsed.points || 0);
      } catch {
        setBestScore(0);
      }
    }
  }, []);

  useEffect(() => {
    if (status !== "playing") return;

    if (timeLeft <= 0) {
      finishGame(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
      if (timeLeft <= 10) playSound("tick");
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status, timeLeft]);

  useEffect(() => {
    if (status === "playing" && gameWon) {
      finishGame(true);
    }
  }, [gameWon, status]);

  function startGame() {
    playSound("start");

    setCards(createDeck(theme));
    setSelectedCards([]);
    setScore(0);
    setLives(TOTAL_LIVES);
    setTimeLeft(TOTAL_TIME);
    setMatchedPairs(0);
    setIsLocked(false);
    setResultMessage("");
    setShowConfetti(false);
    setFloatingPoints([]);
    setStatus("playing");
  }

  function finishGame(won: boolean) {
    const final = won ? score + timeLeft : score;

    setStatus("finished");

    if (won) {
      playSound("win");
      setShowConfetti(true);
      setResultMessage("Victoire spectaculaire !");
    } else {
      playSound("lose");
      setResultMessage("Partie terminée !");
    }

    const newBest = Math.max(bestScore, final);
    setBestScore(newBest);

    localStorage.setItem(
      "training_score_cards",
      JSON.stringify({
        score: `${matchedPairs}/${totalPairs}`,
        points: final,
        baseScore: score,
        timeBonus: won ? timeLeft : 0,
        lives,
        theme,
        success: won,
        updatedAt: new Date().toISOString(),
      })
    );
  }

  function addFloatingPoint(text: string) {
    const id = floatingId.current++;
    setFloatingPoints((prev) => [...prev, { id, text }]);

    setTimeout(() => {
      setFloatingPoints((prev) => prev.filter((item) => item.id !== id));
    }, 900);
  }

  function handleCardClick(cardId: number) {
    if (status !== "playing") return;
    if (isLocked) return;

    const clickedCard = cards.find((card) => card.id === cardId);

    if (!clickedCard || clickedCard.flipped || clickedCard.matched) return;
    if (selectedCards.length >= 2) return;

    playSound("flip");

    const newSelectedCards = [...selectedCards, cardId];

    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, flipped: true, wrong: false } : card
      )
    );

    setSelectedCards(newSelectedCards);

    if (newSelectedCards.length === 2) {
      checkMatch(newSelectedCards);
    }
  }

  function checkMatch(selected: number[]) {
    setIsLocked(true);

    const [firstId, secondId] = selected;
    const firstCard = cards.find((card) => card.id === firstId);
    const secondCard = cards.find((card) => card.id === secondId);

    if (!firstCard || !secondCard) return;

    const isMatch = firstCard.pairId === secondCard.pairId;

    setTimeout(() => {
      if (isMatch) {
        playSound("match");
        addFloatingPoint("+10");

        setCards((prev) =>
          prev.map((card) =>
            card.id === firstId || card.id === secondId
              ? { ...card, matched: true }
              : card
          )
        );

        setScore((prev) => prev + POINTS_PER_PAIR);
        setMatchedPairs((prev) => prev + 1);
      } else {
        playSound("wrong");

        setCards((prev) =>
          prev.map((card) =>
            card.id === firstId || card.id === secondId
              ? { ...card, wrong: true }
              : card
          )
        );

        setLives((prev) => {
          const nextLives = prev - 1;

          if (nextLives <= 0) {
            setTimeout(() => finishGame(false), 550);
          }

          return nextLives;
        });

        setTimeout(() => {
          setCards((prev) =>
            prev.map((card) =>
              card.id === firstId || card.id === secondId
                ? { ...card, flipped: false, wrong: false }
                : card
            )
          );
        }, 600);
      }

      setSelectedCards([]);
      setIsLocked(false);
    }, 650);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <style jsx global>{`
        @keyframes floatParticle {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          20% { opacity: 0.7; }
          100% { transform: translateY(-120vh) translateX(40px); opacity: 0; }
        }

        @keyframes floatPoint {
          0% { transform: translate(-50%, 0) scale(0.7); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(-50%, -70px) scale(1.2); opacity: 0; }
        }

        @keyframes shakeCard {
          0%, 100% { transform: rotateY(180deg) translateX(0); }
          20% { transform: rotateY(180deg) translateX(-7px); }
          40% { transform: rotateY(180deg) translateX(7px); }
          60% { transform: rotateY(180deg) translateX(-5px); }
          80% { transform: rotateY(180deg) translateX(5px); }
        }

        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      {/* Dark arena background */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,#3b0764_0%,#111827_28%,#020617_65%,#000_100%)]" />
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px]" />

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 34 }).map((_, index) => (
          <span
            key={index}
            className="absolute h-1.5 w-1.5 rounded-full bg-yellow-400/50"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: `-${Math.random() * 100}px`,
              animation: `floatParticle ${7 + Math.random() * 9}s linear infinite`,
              animationDelay: `${Math.random() * 8}s`,
            }}
          />
        ))}
      </div>

      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {Array.from({ length: 90 }).map((_, index) => (
            <span
              key={index}
              className="absolute h-3 w-2 rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                top: "-20px",
                background:
                  ["#facc15", "#ef4444", "#a855f7", "#22d3ee", "#f97316"][
                    index % 5
                  ],
                animation: `confettiFall ${2 + Math.random() * 2.8}s linear forwards`,
                animationDelay: `${Math.random() * 0.6}s`,
              }}
            />
          ))}
        </div>
      )}

      <header className="relative z-10 border-b border-purple-500/20 bg-black/70 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <a href="/training" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-black shadow-lg shadow-yellow-400/30">
              Z
            </div>
            <div>
              <h1 className="text-xl font-black">
                Memory<span className="text-yellow-400">Card</span>
              </h1>
              <p className="text-xs text-zinc-400">Zonarena · mémoire premium</p>
            </div>
          </a>

          <a
            href="/training"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400"
          >
            Retour
          </a>
        </nav>
      </header>

      {status === "menu" && (
        <section className="relative z-10 mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-300">
              Jeu premium · mémoire + vitesse
            </div>

            <h2 className="text-4xl font-black leading-tight md:text-6xl">
              Retourne les cartes. <br />
              Trouve les paires. <br />
              <span className="text-yellow-400">Domine l’arène.</span>
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">
              50 secondes, 12 cartes, 5 vies. Chaque paire rapporte 10 points.
              Si tu termines, tes secondes restantes s’ajoutent au score final.
            </p>

            <div className="mt-8 grid max-w-xl gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <p className="text-sm text-zinc-400">Temps</p>
                <h3 className="mt-2 text-3xl font-black text-yellow-400">50s</h3>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <p className="text-sm text-zinc-400">Vies</p>
                <h3 className="mt-2 text-3xl font-black text-yellow-400">4</h3>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <p className="text-sm text-zinc-400">Best</p>
                <h3 className="mt-2 text-3xl font-black text-yellow-400">
                  {bestScore}
                </h3>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-yellow-400/20 blur-2xl" />

            <div className="relative rounded-[2rem] border border-yellow-400/20 bg-zinc-950/95 p-6 shadow-2xl md:p-8">
              <h3 className="text-3xl font-black">Choisis ton thème</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Change le style des cartes pour garder le jeu frais.
              </p>

              <div className="mt-6 grid gap-3">
                {(Object.keys(THEMES) as ThemeKey[]).map((themeKey) => (
                  <button
                    key={themeKey}
                    onClick={() => setTheme(themeKey)}
                    className={`rounded-2xl border px-5 py-4 text-left transition ${
                      theme === themeKey
                        ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
                        : "border-zinc-800 bg-black text-zinc-300 hover:border-yellow-400"
                    }`}
                  >
                    <p className="font-black">{THEMES[themeKey].name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      6 paires · 12 cartes · dos Zonarena
                    </p>
                  </button>
                ))}
              </div>

              <button
                onClick={startGame}
                className="mt-8 w-full rounded-2xl bg-yellow-400 px-6 py-4 font-black text-black shadow-xl shadow-yellow-400/20 transition hover:scale-[1.01] hover:bg-yellow-300"
              >
                Commencer Memory Card
              </button>
            </div>
          </div>
        </section>
      )}

      {status === "playing" && (
        <section className="relative z-10 mx-auto max-w-6xl px-5 py-8">
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
              <p className="text-sm text-zinc-400">Score</p>
              <h3 className="mt-2 text-3xl font-black text-yellow-400">
                {score}
              </h3>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
              <p className="text-sm text-zinc-400">Temps</p>
              <h3
                className={`mt-2 text-3xl font-black ${
                  timeLeft <= 10 ? "text-red-400" : "text-yellow-400"
                }`}
              >
                {timeLeft}s
              </h3>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
              <p className="text-sm text-zinc-400">Vies</p>
              <div className="mt-2 flex gap-2">
                {Array.from({ length: TOTAL_LIVES }).map((_, index) => (
                  <span
                    key={index}
                    className={`text-3xl transition-all duration-300 ${
                      index < lives
                        ? "scale-100 opacity-100"
                        : "scale-0 opacity-0"
                    }`}
                  >
                    ❤️
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
              <p className="text-sm text-zinc-400">Paires</p>
              <h3 className="mt-2 text-3xl font-black text-yellow-400">
                {matchedPairs}/{totalPairs}
              </h3>
            </div>
          </div>

          <div className="mb-6 h-3 overflow-hidden rounded-full bg-zinc-900">
            <div
              className="h-full rounded-full bg-yellow-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-yellow-400/20 blur-2xl" />

            <div className="relative rounded-[2rem] border border-yellow-400/20 bg-zinc-950/95 p-5 shadow-2xl md:p-8">
              {floatingPoints.map((item) => (
                <div
                  key={item.id}
                  className="pointer-events-none absolute left-1/2 top-24 z-20 text-5xl font-black text-green-400"
                  style={{ animation: "floatPoint 0.9s ease forwards" }}
                >
                  {item.text}
                </div>
              ))}

              <div className="mb-6 text-center">
                <p className="font-bold text-yellow-400">
                  {THEMES[theme].name}
                </p>
                <h2 className="mt-2 text-2xl font-black md:text-4xl">
                  Trouve toutes les paires avant la fin du temps.
                </h2>
              </div>

              <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 sm:grid-cols-4">
                {cards.map((card) => {
                  const isVisible = card.flipped || card.matched;

                  return (
                    <button
                      key={card.id}
                      onClick={() => handleCardClick(card.id)}
                      disabled={isLocked || card.flipped || card.matched}
                      className="group relative h-28 rounded-[1.5rem] outline-none sm:h-32 md:h-36"
                      style={{ perspective: "1000px" }}
                    >
                      <div
                        className={`relative h-full w-full rounded-[1.5rem] transition-transform duration-500 [transform-style:preserve-3d] ${
                          isVisible ? "[transform:rotateY(180deg)]" : ""
                        } ${
                          card.wrong ? "[animation:shakeCard_0.45s_ease]" : ""
                        }`}
                      >
                        {/* Back */}
                        <div className="absolute inset-0 rounded-[1.5rem] border border-yellow-400/20 shadow-xl [backface-visibility:hidden] group-hover:shadow-yellow-400/20">
                          <CardBack />
                        </div>

                        {/* Front */}
                        <div
                          className={`absolute inset-0 flex flex-col items-center justify-center rounded-[1.5rem] border bg-black p-3 [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                            card.matched
                              ? "border-green-400 shadow-[0_0_30px_rgba(34,197,94,0.35)]"
                              : card.wrong
                              ? "border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.35)]"
                              : "border-yellow-400/30 shadow-[0_0_25px_rgba(250,204,21,0.16)]"
                          }`}
                          style={{
                            background: `radial-gradient(circle at top, ${card.face.colorA}44, #020617 62%)`,
                          }}
                        >
                          <CardSymbol face={card.face} />
                          <p className="mt-2 text-xs font-black uppercase tracking-wider text-white/80">
                            {card.face.name}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 rounded-2xl border border-zinc-800 bg-black/70 p-4 text-center">
                <p className="text-sm leading-6 text-zinc-400">
                  Mauvaise paire = -1 vie. Termine vite pour ajouter les secondes
                  restantes à ton score final.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {status === "finished" && (
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-4xl items-center justify-center px-5 py-12">
          <div className="relative w-full overflow-hidden rounded-[2rem] border border-yellow-400/20 bg-zinc-950/95 p-6 text-center shadow-2xl md:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#facc1533,transparent_45%)]" />

            <div className="relative">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-yellow-400 text-5xl font-black text-black shadow-lg shadow-yellow-400/30">
                {gameWon ? "Z" : "!"}
              </div>

              <p className="mt-6 font-bold text-yellow-400">Memory Card terminé</p>

              <h2 className="mt-3 text-4xl font-black md:text-6xl">
                {resultMessage}
              </h2>

              <p className="mt-4 text-lg text-zinc-400">
                Score final :{" "}
                <span className="font-black text-yellow-400">
                  {finalScore} pts
                </span>
              </p>

              <div className="mt-10 grid gap-4 md:grid-cols-4">
                <div className="rounded-3xl border border-zinc-800 bg-black p-5">
                  <p className="text-sm text-zinc-400">Paires</p>
                  <h3 className="mt-2 text-3xl font-black text-yellow-400">
                    {score}
                  </h3>
                </div>

                <div className="rounded-3xl border border-zinc-800 bg-black p-5">
                  <p className="text-sm text-zinc-400">Bonus temps</p>
                  <h3 className="mt-2 text-3xl font-black text-yellow-400">
                    {gameWon ? timeLeft : 0}
                  </h3>
                </div>

                <div className="rounded-3xl border border-zinc-800 bg-black p-5">
                  <p className="text-sm text-zinc-400">Vies restantes</p>
                  <h3 className="mt-2 text-3xl font-black text-yellow-400">
                    {lives}
                  </h3>
                </div>

                <div className="rounded-3xl border border-zinc-800 bg-black p-5">
                  <p className="text-sm text-zinc-400">Best</p>
                  <h3 className="mt-2 text-3xl font-black text-yellow-400">
                    {bestScore}
                  </h3>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={startGame}
                  className="flex-1 rounded-2xl bg-yellow-400 px-6 py-4 font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
                >
                  Rejouer
                </button>

                <button
                  onClick={() => setStatus("menu")}
                  className="flex-1 rounded-2xl border border-zinc-700 px-6 py-4 font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400"
                >
                  Changer thème
                </button>

                <a
                  href="/training"
                  className="flex-1 rounded-2xl border border-yellow-400/30 px-6 py-4 text-center font-bold text-yellow-400 transition hover:bg-yellow-400 hover:text-black"
                >
                  Retour training
                </a>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}