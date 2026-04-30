export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-120px] right-[-120px] h-[320px] w-[320px] rounded-full bg-yellow-400/20 blur-3xl" />
        <div className="absolute bottom-[-140px] left-[-120px] h-[360px] w-[360px] rounded-full bg-yellow-500/10 blur-3xl" />
      </div>

      {/* Navbar */}
      <header className="relative z-10 border-b border-yellow-400/20 bg-black/70 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-black shadow-lg shadow-yellow-400/20">
              Q
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">
                Quiz<span className="text-yellow-400">Arena</span>
              </h1>
              <p className="text-xs text-zinc-400">
                Tournois quiz compétitifs
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-6 text-sm text-zinc-300 md:flex">
            <a href="#how" className="hover:text-yellow-400 transition">
              Comment jouer
            </a>
            <a href="#modes" className="hover:text-yellow-400 transition">
              Modes
            </a>
            <a href="#pricing" className="hover:text-yellow-400 transition">
              Tournois
            </a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="rounded-xl border border-yellow-400/30 px-4 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-400 hover:text-black"
            >
              Connexion
            </a>
            <a
              href="/register"
              className="hidden rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 sm:inline-block"
            >
              Inscription
            </a>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div>
          <div className="mb-5 inline-flex items-center rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm font-semibold text-yellow-300">
            Tournois sponsorisés bientôt disponibles
          </div>

          <h2 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
            Défie les autres. <br />
            Réponds vite. <br />
            <span className="text-yellow-400">Grimpe au classement.</span>
          </h2>

          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">
            QuizArena est une plateforme de tournois quiz rapides où 5 joueurs
            s’affrontent sur des catégories simples comme les drapeaux, le
            football et les marques connues. Les meilleurs scores remportent des
            récompenses.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="/register"
              className="rounded-2xl bg-yellow-400 px-7 py-4 text-center font-black text-black shadow-xl shadow-yellow-400/20 transition hover:scale-[1.02] hover:bg-yellow-300"
            >
              Commencer maintenant
            </a>
            <a
              href="/login"
              className="rounded-2xl border border-zinc-700 px-7 py-4 text-center font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400"
            >
              J’ai déjà un compte
            </a>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 max-w-lg">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-2xl font-black text-yellow-400">5</p>
              <p className="text-xs text-zinc-400">joueurs par tournoi</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-2xl font-black text-yellow-400">10</p>
              <p className="text-xs text-zinc-400">questions rapides</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-2xl font-black text-yellow-400">50</p>
              <p className="text-xs text-zinc-400">GDS entrée standard</p>
            </div>
          </div>
        </div>

        {/* Hero card */}
        <div className="relative">
          <div className="absolute inset-0 rounded-[2rem] bg-yellow-400/20 blur-2xl" />
          <div className="relative rounded-[2rem] border border-yellow-400/20 bg-zinc-950 p-5 shadow-2xl">
            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Tournoi du soir</p>
                  <h3 className="text-2xl font-black">Drapeaux Battle</h3>
                </div>
                <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-black">
                  5 places
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { name: "Kev", score: "920 pts", rank: "1" },
                  { name: "Mika", score: "870 pts", rank: "2" },
                  { name: "Sarah", score: "810 pts", rank: "3" },
                  { name: "Jay", score: "760 pts", rank: "4" },
                  { name: "Rony", score: "690 pts", rank: "5" },
                ].map((player) => (
                  <div
                    key={player.rank}
                    className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 font-black text-black">
                        {player.rank}
                      </div>
                      <p className="font-bold">{player.name}</p>
                    </div>
                    <p className="text-sm font-bold text-yellow-400">
                      {player.score}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-yellow-400 p-4 text-black">
                <p className="text-sm font-bold">Récompenses</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-black">1er : 200 GDS</span>
                  <span className="font-black">2e : Ticket</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to play */}
      <section id="how" className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <div className="max-w-2xl">
          <p className="font-bold text-yellow-400">Comment jouer</p>
          <h2 className="mt-2 text-3xl font-black md:text-4xl">
            Simple, rapide et compétitif.
          </h2>
          <p className="mt-4 text-zinc-400">
            QuizArena est pensé pour être compris en quelques secondes.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {[
            {
              title: "1. Crée ton compte",
              text: "Inscris-toi avec tes informations de base et ton numéro MonCash pour les paiements.",
            },
            {
              title: "2. Choisis un tournoi",
              text: "Rejoins un tournoi drapeaux, football ou marques selon ton niveau.",
            },
            {
              title: "3. Réponds vite",
              text: "Chaque bonne réponse compte. En cas d’égalité, le joueur le plus rapide passe devant.",
            },
            {
              title: "4. Gagne ou progresse",
              text: "Les meilleurs gagnent. Les autres gagnent XP, points cashback et progression.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6 transition hover:-translate-y-1 hover:border-yellow-400/50"
            >
              <h3 className="text-lg font-black text-yellow-400">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Modes */}
      <section id="modes" className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Entraînement gratuit",
              description:
                "Joue sans payer, améliore ton score, gagne de l’expérience et prépare-toi pour les vrais tournois.",
              tag: "Gratuit",
            },
            {
              title: "Tournois 5 joueurs",
              description:
                "Affronte 4 autres joueurs dans des quiz rapides. Le score dépend des bonnes réponses et de la vitesse.",
              tag: "Principal",
            },
            {
              title: "Classement",
              description:
                "Monte dans le classement quotidien, hebdomadaire et mensuel pour prouver ton niveau.",
              tag: "Compétition",
            },
            {
              title: "Tournois sponsorisés",
              description:
                "Des tournois gratuits financés par 4infiny ou des partenaires pour permettre aux joueurs de gagner.",
              tag: "Événement",
            },
            {
              title: "Cashback & tickets",
              description:
                "Même quand tu perds, tu peux gagner des points transformables en tickets de tournoi.",
              tag: "Progression",
            },
            {
              title: "Duel 1v1",
              description:
                "Crée une salle, partage le code et affronte un ami dans un duel rapide. Disponible plus tard.",
              tag: "Bientôt",
            },
          ].map((mode) => (
            <div
              key={mode.title}
              className="group rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-6 transition hover:border-yellow-400/60"
            >
              <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-400">
                {mode.tag}
              </span>
              <h3 className="mt-5 text-xl font-black group-hover:text-yellow-400 transition">
                {mode.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {mode.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing / tournaments */}
      <section id="pricing" className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <div className="rounded-[2rem] border border-yellow-400/20 bg-zinc-950 p-6 md:p-10">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="font-bold text-yellow-400">Prix & tournois</p>
              <h2 className="mt-2 text-3xl font-black md:text-4xl">
                Un modèle simple et transparent.
              </h2>
              <p className="mt-5 leading-7 text-zinc-400">
                Au lancement, QuizArena proposera des tournois sponsorisés par
                4infiny. Ensuite, les joueurs pourront rejoindre des tournois
                standards avec une entrée de 50 GDS ou avec un ticket gagné.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-black p-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-xl font-black">Tournoi standard</h3>
                  <p className="text-sm text-zinc-400">5 joueurs maximum</p>
                </div>
                <span className="rounded-2xl bg-yellow-400 px-4 py-2 font-black text-black">
                  50 GDS
                </span>
              </div>

              <div className="mt-5 space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Pot total</span>
                  <span className="font-bold">250 GDS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">1er gagnant</span>
                  <span className="font-bold text-yellow-400">200 GDS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">2e place</span>
                  <span className="font-bold">Ticket gratuit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Autres joueurs</span>
                  <span className="font-bold">XP + cashback</span>
                </div>
              </div>

              <a
                href="/register"
                className="mt-6 block rounded-2xl bg-yellow-400 px-5 py-4 text-center font-black text-black transition hover:bg-yellow-300"
              >
                Rejoindre QuizArena
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust / payments */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-xl font-black text-yellow-400">
              Paiement MonCash
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Les dépôts et retraits seront gérés via MonCash au début, avec
              validation manuelle pour plus de contrôle.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-xl font-black text-yellow-400">
              Règles claires
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Chaque tournoi affiche son entrée, ses prix, son nombre de places
              et son fonctionnement avant l’inscription.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-xl font-black text-yellow-400">
              Historique visible
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Les gagnants, scores, tickets, coins et retraits seront suivis
              dans le compte joueur.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-5 py-16">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-yellow-400/30 bg-yellow-400 p-8 text-center text-black md:p-12">
          <h2 className="text-3xl font-black md:text-5xl">
            Prêt à entrer dans l’arène ?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-semibold">
            Crée ton compte, entraîne-toi gratuitement et prépare-toi pour les
            premiers tournois sponsorisés par 4infiny.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/register"
              className="rounded-2xl bg-black px-7 py-4 font-black text-yellow-400 transition hover:scale-[1.02]"
            >
              Créer un compte
            </a>
            <a
              href="/login"
              className="rounded-2xl border border-black px-7 py-4 font-black text-black transition hover:bg-black hover:text-yellow-400"
            >
              Se connecter
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-zinc-500 md:flex-row">
          <p>
            © 2026 QuizArena. Propulsé par{" "}
            <span className="font-bold text-yellow-400">4infiny</span>.
          </p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-yellow-400">
              Règles
            </a>
            <a href="#" className="hover:text-yellow-400">
              Confidentialité
            </a>
            <a href="#" className="hover:text-yellow-400">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}