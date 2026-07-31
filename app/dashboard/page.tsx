"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UserData = {
  full_name: string;
  coins: number;
  tickets: number;
  xp?: number;
};

const DASHBOARD_USER_COLUMNS = "full_name, coins, tickets, xp";

function WelcomeModal({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        className="relative w-full max-w-md rounded-[26px] border border-yellow-400/25 bg-[#0b0b0d] p-6 shadow-[0_30px_90px_rgba(0,0,0,.65)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Fermer la fenêtre de bienvenue"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition hover:text-white"
        >
          ✕
        </button>

        <div className="mb-5 text-center">
          <div className="mb-3 text-4xl" aria-hidden="true">
            🎁
          </div>

          <h2
            id="welcome-modal-title"
            className="text-2xl font-black text-yellow-400"
          >
            Bienvenue sur Zonarena
          </h2>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Ton espace de jeu, de progression et de récompenses.
          </p>
        </div>

        <div className="mb-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-4">
          <p className="text-sm leading-6 text-white">
            Nous t&apos;offrons{" "}
            <span className="font-bold text-yellow-400">
              5 tickets sponsorisés
            </span>{" "}
            pour participer à tes premiers tournois.
          </p>
        </div>

        <div className="mb-6 space-y-3">
          {[
            ["🎫", "Utilise tes tickets pour les tournois sponsorisés."],
            ["💰", "Les Gourdes servent aux tournois Pro et aux retraits."],
            ["⭐", "Joue pour gagner de l’XP et augmenter ton niveau."],
            ["🎁", "Complète des missions pour obtenir plus de récompenses."],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-start gap-3">
              <span className="mt-0.5 text-lg" aria-hidden="true">
                {icon}
              </span>
              <p className="text-sm leading-6 text-zinc-400">{text}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl bg-yellow-400 py-3.5 text-sm font-black text-black transition hover:bg-yellow-300 active:scale-[.99]"
        >
          Découvrir mon dashboard
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
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
        .select(DASHBOARD_USER_COLUMNS)
        .eq("id", session.user.id)
        .single();

      if (error || !data) {
        router.replace("/login");
        return;
      }

      setUserData(data);

      const welcomeKey = `zonarena_welcome_seen_${session.user.id}`;

      if (!localStorage.getItem(welcomeKey)) {
        setShowWelcomeModal(true);
      }

      setLoading(false);
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          loadUser();
        }

        if (event === "SIGNED_OUT") {
          router.replace("/login");
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [router]);

  const handleCloseWelcome = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      localStorage.setItem(
        `zonarena_welcome_seen_${session.user.id}`,
        "true"
      );
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
          <p className="text-sm text-zinc-400">Chargement...</p>
        </div>
      </main>
    );
  }

  const xp = Number(userData.xp ?? 0);
  const levelInfo = getLevelInfo(xp);

  const progress = Math.min(
    100,
    Math.max(
      0,
      ((xp - levelInfo.current) / (levelInfo.next - levelInfo.current)) * 100
    )
  );

  const firstName =
    userData.full_name?.trim().split(/\s+/)[0] || "Joueur";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050506] text-white">
      {showWelcomeModal && <WelcomeModal onClose={handleCloseWelcome} />}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute right-[-130px] top-[-150px] h-[360px] w-[360px] rounded-full bg-yellow-400/[0.08] blur-3xl" />
        <div className="absolute bottom-[-180px] left-[-150px] h-[420px] w-[420px] rounded-full bg-yellow-500/[0.04] blur-3xl" />
      </div>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-400 text-lg font-black text-black shadow-[0_10px_30px_rgba(250,204,21,.18)]">
              Z
            </span>
            <div>
              <p className="text-base font-black text-yellow-400">Zonarena</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">
                Play. Win. Repeat.
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/login");
            }}
            aria-label="Se déconnecter"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:border-red-400/30 hover:text-red-400 active:scale-95"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            </svg>
          </button>
        </header>

        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Ton espace
          </p>
          <h1 className="mt-1 text-[28px] font-black leading-tight sm:text-4xl">
            Bonjour, <span className="text-yellow-400">{firstName}</span> 👋
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Prêt à jouer et décrocher ta prochaine victoire ?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            title="Gourdes"
            value={userData.coins ?? 0}
            icon="💰"
            className="col-span-2 sm:col-span-1"
          />

          <StatCard
            title="Tickets"
            value={userData.tickets ?? 0}
            icon="🎫"
          />

          <StatCard
            title="Niveau"
            value={levelInfo.level}
            icon="⭐"
            sub={levelInfo.name}
            progress={progress}
          />
        </div>

        <Link
          href="/tournamentsponsorise"
          className="group mt-4 flex items-center gap-4 rounded-[24px] border border-yellow-400/20 bg-gradient-to-r from-yellow-400/[0.12] via-[#111112] to-[#0c0c0e] p-4 transition hover:border-yellow-400/40 active:scale-[.995]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-2xl text-black shadow-[0_10px_30px_rgba(250,204,21,.18)]">
            🏆
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-yellow-400/70">
              Tournois sponsorisés
            </p>
            <h2 className="mt-0.5 text-sm font-black text-white sm:text-base">
              Utilise un ticket et tente de gagner
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Consulte les tournois disponibles aujourd&apos;hui.
            </p>
          </div>

          <span className="text-xl text-yellow-400 transition group-hover:translate-x-1">
            →
          </span>
        </Link>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
              Navigation
            </p>
            <h2 className="mt-1 text-xl font-black">Que veux-tu faire ?</h2>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <ActionCard
            href="/training"
            icon="🎯"
            title="Entraînement"
            description="Améliore tes scores"
          />

          <ActionCard
            href="/duel"
            icon="⚔️"
            title="Duel 1v1"
            description="Défie un joueur"
          />

          <ActionCard
            href="/tournaments/pro"
            icon="🏆"
            title="Tournoi Pro"
            description="Joue avec tes Gourdes"
            featured
          />

          <ActionCard
            href="/tournamentsponsorise"
            icon="🎫"
            title="Sponsorisé"
            description="Joue avec tes tickets"
          />

          <ActionCard
            href="/missions"
            icon="🎁"
            title="Missions"
            description="Gagne des récompenses"
            badge="Nouveau"
          />

          <ActionCard
            href="/depot"
            icon="💳"
            title="Dépôt"
            description="Ajoute des fonds"
          />

          <ActionCard
            href="/withdraw"
            icon="💸"
            title="Retrait"
            description="Retire tes gains"
          />

          <ActionCard
            href="/support"
            icon="💬"
            title="Support"
            description="Besoin d’aide ?"
          />
        </div>

        <div className="mt-5 rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-zinc-400">
                Progression du niveau
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {xp} XP sur {levelInfo.next} XP
              </p>
            </div>

            <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-xs font-black text-yellow-400">
              {Math.round(progress)}%
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-yellow-400 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
  sub,
  progress,
  className = "",
}: {
  title: string;
  value: string | number;
  icon: string;
  sub?: string;
  progress?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border border-white/[0.07] bg-[#0d0d0f] p-4 shadow-[0_18px_45px_rgba(0,0,0,.22)] ${className}`}
    >
      <div className="absolute right-[-18px] top-[-18px] h-20 w-20 rounded-full bg-yellow-400/[0.05] blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
            {title}
          </p>
          <p className="mt-2 text-3xl font-black text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-yellow-400">{sub}</p>}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.08] text-xl">
          {icon}
        </div>
      </div>

      {typeof progress === "number" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-yellow-400"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
  featured = false,
  badge,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  featured?: boolean;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative min-h-[132px] overflow-hidden rounded-[22px] border p-4 transition duration-200 hover:-translate-y-1 active:scale-[.98] ${
        featured
          ? "border-yellow-400/30 bg-gradient-to-br from-yellow-400/[0.13] to-[#0c0c0e]"
          : "border-white/[0.07] bg-[#0d0d0f] hover:border-yellow-400/25"
      }`}
    >
      {badge && (
        <span className="absolute right-3 top-3 rounded-full bg-yellow-400 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-black">
          {badge}
        </span>
      )}

      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035] text-2xl transition group-hover:scale-105">
        {icon}
      </div>

      <h3
        className={`mt-3 text-sm font-black ${
          featured ? "text-yellow-400" : "text-white"
        }`}
      >
        {title}
      </h3>

      <p className="mt-1 text-[11px] leading-4 text-zinc-500">{description}</p>

      <span className="absolute bottom-3 right-3 text-sm text-yellow-400/70 transition group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}

function getLevelInfo(xp: number) {
  if (xp >= 1000) {
    return {
      level: 5,
      name: "Élite",
      stars: "⭐⭐⭐⭐⭐",
      current: 1000,
      next: 1500,
    };
  }

  if (xp >= 500) {
    return {
      level: 4,
      name: "Expert",
      stars: "⭐⭐⭐⭐",
      current: 500,
      next: 1000,
    };
  }

  if (xp >= 250) {
    return {
      level: 3,
      name: "Confirmé",
      stars: "⭐⭐⭐",
      current: 250,
      next: 500,
    };
  }

  if (xp >= 100) {
    return {
      level: 2,
      name: "Amateur",
      stars: "⭐⭐",
      current: 100,
      next: 250,
    };
  }

  return {
    level: 1,
    name: "Débutant",
    stars: "⭐",
    current: 0,
    next: 100,
  };
}