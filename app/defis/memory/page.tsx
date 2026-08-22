"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

type Status =
  | "loading"
  | "ready"
  | "starting"
  | "memorize"
  | "answer"
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

type PublicRound = {
  id: number;
  items: string[];
  options: string[];
};

type PlayerAnswer = {
  roundId: number;
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

const ROUNDS = 10;

const MEMORIZE_TIME = 4;
const ANSWER_TIME = 7;

export default function MemoryChallengePage() {
  const router = useRouter();

  const [
    status,
    setStatus,
  ] =
    useState<Status>(
      "loading"
    );

  const [
    config,
    setConfig,
  ] =
    useState<ChallengeConfig | null>(
      null
    );

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    attemptId,
    setAttemptId,
  ] =
    useState("");

  const [
    rounds,
    setRounds,
  ] =
    useState<PublicRound[]>([]);

  const [
    roundIndex,
    setRoundIndex,
  ] =
    useState(0);

  const [
    memorizeLeft,
    setMemorizeLeft,
  ] =
    useState(
      MEMORIZE_TIME
    );

  const [
    answerLeft,
    setAnswerLeft,
  ] =
    useState(
      ANSWER_TIME
    );

  const [
    selected,
    setSelected,
  ] =
    useState<string | null>(
      null
    );

  const [
    answers,
    setAnswers,
  ] =
    useState<PlayerAnswer[]>([]);

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

  const currentRound =
    rounds[roundIndex];

  const progress =
    rounds.length > 0
      ? ((roundIndex + 1) /
          rounds.length) *
        100
      : 0;

  // ==========================================================
  // LOAD CONFIG PERSONNELLE
  // ==========================================================

  const loadChallenge =
    useCallback(
      async () => {
        try {
          setError("");

          const {
            data: {
              session,
            },
          } =
            await supabase.auth.getSession();

          if (
            !session?.user
          ) {
            router.push(
              "/login"
            );

            return;
          }

          const {
            data,
            error,
          } =
            await supabase.rpc(
              "get_my_active_challenges"
            );

          if (error) {
            throw error;
          }

          const memoryChallenge =
            (
              data || []
            ).find(
              (
                item: ChallengeConfig
              ) =>
                item.game_key ===
                "memory"
            );

          if (
            !memoryChallenge
          ) {
            setError(
              "Le Défi Memory n'est pas disponible."
            );

            setStatus(
              "error"
            );

            return;
          }

          setConfig(
            memoryChallenge
          );

          setStatus(
            "ready"
          );
        } catch (err) {
          console.error(
            err
          );

          setError(
            "Impossible de charger Memory."
          );

          setStatus(
            "error"
          );
        }
      },
      [router]
    );

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  // ==========================================================
  // TIMER MÉMOIRE
  // ==========================================================

  useEffect(() => {
    if (
      status !==
      "memorize"
    ) {
      return;
    }

    if (
      memorizeLeft <= 0
    ) {
      setAnswerLeft(
        ANSWER_TIME
      );

      setStatus(
        "answer"
      );

      return;
    }

    timerRef.current =
      setTimeout(() => {
        setMemorizeLeft(
          (value) =>
            value - 1
        );
      }, 1000);

    return () => {
      if (
        timerRef.current
      ) {
        clearTimeout(
          timerRef.current
        );
      }
    };
  }, [
    status,
    memorizeLeft,
  ]);

  // ==========================================================
  // TIMER RÉPONSE
  // ==========================================================

  useEffect(() => {
    if (
      status !==
        "answer" ||
      selected !== null
    ) {
      return;
    }

    if (
      answerLeft <= 0
    ) {
      handleAnswer(null);

      return;
    }

    timerRef.current =
      setTimeout(() => {
        setAnswerLeft(
          (value) =>
            value - 1
        );
      }, 1000);

    return () => {
      if (
        timerRef.current
      ) {
        clearTimeout(
          timerRef.current
        );
      }
    };
  }, [
    status,
    answerLeft,
    selected,
  ]);

  // ==========================================================
  // PROTECTION SORTIE
  // ==========================================================

  useEffect(() => {
    const handler = (
      event: BeforeUnloadEvent
    ) => {
      if (
        status ===
          "memorize" ||
        status ===
          "answer"
      ) {
        event.preventDefault();

        event.returnValue =
          "";
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
  // START
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

    setStatus(
      "starting"
    );

    try {
      const response =
        await fetch(
          "/api/challenges/memory/start",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "include",

            body:
              JSON.stringify({
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
            "Impossible de commencer Memory."
        );

        setStatus(
          "ready"
        );

        return;
      }

      setAttemptId(
        data.attemptId
      );

      setRounds(
        data.rounds
      );

      setRoundIndex(0);

      setAnswers([]);

      setSelected(null);

      setMemorizeLeft(
        MEMORIZE_TIME
      );

      setAnswerLeft(
        ANSWER_TIME
      );

      setFinalResult(
        null
      );

      submittingRef.current =
        false;

      setStatus(
        "memorize"
      );
    } catch (err) {
      console.error(
        err
      );

      setError(
        "Erreur pendant le démarrage."
      );

      setStatus(
        "ready"
      );
    }
  }

  // ==========================================================
  // ANSWER
  // ==========================================================

  function handleAnswer(
    option:
      | string
      | null
  ) {
    if (
      !currentRound ||
      selected !== null ||
      status !==
        "answer"
    ) {
      return;
    }

    setSelected(
      option ??
        "TIMEOUT"
    );

    const updatedAnswers: PlayerAnswer[] =
      [
        ...answers,

        {
          roundId:
            currentRound.id,

          selected:
            option,
        },
      ];

    setAnswers(
      updatedAnswers
    );

    setTimeout(
      () => {
        moveNext(
          updatedAnswers
        );
      },
      300
    );
  }

  // ==========================================================
  // NEXT ROUND
  // ==========================================================

  function moveNext(
    updatedAnswers:
      PlayerAnswer[]
  ) {
    if (
      roundIndex + 1 <
      ROUNDS
    ) {
      setRoundIndex(
        (value) =>
          value + 1
      );

      setSelected(null);

      setMemorizeLeft(
        MEMORIZE_TIME
      );

      setAnswerLeft(
        ANSWER_TIME
      );

      setStatus(
        "memorize"
      );

      return;
    }

    submitChallenge(
      updatedAnswers
    );
  }

  // ==========================================================
  // SUBMIT
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
          "/api/challenges/memory/submit",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "include",

            body:
              JSON.stringify({
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
            "Impossible de valider Memory."
        );

        setStatus(
          "error"
        );

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
      console.error(
        err
      );

      setError(
        "Erreur pendant la validation."
      );

      setStatus(
        "error"
      );
    }
  }

  // ==========================================================
  // REPLAY
  // ==========================================================

  async function replay() {
    setAttemptId("");

    setRounds([]);

    setAnswers([]);

    setSelected(null);

    setFinalResult(null);

    setRoundIndex(0);

    submittingRef.current =
      false;

    setStatus(
      "loading"
    );

    await loadChallenge();
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    status ===
      "loading" ||
    status ===
      "starting"
  ) {
    return (
      <Screen>
        <Card>
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-purple-400/20 border-t-purple-400" />

          <h1 className="mt-4 text-xl font-black">
            {status ===
            "starting"
              ? "Préparation de Memory..."
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

          <h1 className="mt-4 text-2xl font-black text-red-400">
            Défi indisponible
          </h1>

          <p className="mt-3 text-sm text-zinc-400">
            {error}
          </p>

          <button
            onClick={() =>
              router.push(
                "/defis"
              )
            }
            className="mt-6 min-h-[48px] rounded-xl bg-yellow-400 px-6 py-3 font-black text-black"
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
    status ===
      "ready" &&
    config
  ) {
    const remaining =
      Math.max(
        0,
        config.wins_needed -
          config.wins_in_level
      );

    return (
      <Screen>
        <Card wide>

          <div className="text-5xl">
            🧠
          </div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-purple-300">
            Défis Zonarena
          </p>

          <h1 className="mt-2 text-3xl font-black">
            Memory
          </h1>

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
                  {config.wins_in_level}/
                  {config.wins_needed}
                </p>
              </div>

            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-purple-400"
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
              {remaining} victoire(s)
              avant le prochain niveau
            </p>

          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">

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

          <div className="mt-5 rounded-2xl border border-zinc-800 bg-black p-4 text-left">

            <p className="font-black text-purple-300">
              Comment jouer ?
            </p>

            <p className="mt-2 text-xs leading-5 text-zinc-300">
              Tu disposes de{" "}
              <strong>
                4 secondes
              </strong>{" "}
              pour mémoriser les 6 symboles.
              Ensuite, retrouve le bon symbole.
            </p>

            <p className="mt-2 text-xs font-bold text-green-400">
              Chaque bonne réponse =
              100 points.
            </p>

          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300">
              {error}
            </div>
          )}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">

            <button
              onClick={() =>
                startChallenge(
                  "gds"
                )
              }
              className="min-h-[50px] rounded-xl bg-yellow-400 py-3.5 text-sm font-black text-black active:scale-[0.98]"
            >
              Jouer —{" "}
              {config.entry_price_gds} GDS
            </button>

            {config.allow_ticket && (
              <button
                onClick={() =>
                  startChallenge(
                    "ticket"
                  )
                }
                className="min-h-[50px] rounded-xl border border-yellow-400/40 bg-yellow-400/10 py-3.5 text-sm font-black text-yellow-300 active:scale-[0.98]"
              >
                Utiliser{" "}
                {config.ticket_cost} ticket
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
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-green-400/20 border-t-green-400" />

          <h1 className="mt-4 text-xl font-black text-green-400">
            Vérification...
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Zonarena vérifie tes réponses.
          </p>
        </Card>
      </Screen>
    );
  }

  // ==========================================================
  // RESULT
  // ==========================================================

  if (
    status ===
      "finished" &&
    finalResult
  ) {
    const remaining =
      Math.max(
        0,
        finalResult.winsNeeded -
          finalResult.winsInLevel
      );

    return (
      <Screen>
        <Card wide>

          <div className="text-5xl">
            {finalResult.won
              ? "🏆"
              : "🧠"}
          </div>

          <h1
            className={`mt-4 text-3xl font-black ${
              finalResult.won
                ? "text-green-400"
                : "text-yellow-400"
            }`}
          >
            {finalResult.won
              ? "Défi réussi !"
              : "Ou te prèske la!"}
          </h1>

          <p className="mt-4 text-5xl font-black">
            {finalResult.score}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Objectif :{" "}
            {finalResult.targetScore}
          </p>

          <p className="mt-2 text-xs text-zinc-400">
            {finalResult.correctAnswers}/5
            bonnes réponses
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2">

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

          {finalResult.promoted && (
            <div className="mt-5 rounded-2xl border border-yellow-400/40 bg-yellow-400/10 p-5">

              <div className="text-4xl">
                🔥
              </div>

              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
                Nouveau niveau
              </p>

              <h2 className="mt-1 text-3xl font-black capitalize">
                {finalResult.currentLevel}
              </h2>

              <p className="mt-2 text-sm text-zinc-300">
                Felisitasyon! Ou pase{" "}
                <strong className="capitalize text-yellow-400">
                  {finalResult.currentLevel}
                </strong>
                . Nouvo objektif,
                nouvo rekonpans. 🔥
              </p>

            </div>
          )}

          {finalResult.won &&
            !finalResult.promoted && (
              <div className="mt-5 rounded-xl border border-green-400/20 bg-green-400/10 p-4">

                <p className="font-black text-green-400">
                  Victoire{" "}
                  {finalResult.winsInLevel}/
                  {finalResult.winsNeeded}
                </p>

                <p className="mt-1 text-xs text-zinc-400">
                  Encore {remaining} victoire(s)
                  avant le prochain niveau.
                </p>

              </div>
            )}

          {!finalResult.won && (
            <div className="mt-5 rounded-xl border border-purple-400/20 bg-purple-400/10 p-4">

              <p className="font-black text-purple-300">
                Ou manke fè kòb la! 🔥
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                Retante chans ou ankò.
                Pwochen tantativ la ka bon an.
              </p>

            </div>
          )}

          <button
            onClick={replay}
            className="mt-6 min-h-[50px] w-full rounded-xl bg-yellow-400 py-3.5 font-black text-black active:scale-[0.98]"
          >
            Rejouer
          </button>

          <button
            onClick={() =>
              router.push(
                "/defis"
              )
            }
            className="mt-2 min-h-[46px] w-full rounded-xl border border-zinc-700 py-3 text-sm font-bold text-zinc-300"
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

  if (!currentRound) {
    return null;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-black px-3 py-4 text-white">

      <Background />

      <section className="relative z-10 mx-auto max-w-4xl">

        <div className="mb-3 grid grid-cols-3 gap-2">

          <Stat
            label="Round"
            value={`${roundIndex + 1}/${ROUNDS}`}
          />

          <Stat
            label={
              status ===
              "memorize"
                ? "Mémoire"
                : "Réponse"
            }
            value={`${
              status ===
              "memorize"
                ? memorizeLeft
                : answerLeft
            }s`}
          />

          <Stat
            label="Objectif"
            value={`${config?.target_score || 0}`}
          />

        </div>

        <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-900">

          <div
            className="h-full rounded-full bg-purple-400 transition-all"
            style={{
              width:
                `${progress}%`,
            }}
          />

        </div>

        <div className="rounded-[1.5rem] border border-purple-400/25 bg-zinc-950/95 p-4 shadow-2xl sm:p-6">

          <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-purple-300">
            🧠 Memory
          </p>

          {status ===
          "memorize" ? (
            <>
              <h1 className="mt-2 text-center text-2xl font-black">
                Mémorise
              </h1>

              <div className="mt-5 grid grid-cols-3 gap-2">

                {currentRound.items.map(
                  (item) => (
                    <div
                      key={item}
                      className="flex h-20 items-center justify-center rounded-xl border border-purple-400/20 bg-black text-4xl sm:h-24 sm:text-5xl"
                    >
                      {item}
                    </div>
                  )
                )}

              </div>
            </>
          ) : (
            <>
              <h1 className="mt-2 text-center text-2xl font-black">
                Quel symbole était présent ?
              </h1>

              <div className="mt-5 grid grid-cols-2 gap-2">

                {currentRound.options.map(
                  (option) => (
                    <button
                      key={option}

                      disabled={
                        selected !==
                        null
                      }

                      onClick={() =>
                        handleAnswer(
                          option
                        )
                      }

                      className={`min-h-[82px] rounded-xl border text-4xl font-black transition active:scale-[0.98] ${
                        selected ===
                        option
                          ? "border-yellow-400 bg-yellow-400 text-black"
                          : "border-zinc-800 bg-black"
                      }`}
                    >
                      {option}
                    </button>
                  )
                )}

              </div>
            </>
          )}

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
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-3 py-5 text-white">
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
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`w-full ${
        wide
          ? "max-w-2xl"
          : "max-w-lg"
      } rounded-[1.5rem] border border-purple-400/25 bg-zinc-950/95 p-5 text-center shadow-2xl sm:p-8`}
    >
      {children}
    </div>
  );
}

function Background() {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,#2e1065_0%,#111827_35%,#020617_75%,#000_100%)]" />

      <div className="fixed left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-purple-500/[0.08] blur-3xl pointer-events-none" />
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
    <div className="rounded-xl border border-zinc-800 bg-black p-3">

      <p className="text-[8px] uppercase tracking-widest text-zinc-500">
        {title}
      </p>

      <p
        className={`mt-1 text-lg font-black ${
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/95 p-2.5 text-center">

      <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-purple-300">
        {value}
      </p>

    </div>
  );
}