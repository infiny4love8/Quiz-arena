"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
};

type Leader = {
  id: string;
  score: number | null;
  rank: number | null;
  user_id: string;
};

export default function ProResultsPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = String(params.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);

  const [displayScore, setDisplayScore] = useState(0);
  const [confetti, setConfetti] = useState<number[]>([]);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/login");
          return;
        }

        const { data: tournamentData, error: tournamentError } = await supabase
          .from("tournaments_pro")
          .select("id,name,game_type,starts_at,play_window,status")
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
    if (!entry?.score) return;

    const target = Number(entry.score) || 0;
    let current = 0;

    const step = Math.max(1, Math.ceil(target / 45));

    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setDisplayScore(current);
    }, 25);

    return () => clearInterval(interval);
  }, [entry?.score]);

  useEffect(() => {
    setConfetti(Array.from({ length: 38 }, (_, i) => i));
  }, []);

  const provisionalRank = useMemo(() => {
    if (!entry || !leaders.length) return null;
    const index = leaders.findIndex((l) => l.user_id === entry.user_id);
    return index >= 0 ? index + 1 : null;
  }, [entry, leaders]);

  const timeRemaining = useMemo(() => {
    if (!tournament?.starts_at || !tournament?.play_window) return "Calcul...";
    const start = new Date(tournament.starts_at).getTime();
    const end = start + tournament.play_window * 60 * 1000;
    const diff = Math.max(0, end - Date.now());

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (diff <= 0) return "Tournoi terminé";
    return `${minutes}m ${seconds}s`;
  }, [tournament]);

  const xp = entry?.xp_gained && entry.xp_gained > 0 ? entry.xp_gained : 15;

  const badge = useMemo(() => {
    const score = Number(entry?.score || 0);
    if (score >= 220) return "Maître des paires";
    if (score >= 160) return "Challenger Pro";
    if (score >= 80) return "Combattant de l’arène";
    return "Participant Pro";
  }, [entry?.score]);

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
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,#422006_0%,#090909_45%,#000_100%)]" />
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:46px_46px]" />

      {confetti.map((i) => (
        <span
          key={i}
          className="pointer-events-none fixed top-[-20px] z-20 h-3 w-2 rounded-sm bg-yellow-400"
          style={{
            left: `${Math.random() * 100}%`,
            animation: `fallGold ${2.5 + Math.random() * 2.5}s linear infinite`,
            animationDelay: `${Math.random() * 2}s`,
            opacity: 0.75,
          }}
        />
      ))}

      <section className="relative z-10 mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-yellow-400/30 bg-zinc-950/95 p-7 text-center shadow-2xl shadow-yellow-400/10">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-yellow-400/10 text-6xl shadow-lg shadow-yellow-400/20 animate-pulse">
            🏆
          </div>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
            Résultat du challenge
          </p>

          <h1 className="mt-3 text-3xl font-black md:text-5xl">
            Score <span className="text-yellow-400">enregistré</span>
          </h1>

          <p className="mt-3 text-zinc-400">{tournament.name}</p>

          <div className="mt-8 rounded-3xl border border-yellow-400/25 bg-black p-7">
            <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">
              Ton score
            </p>
            <p className="mt-3 text-7xl font-black text-yellow-400 md:text-8xl">
              {displayScore}
            </p>
            <p className="mt-2 text-sm font-bold text-zinc-500">points</p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-purple-400/30 bg-purple-400/10 p-4">
              <p className="text-2xl">⭐</p>
              <p className="mt-2 text-xl font-black text-purple-300">+{xp} XP</p>
              <p className="text-xs text-zinc-500">XP gagnée</p>
            </div>

            <div className="rounded-2xl border border-green-400/30 bg-green-400/10 p-4">
              <p className="text-2xl">🎖️</p>
              <p className="mt-2 text-sm font-black text-green-400">{badge}</p>
              <p className="text-xs text-zinc-500">Badge obtenu</p>
            </div>

            <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4">
              <p className="text-2xl">📊</p>
              <p className="mt-2 text-xl font-black text-yellow-400">
                {provisionalRank ? `#${provisionalRank}` : "En calcul"}
              </p>
              <p className="text-xs text-zinc-500">Classement provisoire</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-zinc-800 bg-black p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Temps restant
                </p>
                <p className="mt-1 text-xl font-black text-zinc-200">
                  ⏳ {timeRemaining}
                </p>
              </div>
              <div className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-black text-yellow-400">
                Classement bientôt final
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-5 text-left">
            <h2 className="font-black text-yellow-400">Top provisoire</h2>

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
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black ${
                        index === 0 ? "bg-yellow-400 text-black" : "bg-zinc-800 text-zinc-400"
                      }`}>
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

          <div className="mt-7 grid gap-3 md:grid-cols-2">
            <button
              onClick={() => router.push(`/tournaments/pro/${tournamentId}/results`)}
              className="rounded-xl bg-yellow-400 px-6 py-4 font-black text-black transition hover:scale-[1.02] hover:bg-yellow-300"
            >
              🔥 Voir le classement
            </button>

            <button
              onClick={() => router.push("/tournaments/pro")}
              className="rounded-xl border border-zinc-700 px-6 py-4 font-black text-zinc-300 transition hover:border-yellow-400 hover:text-yellow-400"
            >
              🎮 Retour aux tournois
            </button>
          </div>

          <p className="mt-5 text-xs text-zinc-500">
            Ton score est sauvegardé. Les récompenses sont confirmées après la fin du tournoi.
          </p>
        </div>
      </section>

      <style>
        {`
          @keyframes fallGold {
            0% {
              transform: translateY(-30px) rotate(0deg);
            }
            100% {
              transform: translateY(110vh) rotate(360deg);
            }
          }
        `}
      </style>
    </main>
  );
}