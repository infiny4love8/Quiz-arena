"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type GameStatus = "checking" | "ready" | "playing" | "submitting" | "finished" | "error";

type Card = {
  id: number;
  pairId: string;
  icon: string;
  flipped: boolean;
  matched: boolean;
  wrong: boolean;
};

const TOTAL_TIME = 90;
const TOTAL_PAIRS = 8;
const POINTS_PER_PAIR = 25;
const WRONG_PENALTY = 5;

const CARD_ICONS = ["🎮", "🏆", "⚡", "💎", "🛡️", "🔥", "🎯", "👑"];

function shuffle<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5);
}

function createDeck(): Card[] {
  const cards = CARD_ICONS.flatMap((icon, index) => [
    {
      id: index * 2 + 1,
      pairId: icon,
      icon,
      flipped: false,
      matched: false,
      wrong: false,
    },
    {
      id: index * 2 + 2,
      pairId: icon,
      icon,
      flipped: false,
      matched: false,
      wrong: false,
    },
  ]);

  return shuffle(cards).map((card, index) => ({
    ...card,
    id: index + 1,
  }));
}

export default function ProCardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tournamentId = searchParams.get("tournamentId") || "";
  const gameToken = searchParams.get("token") || "";

  const [status, setStatus] = useState<GameStatus>("checking");
  const [error, setError] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);

  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [score, setScore] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [soundOn, setSoundOn] = useState(true);

  const submittedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const progress = Math.min((matchedPairs / TOTAL_PAIRS) * 100, 100);
  const danger = timeLeft <= 10;

  const gameTitle = useMemo(() => "Trouve les paires", []);

  function beep(type: "flip" | "match" | "wrong" | "tick" | "win") {
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
      flip: { freq: 620, gain: 0.04, duration: 0.08, type: "sine" as OscillatorType },
      match: { freq: 920, gain: 0.08, duration: 0.16, type: "triangle" as OscillatorType },
      wrong: { freq: 150, gain: 0.09, duration: 0.18, type: "sawtooth" as OscillatorType },
      tick: { freq: 760, gain: 0.035, duration: 0.07, type: "sine" as OscillatorType },
      win: { freq: 1050, gain: 0.1, duration: 0.28, type: "triangle" as OscillatorType },
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

        if (tournament.game_type !== "memory_cards") {
          setError("Ce challenge n'est pas un jeu de paires.");
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

        const elapsed = Math.floor(
          (Date.now() - new Date(entry.game_started_at).getTime()) / 1000
        );

        const remaining = Math.max(TOTAL_TIME - elapsed, 0);

        if (remaining <= 0) {
          await submitScore(0, 0, 0, 0);
          return;
        }

        setTimeLeft(remaining);
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
    if (status !== "playing") return;

    if (timeLeft <= 0) {
      finishGame(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 10) beep("tick");
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status, timeLeft]);

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
    setCards(createDeck());
    setSelected([]);
    setLocked(false);
    setScore(0);
    setMatchedPairs(0);
    setWrongAttempts(0);
    setFinalScore(0);
    beep("flip");
    setStatus("playing");
  }

  async function submitScore(
    scoreToSubmit: number,
    pairs: number,
    wrongs: number,
    completionTimeMs: number
  ) {
    if (submittedRef.current) return;
    submittedRef.current = true;

    setStatus("submitting");

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
          pairs,
          wrongAttempts: wrongs,
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

  function finishGame(won: boolean, customScore?: number, customPairs?: number, customWrongs?: number) {
    if (timerRef.current) clearTimeout(timerRef.current);

    const safeScore =
      customScore ??
      Math.max(0, score + (won ? timeLeft : 0));

    const pairs = customPairs ?? matchedPairs;
    const wrongs = customWrongs ?? wrongAttempts;

    const completionTimeMs = Math.max(0, (TOTAL_TIME - timeLeft) * 1000);

    if (won) beep("win");

    submitScore(safeScore, pairs, wrongs, completionTimeMs);
  }

  function handleCardClick(cardId: number) {
    if (status !== "playing" || locked) return;

    const clicked = cards.find((card) => card.id === cardId);
    if (!clicked || clicked.flipped || clicked.matched) return;

    beep("flip");

    const newSelected = [...selected, cardId];

    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, flipped: true, wrong: false } : card
      )
    );

    setSelected(newSelected);

    if (newSelected.length === 2) {
      checkMatch(newSelected);
    }
  }

  function checkMatch(ids: number[]) {
    setLocked(true);

    const [firstId, secondId] = ids;
    const first = cards.find((card) => card.id === firstId);
    const second = cards.find((card) => card.id === secondId);

    if (!first || !second) return;

    const match = first.pairId === second.pairId;

    setTimeout(() => {
      if (match) {
        beep("match");

        const nextPairs = matchedPairs + 1;
        const nextScore = score + POINTS_PER_PAIR;

        setCards((prev) =>
          prev.map((card) =>
            card.id === firstId || card.id === secondId
              ? { ...card, matched: true }
              : card
          )
        );

        setMatchedPairs(nextPairs);
        setScore(nextScore);

        if (nextPairs === TOTAL_PAIRS) {
          const final = Math.max(0, nextScore + timeLeft);
          setTimeout(() => finishGame(true, final, nextPairs, wrongAttempts), 450);
        }
      } else {
        beep("wrong");

        const nextWrongs = wrongAttempts + 1;
        const nextScore = Math.max(0, score - WRONG_PENALTY);

        setWrongAttempts(nextWrongs);
        setScore(nextScore);

        setCards((prev) =>
          prev.map((card) =>
            card.id === firstId || card.id === secondId
              ? { ...card, wrong: true }
              : card
          )
        );

        setTimeout(() => {
          setCards((prev) =>
            prev.map((card) =>
              card.id === firstId || card.id === secondId
                ? { ...card, flipped: false, wrong: false }
                : card
            )
          );
        }, 550);
      }

      setSelected([]);
      setLocked(false);
    }, 520);
  }

  if (status === "checking") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <div className="rounded-3xl border border-purple-400/30 bg-zinc-950 p-8 text-center">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-purple-400/20 border-t-purple-400" />
          <h1 className="text-2xl font-black">Vérification du challenge...</h1>
          <p className="mt-3 text-zinc-400">Jeton, tournoi et participation en cours de validation.</p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <div className="w-full max-w-lg rounded-3xl border border-red-500/30 bg-zinc-950 p-8 text-center">
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
      <main className="min-h-screen overflow-hidden bg-black text-white px-5 py-8">
        <ArenaBackground />

        <section className="relative z-10 mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[2rem] border border-purple-400/30 bg-zinc-950/90 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-yellow-400">
                  🏆 Tournoi Pro
                </p>
                <h1 className="mt-3 text-4xl font-black md:text-6xl">
                  {gameTitle}
                </h1>
              </div>

              <button
                onClick={() => setSoundOn((v) => !v)}
                className="rounded-2xl border border-purple-400/40 bg-purple-400/10 px-4 py-3 font-black text-purple-300"
              >
                {soundOn ? "🔊 ON" : "🔇 OFF"}
              </button>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <InfoCard icon="⏱️" title="90 secondes" text="Trouve les 8 paires avant la fin." />
              <InfoCard icon="✅" title="+25 points" text="Chaque bonne paire augmente ton score." />
              <InfoCard icon="❌" title="-5 points" text="Chaque mauvaise paire coûte des points." />
            </div>

            <div className="mt-8 rounded-3xl border border-yellow-400/30 bg-yellow-400/10 p-5">
              <p className="text-sm font-black uppercase tracking-widest text-yellow-400">
                Objectif
              </p>
              <p className="mt-2 text-lg text-zinc-300">
                Fais le meilleur score possible. Ton résultat sera envoyé automatiquement pour le classement Pro.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-yellow-400/30 bg-zinc-950/90 p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-yellow-400/10 text-7xl animate-pulse">
              🃏
            </div>

            <h2 className="mt-6 text-3xl font-black">Prêt pour l’arène ?</h2>
            <p className="mt-3 text-zinc-400">
              Une tentative. Un chrono. Un classement.
            </p>

            <button
              onClick={startGame}
              className="mt-8 w-full rounded-2xl bg-yellow-400 py-4 font-black text-black shadow-lg shadow-yellow-400/30 transition hover:scale-[1.03] hover:bg-yellow-300"
            >
              Commencer le défi 🚀
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (status === "submitting") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <div className="w-full max-w-lg rounded-3xl border border-green-400/30 bg-zinc-950 p-8 text-center">
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
            onClick={() => router.push("/tournaments/pro")}
            className="mt-8 w-full rounded-xl bg-yellow-400 py-4 font-black text-black transition hover:bg-yellow-300"
          >
            Retour aux tournois
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white px-3 py-4">
      <ArenaBackground />

      <section className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Stat title="Temps" value={`${timeLeft}s`} danger={danger} />
          <Stat title="Score" value={score.toString()} />
          <Stat title="Paires" value={`${matchedPairs}/${TOTAL_PAIRS}`} />
          <Stat title="Erreurs" value={`${wrongAttempts}`} danger={wrongAttempts > 0} />
        </div>

        <div className="mb-4 h-3 overflow-hidden rounded-full bg-zinc-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-400 to-yellow-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="rounded-[2rem] border border-purple-400/30 bg-zinc-950/90 p-4 shadow-2xl md:p-6">
          <div className="mb-5 text-center">
            <p className="text-sm font-black uppercase tracking-widest text-yellow-400">
              🏆 Tournoi Pro
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">
              Trouve les paires
            </h1>
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-4 gap-3 md:gap-4">
            {cards.map((card) => {
              const visible = card.flipped || card.matched;

              return (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  disabled={locked || card.flipped || card.matched}
                  className="group relative h-24 rounded-2xl outline-none sm:h-28 md:h-36"
                  style={{ perspective: "1000px" }}
                >
                  <div
                    className={`relative h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] ${
                      visible ? "[transform:rotateY(180deg)]" : ""
                    } ${card.wrong ? "animate-[shake_0.35s_ease]" : ""}`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-purple-400/40 bg-[radial-gradient(circle_at_top,#4c1d95,#111827_55%,#020617)] text-4xl shadow-xl [backface-visibility:hidden] group-hover:border-yellow-400/50">
                      👑
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-yellow-400/40 bg-black text-5xl shadow-[0_0_25px_rgba(250,204,21,0.18)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      {card.icon}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-center text-sm text-zinc-500">
            Bonne paire : +25 pts · Mauvaise paire : -5 pts · Bonus temps à la fin
          </p>
        </div>
      </section>

      <style>
        {`
          @keyframes shake {
            0%, 100% { transform: rotateY(180deg) translateX(0); }
            25% { transform: rotateY(180deg) translateX(-6px); }
            50% { transform: rotateY(180deg) translateX(6px); }
            75% { transform: rotateY(180deg) translateX(-4px); }
          }
        `}
      </style>
    </main>
  );
}

function ArenaBackground() {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,#3b0764_0%,#111827_32%,#020617_70%,#000_100%)]" />
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="fixed left-10 top-20 h-52 w-52 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="fixed bottom-20 right-10 h-52 w-52 rounded-full bg-yellow-400/10 blur-3xl" />
    </>
  );
}

function InfoCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/60 p-5">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-3 font-black text-yellow-400">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{text}</p>
    </div>
  );
}

function Stat({ title, value, danger }: { title: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{title}</p>
      <p className={`mt-1 text-3xl font-black ${danger ? "text-red-400" : "text-yellow-400"}`}>
        {value}
      </p>
    </div>
  );
}