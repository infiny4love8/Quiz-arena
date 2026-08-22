"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

type Challenge = {
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

type Game = {
  key: string;
  name: string;
  icon: string;
  description: string;
  href?: string;
  soon?: boolean;
};

const games: Game[] = [
  {
    key: "flags",
    name: "Drapeaux",
    icon: "🌍",
    description:
      "Reconnais les pays et atteins ton objectif.",
    href: "/defis/flags",
  },

  {
    key: "memory",
    name: "Memory",
    icon: "🧠",
    description:
      "Mémorise vite et vise le score demandé.",
    href: "/defis/memory",
  },

  {
    key: "memory_cards",
    name: "Memory Cards",
    icon: "🃏",
    description:
      "Retourne les cartes et retrouve les paires.",
    soon: true,
  },

  {
    key: "domino",
    name: "Domino",
    icon: "🁫",
    description:
      "Le classique arrive bientôt.",
    soon: true,
  },
];

export default function DefisPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    challenges,
    setChallenges,
  ] = useState<Challenge[]>([]);

  useEffect(() => {
    async function load() {
      try {
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
  console.error("GET MY ACTIVE CHALLENGES ERROR:", {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });

  throw error;
}

        setChallenges(
          (data || []) as Challenge[]
        );
      } catch (err) {
        console.error(err);

        setError(
          "Impossible de charger les Défis Zonarena."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const challengesByGame =
    useMemo(() => {
      const map =
        new Map<
          string,
          Challenge
        >();

      challenges.forEach(
        (challenge) => {
          map.set(
            challenge.game_key,
            challenge
          );
        }
      );

      return map;
    }, [challenges]);

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <Background />

        <div className="relative z-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-yellow-400/15 border-t-yellow-400" />

          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Chargement...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black px-3 pb-8 pt-4 text-white sm:px-4 sm:pt-6">
      <Background />

      <section className="relative z-10 mx-auto w-full max-w-5xl">

        {/* HEADER */}

        <header className="mb-3 flex items-start justify-between gap-2 sm:mb-5">

          <div className="min-w-0">

            <div className="inline-flex items-center gap-1.5 rounded-full border border-green-400/25 bg-green-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-green-400 sm:text-[10px]">

              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />

              24h/24
            </div>

            <h1 className="mt-2 text-[28px] font-black leading-none tracking-tight sm:mt-3 sm:text-4xl">
              Défis{" "}
              <span className="text-yellow-400">
                Zonarena
              </span>
            </h1>

            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
              Joue. Atteins l’objectif.
              Gagne.
            </p>
          </div>

          <button
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
            className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-[10px] font-bold text-zinc-400 sm:rounded-xl sm:px-3 sm:text-xs"
          >
            ← Retour
          </button>
        </header>

        {/* BADGES */}

        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 sm:mb-5 sm:gap-2">

          <Badge>
            ⚡ Rejoue direct
          </Badge>

          <Badge>
            🎟️ GDS ou ticket
          </Badge>

          <Badge>
            🏆 3 victoires = niveau +
          </Badge>

        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300 sm:text-sm">
            {error}
          </div>
        )}

        {/* JEUX */}

        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">

          {games.map((game) => {

            const challenge =
              challengesByGame.get(
                game.key
              );

            const active =
              !!challenge &&
              !game.soon;

            return (
              <TicketCard
                key={game.key}
                active={active}
              >

                {/* TOP */}

                <div className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-5 sm:pt-5">

                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">

                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xl sm:h-12 sm:w-12 sm:rounded-2xl sm:text-2xl ${
                        active
                          ? "border-yellow-400/25 bg-yellow-400/10"
                          : "border-zinc-800 bg-black"
                      }`}
                    >
                      {game.icon}
                    </div>

                    <div className="min-w-0">

                      <h2 className="truncate text-lg font-black sm:text-xl">
                        {game.name}
                      </h2>

                      <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500 sm:text-xs">
                        {game.description}
                      </p>

                    </div>
                  </div>

                  <StatusStamp
                    active={active}
                  />
                </div>

                {active &&
                challenge ? (
                  <>

                    <Perforation />

                    <div className="px-4 sm:px-5">

                      {/* STATS */}

                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">

                        <MiniMetric
                          label="Objectif"
                          value={`${challenge.target_score}`}
                          suffix="pts"
                        />

                        <MiniMetric
                          label="Entrée"
                          value={`${challenge.entry_price_gds}`}
                          suffix="GDS"
                        />

                        <MiniMetric
                          label="Gain"
                          value={`${challenge.reward_gds}`}
                          suffix="GDS"
                          highlight
                        />

                      </div>

                      {/* PROGRESSION PERSONNELLE */}

                      <div className="mt-2.5 rounded-xl border border-zinc-800 bg-black/80 px-3 py-2.5 sm:mt-3 sm:px-4 sm:py-3">

                        <div className="flex items-center justify-between">

                          <div>
                            <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 sm:text-[9px]">
                              Niveau
                            </p>

                            <p className="mt-0.5 text-sm font-black capitalize text-white sm:text-base">
                              {challenge.level_name}
                            </p>
                          </div>

                          <div className="text-right">

                            <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 sm:text-[9px]">
                              Progression
                            </p>

                            <p className="mt-0.5 text-sm font-black text-yellow-400 sm:text-base">
                              {challenge.wins_in_level}
                              /
                              {challenge.wins_needed}
                            </p>

                          </div>
                        </div>

                        {/* BARRE */}

                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-900">

                          <div
                            className="h-full rounded-full bg-yellow-400 transition-all duration-500"
                            style={{
                              width: `${
                                (
                                  challenge.wins_in_level /
                                  challenge.wins_needed
                                ) *
                                100
                              }%`,
                            }}
                          />

                        </div>

                        <div className="mt-2 flex items-center justify-between">

                          <p className="text-[9px] text-zinc-600 sm:text-[10px]">

                            {Math.max(
                              0,
                              challenge.wins_needed -
                                challenge.wins_in_level
                            )}{" "}
                            victoire(s) avant niveau suivant

                          </p>

                          <p className="text-[9px] font-black text-yellow-400 sm:text-[10px]">
                            +{challenge.xp_win} XP
                          </p>

                        </div>

                      </div>

                    </div>

                    {/* ACTION */}

                    <div className="px-4 pb-4 sm:px-5 sm:pb-5">

                      <button
                        onClick={() =>
                          game.href &&
                          router.push(
                            game.href
                          )
                        }
                        className="mt-3 flex min-h-[48px] w-full items-center justify-between rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-black transition active:scale-[0.985] sm:mt-4 sm:px-5 sm:text-base"
                      >
                        <span>
                          Jouer maintenant
                        </span>

                        <span aria-hidden>
                          →
                        </span>
                      </button>

                      {challenge.allow_ticket && (
                        <p className="mt-1.5 text-center text-[10px] text-zinc-600 sm:mt-2 sm:text-[11px]">

                          {
                            challenge.entry_price_gds
                          }{" "}
                          GDS ou{" "}
                          {
                            challenge.ticket_cost
                          }{" "}
                          ticket

                        </p>
                      )}

                    </div>
                  </>
                ) : (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5">

                    <Perforation muted />

                    <div className="mt-2 rounded-xl border border-dashed border-zinc-800 bg-black/50 px-3 py-3.5 sm:mt-3 sm:px-4 sm:py-5">

                      <p className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-600 sm:text-xs">
                        Bientôt disponible
                      </p>

                    </div>
                  </div>
                )}

              </TicketCard>
            );
          })}
        </div>

        <div className="mt-5 text-center sm:mt-8">

          <p className="text-[11px] text-zinc-600 sm:text-xs">
            Pa bezwen tann yon
            tounwa. Jwe lè w vle.
          </p>

        </div>

      </section>
    </main>
  );
}

/* ==========================================================
   UI
========================================================== */

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="whitespace-nowrap rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 sm:px-3 sm:text-[11px]">
      {children}
    </div>
  );
}

function StatusStamp({
  active,
}: {
  active: boolean;
}) {
  return active ? (
    <span className="shrink-0 rounded-md border border-green-400/30 bg-green-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-green-400 sm:px-2.5 sm:text-[10px]">
      Actif
    </span>
  ) : (
    <span className="shrink-0 rounded-md border border-zinc-800 bg-black px-2 py-1 text-[9px] font-black uppercase tracking-wider text-zinc-600 sm:px-2.5 sm:text-[10px]">
      Bientôt
    </span>
  );
}

function Perforation({
  muted = false,
}: {
  muted?: boolean;
}) {
  return (
    <div className="relative my-3 h-0 sm:my-4">

      <div
        className={`absolute -left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full sm:-left-5 sm:h-4 sm:w-4 ${
          muted
            ? "bg-zinc-950"
            : "bg-black"
        }`}
      />

      <div
        className={`absolute -right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full sm:-right-5 sm:h-4 sm:w-4 ${
          muted
            ? "bg-zinc-950"
            : "bg-black"
        }`}
      />

      <div
        className={`mx-4 border-t border-dashed sm:mx-5 ${
          muted
            ? "border-zinc-800"
            : "border-yellow-400/20"
        }`}
      />

    </div>
  );
}

function TicketCard({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-[1.4rem] border shadow-xl sm:rounded-[1.7rem] ${
        active
          ? "border-yellow-400/30 bg-zinc-950"
          : "border-zinc-800/80 bg-zinc-950/60"
      }`}
    >

      {active && (
        <>
          <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-yellow-400/10 blur-3xl sm:h-32 sm:w-32" />

          <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-yellow-400/0 via-yellow-400/60 to-yellow-400/0" />
        </>
      )}

      <div className="relative z-10">
        {children}
      </div>

    </article>
  );
}

function MiniMetric({
  label,
  value,
  suffix,
  highlight = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black/80 px-1.5 py-2 text-center sm:rounded-xl sm:px-3 sm:py-3">

      <p className="text-[7px] font-bold uppercase tracking-wider text-zinc-600 sm:text-[9px] sm:tracking-widest">
        {label}
      </p>

      <p
        className={`mt-0.5 text-base font-black tabular-nums sm:mt-1 sm:text-lg ${
          highlight
            ? "text-green-400"
            : "text-white"
        }`}
      >
        {value}
      </p>

      {suffix && (
        <p className="text-[8px] font-bold text-zinc-600 sm:text-[9px]">
          {suffix}
        </p>
      )}

    </div>
  );
}

function Background() {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,#2b2205_0%,#09090b_30%,#000_70%)]" />

      <div className="fixed left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-yellow-400/[0.05] blur-3xl pointer-events-none sm:h-72 sm:w-72" />
    </>
  );
}