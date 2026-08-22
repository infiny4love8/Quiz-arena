"use client";

import React, {
  PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

/* ============================================================
   TYPES
============================================================ */

type Summary = {
  real_deposits_gds: number;
  challenge_entries_gds: number;
  rewards_paid_gds: number;
  challenge_profit_gds: number;
  margin_percent: number;
  economy_status: "healthy" | "watch" | "loss";
  attempts: number;
  unique_players: number;
  replayers: number;
  ticket_attempts: number;
  tickets_used: number;
  success_rate: number;
};

type GameStats = {
  game_key: string;
  attempts: number;
  unique_players: number;
  replayers: number;

  entries_gds: number;

  ticket_attempts: number;
  tickets_used: number;

  rewards_gds: number;

  profit_gds: number;
  margin_percent: number;

  success_rate: number;
  average_score: number;
};

type LevelStat = {
  game_key: string;
  level: string;
  players: number;
};

type Config = {
  id: string;

  game_key: string;
  level: string;

  entry_price_gds: number;

  allow_ticket: boolean;
  ticket_cost: number;

  target_score: number;
  reward_gds: number;

  xp_win: number;
  xp_loss: number;

  is_active: boolean;
};

type ControlCenterData = {
  success: boolean;

  timezone: string;
  day: string;

  summary: Summary;

  games: GameStats[];

  levels: LevelStat[];

  configs: Config[];
};

type Point = {
  x: number;
  y: number;
};

/* ============================================================
   PAGE
============================================================ */

export default function ControlCenterPage() {
  const router = useRouter();

  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const drawingRef =
    useRef(false);

  const currentStrokeRef =
    useRef<Point[]>([]);

  const strokesRef =
    useRef<Point[][]>([]);

  const [unlocked, setUnlocked] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [attempts, setAttempts] =
    useState(0);

  const [data, setData] =
    useState<ControlCenterData | null>(null);

  /* ==========================================================
     DRAWING CANVAS
  ========================================================== */

  useEffect(() => {
    if (unlocked) return;

    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const rect =
      canvas.getBoundingClientRect();

    const dpr =
      window.devicePixelRatio || 1;

    canvas.width =
      rect.width * dpr;

    canvas.height =
      rect.height * dpr;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    ctx.scale(dpr, dpr);

    ctx.lineCap =
      "round";

    ctx.lineJoin =
      "round";

    ctx.lineWidth =
      4;

    ctx.strokeStyle =
      "rgba(250, 204, 21, 0.85)";
  }, [unlocked]);

  function getPoint(
    event:
      PointerEvent<HTMLCanvasElement>
  ): Point {
    const canvas =
      canvasRef.current!;

    const rect =
      canvas.getBoundingClientRect();

    return {
      x:
        event.clientX -
        rect.left,

      y:
        event.clientY -
        rect.top,
    };
  }

  function pointerDown(
    event:
      PointerEvent<HTMLCanvasElement>
  ) {
    event.preventDefault();

    const canvas =
      canvasRef.current;

    if (!canvas) return;

    canvas.setPointerCapture(
      event.pointerId
    );

    drawingRef.current =
      true;

    currentStrokeRef.current = [
      getPoint(event),
    ];
  }

  function pointerMove(
    event:
      PointerEvent<HTMLCanvasElement>
  ) {
    if (
      !drawingRef.current
    ) {
      return;
    }

    event.preventDefault();

    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    const stroke =
      currentStrokeRef.current;

    const previous =
      stroke[
        stroke.length - 1
      ];

    const next =
      getPoint(event);

    stroke.push(next);

    ctx.beginPath();

    ctx.moveTo(
      previous.x,
      previous.y
    );

    ctx.lineTo(
      next.x,
      next.y
    );

    ctx.stroke();
  }

  function pointerUp(
    event:
      PointerEvent<HTMLCanvasElement>
  ) {
    if (
      !drawingRef.current
    ) {
      return;
    }

    event.preventDefault();

    drawingRef.current =
      false;

    const stroke =
      currentStrokeRef.current;

    if (
      stroke.length >= 2
    ) {
      strokesRef.current.push(
        [...stroke]
      );
    }

    currentStrokeRef.current =
      [];

    if (
      strokesRef.current.length >= 2
    ) {
      validatePattern();
    }
  }

  /* ==========================================================
     RECONNAÎTRE UN X SIMPLE
  ========================================================== */

  function validatePattern() {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const strokes =
      strokesRef.current.slice(
        -2
      );

    if (
      strokes.length !== 2
    ) {
      return;
    }

    const rect =
      canvas.getBoundingClientRect();

    const width =
      rect.width;

    const height =
      rect.height;

    const first =
      normalizeStroke(
        strokes[0],
        width,
        height
      );

    const second =
      normalizeStroke(
        strokes[1],
        width,
        height
      );

    const firstIsTLBR =
      isDiagonal(
        first,
        "tl-br"
      );

    const firstIsTRBL =
      isDiagonal(
        first,
        "tr-bl"
      );

    const secondIsTLBR =
      isDiagonal(
        second,
        "tl-br"
      );

    const secondIsTRBL =
      isDiagonal(
        second,
        "tr-bl"
      );

    const valid =
      (
        firstIsTLBR &&
        secondIsTRBL
      ) ||
      (
        firstIsTRBL &&
        secondIsTLBR
      );

    if (valid) {
      setAttempts(0);
      setError("");
      setUnlocked(true);

      return;
    }

    const nextAttempts =
      attempts + 1;

    setAttempts(
      nextAttempts
    );

    clearCanvas();

    if (
      nextAttempts >= 3
    ) {
      setError(
        "Séquence refusée."
      );

      setTimeout(() => {
        setAttempts(0);
        setError("");
      }, 5000);
    }
  }

  function normalizeStroke(
    stroke: Point[],
    width: number,
    height: number
  ) {
    const start =
      stroke[0];

    const end =
      stroke[
        stroke.length - 1
      ];

    return {
      sx:
        start.x / width,

      sy:
        start.y / height,

      ex:
        end.x / width,

      ey:
        end.y / height,
    };
  }

  function isDiagonal(
    stroke: {
      sx: number;
      sy: number;
      ex: number;
      ey: number;
    },
    type:
      | "tl-br"
      | "tr-bl"
  ) {
    const tolerance =
      0.35;

    if (
      type === "tl-br"
    ) {
      return (
        stroke.sx <
          tolerance &&
        stroke.sy <
          tolerance &&
        stroke.ex >
          1 - tolerance &&
        stroke.ey >
          1 - tolerance
      );
    }

    return (
      stroke.sx >
        1 - tolerance &&
      stroke.sy <
        tolerance &&
      stroke.ex <
        tolerance &&
      stroke.ey >
        1 - tolerance
    );
  }

  function clearCanvas() {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    strokesRef.current =
      [];

    currentStrokeRef.current =
      [];
  }

  /* ==========================================================
     LOAD CONTROL CENTER
  ========================================================== */

  const loadControlCenter =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
            await fetch(
              "/api/control-center",
              {
                method: "GET",

                credentials:
                  "include",

                cache:
                  "no-store",
              }
            );

          const result =
            await response.json();

          if (
            response.status ===
            401
          ) {
            router.push(
              "/login"
            );

            return;
          }

          if (
            response.status ===
            403
          ) {
            setError(
              "Accès non autorisé."
            );

            return;
          }

          if (
            !response.ok ||
            !result.success
          ) {
            setError(
              result.error ||
                "Impossible de charger le Control Center."
            );

            return;
          }

          setData(
            result.data
          );
        } catch (err) {
          console.error(
            err
          );

          setError(
            "Erreur de connexion au Control Center."
          );
        } finally {
          setLoading(false);
        }
      },
      [router]
    );

  useEffect(() => {
    if (
      !unlocked
    ) {
      return;
    }

    loadControlCenter();
  }, [
    unlocked,
    loadControlCenter,
  ]);

  /* ==========================================================
     LOCK SCREEN
  ========================================================== */

  if (!unlocked) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-white">

        <div className="absolute inset-0 bg-white" />

        <div className="absolute left-6 top-6">
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-200" />
        </div>

        <div className="absolute bottom-5 right-5">

          <div className="mb-2 text-right">
            {error && (
              <p className="text-[10px] font-medium text-zinc-300">
                {error}
              </p>
            )}
          </div>

          <canvas
            ref={canvasRef}

            onPointerDown={
              pointerDown
            }

            onPointerMove={
              pointerMove
            }

            onPointerUp={
              pointerUp
            }

            onPointerCancel={
              pointerUp
            }

            className="h-[105px] w-[105px] touch-none rounded-2xl"
          />

        </div>

      </main>
    );
  }

  /* ==========================================================
     LOADING
  ========================================================== */

  if (
    loading &&
    !data
  ) {
    return (
      <ControlBackground>

        <div className="flex min-h-screen items-center justify-center">

          <div className="text-center">

            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-yellow-400/15 border-t-yellow-400" />

            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
              Control Center
            </p>

          </div>

        </div>

      </ControlBackground>
    );
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (
    error &&
    !data
  ) {
    return (
      <ControlBackground>

        <div className="flex min-h-screen items-center justify-center px-5">

          <div className="w-full max-w-md rounded-[1.5rem] border border-red-500/20 bg-zinc-950 p-6 text-center">

            <div className="text-4xl">
              ⛔
            </div>

            <h1 className="mt-4 text-xl font-black text-red-400">
              Accès impossible
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              {error}
            </p>

          </div>

        </div>

      </ControlBackground>
    );
  }

  if (!data) {
    return null;
  }

  const summary =
    data.summary;

  /* ==========================================================
     DASHBOARD
  ========================================================== */

  return (
    <ControlBackground>

      <main className="relative z-10 min-h-screen px-3 pb-10 pt-4 text-white sm:px-5 sm:pt-6">

        <section className="mx-auto max-w-7xl">

          {/* HEADER */}

          <header className="flex items-start justify-between gap-3">

            <div>

              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-yellow-400">
                Zonarena
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">
                Control Center
              </h1>

              <p className="mt-1 text-[10px] text-zinc-600 sm:text-xs">
                {formatDate(
                  data.day
                )}
              </p>

            </div>

            <div className="flex gap-2">

              <button
                onClick={
                  loadControlCenter
                }
                disabled={
                  loading
                }
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[10px] font-black text-zinc-400 active:scale-[0.98]"
              >
                {loading
                  ? "..."
                  : "↻ Actualiser"}
              </button>

              <button
                onClick={() =>
                  router.push(
                    "/dashboard"
                  )
                }
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[10px] font-black text-zinc-500"
              >
                Quitter
              </button>

            </div>

          </header>

          {/* ECONOMY STATUS */}

          <div className="mt-5">

            <EconomyStatus
              status={
                summary.economy_status
              }

              margin={
                summary.margin_percent
              }
            />

          </div>

          {/* MONEY */}

          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">

            <MoneyCard
              label="Dépôts réels"
              value={
                summary.real_deposits_gds
              }
              suffix="GDS"
            />

            <MoneyCard
              label="Entrées Défis"
              value={
                summary.challenge_entries_gds
              }
              suffix="GDS"
            />

            <MoneyCard
              label="Récompenses"
              value={
                summary.rewards_paid_gds
              }
              suffix="GDS"
            />

            <MoneyCard
              label="Profit Défis"
              value={
                summary.challenge_profit_gds
              }
              suffix="GDS"
              profit
            />

          </div>

          {/* ACTIVITY */}

          <div className="mt-3 grid grid-cols-3 gap-2">

            <SmallStat
              label="Parties"
              value={
                summary.attempts
              }
            />

            <SmallStat
              label="Joueurs"
              value={
                summary.unique_players
              }
            />

            <SmallStat
              label="Rejoueurs"
              value={
                summary.replayers
              }
            />

          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">

            <SmallStat
              label="Tickets"
              value={
                summary.tickets_used
              }
            />

            <SmallStat
              label="Réussite"
              value={`${summary.success_rate}%`}
            />

            <SmallStat
              label="Marge"
              value={`${summary.margin_percent}%`}
            />

          </div>

          {/* GAME TITLE */}

          <SectionTitle>
            Jeux aujourd’hui
          </SectionTitle>

          {/* GAME CARDS */}

          <div className="grid gap-3 lg:grid-cols-2">

            {data.games.map(
              (game) => (
                <GameCard
                  key={
                    game.game_key
                  }
                  game={game}
                  levels={
                    data.levels.filter(
                      (level) =>
                        level.game_key ===
                        game.game_key
                    )
                  }
                  configs={
                    data.configs.filter(
                      (config) =>
                        config.game_key ===
                        game.game_key
                    )
                  }
                />
              )
            )}

          </div>

          {/* FOOTER */}

          <p className="mt-8 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-800">
            Zonarena Internal
          </p>

        </section>

      </main>

    </ControlBackground>
  );
}

/* ============================================================
   GAME CARD
============================================================ */

function GameCard({
  game,
  levels,
  configs,
}: {
  game: GameStats;
  levels: LevelStat[];
  configs: Config[];
}) {
  const gameName =
    game.game_key ===
    "flags"
      ? "Drapeaux"
      : game.game_key ===
        "memory"
      ? "Memory"
      : game.game_key;

  const icon =
    game.game_key ===
    "flags"
      ? "🌍"
      : game.game_key ===
        "memory"
      ? "🧠"
      : "🎮";

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-zinc-800 bg-zinc-950">

      <div className="flex items-center justify-between border-b border-zinc-900 px-4 py-4">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/15 bg-yellow-400/[0.06] text-xl">
            {icon}
          </div>

          <div>
            <h2 className="text-lg font-black">
              {gameName}
            </h2>

            <p className="text-[9px] uppercase tracking-wider text-zinc-600">
              Aujourd’hui
            </p>
          </div>

        </div>

        <MarginChip
          margin={
            game.margin_percent
          }
        />

      </div>

      {/* BUSINESS */}

      <div className="grid grid-cols-3 gap-px bg-zinc-900">

        <DarkMetric
          label="Entrées"
          value={`${game.entries_gds}`}
          suffix="GDS"
        />

        <DarkMetric
          label="Récomp."
          value={`${game.rewards_gds}`}
          suffix="GDS"
        />

        <DarkMetric
          label="Profit"
          value={`${game.profit_gds}`}
          suffix="GDS"
          highlight
        />

      </div>

      {/* PERFORMANCE */}

      <div className="grid grid-cols-3 gap-2 p-4">

        <SmallStat
          label="Parties"
          value={
            game.attempts
          }
        />

        <SmallStat
          label="Joueurs"
          value={
            game.unique_players
          }
        />

        <SmallStat
          label="Rejoueurs"
          value={
            game.replayers
          }
        />

        <SmallStat
          label="Réussite"
          value={`${game.success_rate}%`}
        />

        <SmallStat
          label="Score moyen"
          value={
            game.average_score
          }
        />

        <SmallStat
          label="Tickets"
          value={
            game.tickets_used
          }
        />

      </div>

      {/* LEVELS */}

      <div className="border-t border-zinc-900 px-4 py-4">

        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
          Niveaux joueurs
        </p>

        <div className="mt-3 flex flex-wrap gap-2">

          {levels.length >
          0 ? (
            levels.map(
              (level) => (
                <span
                  key={
                    level.level
                  }
                  className="rounded-lg border border-zinc-800 bg-black px-2.5 py-1.5 text-[10px] font-black capitalize text-zinc-400"
                >
                  {level.level}{" "}
                  <span className="text-yellow-400">
                    {
                      level.players
                    }
                  </span>
                </span>
              )
            )
          ) : (
            <span className="text-[10px] text-zinc-700">
              Aucun joueur
            </span>
          )}

        </div>

      </div>

      {/* CONFIGS */}

      <div className="border-t border-zinc-900 px-4 py-4">

        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
          Configuration
        </p>

        <div className="mt-3 space-y-2">

          {configs.map(
            (config) => (
              <div
                key={
                  config.id
                }
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-900 bg-black px-3 py-3"
              >

                <div>

                  <div className="flex items-center gap-2">

                    <p className="text-xs font-black capitalize text-white">
                      {
                        config.level
                      }
                    </p>

                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        config.is_active
                          ? "bg-green-400"
                          : "bg-zinc-700"
                      }`}
                    />

                  </div>

                  <p className="mt-1 text-[9px] text-zinc-600">
                    Objectif{" "}
                    {
                      config.target_score
                    }{" "}
                    • Gain{" "}
                    {
                      config.reward_gds
                    }{" "}
                    GDS
                  </p>

                </div>

                <div className="text-right">

                  <p className="text-xs font-black text-yellow-400">
                    {
                      config.entry_price_gds
                    }{" "}
                    GDS
                  </p>

                  <p className="mt-1 text-[9px] text-zinc-700">
                    +{
                      config.xp_win
                    }{" "}
                    XP
                  </p>

                </div>

              </div>
            )
          )}

        </div>

      </div>

    </article>
  );
}

/* ============================================================
   UI
============================================================ */

function ControlBackground({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black">

      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,#211a04_0%,#09090b_28%,#000_68%)]" />

      <div className="fixed left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-yellow-400/[0.04] blur-3xl pointer-events-none" />

      {children}

    </div>
  );
}

function EconomyStatus({
  status,
  margin,
}: {
  status:
    | "healthy"
    | "watch"
    | "loss";

  margin: number;
}) {
  const info =
    status === "healthy"
      ? {
          icon: "🟢",
          title:
            "Économie saine",
          text:
            "La marge des Défis est positive.",
        }
      : status === "watch"
      ? {
          icon: "🟡",
          title:
            "À surveiller",
          text:
            "La marge est faible.",
        }
      : {
          icon: "🔴",
          title:
            "Déficitaire",
          text:
            "Les récompenses dépassent les entrées cash.",
        };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">

      <div className="flex items-center gap-3">

        <div className="text-xl">
          {info.icon}
        </div>

        <div>

          <p className="text-sm font-black">
            {info.title}
          </p>

          <p className="mt-0.5 text-[9px] text-zinc-600">
            {info.text}
          </p>

        </div>

      </div>

      <p className="text-lg font-black tabular-nums text-white">
        {margin}%
      </p>

    </div>
  );
}

function MoneyCard({
  label,
  value,
  suffix,
  profit = false,
}: {
  label: string;
  value: number;
  suffix: string;
  profit?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 sm:p-4">

      <p className="text-[8px] font-black uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <p
        className={`mt-2 text-xl font-black tabular-nums sm:text-2xl ${
          profit
            ? value >= 0
              ? "text-green-400"
              : "text-red-400"
            : "text-white"
        }`}
      >
        {value >= 0 &&
        profit
          ? "+"
          : ""}
        {formatNumber(value)}
      </p>

      <p className="mt-0.5 text-[9px] font-bold text-zinc-700">
        {suffix}
      </p>

    </div>
  );
}

function SmallStat({
  label,
  value,
}: {
  label: string;
  value:
    | number
    | string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-2 py-3 text-center">

      <p className="text-[7px] font-black uppercase tracking-wider text-zinc-600 sm:text-[8px]">
        {label}
      </p>

      <p className="mt-1 text-base font-black tabular-nums text-white sm:text-lg">
        {value}
      </p>

    </div>
  );
}

function DarkMetric({
  label,
  value,
  suffix,
  highlight = false,
}: {
  label: string;
  value: string;
  suffix: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-black px-2 py-3 text-center">

      <p className="text-[7px] font-black uppercase tracking-wider text-zinc-700">
        {label}
      </p>

      <p
        className={`mt-1 text-base font-black tabular-nums ${
          highlight
            ? Number(value) >=
              0
              ? "text-green-400"
              : "text-red-400"
            : "text-white"
        }`}
      >
        {value}
      </p>

      <p className="text-[8px] text-zinc-700">
        {suffix}
      </p>

    </div>
  );
}

function MarginChip({
  margin,
}: {
  margin: number;
}) {
  const className =
    margin >= 15
      ? "border-green-400/20 bg-green-400/10 text-green-400"
      : margin >= 0
      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-400"
      : "border-red-400/20 bg-red-400/10 text-red-400";

  return (
    <span
      className={`rounded-lg border px-2 py-1 text-[10px] font-black ${className}`}
    >
      {margin}%
    </span>
  );
}

function SectionTitle({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div className="mb-3 mt-7 flex items-center gap-3">

      <h2 className="whitespace-nowrap text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
        {children}
      </h2>

      <div className="h-px flex-1 bg-zinc-900" />

    </div>
  );
}

/* ============================================================
   HELPERS
============================================================ */

function formatNumber(
  value: number
) {
  return new Intl.NumberFormat(
    "fr-FR"
  ).format(value);
}

function formatDate(
  value: string
) {
  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    ).format(
      new Date(
        `${value}T12:00:00`
      )
    );
  } catch {
    return value;
  }
}