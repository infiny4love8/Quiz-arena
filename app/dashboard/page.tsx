"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UserData = {
  full_name: string;
  coins: number;
  tickets: number;
  level?: number;
  ranking?: number;
  cashback?: number;
  xp?: number;
};

function WelcomeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-md rounded-[20px] border border-yellow-400/35 bg-[#0a0a0f] p-6">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 transition hover:text-white"
        >
          ✕
        </button>

        <div className="mb-5 text-center">
          <div className="mb-2 inline-block text-4xl animate-bounce">🎁</div>
          <h2 className="text-xl font-bold text-yellow-400">
            Bienvenue sur Zonarena
          </h2>
          <div className="mx-auto mt-2 h-0.5 w-10 rounded bg-yellow-400 opacity-50" />
        </div>

        <div className="mb-4 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3">
          <p className="text-sm leading-relaxed text-white">
            🎉 Nous t&apos;offrons{" "}
            <span className="font-semibold text-yellow-400">3 tickets gratuits</span>{" "}
            pour participer aux tournois sponsorisés du lancement.
          </p>
        </div>

        <div className="mb-5 flex flex-col gap-3">
          {[
            ["🎫", "Les tickets servent à rejoindre les tournois sponsorisés."],
            ["🪙", "Les coins servent à rejoindre les tournois Pro. 1 coin = 1 GDS."],
            ["🏆", "Joue, progresse, grimpe et tente de devenir l’un des meilleurs."],
            ["💳", "Tu peux acheter des tickets ou des coins dans Coins / Tickets."],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-lg">{icon}</span>
              <p className="text-sm leading-relaxed text-zinc-400">{text}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 border-t border-white/10 pt-4 text-center">
          <p className="text-xs leading-relaxed text-zinc-600">
            Merci d&apos;avoir choisi Zonarena.
            <br />
            Amuse-toi, progresse et tente de gagner. 🚀
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-xl bg-yellow-400 py-3 text-sm font-bold text-black transition hover:bg-yellow-300"
        >
          C&apos;est parti ! 🎮
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error || !data) {
        router.replace("/login");
        return;
      }

      setUserData(data);

      const key = `zonarena_welcome_seen_${session.user.id}`;
      if (!localStorage.getItem(key)) {
        setShowWelcomeModal(true);
      }

      setLoading(false);
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) loadUser();
      if (event === "SIGNED_OUT") router.replace("/login");
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  const handleCloseWelcome = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      localStorage.setItem(`zonarena_welcome_seen_${session.user.id}`, "true");
    }

    setShowWelcomeModal(false);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const checkPendingDuels = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: pendingDuels } = await supabase
        .from("duels")
        .select("id")
        .eq("player_b", user.id)
        .eq("status", "pending")
        .limit(1);

      if (pendingDuels && pendingDuels.length > 0) {
        router.push(`/duel/${pendingDuels[0].id}/respond`);
      }
    };

    checkPendingDuels();
    interval = setInterval(checkPendingDuels, 3000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [router]);

  if (loading || !userData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050506] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
          <p className="text-zinc-400">Chargement...</p>
        </div>
      </main>
    );
  }

  const xp = Number(userData.xp ?? 0);
  const level = getLevelFromXp(xp);
  const currentLevelXp = getLevelBaseXp(level);
  const nextLevelXp = getNextLevelXp(level);
  const progress = Math.min(
    100,
    Math.max(0, ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100)
  );

  return (
    <main className="min-h-screen bg-[#050506] text-white">
      {showWelcomeModal && <WelcomeModal onClose={handleCloseWelcome} />}

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute right-[-160px] top-[-160px] h-[380px] w-[380px] rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[-120px] h-[420px] w-[420px] rounded-full bg-yellow-500/5 blur-3xl" />
      </div>

      <div className="lg:hidden fixed left-4 top-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-xl border border-yellow-400/30 bg-[#0c0c0e]/90 p-2 backdrop-blur-xl"
        >
          <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-[#3a3220] bg-[#0c0c0e] p-5 lg:hidden">
            <div className="mb-4 flex justify-end">
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-zinc-400">
                ✕
              </button>
            </div>

            <SidebarLogo />

            <div className="mt-6 rounded-2xl border border-[#232326] bg-black/30 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#8a8a92]">
                Connecté
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {userData.full_name}
              </p>
              <p className="mt-1 text-xs text-yellow-400">
                {userData.coins ?? 0} coins · {userData.tickets ?? 0} tickets
              </p>
            </div>

            <nav className="mt-6 flex-1 space-y-2 overflow-y-auto pb-6">
              <MobileNavLink href="/dashboard" active onClick={() => setMobileMenuOpen(false)}>
                Dashboard
              </MobileNavLink>
              <MobileNavLink href="/tournaments/pro" onClick={() => setMobileMenuOpen(false)}>
                Tournois Pro
              </MobileNavLink>
              <MobileNavLink href="/tournamentsponsorise" onClick={() => setMobileMenuOpen(false)}>
                Tournois Sponsorisé
              </MobileNavLink>
              <MobileNavLink href="/duel" onClick={() => setMobileMenuOpen(false)}>
                Duel 1 VS 1
              </MobileNavLink>
              <MobileNavLink href="/training" onClick={() => setMobileMenuOpen(false)}>
                Entraînement
              </MobileNavLink>
              <MobileNavLink href="/withdraw" onClick={() => setMobileMenuOpen(false)}>
                Retrait
              </MobileNavLink>
              <MobileNavLink href="/depot" onClick={() => setMobileMenuOpen(false)}>
                Coins / Tickets
              </MobileNavLink>
              <MobileNavLink href="/support" onClick={() => setMobileMenuOpen(false)}>
                Support
              </MobileNavLink>
            </nav>

            <div className="border-t border-[#232326] pt-4">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.replace("/login");
                }}
                className="w-full rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm font-bold text-red-400"
              >
                Déconnexion
              </button>
            </div>
          </aside>
        </>
      )}

      <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-[#3a3220] bg-[#0c0c0e] p-5 lg:flex">
        <SidebarLogo />

        <div className="mt-6 rounded-2xl border border-[#232326] bg-black/30 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8a8a92]">
            Connecté
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {userData.full_name}
          </p>
          <p className="mt-1 text-xs text-yellow-400">Dashboard Premium</p>
        </div>

        <nav className="mt-8 flex-1 space-y-2">
          <DesktopNavLink href="/dashboard" active>Dashboard</DesktopNavLink>
          <DesktopNavLink href="/tournaments/pro">Tournois Pro</DesktopNavLink>
          <DesktopNavLink href="/tournamentsponsorise">Tournois Sponsorisé</DesktopNavLink>
          <DesktopNavLink href="/duel">Duel 1v1</DesktopNavLink>
          <DesktopNavLink href="/training">Entraînement</DesktopNavLink>
          <DesktopNavLink href="/withdraw">Retrait</DesktopNavLink>
          <DesktopNavLink href="/depot">Dépôt</DesktopNavLink>
          <DesktopNavLink href="/support">Support</DesktopNavLink>
        </nav>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
          className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/10"
        >
          Déconnexion
        </button>
      </aside>

      <section className="relative z-10 pb-24 pt-6 lg:ml-72 p-4 sm:p-6">
        <div className="rounded-3xl border border-[#232326] bg-[#0c0c0e] p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-yellow-400">
            Bienvenue sur ton espace
          </p>
          <h1 className="mt-2 text-2xl font-medium text-white sm:text-3xl">
            Hello, <span className="text-yellow-400">{userData.full_name}</span> 👋
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#8a8a92]">
            Gère tes coins, tes tickets, tes retraits et ta progression.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <CollectorCard title="Coins" value={userData.coins ?? 0} icon="🪙" badge="SOLDE" />
          <CollectorCard title="Tickets" value={userData.tickets ?? 0} icon="🎫" badge="RARE" />
          <CollectorCard
            title="Niveau"
            value={`Débutant ⭐`}
            icon="⭐"
            badge={`LV.${level}`}
            progress={progress}
            sub={`${xp} / ${nextLevelXp} XP`}
          />
          <CollectorCard title="Classement" value="Bientôt dispo" icon="🏆" badge="SOON" />
          <CollectorCard title="Cashback" value="5 coins" icon="💵" sub="si défaite Pro" />
          <CollectorCard title="Objectif" value="Jouer Pro" icon="🎯" badge="GO" sub="+15 XP bientôt" />
        </div>

        <div className="mt-8">
          <Link href="/tournamentsponsorise">
            <div className="rounded-3xl border border-yellow-400/25 bg-gradient-to-r from-yellow-400/10 via-[#161615] to-[#0c0c0e] p-5 transition hover:-translate-y-0.5 hover:border-yellow-400/45">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⭐</span>
                <div>
                  <h3 className="font-medium text-yellow-400">Tournoi Sponsorisé</h3>
                  <p className="text-xs text-[#8a8a92]">
                    Utilise tes tickets et tente de gagner gratuitement.
                  </p>
                </div>
                <span className="ml-auto text-yellow-400">→</span>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-8">
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.25em] text-[#8a8a92]">
            Actions rapides
          </h3>

          <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-6 lg:overflow-visible">
            <QuickButton href="/tournaments/pro" icon="🏆" label="Pro" />
            <QuickButton href="/tournamentsponsorise" icon="🎁" label="Gratuit" />
            <QuickButton href="/duel" icon="⚔️" label="Duel" />
            <QuickButton href="/depot" icon="🪙" label="Dépôt" />
            <QuickButton href="/withdraw" icon="💸" label="Retrait" />
            <QuickButton href="/support" icon="💬" label="Support" />
          </div>
        </div>
      </section>
    </main>
  );
}

function SidebarLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-xl font-black text-yellow-400">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-black">
        Z
      </span>
      Zonarena
    </Link>
  );
}

function DesktopNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-2xl px-4 py-3 text-sm transition ${
        active
          ? "bg-yellow-400 font-bold text-black"
          : "text-zinc-300 hover:bg-white/5 hover:text-yellow-400"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  active,
  onClick,
  children,
}: {
  href: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block rounded-2xl px-4 py-3 text-sm transition ${
        active
          ? "bg-yellow-400 font-bold text-black"
          : "text-zinc-300 hover:bg-white/5 hover:text-yellow-400"
      }`}
    >
      {children}
    </Link>
  );
}

function CollectorCard({
  title,
  value,
  icon,
  badge,
  sub,
  progress,
}: {
  title: string;
  value: string | number;
  icon: string;
  badge?: string;
  sub?: string;
  progress?: number;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[10px] border border-[#3a3220] bg-gradient-to-b from-[#161615] to-[#0f0f0e] p-3 transition hover:-translate-y-0.5 hover:border-yellow-400/50">
      {badge && (
        <span className="absolute right-0 top-0 rounded-bl-lg bg-yellow-400 px-2 py-0.5 text-[8px] font-medium text-[#1a1400]">
          {badge}
        </span>
      )}

      <div className="text-[15px] text-yellow-400">{icon}</div>
      <p className="mt-2 text-[10px] text-[#8a8a92]">{title}</p>
      <p className="mt-1 text-[17px] font-medium text-yellow-400">{value}</p>

      {sub && <p className="mt-1 text-[10px] text-[#8a8a92]">{sub}</p>}

      {typeof progress === "number" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#232320]">
          <div
            className="h-full rounded-full bg-yellow-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function QuickButton({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="w-20 flex-shrink-0 rounded-xl border border-[#232326] bg-[#0c0c0e] p-3 text-center transition hover:-translate-y-0.5 hover:border-yellow-400/40 lg:w-auto"
    >
      <div className="mb-1 text-2xl">{icon}</div>
      <div className="text-[11px] font-medium text-[#8a8a92]">{label}</div>
    </Link>
  );
}

function getLevelFromXp(xp: number) {
  if (xp >= 1000) return 5;
  if (xp >= 500) return 4;
  if (xp >= 250) return 3;
  if (xp >= 100) return 2;
  return 1;
}

function getLevelBaseXp(level: number) {
  if (level <= 1) return 0;
  if (level === 2) return 100;
  if (level === 3) return 250;
  if (level === 4) return 500;
  return 1000;
}

function getNextLevelXp(level: number) {
  if (level <= 1) return 100;
  if (level === 2) return 250;
  if (level === 3) return 500;
  if (level === 4) return 1000;
  return 1500;
}