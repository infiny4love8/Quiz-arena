"use client";

import { useEffect, useState } from "react";

type TrainingScore = {
  theme: string;
  label: string;
  score: string;
  points: number;
  played: boolean;
};

export default function TrainingPage() {
  const [recentScores, setRecentScores] = useState<TrainingScore[]>([]);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const bgMusic = new Audio("/sounds/training-bg.mp3");
    bgMusic.loop = true;
    bgMusic.volume = 0.2;
    bgMusic.play().catch(() => {});
    setAudio(bgMusic);

    const defaultScores: TrainingScore[] = [
      {
        theme: "flags",
        label: "Quiz Drapeaux",
        score: "0/10",
        points: 0,
        played: false,
      },
      {
        theme: "memory",
        label: "Mémoire",
        score: "0/10",
        points: 0,
        played: false,
      },
      {
        theme: "tankarena",
        label: "TankArena",
        score: "0/10",
        points: 0,
        played: false,
      },
      {
        theme: "dames",
        label: "Jeu de Dames",
        score: "0/10",
        points: 0,
        played: false,
      },
    ];

    const savedScores = defaultScores.map((item) => {
      const saved = localStorage.getItem(`training_score_${item.theme}`);

      if (!saved) return item;

      try {
        const parsed = JSON.parse(saved);

        return {
          ...item,
          score: parsed.score || "0/10",
          points: parsed.points || 0,
          played: true,
        };
      } catch {
        return item;
      }
    });

    setRecentScores(savedScores);

    return () => {
      bgMusic.pause();
    };
  }, []);

  const themes = [
    {
      id: "flags",
      title: "Quiz Drapeaux",
      description: "Reconnais les drapeaux du monde entier.",
      difficulty: "Facile",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqSl1xsDQw0huJ4yFYWTkXCH9E9JkmdfoJxA&s",
      accent: "from-blue-500 to-cyan-400",
    },
    {
      id: "memory",
      title: "Mémoire",
      description: "Teste ta concentration et ta mémoire.",
      difficulty: "Mental",
      image:
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
      accent: "from-violet-500 to-fuchsia-500",
    },
    {
      id: "tankarena",
      title: "TankArena",
      description: "Détruis les ennemis et bats le boss.",
      difficulty: "Hardcore",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSv8QPF9WPUhGhg9-9HxOocOsu2F8uNAN3odQ&s",
      accent: "from-orange-500 to-red-500",
    },
    {
      id: "dames",
      title: "Jeu de Dames",
      description: "Le classique stratégique intemporel.",
      difficulty: "Tactique",
      image:
        "https://le-palais-des-echecs.com/wp-content/uploads/2022/10/Jeu-de-dame.png",
      accent: "from-yellow-500 to-amber-500",
    },
  ];

  const bestScore = recentScores.reduce(
    (best, current) =>
      current.points > best.points ? current : best,
    recentScores[0] || {
      label: "Aucun",
      score: "0/10",
      points: 0,
    }
  );

  return (
    <main className="min-h-screen bg-[#070707] text-white overflow-hidden">
      {/* BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1f2937_0%,#070707_55%)]" />
        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-black/40 border-b border-white/10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-xl font-black shadow-lg">
              Q
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight">
                QuizArena
              </h1>

              <p className="text-sm text-zinc-400">
                Training Center
              </p>
            </div>
          </a>

          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="px-5 py-2.5 rounded-2xl border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all duration-300 text-sm font-semibold"
            >
              Dashboard
            </a>

            <a
              href="/tournaments"
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-black font-black hover:scale-105 transition-all duration-300 shadow-xl"
            >
              Tournois
            </a>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-red-500/20 bg-red-500/10 text-red-300 font-semibold mb-8">
            ⚡ Entraînement Gaming
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-8">
            Entre dans
            <span className="block bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
              l'Arène
            </span>
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
            Progresse sur plusieurs jeux, améliore ton score
            et prépare-toi pour les tournois compétitifs.
          </p>
        </div>
      </section>

      {/* STATS */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* BEST SCORE */}
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-orange-500/5" />

            <div className="relative z-10">
              <p className="text-zinc-400 mb-3 font-medium">
                🔥 Meilleur Score
              </p>

              <h2 className="text-4xl font-black mb-8">
                {bestScore.label}
              </h2>

              <div className="rounded-3xl bg-gradient-to-r from-red-500 to-orange-500 p-8 text-black shadow-2xl">
                <div className="text-6xl font-black mb-3">
                  {bestScore.score}
                </div>

                <div className="text-2xl font-black">
                  {bestScore.points} pts
                </div>
              </div>
            </div>
          </div>

          {/* HISTORY */}
          <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-8">
            <h3 className="text-3xl font-black mb-8">
              📈 Historique
            </h3>

            <div className="space-y-4">
              {recentScores.map((item) => (
                <div
                  key={item.theme}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-5 py-4 hover:border-white/20 transition-all duration-300"
                >
                  <div>
                    <p className="font-bold text-lg">
                      {item.label}
                    </p>

                    <p className="text-zinc-500 text-sm">
                      {item.played
                        ? item.score
                        : "Pas encore joué"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-green-400 font-black text-xl">
                      {item.points}
                    </p>

                    <p className="text-zinc-500 text-sm">
                      points
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TITLE */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Choisis ton jeu
            </h2>

            <p className="text-zinc-400 text-lg">
              Lance une partie et améliore ton classement.
            </p>
          </div>

          <a
            href="/leaderboard"
            className="w-fit px-7 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-black font-black shadow-xl hover:scale-105 transition-all duration-300"
          >
            🏆 Leaderboard
          </a>
        </div>
      </section>

      {/* GAME CARDS */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {themes.map((theme, index) => {
            const currentScore = recentScores.find(
              (s) => s.theme === theme.id
            );

            return (
              <a
                key={theme.id}
                href={`/training/${theme.id}`}
                className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-zinc-900/60 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-white/30"
              >
                {/* IMAGE */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={theme.image}
                    alt={theme.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />

                  {/* OVERLAY */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                  {/* DIFFICULTY */}
                  <div
                    className={`absolute top-4 left-4 bg-gradient-to-r ${theme.accent} px-4 py-2 rounded-full text-sm font-black shadow-lg`}
                  >
                    {theme.difficulty}
                  </div>

                  {/* NUMBER */}
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-sm font-black">
                    0{index + 1}
                  </div>
                </div>

                {/* CONTENT */}
                <div className="p-7">
                  <div className="mb-5">
                    <h3 className="text-3xl font-black mb-3">
                      {theme.title}
                    </h3>

                    <p className="text-zinc-400 leading-relaxed">
                      {theme.description}
                    </p>
                  </div>

                  {/* STATS */}
                  <div className="flex items-center justify-between mb-7">
                    <div>
                      <p className="text-zinc-500 text-sm mb-1">
                        Score
                      </p>

                      <p className="text-2xl font-black">
                        {currentScore?.score || "0/10"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-zinc-500 text-sm mb-1">
                        Points
                      </p>

                      <p className="text-2xl font-black text-green-400">
                        {currentScore?.points || 0}
                      </p>
                    </div>
                  </div>

                  {/* BUTTON */}
                  <div
                    className={`w-full rounded-2xl bg-gradient-to-r ${theme.accent} py-4 text-center text-lg font-black shadow-xl transition-all duration-300 group-hover:scale-[1.02]`}
                  >
                    JOUER MAINTENANT
                  </div>
                </div>

                {/* HOVER GLOW */}
                <div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${theme.accent}`}
                />
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}