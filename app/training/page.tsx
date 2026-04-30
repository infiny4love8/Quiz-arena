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
  const [recentScores, setRecentScores] = useState<TrainingScore[]>([
    {
      theme: "flags",
      label: "Drapeaux",
      score: "0/10",
      points: 0,
      played: false,
    },
    {
      theme: "brands",
      label: "Marques",
      score: "0/10",
      points: 0,
      played: false,
    },
    {
      theme: "movies",
      label: "Films / Séries",
      score: "0/10",
      points: 0,
      played: false,
    },
  ]);

  useEffect(() => {
    const defaultScores: TrainingScore[] = [
      {
        theme: "flags",
        label: "Drapeaux",
        score: "0/10",
        points: 0,
        played: false,
      },
      {
        theme: "brands",
        label: "Marques",
        score: "0/10",
        points: 0,
        played: false,
      },
      {
        theme: "movies",
        label: "Films / Séries",
        score: "0/10",
        points: 0,
        played: false,
      },
    ];

    const savedScores = defaultScores.map((item) => {
      const saved = localStorage.getItem(`training_score_${item.theme}`);

      if (!saved) {
        return item;
      }

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
  }, []);

  const themes = [
    {
      id: "flags",
      title: "Drapeaux",
      description:
        "Teste ta mémoire visuelle avec les drapeaux du monde. Simple, rapide et parfait pour t’échauffer.",
      icon: "🏳️",
      difficulty: "Facile à moyen",
      questions: "10 questions",
      color: "from-red-500/20 to-black",
    },
    {
      id: "brands",
      title: "Marques",
      description:
        "Reconnais les logos, apps, marques connues, restaurants, vêtements et produits populaires.",
      icon: "🏷️",
      difficulty: "Très populaire",
      questions: "10 questions",
      color: "from-red-600/20 to-black",
    },
    {
      id: "movies",
      title: "Films / Séries",
      description:
        "Devine les films, séries, personnages ou univers connus. Un thème fun pour tout le monde.",
      icon: "🎬",
      difficulty: "Fun & culturel",
      questions: "10 questions",
      color: "from-rose-600/20 to-black",
    },
  ];

  const bestScore = recentScores.reduce((best, current) => {
    return current.points > best.points ? current : best;
  }, recentScores[0]);

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute right-[-140px] top-[-140px] h-[380px] w-[380px] rounded-full bg-red-600/25 blur-3xl" />
        <div className="absolute bottom-[-160px] left-[-120px] h-[420px] w-[420px] rounded-full bg-red-500/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-red-400/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-red-500/20 bg-black/70 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <a href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500 text-xl font-black text-black shadow-lg shadow-red-500/30">
              Q
            </div>
            <div>
              <h1 className="text-xl font-black">
                Quiz<span className="text-red-400">Arena</span>
              </h1>
              <p className="text-xs text-zinc-400">Mode entraînement</p>
            </div>
          </a>

          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-white transition hover:border-red-400 hover:text-red-400"
            >
              Dashboard
            </a>
            <a
              href="/tournaments"
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-black transition hover:bg-red-400"
            >
              Tournois
            </a>
          </div>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-12">
        {/* Hero */}
        <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300">
              Entraînement gratuit
            </div>

            <h2 className="text-4xl font-black leading-tight md:text-6xl">
              Choisis ton thème. <br />
              <span className="text-red-400">Améliore ton score.</span>
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">
              Le mode entraînement te permet de jouer gratuitement, tester ton
              niveau, gagner de l’expérience et te préparer avant les tournois
              contre d’autres joueurs.
            </p>

            <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <p className="text-sm text-zinc-400">Coût</p>
                <h3 className="mt-2 text-3xl font-black text-red-400">
                  Gratuit
                </h3>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <p className="text-sm text-zinc-400">Format</p>
                <h3 className="mt-2 text-3xl font-black text-red-400">
                  10 Q
                </h3>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <p className="text-sm text-zinc-400">Objectif</p>
                <h3 className="mt-2 text-3xl font-black text-red-400">
                  XP
                </h3>
              </div>
            </div>
          </div>

          {/* Real score preview card */}
          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-red-500/20 blur-2xl" />

            <div className="relative rounded-[2rem] border border-red-400/20 bg-zinc-950 p-6 shadow-2xl">
              <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">
                      {bestScore.played ? "Meilleur score" : "Aucun score"}
                    </p>
                    <h3 className="text-2xl font-black">
                      {bestScore.played ? bestScore.label : "Commence à jouer"}
                    </h3>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500 text-2xl font-black text-black">
                    {bestScore.played ? "🔥" : "🎮"}
                  </div>
                </div>

                <div className="mt-8 rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 p-6 text-black">
                  <p className="text-sm font-black opacity-80">Performance</p>
                  <h4 className="mt-2 text-5xl font-black">
                    {bestScore.score}
                  </h4>
                  <p className="mt-2 font-bold">
                    {bestScore.points} points gagnés
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  {recentScores.map((item) => (
                    <div
                      key={item.theme}
                      className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                    >
                      <div>
                        <p className="font-bold">{item.label}</p>
                        <p className="text-xs text-zinc-500">
                          {item.played ? item.score : "Pas encore joué"}
                        </p>
                      </div>
                      <p className="text-sm font-black text-red-400">
                        {item.points} pts
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Theme selection */}
        <div className="mt-16">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-bold text-red-400">Thèmes disponibles</p>
              <h3 className="mt-2 text-3xl font-black">
                Sélectionne ton entraînement
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                Chaque thème contient des questions visuelles pensées pour être
                rapides, simples à comprendre et utiles pour progresser avant
                les tournois.
              </p>
            </div>

            <a
              href="/leaderboard"
              className="rounded-2xl border border-red-400/30 px-5 py-3 text-center font-bold text-red-400 transition hover:bg-red-500 hover:text-black"
            >
              Voir classement
            </a>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className={`group rounded-[2rem] border border-zinc-800 bg-gradient-to-br ${theme.color} p-6 transition hover:-translate-y-2 hover:border-red-400/60`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/15 text-4xl">
                    {theme.icon}
                  </div>
                  <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-black text-red-300">
                    {theme.questions}
                  </span>
                </div>

                <h4 className="mt-8 text-2xl font-black group-hover:text-red-400 transition">
                  {theme.title}
                </h4>

                <p className="mt-3 min-h-[72px] text-sm leading-6 text-zinc-400">
                  {theme.description}
                </p>

                <div className="mt-5 flex items-center justify-between rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3">
                  <span className="text-sm text-zinc-400">Difficulté</span>
                  <span className="text-sm font-bold text-red-400">
                    {theme.difficulty}
                  </span>
                </div>

                <a
                  href={`/training/${theme.id}`}
                  className="mt-6 block rounded-2xl bg-red-500 px-5 py-4 text-center font-black text-black shadow-lg shadow-red-500/20 transition hover:bg-red-400"
                >
                  Commencer
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Rules / benefits */}
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <h4 className="text-xl font-black text-red-400">Aucun risque</h4>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              L’entraînement est gratuit. Tu peux tester les thèmes sans utiliser
              tes coins ni tes tickets.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <h4 className="text-xl font-black text-red-400">
              Scores conservés
            </h4>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Tes meilleurs scores d’entraînement sont sauvegardés localement
              sur ton appareil pour suivre ta progression.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <h4 className="text-xl font-black text-red-400">
              Préparation tournoi
            </h4>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Entraîne-toi avant d’entrer dans une vraie arène contre d’autres
              joueurs.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}