"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  winnerMessages,
  secondMessages,
  loserMessages,
  cancelledMessages,
  pendingMessages,
  topThreeMessages,
  pickRandomMessage,
} from "@/lib/resultMessages";

type Entry = {
  id: string;
  user_id: string;
  score: number | null;
  rank: number | null;
  xp_gained: number | null;
  prize_ticket: boolean | null;
  prize_coins: number | null;
  cashback_coins: number | null;
  score_submitted_at: string | null;
};

type Tournament = {
  id: string;
  name: string;
  game_type: string;
  starts_at: string;
  play_window: number;
  status: string;
  entry_coins: number;
};

type Leader = {
  id: string;
  score: number | null;
  rank: number | null;
  user_id: string;
};

type Outcome = "cancelled" | "pending" | "winner" | "second" | "top3" | "lost";

export default function ProResultsPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = String(params.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [confetti, setConfetti] = useState<number[]>([]);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/login");
          return;
        }

        const { data: tournamentData, error: tournamentError } = await supabase
          .from("tournaments_pro")
          .select("id,name,game_type,starts_at,play_window,status,entry_coins")
          .eq("id", tournamentId)
          .single();

        if (tournamentError || !tournamentData) {
          setError("Tournoi introuvable.");
          return;
        }

        setTournament(tournamentData);

        const { data: entryData, error: entryError } = await supabase
          .from("tournament_pro_entries")
          .select("id,user_id,score,rank,xp_gained,prize_ticket,prize_coins,cashback_coins,score_submitted_at")
          .eq("tournament_id", tournamentId)
          .eq("user_id", session.user.id)
          .single();

        if (entryError || !entryData) {
          setError("Résultat introuvable pour ce tournoi.");
          return;
        }

        setEntry(entryData);

        const { data: leadersData } = await supabase
          .from("tournament_pro_entries")
          .select("id,user_id,score,rank")
          .eq("tournament_id", tournamentId)
          .not("score", "is", null)
          .order("score", { ascending: false })
          .limit(5);

        setLeaders(leadersData || []);
      } catch (err) {
        console.error(err);
        setError("Erreur lors du chargement des résultats.");
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [router, tournamentId]);

  useEffect(() => {
    setConfetti(Array.from({ length: 44 }, (_, i) => i));
  }, []);

  const provisionalRank = useMemo(() => {
    if (!entry || !leaders.length) return null;
    const index = leaders.findIndex((l) => l.user_id === entry.user_id);
    return index >= 0 ? index + 1 : null;
  }, [entry, leaders]);

  const finalRank = entry?.rank || provisionalRank;

  const timeRemaining = useMemo(() => {
    if (!tournament?.starts_at || !tournament?.play_window) return "Calcul...";
    const start = new Date(tournament.starts_at).getTime();
    const end = start + tournament.play_window * 60 * 1000;
    const diff = Math.max(0, end - Date.now());

    if (diff <= 0) return "Tournoi terminé";

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
  }, [tournament]);

  const outcome: Outcome = useMemo(() => {
    if (!tournament || !entry) return "pending";
    if (tournament.status === "cancelled") return "cancelled";

    const stillRunning = tournament.status === "active" && timeRemaining !== "Tournoi terminé";
    if (stillRunning) return "pending";

    if ((entry.prize_coins || 0) > 0 || finalRank === 1) return "winner";
    if (entry.prize_ticket || finalRank === 2) return "second";
    if (finalRank === 3) return "top3";

    return "lost";
  }, [tournament, entry, finalRank, timeRemaining]);

  const message = useMemo(() => {
    if (outcome === "winner") return pickRandomMessage(winnerMessages);
    if (outcome === "second") return pickRandomMessage(secondMessages);
    if (outcome === "top3") return pickRandomMessage(topThreeMessages);
    if (outcome === "cancelled") return pickRandomMessage(cancelledMessages);
    if (outcome === "pending") return pickRandomMessage(pendingMessages);
    return pickRandomMessage(loserMessages);
  }, [outcome]);

  const hero = getHero(outcome);
  const rewards = getRewards(outcome, entry, tournament);
  const mainButton = getMainButton(outcome);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <div className="rounded-3xl border border-yellow-400/30 bg-zinc-950 p-8 text-center">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-yellow-400/20 border-t-yellow-400" />
          <p className="font-black text-zinc-300">Chargement du résultat...</p>
        </div>
      </main>
    );
  }

  if (error || !entry || !tournament) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <div className="w-full max-w-lg rounded-3xl border border-red-500/30 bg-zinc-950 p-8 text-center">
          <div className="text-5xl">🚫</div>
          <h1 className="mt-5 text-2xl font-black text-red-400">Résultat indisponible</h1>
          <p className="mt-3 text-zinc-400">{error || "Impossible de trouver ce résultat."}</p>
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-5 py-8 text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_10%,#422006_0%,#090909_42%,#000_100%)]" />
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:46px_46px]" />

      {outcome === "winner" &&
        confetti.map((i) => (
          <span
            key={i}
            className="pointer-events-none fixed top-[-20px] z-20 h-3 w-2 rounded-sm bg-yellow-400"
            style={{
              left: `${(i * 17) % 100}%`,
              animation: `fallGold ${2.5 + (i % 5) * 0.35}s linear infinite`,
              animationDelay: `${(i % 7) * 0.2}s`,
              opacity: 0.75,
            }}
          />
        ))}

      <section className="relative z-10 mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-yellow-400/30 bg-zinc-950/95 p-7 text-center shadow-2xl shadow-yellow-400/10">
          <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full text-6xl shadow-lg animate-pulse ${hero.ring}`}>
            {hero.icon}
          </div>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
            Résultat du challenge
          </p>

          <h1 className="mt-3 text-3xl font-black md:text-5xl">{hero.title}</h1>
          <p className="mt-3 text-zinc-400">{tournament.name}</p>

          <div className="mt-7 rounded-3xl border border-yellow-400/25 bg-black p-6">
            <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Ton score</p>
            <p className="mt-3 text-7xl font-black text-yellow-400 md:text-8xl">
              <AnimatedNumber value={Number(entry.score || 0)} />
            </p>
            <p className="mt-2 text-sm font-bold text-zinc-500">points</p>
          </div>

          <ResultMessageCard
            outcome={outcome}
            entry={entry}
            tournament={tournament}
            message={message}
          />

          <div className="mt-5 rounded-2xl border border-yellow-400/25 bg-black p-5 text-left">
            <h2 className="text-lg font-black text-yellow-400">🎁 Récompenses obtenues</h2>

            <div className="mt-4 space-y-3">
              {rewards.map((reward, index) => (
                <RewardRow
                  key={reward.label}
                  icon={reward.icon}
                  label={reward.label}
                  value={reward.value}
                  delay={index * 120}
                  color={reward.color}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <InfoBox
              icon="📊"
              title={tournament.status === "active" ? "Rang provisoire" : "Classement"}
              value={finalRank ? `#${finalRank}` : "En calcul"}
              color="yellow"
            />

            <InfoBox
              icon="⏳"
              title="Temps restant"
              value={timeRemaining}
              color="white"
            />

            <InfoBox
              icon="⭐"
              title="XP gagné"
              value={`+${entry.xp_gained || 0} XP`}
              color="purple"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-5 text-left">
            <h2 className="font-black text-yellow-400">
              {tournament.status === "active" ? "Top provisoire" : "Classement du tournoi"}
            </h2>

            <div className="mt-4 space-y-2">
              {leaders.length > 0 ? (
                leaders.map((leader, index) => (
                  <div
                    key={leader.id}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                      leader.user_id === entry.user_id
                        ? "border-yellow-400/40 bg-yellow-400/10"
                        : "border-zinc-800 bg-zinc-950"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black ${
                          index === 0
                            ? "bg-yellow-400 text-black"
                            : index === 1
                            ? "bg-zinc-300 text-black"
                            : index === 2
                            ? "bg-orange-400 text-black"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        #{index + 1}
                      </div>
                      <p className="text-sm font-bold">
                        {leader.user_id === entry.user_id ? "Toi" : `Joueur ${index + 1}`}
                      </p>
                    </div>
                    <p className="font-black text-yellow-400">{leader.score || 0} pts</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">Classement en préparation...</p>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-5 text-left">
            <h2 className="font-black text-yellow-400">Continue ton aventure</h2>
            <p className="mt-2 text-sm text-zinc-400">{getNextChallenge(outcome, tournament.game_type)}</p>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-2">
            <button
              onClick={() => {
                if (mainButton.href) router.push(mainButton.href);
                else window.location.reload();
              }}
              className="rounded-xl bg-yellow-400 px-6 py-4 font-black text-black transition hover:scale-[1.02] hover:bg-yellow-300"
            >
              {mainButton.label}
            </button>

            <button
              onClick={() => router.push("/tournaments/pro")}
              className="rounded-xl border border-zinc-700 px-6 py-4 font-black text-zinc-300 transition hover:border-yellow-400 hover:text-yellow-400"
            >
              🎮 Retour aux tournois
            </button>
          </div>

          <p className="mt-5 text-xs text-zinc-500">
            Ton score est sauvegardé. Les récompenses sont confirmées automatiquement selon le statut final du tournoi.
          </p>
        </div>
      </section>

      <style>
        {`
          @keyframes fallGold {
            0% { transform: translateY(-30px) rotate(0deg); }
            100% { transform: translateY(110vh) rotate(360deg); }
          }

          @keyframes rewardIn {
            from { opacity: 0; transform: translateY(10px) scale(.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>
    </main>
  );
}

function ResultMessageCard({
  outcome,
  entry,
  tournament,
  message,
}: {
  outcome: Outcome;
  entry: Entry;
  tournament: Tournament;
  message: string;
}) {
  const prizeCoins = entry.prize_coins || 0;
  const xp = entry.xp_gained || 0;
  const cashback = entry.cashback_coins || 0;

  const data =
    outcome === "winner"
      ? {
          icon: "👑",
          title: "Félicitations, champion !",
          text: `Tu as remporté le tournoi et gagné ${prizeCoins} coins + ${xp} XP. Tes récompenses sont déjà créditées sur ton compte.`,
          detail: "🏦 Gains disponibles au retrait.",
        }
      : outcome === "second"
      ? {
          icon: "🥈",
          title: "Tu étais à un pas de la victoire",
          text: `Tu termines 2e et tu gagnes 1 ticket sponsorisé + ${xp} XP. Le prochain tournoi peut clairement être le tien.`,
          detail: "🎫 Ton ticket est déjà disponible.",
        }
      : outcome === "top3"
      ? {
          icon: "🏅",
          title: "Top 3 validé !",
          text: `Tu termines dans le Top 3. Tu reçois ${cashback} coins cashback + ${xp} XP. Encore un effort et tu peux viser la victoire.`,
          detail: "💚 Cashback crédité automatiquement.",
        }
      : outcome === "lost"
      ? {
          icon: "👏",
          title: "Bien joué, continue comme ça",
          text: `Merci d'avoir participé. Tu reçois ${cashback} coins cashback + ${xp} XP. Entraîne-toi et reviens plus fort, on t'attend.`,
          detail: "💚 Bonus retour déjà ajouté.",
        }
      : outcome === "cancelled"
      ? {
          icon: "↩️",
          title: "Tournoi annulé",
          text: `Le minimum de joueurs actifs n'a pas été atteint. Tes ${tournament.entry_coins} coins ont été remboursés automatiquement.`,
          detail: "Aucun XP attribué sur tournoi annulé.",
        }
      : {
          icon: "⏳",
          title: "Score enregistré",
          text: "Ton score est sauvegardé. Attends la fin du tournoi pour découvrir ton classement final et tes récompenses.",
          detail: "Le classement peut encore évoluer.",
        };

  return (
    <div className="mt-5 rounded-2xl border border-yellow-400/25 bg-yellow-400/10 p-5">
      <p className="text-3xl">{data.icon}</p>

      <h2 className="mt-2 text-2xl font-black text-yellow-400">
        {data.title}
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
        {message}
      </p>

      <p className="mt-3 text-sm leading-relaxed text-zinc-200">
        {data.text}
      </p>

      <p className="mt-4 rounded-xl border border-yellow-400/20 bg-black px-4 py-3 text-sm font-bold text-yellow-400">
        {data.detail}
      </p>
    </div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let current = 0;
    const duration = 800;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      current = Math.floor(value * progress);
      setDisplay(current);

      if (progress < 1) requestAnimationFrame(tick);
      else setDisplay(value);
    };

    requestAnimationFrame(tick);
  }, [value]);

  return <>{display}</>;
}

function RewardRow({
  icon,
  label,
  value,
  delay,
  color,
}: {
  icon: string;
  label: string;
  value: number | string;
  delay: number;
  color: "yellow" | "green" | "purple" | "white";
}) {
  const colorClass =
    color === "yellow"
      ? "text-yellow-400"
      : color === "green"
      ? "text-green-400"
      : color === "purple"
      ? "text-purple-400"
      : "text-zinc-200";

  return (
    <div
      className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 opacity-0"
      style={{
        animation: `rewardIn .8s ease forwards`,
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm font-bold text-zinc-300">{label}</span>
      </div>
      <span className={`text-lg font-black ${colorClass}`}>{value}</span>
    </div>
  );
}

function InfoBox({
  icon,
  title,
  value,
  color,
}: {
  icon: string;
  title: string;
  value: string;
  color: "yellow" | "green" | "white" | "purple";
}) {
  const colorClass =
    color === "yellow"
      ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
      : color === "green"
      ? "text-green-400 border-green-400/30 bg-green-400/10"
      : color === "purple"
      ? "text-purple-400 border-purple-400/30 bg-purple-400/10"
      : "text-zinc-200 border-zinc-800 bg-black";

  return (
    <div className={`rounded-2xl border p-4 ${colorClass}`}>
      <p className="text-2xl">{icon}</p>
      <p className="mt-2 text-xs text-zinc-500">{title}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function getHero(outcome: Outcome) {
  if (outcome === "winner") {
    return {
      icon: "👑",
      title: "Tu remportes le tournoi !",
      rewardIcon: "💰",
      rewardTitle: "Récompenses obtenues",
      ring: "bg-yellow-400 text-black shadow-yellow-400/20",
    };
  }

  if (outcome === "second") {
    return {
      icon: "🥈",
      title: "Magnifique performance !",
      rewardIcon: "🎫",
      rewardTitle: "Tu étais à un pas de la victoire",
      ring: "bg-zinc-300 text-black shadow-zinc-300/20",
    };
  }

  if (outcome === "top3") {
    return {
      icon: "🏅",
      title: "Top 3 validé !",
      rewardIcon: "💚",
      rewardTitle: "Cashback reçu",
      ring: "bg-orange-400 text-black shadow-orange-400/20",
    };
  }

  if (outcome === "cancelled") {
    return {
      icon: "↩️",
      title: "Tournoi annulé",
      rewardIcon: "🪙",
      rewardTitle: "Mise remboursée",
      ring: "bg-blue-400 text-black shadow-blue-400/20",
    };
  }

  if (outcome === "pending") {
    return {
      icon: "⏳",
      title: "Score enregistré",
      rewardIcon: "🏆",
      rewardTitle: "Classement en attente",
      ring: "bg-yellow-400/10 text-yellow-400 shadow-yellow-400/20",
    };
  }

  return {
    icon: "👏",
    title: "Bien joué !",
    rewardIcon: "💚",
    rewardTitle: "Bonus retour",
    ring: "bg-green-400 text-black shadow-green-400/20",
  };
}

function getRewards(
  outcome: Outcome,
  entry: Entry | null,
  tournament: Tournament | null
) {
  const rewards: {
    icon: string;
    label: string;
    value: string;
    color: "yellow" | "green" | "purple" | "white";
  }[] = [];

  if (outcome === "winner") {
    rewards.push({
      icon: "💰",
      label: "Coins gagnés",
      value: `+${entry?.prize_coins || 0}`,
      color: "yellow",
    });
  }

  if (outcome === "second") {
    rewards.push({
      icon: "🎫",
      label: "Ticket sponsorisé",
      value: "+1",
      color: "yellow",
    });
  }

  if (outcome === "cancelled") {
    rewards.push({
      icon: "🪙",
      label: "Coins remboursés",
      value: `+${tournament?.entry_coins || 50}`,
      color: "yellow",
    });
  }

  if (outcome === "top3" || outcome === "lost") {
    rewards.push({
      icon: "💚",
      label: outcome === "top3" ? "Cashback Top 3" : "Cashback reçu",
      value: `+${entry?.cashback_coins || 0}`,
      color: "green",
    });
  }

  if (outcome !== "cancelled" && outcome !== "pending") {
    rewards.push({
      icon: "⭐",
      label: "XP gagnés",
      value: `+${entry?.xp_gained || 0}`,
      color: "purple",
    });
  }

  if (outcome === "pending") {
    rewards.push({
      icon: "⏳",
      label: "Récompenses",
      value: "En attente",
      color: "white",
    });
  }

  return rewards;
}

function getNextChallenge(outcome: Outcome, gameType: string) {
  if (outcome === "winner") return "🏆 Défends ton titre dans un autre tournoi Pro.";
  if (outcome === "second") return "🎫 Utilise ton ticket sponsorisé et reviens chercher la première place.";
  if (outcome === "top3") return "🥉 Tu es déjà dans le Top 3. Le prochain objectif, c'est la victoire.";
  if (outcome === "cancelled") return "Rejoins une autre table. Ta mise est protégée.";
  if (outcome === "pending") return "Reviens à la fin du chrono pour découvrir ton rang final.";

  if (gameType === "memory_cards") return "🃏 Entraîne-toi sur Memory Cards puis reviens plus fort.";
  if (gameType === "drapeaux") return "🌍 Grimpe dans Flags et vise le Top 2.";
  if (gameType === "memory") return "🧠 Essaie Memory Rush pour améliorer tes réflexes.";
  if (gameType === "tank_arena") return "🛡️ Retourne dans Tank Arena et vise un meilleur score.";

  return "Entraîne-toi quelques minutes puis reviens chercher le Top 2.";
}

function getMainButton(outcome: Outcome) {
  if (outcome === "winner") return { label: "💸 Retirer mes gains", href: "/withdraw" };
  if (outcome === "second") return { label: "🎁 Utiliser mon ticket", href: "/tournamentsponsorise" };
  if (outcome === "cancelled") return { label: "🏆 Rejoindre un autre tournoi", href: "/tournaments/pro" };
  if (outcome === "pending") return { label: "🔥 Actualiser le classement", href: "" };
  return { label: "🏆 Rejouer un tournoi", href: "/tournaments/pro" };
}