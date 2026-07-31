"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Mission = {
  id: string;
  title: string;
  description: string;
  mission_type: "pro_participation" | "duel_completed";
  target_count: number;
  progress: number;
  reward_type: "tickets" | "coins" | "xp";
  reward_amount: number;
  starts_at: string;
  ends_at: string;
  reward_claimed: boolean;
};

type ClaimResponse = {
  success: boolean;
  reward_type: Mission["reward_type"];
  reward_amount: number;
};

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const router = useRouter();

  const loadMissions = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setMessage(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase.rpc("get_my_daily_missions");

      if (error) {
        console.error("Erreur missions :", error);
        setMessage({
          type: "error",
          text: "Impossible de charger les missions pour le moment.",
        });
      } else {
        setMissions((data ?? []) as Mission[]);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [router]
  );

  useEffect(() => {
    loadMissions();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session?.user) {
          router.replace("/login");
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [loadMissions, router]);

  const completedCount = useMemo(
    () =>
      missions.filter(
        (mission) =>
          mission.progress >= mission.target_count ||
          mission.reward_claimed
      ).length,
    [missions]
  );

  async function claimReward(mission: Mission) {
    if (
      mission.reward_claimed ||
      mission.progress < mission.target_count ||
      claimingId
    ) {
      return;
    }

    setClaimingId(mission.id);
    setMessage(null);

    const { data, error } = await supabase.rpc("claim_mission_reward", {
      p_mission_id: mission.id,
    });

    if (error) {
      console.error("Erreur récupération récompense :", error);
      setMessage({
        type: "error",
        text:
          error.message ||
          "La récompense n’a pas pu être récupérée.",
      });
      setClaimingId(null);
      return;
    }

    const result = data as ClaimResponse | null;

    setMessage({
      type: "success",
      text: result
        ? `Bravo ! Tu as reçu ${formatReward(
            result.reward_type,
            result.reward_amount
          )}.`
        : "Bravo ! Ta récompense a été ajoutée.",
    });

    await loadMissions(true);
    setClaimingId(null);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050506] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
          <p className="text-sm text-zinc-400">
            Chargement des missions...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050506] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute right-[-140px] top-[-150px] h-[360px] w-[360px] rounded-full bg-yellow-400/[0.08] blur-3xl" />
        <div className="absolute bottom-[-200px] left-[-160px] h-[430px] w-[430px] rounded-full bg-yellow-500/[0.04] blur-3xl" />
      </div>

      <section className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-12 pt-5 sm:px-6">
        <header className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-xl text-zinc-300 transition hover:border-yellow-400/30 hover:text-yellow-400 active:scale-95"
            aria-label="Retour au dashboard"
          >
            ←
          </Link>

          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-yellow-400/70">
              Zonarena
            </p>
            <p className="mt-0.5 text-sm font-black">Missions</p>
          </div>

          <button
            type="button"
            onClick={() => loadMissions(true)}
            disabled={refreshing}
            aria-label="Actualiser les missions"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-lg text-zinc-300 transition hover:border-yellow-400/30 hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
          >
            <span className={refreshing ? "animate-spin" : ""}>↻</span>
          </button>
        </header>

        <div className="mt-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Objectifs du jour
              </p>
              <h1 className="mt-1 text-3xl font-black sm:text-4xl">
                Tes missions <span className="text-yellow-400">🎁</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                Joue, accomplis les objectifs et récupère tes récompenses
                avant la fin de la journée.
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div
            role="status"
            className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                : "border-red-400/25 bg-red-400/10 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {missions.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <SummaryCard
              label="Disponibles"
              value={missions.length}
              icon="📋"
            />
            <SummaryCard
              label="Terminées"
              value={`${completedCount}/${missions.length}`}
              icon="✅"
            />
          </div>
        )}

        <div className="mt-6 space-y-4">
          {missions.length === 0 ? (
            <EmptyState />
          ) : (
            missions.map((mission) => {
              const progress = Math.min(
                mission.progress,
                mission.target_count
              );
              const percent = Math.min(
                100,
                Math.round(
                  (progress / mission.target_count) * 100
                )
              );
              const completed =
                progress >= mission.target_count;
              const action = getMissionAction(mission.mission_type);

              return (
                <article
                  key={mission.id}
                  className={`relative overflow-hidden rounded-[26px] border p-5 shadow-[0_20px_60px_rgba(0,0,0,.25)] ${
                    mission.reward_claimed
                      ? "border-emerald-400/20 bg-emerald-400/[0.04]"
                      : completed
                      ? "border-yellow-400/30 bg-gradient-to-br from-yellow-400/[0.11] to-[#0d0d0f]"
                      : "border-white/[0.07] bg-[#0d0d0f]"
                  }`}
                >
                  <div className="absolute right-[-35px] top-[-35px] h-28 w-28 rounded-full bg-yellow-400/[0.05] blur-3xl" />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.08] text-2xl">
                          {getMissionIcon(mission.mission_type)}
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-400/70">
                            Mission du jour
                          </p>
                          <h2 className="mt-1 text-lg font-black leading-6 text-white">
                            {mission.title}
                          </h2>
                        </div>
                      </div>

                      {mission.reward_claimed && (
                        <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-300">
                          Récupérée
                        </span>
                      )}
                    </div>

                    <p className="mt-4 text-sm leading-6 text-zinc-500">
                      {mission.description}
                    </p>

                    <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-zinc-400">
                          Progression
                        </p>
                        <p className="text-xs font-black text-white">
                          {progress} / {mission.target_count}
                        </p>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            completed
                              ? "bg-emerald-400"
                              : "bg-yellow-400"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.07] px-4 py-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-yellow-400/60">
                          Récompense
                        </p>
                        <p className="mt-1 text-sm font-black text-yellow-400">
                          {formatReward(
                            mission.reward_type,
                            mission.reward_amount
                          )}
                        </p>
                      </div>

                      <span className="text-2xl">
                        {getRewardIcon(mission.reward_type)}
                      </span>
                    </div>

                    <div className="mt-4">
                      {mission.reward_claimed ? (
                        <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 py-3.5 text-sm font-black text-emerald-300">
                          <span>✓</span>
                          Récompense récupérée
                        </div>
                      ) : completed ? (
                        <button
                          type="button"
                          onClick={() => claimReward(mission)}
                          disabled={claimingId !== null}
                          className="w-full rounded-2xl bg-yellow-400 py-3.5 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[.99]"
                        >
                          {claimingId === mission.id
                            ? "Récupération..."
                            : "Récupérer la récompense"}
                        </button>
                      ) : (
                        <Link
                          href={action.href}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-yellow-400/25 bg-yellow-400/[0.09] py-3.5 text-sm font-black text-yellow-400 transition hover:bg-yellow-400/[0.14] active:scale-[.99]"
                        >
                          {action.label}
                          <span>→</span>
                        </Link>
                      )}
                    </div>

                    <p className="mt-3 text-center text-[10px] text-zinc-600">
                      Disponible jusqu&apos;à{" "}
                      {formatEndTime(mission.ends_at)}
                    </p>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="mt-6 rounded-[22px] border border-white/[0.06] bg-white/[0.025] p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <h3 className="text-sm font-black text-white">
                La progression ne s’affiche pas ?
              </h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Termine complètement ton tournoi ou ton duel, puis appuie
                sur le bouton d’actualisation en haut de la page.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/[0.07] bg-[#0d0d0f] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-white">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[28px] border border-white/[0.07] bg-[#0d0d0f] px-5 py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-yellow-400/15 bg-yellow-400/[0.07] text-3xl">
        🌙
      </div>
      <h2 className="mt-5 text-xl font-black">
        Aucune mission aujourd&apos;hui
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
        Reviens plus tard. Une nouvelle mission et une nouvelle récompense
        pourraient bientôt apparaître.
      </p>
      <Link
        href="/dashboard"
        className="mx-auto mt-6 inline-flex rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-black text-black"
      >
        Retour au dashboard
      </Link>
    </div>
  );
}

function getMissionAction(type: Mission["mission_type"]) {
  if (type === "pro_participation") {
    return {
      href: "/tournaments/pro",
      label: "Voir les tournois Pro",
    };
  }

  return {
    href: "/duel",
    label: "Faire un duel",
  };
}

function getMissionIcon(type: Mission["mission_type"]) {
  return type === "pro_participation" ? "🏆" : "⚔️";
}

function getRewardIcon(type: Mission["reward_type"]) {
  if (type === "tickets") return "🎫";
  if (type === "coins") return "💰";
  return "⭐";
}

function formatReward(
  type: Mission["reward_type"],
  amount: number
) {
  if (type === "tickets") {
    return `${amount} ticket${amount > 1 ? "s" : ""} sponsorisé${
      amount > 1 ? "s" : ""
    }`;
  }

  if (type === "coins") {
    return `${amount} Gourde${amount > 1 ? "s" : ""}`;
  }

  return `${amount} XP`;
}

function formatEndTime(value: string) {
  return new Intl.DateTimeFormat("fr-HT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}