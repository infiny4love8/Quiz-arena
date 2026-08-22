"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

type GameStatus =
  | "loading"
  | "ready"
  | "starting"
  | "playing"
  | "submitting"
  | "finished"
  | "error";

type ChallengeConfig = {
  id: string;

  game_key: string;
  level_name: string;

  entry_price_gds: number;

  allow_ticket: boolean;
  ticket_cost: number;

  target_score: number;
  reward_gds: number;

  xp_win: number;
  xp_loss: number;

  wins_in_level: number;
  wins_needed: number;
};

type PublicQuestion = {
  id: string;
  question: string;
  flag: string;
  options: string[];
};

type PlayerAnswer = {
  questionId: string;
  selected: string | null;
};

type FinalResult = {
  won: boolean;

  score: number;

  correctAnswers: number;

  targetScore: number;

  rewardGds: number;

  xpAwarded: number;

  oldLevel: string;

  currentLevel: string;

  winsInLevel: number;

  winsNeeded: number;

  promoted: boolean;
};

const QUESTION_TIME = 7;

export default function FlagsChallengePage() {
  const router = useRouter();

  const [
    status,
    setStatus,
  ] = useState<GameStatus>(
    "loading"
  );

  const [
    config,
    setConfig,
  ] =
    useState<ChallengeConfig | null>(
      null
    );

  const [error, setError] =
    useState("");

  const [
    attemptId,
    setAttemptId,
  ] = useState("");

  const [
    questions,
    setQuestions,
  ] =
    useState<PublicQuestion[]>([]);

  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(0);

  const [
    answers,
    setAnswers,
  ] =
    useState<PlayerAnswer[]>([]);

  const [
    selectedAnswer,
    setSelectedAnswer,
  ] =
    useState<string | null>(
      null
    );

  const [
    timeLeft,
    setTimeLeft,
  ] =
    useState(QUESTION_TIME);

  const [
    finalResult,
    setFinalResult,
  ] =
    useState<FinalResult | null>(
      null
    );

  const timerRef =
    useRef<NodeJS.Timeout | null>(
      null
    );

  const submittingRef =
    useRef(false);

  const currentQuestion =
    questions[currentIndex];

  const progress =
    questions.length > 0
      ? ((currentIndex + 1) /
          questions.length) *
        100
      : 0;

  // ==========================================================
  // CHARGER LE NIVEAU PERSONNEL DU JOUEUR
  // ==========================================================

  const loadChallenge =
    useCallback(async () => {
      try {
        setError("");

        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/login");
          return;
        }

        const {
          data,
          error,
        } = await supabase.rpc(
          "get_my_active_challenges"
        );

        if (error) {
          throw error;
        }

        const flagsChallenge = (
          data || []
        ).find(
          (
            item: ChallengeConfig
          ) =>
            item.game_key ===
            "flags"
        );

        if (!flagsChallenge) {
          setError(
            "Le Défi Drapeaux n'est pas disponible."
          );

          setStatus("error");

          return;
        }

        setConfig(
          flagsChallenge
        );

        setStatus("ready");
      } catch (err) {
        console.error(err);

        setError(
          "Impossible de charger le défi."
        );

        setStatus("error");
      }
    }, [router]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  // ==========================================================
  // TIMER
  // ==========================================================

  useEffect(() => {
    if (
      status !== "playing"
    ) {
      return;
    }

    if (!currentQuestion) {
      return;
    }

    if (
      selectedAnswer !== null
    ) {
      return;
    }

    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }

    timerRef.current =
      setTimeout(() => {
        setTimeLeft(
          (value) =>
            value - 1
        );
      }, 1000);

    return () => {
      if (timerRef.current) {
        clearTimeout(
          timerRef.current
        );
      }
    };
  }, [
    status,
    timeLeft,
    selectedAnswer,
    currentQuestion,
  ]);

  // ==========================================================
  // PROTECTION SORTIE
  // ==========================================================

  useEffect(() => {
    const handler = (
      event: BeforeUnloadEvent
    ) => {
      if (
        status === "playing"
      ) {
        event.preventDefault();

        event.returnValue = "";
      }
    };

    window.addEventListener(
      "beforeunload",
      handler
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handler
      );
    };
  }, [status]);

  // ==========================================================
  // COMMENCER
  // ==========================================================

  async function startChallenge(
    paymentMethod:
      | "gds"
      | "ticket"
  ) {
    if (!config) {
      return;
    }

    setError("");

    setStatus("starting");

    try {
      const response =
        await fetch(
          "/api/challenges/flags/start",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "include",

            body: JSON.stringify({
              configId:
                config.id,

              paymentMethod,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        setError(
          data.error ||
            "Impossible de commencer."
        );

        setStatus("ready");

        return;
      }

      setAttemptId(
        data.attemptId
      );

      setQuestions(
        data.questions
      );

      setCurrentIndex(0);

      setAnswers([]);

      setSelectedAnswer(
        null
      );

      setTimeLeft(
        QUESTION_TIME
      );

      setFinalResult(
        null
      );

      submittingRef.current =
        false;

      setStatus("playing");
    } catch (err) {
      console.error(err);

      setError(
        "Erreur pendant le démarrage."
      );

      setStatus("ready");
    }
  }

  // ==========================================================
  // RÉPONSE
  // ==========================================================

  function handleAnswer(
    option: string
  ) {
    if (
      status !== "playing" ||
      selectedAnswer !== null ||
      !currentQuestion
    ) {
      return;
    }

    setSelectedAnswer(
      option
    );

    const updatedAnswers = [
      ...answers,

      {
        questionId:
          currentQuestion.id,

        selected: option,
      },
    ];

    setAnswers(
      updatedAnswers
    );

    setTimeout(() => {
      moveNext(
        updatedAnswers
      );
    }, 300);
  }

  // ==========================================================
  // TIMEOUT
  // ==========================================================

  function handleTimeout() {
    if (
      !currentQuestion ||
      selectedAnswer !== null
    ) {
      return;
    }

    setSelectedAnswer(
      "TIMEOUT"
    );

    const updatedAnswers = [
      ...answers,

      {
        questionId:
          currentQuestion.id,

        selected: null,
      },
    ];

    setAnswers(
      updatedAnswers
    );

    setTimeout(() => {
      moveNext(
        updatedAnswers
      );
    }, 300);
  }

  // ==========================================================
  // QUESTION SUIVANTE
  // ==========================================================

  function moveNext(
    updatedAnswers:
      PlayerAnswer[]
  ) {
    if (
      currentIndex + 1 <
      questions.length
    ) {
      setCurrentIndex(
        (value) =>
          value + 1
      );

      setSelectedAnswer(
        null
      );

      setTimeLeft(
        QUESTION_TIME
      );

      return;
    }

    submitChallenge(
      updatedAnswers
    );
  }

  // ==========================================================
  // VALIDATION
  // ==========================================================

  async function submitChallenge(
    finalAnswers:
      PlayerAnswer[]
  ) {
    if (
      submittingRef.current ||
      !attemptId
    ) {
      return;
    }

    submittingRef.current =
      true;

    setStatus(
      "submitting"
    );

    try {
      const response =
        await fetch(
          "/api/challenges/flags/submit",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "include",

            body: JSON.stringify({
              attemptId,

              answers:
                finalAnswers,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        setError(
          data.error ||
            "Impossible de valider la partie."
        );

        setStatus("error");

        return;
      }

      setFinalResult({
        won:
          data.won,

        score:
          data.score,

        correctAnswers:
          data.correctAnswers,

        targetScore:
          data.targetScore,

        rewardGds:
          data.rewardGds,

        xpAwarded:
          data.xpAwarded,

        oldLevel:
          data.oldLevel,

        currentLevel:
          data.currentLevel,

        winsInLevel:
          data.winsInLevel,

        winsNeeded:
          data.winsNeeded,

        promoted:
          data.promoted,
      });

      setStatus(
        "finished"
      );
    } catch (err) {
      console.error(err);

      setError(
        "Erreur pendant l'envoi des réponses."
      );

      setStatus("error");
    }
  }

  // ==========================================================
  // REJOUER
  // ==========================================================

  async function replay() {
    setAttemptId("");

    setQuestions([]);

    setAnswers([]);

    setFinalResult(
      null
    );

    setSelectedAnswer(
      null
    );

    setCurrentIndex(0);

    setTimeLeft(
      QUESTION_TIME
    );

    submittingRef.current =
      false;

    setStatus("loading");

    await loadChallenge();
  }

  // ==========================================================
  // LOADING / STARTING
  // ==========================================================

  if (
    status === "loading" ||
    status === "starting"
  ) {
    return (
      <Screen>
        <Card>

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-400/20 border-t-yellow-400" />

          <h1 className="mt-5 text-2xl font-black">

            {status ===
            "starting"
              ? "Préparation du défi..."
              : "Chargement..."}

          </h1>

        </Card>
      </Screen>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    status === "error"
  ) {
    return (
      <Screen>

        <Card>

          <div className="text-5xl">
            🚫
          </div>

          <h1 className="mt-5 text-2xl font-black text-red-400">
            Défi indisponible
          </h1>

          <p className="mt-3 text-zinc-400">
            {error}
          </p>

          <button
            onClick={() =>
              router.push(
                "/defis"
              )
            }
            className="mt-6 rounded-xl bg-yellow-400 px-6 py-3 font-black text-black"
          >
            Retour
          </button>

        </Card>

      </Screen>
    );
  }

  // ==========================================================
  // READY
  // ==========================================================

  if (
    status === "ready" &&
    config
  ) {
    const remainingWins =
      Math.max(
        0,
        config.wins_needed -
          config.wins_in_level
      );

    return (
      <Screen>

        <Card wide>

          <div className="text-5xl sm:text-6xl">
            🌍
          </div>

          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400 sm:mt-5 sm:text-xs">
            Défis Zonarena
          </p>

          <h1 className="mt-2 text-3xl font-black sm:mt-3 sm:text-4xl md:text-5xl">
            Drapeaux
          </h1>

          {/* NIVEAU */}

          <div className="mx-auto mt-4 max-w-sm rounded-xl border border-zinc-800 bg-black/70 px-4 py-3">

            <div className="flex items-center justify-between">

              <div className="text-left">

                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                  Niveau
                </p>

                <p className="mt-1 font-black capitalize text-white">
                  {config.level_name}
                </p>

              </div>

              <div className="text-right">

                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                  Progression
                </p>

                <p className="mt-1 font-black text-yellow-400">
                  {config.wins_in_level}
                  /
                  {config.wins_needed}
                </p>

              </div>

            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-900">

              <div
                className="h-full rounded-full bg-yellow-400 transition-all duration-500"
                style={{
                  width: `${
                    (
                      config.wins_in_level /
                      config.wins_needed
                    ) *
                    100
                  }%`,
                }}
              />

            </div>

            <p className="mt-2 text-[10px] text-zinc-600">

              {remainingWins > 0
                ? `${remainingWins} victoire(s) avant le prochain niveau`
                : "Progression maximale de ce niveau"}

            </p>

          </div>

          {/* INFOS */}

          <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3">

            <Info
              title="Objectif"
              value={`${config.target_score}`}
              suffix="pts"
            />

            <Info
              title="Gain"
              value={`${config.reward_gds}`}
              suffix="GDS"
              highlight
            />

            <Info
              title="XP"
              value={`+${config.xp_win}`}
            />

          </div>

          <div className="mt-5 rounded-2xl border border-zinc-800 bg-black p-4 text-left sm:p-5">

            <p className="font-black text-yellow-400">
              Comment ça marche ?
            </p>

            <p className="mt-2 text-xs leading-5 text-zinc-300 sm:mt-3 sm:text-sm sm:leading-6">

              10 drapeaux.
              Chaque bonne réponse
              vaut 100 points.
              Atteins{" "}
              <strong className="text-white">
                {config.target_score}
              </strong>{" "}
              points pour gagner{" "}
              <strong className="text-green-400">
                {config.reward_gds} GDS
              </strong>
              .

            </p>

            <p className="mt-2 text-xs font-bold text-green-400 sm:mt-3 sm:text-sm">
              3 victoires =
              prochain niveau 🔥
            </p>

          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300 sm:text-sm">
              {error}
            </div>
          )}

          {/* PAIEMENT */}

          <div className="mt-5 grid gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-3">

            <button
              onClick={() =>
                startChallenge(
                  "gds"
                )
              }
              className="min-h-[50px] rounded-xl bg-yellow-400 py-3.5 text-sm font-black text-black transition hover:bg-yellow-300 active:scale-[0.98] sm:py-4 sm:text-base"
            >
              Jouer —{" "}
              {
                config.entry_price_gds
              }{" "}
              GDS
            </button>

            {config.allow_ticket && (
              <button
                onClick={() =>
                  startChallenge(
                    "ticket"
                  )
                }
                className="min-h-[50px] rounded-xl border border-yellow-400/40 bg-yellow-400/10 py-3.5 text-sm font-black text-yellow-300 transition hover:bg-yellow-400/20 active:scale-[0.98] sm:py-4 sm:text-base"
              >
                Utiliser{" "}
                {
                  config.ticket_cost
                }{" "}
                ticket
              </button>
            )}

          </div>

        </Card>

      </Screen>
    );
  }

  // ==========================================================
  // SUBMITTING
  // ==========================================================

  if (
    status ===
    "submitting"
  ) {
    return (
      <Screen>

        <Card>

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-green-400/20 border-t-green-400" />

          <h1 className="mt-5 text-2xl font-black text-green-400">
            Vérification...
          </h1>

          <p className="mt-3 text-zinc-400">
            Zonarena vérifie
            tes réponses.
          </p>

        </Card>

      </Screen>
    );
  }

  // ==========================================================
  // FINISHED
  // ==========================================================

  if (
    status ===
      "finished" &&
    finalResult
  ) {
    const remainingWins =
      Math.max(
        0,
        finalResult.winsNeeded -
          finalResult.winsInLevel
      );

    return (
      <Screen>

        <Card wide>

          <div className="text-5xl sm:text-6xl">
            {finalResult.won
              ? "🏆"
              : "🎯"}
          </div>

          <h1
            className={`mt-4 text-3xl font-black sm:mt-5 sm:text-4xl ${
              finalResult.won
                ? "text-green-400"
                : "text-yellow-400"
            }`}
          >

            {finalResult.won
              ? "Défi réussi !"
              : "Pas encore !"}

          </h1>

          <p className="mt-5 text-5xl font-black text-white sm:mt-6 sm:text-6xl">
            {finalResult.score}
          </p>

          <p className="mt-1 text-xs text-zinc-500 sm:mt-2 sm:text-sm">
            Objectif :{" "}
            {
              finalResult.targetScore
            }
          </p>

          <p className="mt-2 text-xs text-zinc-400 sm:mt-3 sm:text-sm">
            {
              finalResult.correctAnswers
            }
            /10 bonnes réponses
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3">

            <Info
              title="Récompense"
              value={
                finalResult.won
                  ? `+${finalResult.rewardGds}`
                  : "0"
              }
              suffix="GDS"
              highlight={
                finalResult.won
              }
            />

            <Info
              title="XP"
              value={`+${finalResult.xpAwarded}`}
            />

          </div>

          {/* PROMOTION */}

          {finalResult.promoted && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-yellow-400/40 bg-yellow-400/10 p-5 sm:mt-6">

              <div className="text-4xl">
                🔥
              </div>

              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
                Nouveau niveau débloqué
              </p>

              <h2 className="mt-2 text-3xl font-black capitalize text-white">
                {
                  finalResult.currentLevel
                }
              </h2>

              <p className="mt-2 text-sm text-zinc-300">
                Felisitasyon!
                Ou pase{" "}
                <span className="font-black capitalize text-yellow-400">
                  {
                    finalResult.currentLevel
                  }
                </span>
                . Nouvo objektif,
                nouvo rekonpans. 🔥
              </p>

            </div>
          )}

          {/* VICTOIRE SANS PROMOTION */}

          {finalResult.won &&
            !finalResult.promoted && (
              <div className="mt-5 rounded-xl border border-green-400/20 bg-green-400/10 p-4">

                <p className="font-black text-green-400">
                  Victoire{" "}
                  {
                    finalResult.winsInLevel
                  }
                  /
                  {
                    finalResult.winsNeeded
                  }
                </p>

                <div className="mx-auto mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-zinc-900">

                  <div
                    className="h-full rounded-full bg-green-400"
                    style={{
                      width: `${
                        (
                          finalResult.winsInLevel /
                          finalResult.winsNeeded
                        ) *
                        100
                      }%`,
                    }}
                  />

                </div>

                <p className="mt-2 text-xs text-zinc-400">

                  Encore{" "}
                  {remainingWins}{" "}
                  victoire(s) avant
                  le prochain niveau.

                </p>

              </div>
            )}

          {/* DÉFAITE */}

          {!finalResult.won && (
            <div className="mt-5 rounded-xl border border-zinc-800 bg-black/70 p-4">

              <p className="font-bold text-zinc-300">
                Tu gardes ta
                progression actuelle.
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Une défaite
                n'enlève aucune
                victoire. Tu peux
                retenter immédiatement.
              </p>

            </div>
          )}

          {/* REJOUER */}

          <button
            onClick={replay}
            className="mt-6 min-h-[50px] w-full rounded-xl bg-yellow-400 py-3.5 font-black text-black transition active:scale-[0.98] sm:mt-7 sm:py-4"
          >
            Rejouer
          </button>

          <button
            onClick={() =>
              router.push(
                "/defis"
              )
            }
            className="mt-2 min-h-[46px] w-full rounded-xl border border-zinc-700 py-3 text-sm font-bold text-zinc-300 sm:mt-3"
          >
            Retour aux Défis
          </button>

        </Card>

      </Screen>
    );
  }

  // ==========================================================
  // GAME
  // ==========================================================

  if (
    status !== "playing" ||
    !currentQuestion
  ) {
    return null;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-black px-3 py-4 text-white sm:px-4 sm:py-6">

      <Background />

      <section className="relative z-10 mx-auto max-w-4xl">

        {/* STATS */}

        <div className="mb-3 grid grid-cols-3 gap-2 sm:mb-4 sm:gap-3">

          <Stat
            label="Temps"
            value={`${timeLeft}s`}
          />

          <Stat
            label="Question"
            value={`${
              currentIndex + 1
            }/10`}
          />

          <Stat
            label="Objectif"
            value={`${
              config?.target_score ||
              0
            }`}
          />

        </div>

        {/* PROGRESS */}

        <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-900 sm:mb-5 sm:h-3">

          <div
            className="h-full rounded-full bg-yellow-400 transition-all"
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

        {/* QUESTION */}

        <div className="rounded-[1.5rem] border border-yellow-400/20 bg-zinc-950/95 p-4 shadow-2xl sm:rounded-[2rem] sm:p-5 md:p-8">

          <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400 sm:text-xs sm:tracking-[0.25em]">
            🌍 Drapeaux
          </p>

          <h1 className="mt-2 text-center text-xl font-black sm:mt-3 sm:text-2xl md:text-4xl">
            Quel pays correspond
            à ce drapeau ?
          </h1>

          <div className="mt-4 flex justify-center sm:mt-7">

            <div className="rounded-[1.4rem] border border-yellow-400/20 bg-black p-3 sm:rounded-[2rem] sm:p-4">

              <img
                src={`https://flagcdn.com/w320/${currentQuestion.flag}.png`}
                alt="Drapeau"
                className="h-32 w-auto rounded-xl object-cover sm:h-40 sm:rounded-2xl md:h-52"
              />

            </div>

          </div>

          <div className="mt-5 grid gap-2 sm:mt-8 sm:gap-3">

            {currentQuestion.options.map(
              (option) => (
                <button
                  key={option}

                  disabled={
                    selectedAnswer !==
                    null
                  }

                  onClick={() =>
                    handleAnswer(
                      option
                    )
                  }

                  className={`min-h-[50px] rounded-xl border px-4 py-3 text-left text-sm font-black transition sm:rounded-2xl sm:px-5 sm:py-4 sm:text-base ${
                    selectedAnswer ===
                    option
                      ? "border-yellow-400 bg-yellow-400 text-black"
                      : "border-zinc-800 bg-black active:border-yellow-400/60"
                  }`}
                >
                  {option}
                </button>
              )
            )}

          </div>

          <p className="mt-4 text-center text-[9px] text-zinc-700 sm:mt-5 sm:text-xs">
            Résultats vérifiés
            automatiquement.
          </p>

        </div>

      </section>

    </main>
  );
}

/* ==========================================================
   UI
========================================================== */

function Screen({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-3 py-5 text-white sm:px-5 sm:py-8">

      <Background />

      <div className="relative z-10 flex w-full justify-center">
        {children}
      </div>

    </main>
  );
}

function Card({
  children,
  wide = false,
}: {
  children:
    React.ReactNode;

  wide?: boolean;
}) {
  return (
    <div
      className={`w-full ${
        wide
          ? "max-w-2xl"
          : "max-w-lg"
      } rounded-[1.5rem] border border-yellow-400/25 bg-zinc-950/95 p-5 text-center shadow-2xl sm:rounded-[2rem] sm:p-8`}
    >
      {children}
    </div>
  );
}

function Background() {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,#3f2b05_0%,#111827_38%,#020617_75%,#000_100%)]" />

      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:46px_46px]" />
    </>
  );
}

function Info({
  title,
  value,
  suffix,
  highlight = false,
}: {
  title: string;

  value: string;

  suffix?: string;

  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-3 sm:rounded-2xl sm:p-4">

      <p className="text-[8px] uppercase tracking-widest text-zinc-500 sm:text-xs">
        {title}
      </p>

      <p
        className={`mt-1 text-lg font-black sm:mt-2 sm:text-xl ${
          highlight
            ? "text-green-400"
            : "text-yellow-400"
        }`}
      >
        {value}
      </p>

      {suffix && (
        <p className="text-[9px] font-bold text-zinc-600">
          {suffix}
        </p>
      )}

    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/95 p-2.5 text-center sm:rounded-2xl sm:p-3">

      <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 sm:text-[10px]">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-yellow-400 sm:text-xl">
        {value}
      </p>

    </div>
  );
}