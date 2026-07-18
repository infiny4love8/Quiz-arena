"use client";

import { useEffect, useState, useRef } from "react";

type TrainingScore = {
  theme: string;
  label: string;
  score: string;
  points: number;
  played: boolean;
};

export default function TrainingPage() {
  const [recentScores, setRecentScores] = useState<TrainingScore[]>([]);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const bgMusic = new Audio("/sounds/training-bg.mp3");
    bgMusic.loop = true;
    bgMusic.volume = 0.2;
    audioRef.current = bgMusic;

    const defaultScores: TrainingScore[] = [
      { theme: "flags",     label: "Quiz Drapeaux", score: "0/10", points: 0, played: false },
      { theme: "memory",    label: "Mémoire",        score: "0/10", points: 0, played: false },
      { theme: "cards",     label: "Trouver les paires", score: "0/10", points: 0, played: false },
      { theme: "tankarena", label: "Tank Arena",      score: "0/10", points: 0, played: false },
    ];

    const savedScores = defaultScores.map((item) => {
      const saved = localStorage.getItem(`training_score_${item.theme}`);
      if (!saved) return item;
      try {
        const parsed = JSON.parse(saved);
        return { ...item, score: parsed.score || "0/10", points: parsed.points || 0, played: true };
      } catch {
        return item;
      }
    });

    setRecentScores(savedScores);

    return () => {
      bgMusic.pause();
    };
  }, []);

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicPlaying) {
      audio.pause();
      setMusicPlaying(false);
    } else {
      audio.play().catch(() => {});
      setMusicPlaying(true);
    }
  };

  const themes = [
    {
      id: "flags",
      title: "Quiz Drapeaux",
      description: "Reconnais les drapeaux du monde entier.",
      difficulty: "Facile",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqSl1xsDQw0huJ4yFYWTkXCH9E9JkmdfoJxA&s",
      accent: "from-blue-500 to-cyan-400",
    },
    {
      id: "memory",
      title: "Mémoire",
      description: "Teste ta concentration et ta mémoire.",
      difficulty: "Mental",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
      accent: "from-violet-500 to-fuchsia-500",
    },
    {
      id: "tankarena",
      title: "Tank Arena",
      description: "Détruis les ennemis et bats le boss.",
      difficulty: "Hardcore",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSv8QPF9WPUhGhg9-9HxOocOsu2F8uNAN3odQ&s",
      accent: "from-orange-500 to-red-500",
    },
    {
      id: "dames",
      title: "Jeu de Dames",
      description: "Le classique stratégique intemporel.",
      difficulty: "Tactique",
      image: "https://le-palais-des-echecs.com/wp-content/uploads/2022/10/Jeu-de-dame.png",
      accent: "from-yellow-500 to-amber-500",
    },
    {
      id: "cards",
      title: "Trouver les paires",
      description: "Fun, style et simple.",
      difficulty: "Mental",
      image: "https://store-images.s-microsoft.com/image/apps.24863.14090654178473619.aa2706f7-9244-4d37-b59f-3f87f7589476.44b1110d-8322-4f98-8c36-7611764453ce?w=207",
      accent: "from-pink-500 to-rose-400",
    },
  ];

  return (
    <main className="min-h-screen bg-[#070707] text-white overflow-hidden">
      {/* BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1f2937_0%,#070707_55%)]" />
        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-black/40 border-b border-white/10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-xl font-black shadow-lg">
              Z
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Zonarena</h1>
              <p className="text-xs sm:text-sm text-zinc-400">Training Center</p>
            </div>
          </a>

          <div className="flex items-center gap-3">
            {/* BOUTON MUSIQUE */}
            <button
              onClick={toggleMusic}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all duration-300 text-sm font-semibold"
              title={musicPlaying ? "Couper la musique" : "Lancer la musique"}
            >
              {musicPlaying ? "🔊" : "🔇"}
            </button>

            <a
              href="/dashboard"
              className="hidden sm:inline-flex px-5 py-2.5 rounded-2xl border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all duration-300 text-sm font-semibold"
            >
              Dashboard
            </a>
            <a
              href="/tournaments"
              className="hidden sm:inline-flex px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-black font-black hover:scale-105 transition-all duration-300 shadow-xl"
            >
              Tournois
            </a>
          </div>
        </nav>
      </header>

      {/* HERO COMPACT */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 sm:pt-14 sm:pb-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/20 bg-red-500/10 text-red-300 text-sm font-semibold mb-4">
            ⚡ Centre d&apos;entraînement
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Choisis ton jeu
          </h1>
          <p className="mt-3 text-zinc-400 text-sm sm:text-lg leading-relaxed max-w-2xl">
            Entraîne-toi, améliore tes scores et prépare-toi pour les tournois.
          </p>
        </div>
      </section>

      {/* TITRE JEUX */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-5 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black mb-2">Jeux disponibles</h2>
          <p className="text-zinc-400 text-sm sm:text-base">Lance une partie et bats ton meilleur score.</p>
        </div>
      </section>

      {/* GAME CARDS */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
          {themes.map((theme, index) => {
            const currentScore = recentScores.find((s) => s.theme === theme.id);
            return (
              <a
                key={theme.id}
                href={`/training/${theme.id}`}
                className="group relative overflow-hidden rounded-2xl sm:rounded-[32px] border border-white/10 bg-zinc-900/60 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-white/30"
              >
                {/* IMAGE */}
                <div className="relative h-44 sm:h-56 md:h-64 overflow-hidden">
                  <img
                    src={theme.image}
                    alt={theme.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  <div className={`absolute top-4 left-4 bg-gradient-to-r ${theme.accent} px-4 py-2 rounded-full text-sm font-black shadow-lg`}>
                    {theme.difficulty}
                  </div>
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-sm font-black">
                    0{index + 1}
                  </div>
                </div>

                {/* CONTENT */}
                <div className="p-5 sm:p-7">
                  <div className="mb-5">
                    <h3 className="text-2xl sm:text-3xl font-black mb-2 sm:mb-3">{theme.title}</h3>
                    <p className="text-zinc-400 leading-relaxed">{theme.description}</p>
                  </div>
                  <div className="flex items-center justify-between mb-5 sm:mb-7">
                    <div>
                      <p className="text-zinc-500 text-sm mb-1">Score</p>
                      <p className="text-xl sm:text-2xl font-black">{currentScore?.score || "0/10"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-500 text-sm mb-1">Points</p>
                      <p className="text-xl sm:text-2xl font-black text-green-400">{currentScore?.points || 0}</p>
                    </div>
                  </div>
                  <div className={`w-full rounded-2xl bg-gradient-to-r ${theme.accent} py-3.5 sm:py-4 text-center text-sm sm:text-lg font-black shadow-xl transition-all duration-300 group-hover:scale-[1.02]`}>
                    JOUER MAINTENANT
                  </div>
                </div>

                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${theme.accent}`} />
              </a>
            );
          })}
        </div>
      </section>

      {/* HISTORIQUE — EN BAS DE PAGE */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="rounded-2xl sm:rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-5 sm:p-8">
          <h3 className="text-2xl sm:text-3xl font-black mb-5 sm:mb-8">📈 Historique</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {recentScores.map((item) => (
              <div
                key={item.theme}
                className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-white/5 bg-black/20 px-4 py-3.5 sm:px-5 sm:py-4 hover:border-white/20 transition-all duration-300"
              >
                <div>
                  <p className="font-bold text-base sm:text-lg">{item.label}</p>
                  <p className="text-zinc-500 text-xs sm:text-sm">
                    {item.played ? item.score : "Pas encore joué"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-black text-lg sm:text-xl">{item.points}</p>
                  <p className="text-zinc-500 text-xs sm:text-sm">points</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}