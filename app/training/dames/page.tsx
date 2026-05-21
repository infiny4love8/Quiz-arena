"use client";

export default function TankArenaPage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-zinc-950 p-8 text-center shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-400">
          Jeu de Dames
        </p>

        <h1 className="mt-3 text-4xl font-black md:text-6xl">
          Lance la partie
        </h1>

        <p className="mt-4 text-zinc-400 leading-7">
          Ton jeu HTML est prêt. Clique sur jouer pour ouvrir le fichier.
        </p>

        <a
          href="/dame.html"
          className="mt-8 inline-flex rounded-2xl bg-red-500 px-8 py-4 text-lg font-black text-black transition hover:bg-red-400"
        >
          Jouer
        </a>
      </div>
    </main>
  );
}