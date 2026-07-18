import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ZonArena — Tournois sponsorisés, gains en Gourdes",
  description:
    "Participe à des tournois sponsorisés gratuits ou Pro, défie tes amis en duel 1v1 et gagne des Gourdes. Retraits rapides via MonCash.",
  openGraph: {
    title: "ZonArena — Entre dans l'Arène",
    description:
      "Tournois sponsorisés, duels 1v1 et gains en Gourdes. Retraits via MonCash.",
    type: "website",
  },
};

type LogoProps = {
  width?: number;
  height?: number;
};

// Sorti du composant HomePage pour éviter d'être recréé à chaque rendu
const MonCashLogo = ({ width = 72, height = 28 }: LogoProps) => (
  // viewBox élargi (avec offset négatif) pour englober les coordonnées
  // négatives du path ci-dessous, qui étaient coupées auparavant
  <svg width={width} height={height} viewBox="-2 -2 76 32" role="img" aria-label="MonCash">
    <path
      d="M4,1 Q0,-1 -1,5 L-1,22 Q0,28 4,26 Q28,18 52,14 Q57,12 52,10 Q28,6 4,1 Z"
      fill="#cc1c2e"
      stroke="#cc1c2e"
      strokeWidth="4"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <text x="6" y="17" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="900" fill="white">
      MON
    </text>
    <text x="60" y="19" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="900" fill="#777">
      cash
    </text>
  </svg>
);

export default function HomePage() {
  const stats = [
    { icon: "👥", label: "Joueurs inscrits", value: "52" },
    { icon: "✅", label: "Retraits effectués", value: "26" },
    { icon: "💸", label: "Déjà distribués", value: "6,125 GDS" },
    { icon: "🎮", label: "Jeux disponibles", value: "4" },
  ];

  const winners = [
    { name: "Jean M.", amount: "250 GDS", game: "Quiz Drapeaux" },
    { name: "Nadia P.", amount: "200 GDS", game: "Mémoire" },
    { name: "Daniel S.", amount: "220 GDS", game: "Tournoi Pro" },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      <div className="overflow-hidden border-b border-yellow-400/20 bg-[#08130D]">
        <div
          className="flex w-max marquee-track"
          style={{ animation: "zonarenaMarquee 24s linear infinite" }}
        >
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="flex shrink-0 items-center gap-6 whitespace-nowrap px-6 py-2.5 text-sm"
              aria-hidden={copy === 1}
            >
              <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-black text-green-400">
                GRATUIT
              </span>
              <span className="font-bold text-white">Tournois sponsorisés</span>
              <span className="font-black text-yellow-400">8h • 12h • 18h</span>
              <span className="text-zinc-300">Gagne jusqu&apos;à 250 GDS</span>
              <span className="text-zinc-500">Retraits MonCash</span>
              <span className="text-zinc-300">Duel 1v1</span>
              <span className="text-yellow-400">Joue • Progresse • Gagne</span>
            </div>
          ))}
        </div>

        <style>
          {`
            @keyframes zonarenaMarquee {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
            @media (prefers-reduced-motion: reduce) {
              .marquee-track {
                animation: none !important;
              }
            }
          `}
        </style>
      </div>

      <header className="border-b border-yellow-400/15 bg-[#0a0a0a]/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-base font-black text-black shadow-lg shadow-yellow-400/20">
              Z
            </div>
            <span className="text-lg font-black tracking-tight">
              Zon<span className="text-yellow-400">Arena</span>
            </span>
          </div>

          <div className="hidden items-center gap-6 text-sm text-zinc-500 md:flex">
            <a href="#modes" className="transition hover:text-yellow-400">Tournois</a>
            <a href="#duel" className="transition hover:text-yellow-400">Duel</a>
            <a href="#preuves" className="transition hover:text-yellow-400">Gagnants</a>
            <a href="#confidentialite" className="transition hover:text-yellow-400">Sécurité</a>
          </div>

          <div className="flex items-center gap-3">
            <a href="/login" className="rounded-xl border border-yellow-400/40 px-4 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-400 hover:text-black">
              Connexion
            </a>
            <a href="/register" className="hidden rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black transition hover:bg-yellow-300 sm:inline-block">
              Inscription
            </a>
          </div>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-5xl gap-12 px-8 py-14 md:grid-cols-2 md:items-center md:py-20">
        <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />

        <div className="relative">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-green-400/30 bg-green-400/10 px-4 py-2 text-sm font-black text-green-400">
            <span aria-hidden="true">🟢</span> Tournois sponsorisés · gains en Gourdes
          </div>

          <h1 className="text-5xl font-black leading-[1.08] tracking-tight md:text-6xl">
            Entre dans<br />
            <span className="text-yellow-400">l'Arène.</span>
          </h1>

          <div className="mt-5 space-y-2 text-[18px] font-bold text-zinc-300">
            <p><span aria-hidden="true">🎁</span> Tournois sponsorisés GRATUITS</p>
             <p><span aria-hidden="true">🎁</span> Tournois Pro disponible</p>
            <p><span aria-hidden="true">💰</span> Gagne de L'argent</p>
            <p><span aria-hidden="true">⚔️</span> Défie tes amis en Duel</p>
          </div>

          <p className="mt-5 max-w-sm text-[16px] font-medium leading-relaxed text-zinc-400">
            Participe à des tournois, progresse dans les jeux, gagne des Gourdes et retire tes gains via MonCash.
          </p>

          <div className="mt-7 flex gap-3">
            <a href="/register" className="rounded-xl bg-yellow-400 px-6 py-3.5 text-sm font-black text-black transition hover:scale-[1.03] hover:bg-yellow-300">
              Créer mon compte
            </a>
            <a href="/login" className="rounded-xl border border-zinc-700 px-6 py-3.5 text-sm font-semibold text-zinc-400 transition hover:border-yellow-400/40 hover:text-yellow-400">
              Connexion
            </a>
          </div>

          <div className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2.5">
            <MonCashLogo />
            <span className="text-[13px] font-medium text-zinc-300">Paiements & retraits MonCash</span>
            <span className="text-zinc-600">·</span>
            <span className="text-[13px] font-medium text-zinc-400">Retrait min. 250 GDS</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 rounded-[2rem] bg-yellow-400/10 blur-2xl" />
          <div className="relative rounded-[1.5rem] border border-yellow-400/20 bg-zinc-950 p-4 shadow-2xl transition hover:-translate-y-1">
            <div className="rounded-[1.2rem] border border-zinc-800 bg-black p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-600">Prochain tournoi</p>
                  <h3 className="text-lg font-black"><span aria-hidden="true">⚑</span> Drapeaux Battle</h3>
                </div>
                <div className="text-right">
                  <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-black text-green-400">
                    GRATUIT
                  </span>
                  <p className="mt-2 text-[11px] font-semibold text-zinc-500">
                    1 ticket sponsorisé requis
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { name: "Nidia", score: "920 pts", rank: "1", top: true },
                  { name: "Lauradieu", score: "870 pts", rank: "2", top: false },
                  { name: "Schneider", score: "810 pts", rank: "3", top: false },
                  { name: "Jonathan", score: "760 pts", rank: "4", top: false },
                ].map((p) => (
                  <div key={p.rank} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${p.top ? "border-yellow-400/40 bg-zinc-950" : "border-zinc-800 bg-zinc-950"}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${p.top ? "bg-yellow-400 text-black" : "bg-zinc-800 text-zinc-500"}`}>
                        {p.rank}
                      </div>
                      <span className="text-sm font-semibold text-zinc-300">{p.name}</span>
                    </div>
                    <span className="text-xs font-bold text-yellow-400">{p.score}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-yellow-400 px-4 py-3 text-black">
                <span className="text-xs font-bold">1er</span>
                <span className="font-black">250 GDS</span>
                <span className="text-xs font-bold">2e → Ticket</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-8 pb-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-center transition hover:-translate-y-1 hover:border-yellow-400/30">
              <div className="text-2xl" aria-hidden="true">{s.icon}</div>
              <p className="mt-2 text-2xl font-black text-yellow-400">{s.value}</p>
              <p className="mt-1 text-xs font-semibold text-zinc-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-5xl border-t border-zinc-900" />

      <section id="modes" className="mx-auto max-w-5xl px-8 py-14">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-yellow-400">modes de jeu</p>
        <h2 className="mb-8 text-2xl font-black tracking-tight">Choisis ton arène</h2>

        <div className="grid gap-3 md:grid-cols-4">
          {[
            { tag: "GRATUIT", name: "Tournois sponsorisés", desc: "Utilise 1 ticket sponsorisé et tente de gagner jusqu'à 250 GDS.", color: "green" },
            { tag: "PRO", name: "Tournois Pro", desc: "50 GDS d'entrée. Le meilleur score remporte le gros lot.", color: "yellow" },
            { tag: "1V1", name: "Duel entre amis", desc: "Défie un ami pour le fun ou avec une mise en Gourdes.", color: "blue" },
            { tag: "TRAINING", name: "Entraînement", desc: "Améliore ton score avant les tournois.", color: "yellow" },
          ].map((m) => (
            <div key={m.name} className="rounded-2xl border border-yellow-400/25 bg-[#131309] p-5 transition hover:-translate-y-1 hover:border-yellow-400/50">
              <span className={`mb-3 inline-block rounded-full border px-3 py-1 text-xs font-black ${
                m.color === "green"
                  ? "border-green-400/30 bg-green-400/10 text-green-400"
                  : m.color === "blue"
                  ? "border-blue-400/30 bg-blue-400/10 text-blue-400"
                  : "border-yellow-400/20 bg-yellow-400/10 text-yellow-400"
              }`}>
                {m.tag}
              </span>
              <h3 className="mb-2 text-sm font-black text-zinc-100">{m.name}</h3>
              <p className="text-[16px] font-medium leading-relaxed text-zinc-400">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-5xl border-t border-zinc-900" />

      <section id="duel" className="mx-auto max-w-5xl px-8 py-14">
        <div className="rounded-3xl border border-yellow-400/30 bg-yellow-400/5 p-7 md:flex md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-yellow-400">duel 1v1</p>
            <h2 className="text-2xl font-black tracking-tight">Défie un ami en duel</h2>
            <p className="mt-3 max-w-xl text-[17px] font-medium leading-relaxed text-zinc-400">
              Crée un duel, choisis le jeu, invite ton ami et voyez qui fait le meilleur score. Jouez pour le fun ou avec une mise en Gourdes.
            </p>
          </div>
          <a href="/register" className="mt-6 inline-block rounded-xl bg-yellow-400 px-6 py-3.5 text-sm font-black text-black transition hover:scale-[1.03] hover:bg-yellow-300 md:mt-0">
            Commencer
          </a>
        </div>
      </section>

      <div className="mx-auto max-w-5xl border-t border-zinc-900" />

      <section id="preuves" className="mx-auto max-w-5xl px-8 py-14">
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-yellow-400">preuves récentes</p>
          <h2 className="text-2xl font-black tracking-tight">Derniers gagnants</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {winners.map((w) => (
            <div key={w.name} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:-translate-y-1 hover:border-green-400/30">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-2xl" aria-hidden="true">🏆</span>
                <span className="rounded-full bg-green-400/10 px-3 py-1 text-xs font-black text-green-400">Payé</span>
              </div>
              <h3 className="text-sm font-black text-zinc-100">{w.name}</h3>
              <p className="mt-1 text-xs text-zinc-500">{w.game}</p>
              <p className="mt-4 text-2xl font-black text-yellow-400">{w.amount}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="confidentialite" className="mx-auto max-w-5xl px-8 py-14">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-yellow-400">confidentialité & sécurité</p>
          <h2 className="text-xl font-black tracking-tight">ZonArena protège vos informations</h2>
          <p className="mt-3 text-[15px] font-medium leading-relaxed text-zinc-400">
            ZonArena collecte uniquement les informations nécessaires au fonctionnement du compte, des tournois,
            des dépôts et des retraits MonCash. Vos données ne sont pas revendues. La plateforme est basée sur
            des jeux de compétition et de score, pas sur le hasard.
          </p>
          <p className="mt-3 text-[13px] text-zinc-500">
            Contact :{" "}
            <a href="mailto:zonarena41@gmail.com" className="font-bold text-yellow-400 hover:text-yellow-300">
              zonarena41@gmail.com
            </a>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-8 pb-16">
        <div className="flex flex-col gap-6 rounded-2xl bg-yellow-400 px-8 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-black">Prêt à entrer dans l'arène ?</h2>
            <p className="mt-1 text-[17px] font-medium text-black/60">
              Inscris-toi, récupère tes tickets gratuits et rejoins le prochain tournoi.
            </p>
          </div>
          <a href="/register" className="rounded-xl bg-black px-6 py-3.5 text-center text-sm font-black text-yellow-400 transition hover:scale-[1.03] hover:bg-zinc-900">
            Créer un compte
          </a>
        </div>
      </section>

      <footer className="border-t border-zinc-900 px-8 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 text-xs text-zinc-600 md:flex-row md:items-center md:justify-between">
          <span>
            © 2026 ZonArena — propulsé par <span className="font-black text-yellow-400">4infiny</span>
          </span>
          <div className="flex flex-wrap gap-5">
            <a href="#modes" className="transition hover:text-yellow-400">Tournois</a>
            <a href="#duel" className="transition hover:text-yellow-400">Duel</a>
            <a href="#confidentialite" className="transition hover:text-yellow-400">Confidentialité</a>
            <a href="mailto:zonarena41@gmail.com" className="transition hover:text-yellow-400">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}