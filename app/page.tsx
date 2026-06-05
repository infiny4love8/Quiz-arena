export default function HomePage() {
  const MonCashLogo = ({ width = 72, height = 28 }) => (
    <svg width={width} height={height} viewBox="0 0 72 28">
      <path
        d="M4,1 Q0,-1 -1,5 L-1,22 Q0,28 4,26 Q28,18 52,14 Q57,12 52,10 Q28,6 4,1 Z"
        fill="#cc1c2e" stroke="#cc1c2e" strokeWidth="4"
        strokeLinejoin="round" strokeLinecap="round"
      />
      <text x="6" y="17" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="900" fill="white" letterSpacing="0.5">MON</text>
      <text x="60" y="19" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="900" fill="#777" letterSpacing="-0.3">cash</text>
    </svg>
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-sans">

      {/* Navbar */}
      <header className="border-b border-yellow-400/15 bg-[#0a0a0a]/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-base font-black text-black">Z</div>
            <span className="text-lg font-black tracking-tight">Zon<span className="text-yellow-400">arena</span></span>
          </div>
          <div className="hidden items-center gap-6 text-sm text-zinc-500 md:flex">
            <a href="#modes" className="hover:text-yellow-400 transition">Tournois</a>
            <a href="#steps" className="hover:text-yellow-400 transition">Classement</a>
            <a href="#steps" className="hover:text-yellow-400 transition">Entraînement</a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="rounded-xl border border-yellow-400/40 px-4 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-400 hover:text-black">Connexion</a>
            <a href="/register" className="hidden rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black transition hover:bg-yellow-300 sm:inline-block">Inscription</a>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-5xl gap-12 px-8 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm font-semibold text-yellow-300">
            <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
            Tournois pro bientot disponibles
          </div>
          <h1 className="text-5xl font-black leading-[1.08] tracking-tight md:text-6xl">
            Joue.<br />Gagne.<br /><span className="text-yellow-400">Domine.</span>
          </h1>
          <p className="mt-5 text-[18px] leading-relaxed text-zinc-300 font-medium max-w-sm">
            Tournois  compétitifs .<br />
            Fais les meilleurs scores, réponds vite,<br />
            remporte des récompenses.
          </p>
          <div className="mt-7 flex gap-3">
            <a href="/register" className="flex items-center gap-2 rounded-xl bg-yellow-400 px-6 py-3.5 text-sm font-black text-black transition hover:bg-yellow-300 hover:scale-[1.02]">
              🏆 Rejoindre l'arène
            </a>
            <a href="/login" className="rounded-xl border border-zinc-700 px-6 py-3.5 text-sm font-semibold text-zinc-400 transition hover:border-yellow-400/40 hover:text-yellow-400">
              Connexion
            </a>
          </div>
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2.5">
            <MonCashLogo width={72} height={28} />
            <span className="text-[13px] text-zinc-300 font-medium">Paiement disponible tous les jours</span>
            <span className="text-zinc-600">·</span>
            <span className="text-[13px] text-zinc-400 font-medium">Retrait 250 GDS minimum</span>
          </div>
        </div>

        {/* Live card */}
        <div className="relative">
          <div className="absolute inset-0 rounded-[2rem] bg-yellow-400/10 blur-2xl" />
          <div className="relative rounded-[1.5rem] border border-yellow-400/20 bg-zinc-950 p-4 shadow-2xl">
            <div className="rounded-[1.2rem] border border-zinc-800 bg-black p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-600">En direct</p>
                  <h3 className="text-lg font-black">⚑ Drapeaux Battle</h3>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 text-xs font-black text-yellow-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  EN DIRECT
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { name: "Nidia", score: "920 pts", rank: "1", top: true },
                  { name: "Lauradieu", score: "870 pts", rank: "2", top: false },
                  { name: "Schneider", score: "810 pts", rank: "3", top: false },
                  { name: "Jonathan", score: "760 pts", rank: "4", top: false },
                  { name: "Jean", score: "690 pts", rank: "5", top: false },
                ].map((p) => (
                  <div key={p.rank} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${p.top ? "border-yellow-400/40 bg-zinc-950" : "border-zinc-800 bg-zinc-950"}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${p.top ? "bg-yellow-400 text-black" : "bg-zinc-800 text-zinc-500"}`}>{p.rank}</div>
                      <span className="text-sm font-semibold text-zinc-300">{p.name}</span>
                    </div>
                    <span className="text-xs font-bold text-yellow-400">{p.score}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-yellow-400 px-4 py-3 text-black">
                <span className="text-xs font-bold">1er place</span>
                <span className="font-black">200- 400GDS</span>
                <span className="text-xs font-bold">2e → Ticket</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-5xl border-t border-zinc-900" />

      {/* Modes */}
      <section id="modes" className="mx-auto max-w-5xl px-8 py-16">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-yellow-400">modes de jeu</p>
        <h2 className="mb-8 text-2xl font-black tracking-tight">Deux façons de gagner</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { tag: "Compétitif", tagColor: "yellow", name: "Tournois Pro", desc: "50 GDS d'entrée. 5-10 joueurs. Fais le meilleur score, remporte 220-400 GDS.", featured: true },
            { tag: "Gratuit · chaque jour", tagColor: "green", name: "Tournois sponsorisés", desc: "Entrée 100% gratuite financée par 4infiny. Des opportunités de gain tous les jours.", featured: true },
            { tag: "Classement", tagColor: "yellow", name: "Classement global", desc: "Quotidien, hebdo, mensuel. Prouve que tu es le meilleur.", featured: false },
            { tag: "Progression", tagColor: "yellow", name: "Cashback & tickets", desc: "Même en perdant tu gagnes du cashback et des tickets pour les tournois sponsorisés.", featured: false },
            { tag: "Entraînement", tagColor: "gray", name: "Mode entraînement", desc: "Maîtrise les jeux avant de te lancer. Pratique libre sans mise.", featured: false },
            { tag: "Bientôt", tagColor: "gray", name: "Duel 1v1", desc: "Crée une salle privée et affronte un ami en direct.", featured: false },
          ].map((m) => (
            <div key={m.name} className={`rounded-2xl border p-5 transition hover:-translate-y-0.5 ${m.featured ? "border-yellow-400/30 bg-[#131309]" : "border-zinc-800 bg-zinc-950"}`}>
              <span className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-black border ${
                m.tagColor === "yellow" ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/20" :
                m.tagColor === "green" ? "bg-green-400/10 text-green-400 border-green-400/20" :
                "bg-zinc-800/50 text-zinc-500 border-zinc-700"
              }`}>{m.tag}</span>
              <h3 className="mb-2 text-sm font-black text-zinc-100">{m.name}</h3>
              <p className="text-[18px] leading-relaxed text-zinc-400 font-medium">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-5xl border-t border-zinc-900" />

      {/* Rewards */}
      <section className="mx-auto max-w-5xl px-8 py-16">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-yellow-400">récompenses</p>
        <h2 className="mb-8 text-2xl font-black tracking-tight">Tout le monde repart avec quelque chose</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-5">
            <div className="text-2xl mb-3">🥇</div>
            <h3 className="text-sm font-black text-yellow-400 mb-2">1er — Félicitations !</h3>
            <p className="text-[18px] leading-relaxed text-zinc-400 font-medium">Tu as dominé le tournoi. Voilà ta récompense : 250 gds faites votre retrait pour recevoir votre argnt sur votre compte mon cash</p>
          </div>
          <div className="rounded-2xl border border-zinc-600/30 bg-zinc-800/10 p-5">
            <div className="text-2xl mb-3">🥈</div>
            <h3 className="text-sm font-black text-zinc-300 mb-2">2e — Encore bravo !</h3>
            <p className="text-[18px] leading-relaxed text-zinc-400 font-medium">Très bonne performance. Tu remportes un ticket gratuit pour rejoindre le prochain tournoi sponsorise.</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="text-2xl mb-3">🎯</div>
            <h3 className="text-sm font-black text-zinc-500 mb-2">3e – 10e — Pas de souci !</h3>
            <p className="text-[18px] leading-relaxed text-zinc-400 font-medium">Tu gagnes du cashback à chaque partie jouée. Accumule et reviens plus fort au prochain tournoi.</p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-5xl border-t border-zinc-900" />

      {/* Steps */}
      <section id="steps" className="mx-auto max-w-5xl px-8 py-16">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-yellow-400">comment démarrer</p>
        <h2 className="mb-8 text-2xl font-black tracking-tight">En 4 étapes</h2>
        <div className="grid grid-cols-2 gap-0 md:grid-cols-4 divide-x divide-zinc-900">
          {[
            { n: "01", title: "Inscription", desc: "Crée ton compte avec ton numéro MonCash en quelques secondes." },
            { n: "02", title: "Entraîne-toi", desc: "Maîtrise les catégories en mode entraînement avant de jouer pour de vrai." },
            { n: "03", title: "Choisis ton tournoi", desc: "Sponsorisé gratuit ou Pro à 50 GDS — tu peux gagner dans les deux." },
            { n: "04", title: "Gagne", desc: "Réponds vite, fais le meilleur score et remporte GDS, tickets ou cashback." },
          ].map((s) => (
            <div key={s.n} className="p-5">
              <p className="mb-2 text-xs font-black text-yellow-400">{s.n}</p>
              <p className="mb-2 text-sm font-black text-zinc-100">{s.title}</p>
              <p className="text-[18px] leading-relaxed text-zinc-400 font-medium">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-5xl px-8 pb-16">
        <div className="flex items-center justify-between gap-6 rounded-2xl bg-yellow-400 px-10 py-9">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-black">Prêt à entrer dans l'arène ?</h2>
            <p className="mt-1 text-[18px] font-medium text-black/60">Inscris-toi, entraîne-toi, et rejoins un tournoi dès aujourd'hui.</p>
          </div>
          <a href="/register" className="flex-shrink-0 rounded-xl bg-black px-6 py-3.5 text-sm font-black text-yellow-400 transition hover:bg-zinc-900 hover:scale-[1.02]">
            Créer un compte
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 px-8 py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between text-xs text-zinc-600">
          <div className="flex items-center gap-4">
            <span>© 2026 Zonarena — propulsé par <span className="font-black text-yellow-400">4infiny</span></span>
            <MonCashLogo width={72} height={28} />
          </div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-yellow-400 transition">Règles</a>
            <a href="#" className="hover:text-yellow-400 transition">Confidentialité</a>
            <a href="#" className="hover:text-yellow-400 transition">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}