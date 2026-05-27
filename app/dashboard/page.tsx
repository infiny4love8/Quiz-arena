"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UserData = {
  full_name: string;
  coins: number;
  tickets: number;
  level: number;
  ranking: number;
  cashback: number;
};

// ===== WELCOME MODAL =====
function WelcomeModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.80)" }}
    >
      <div
        className="relative w-full max-w-md rounded-[20px] p-6"
        style={{
          background: "#0a0a0f",
          border: "1px solid rgba(250,204,21,0.35)",
        }}
      >
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-white transition"
          style={{ background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)" }}
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-5 text-center">
          <div className="text-4xl mb-2" style={{ display: "inline-block", animation: "zonarena-bounce 1.2s ease infinite" }}>
            🎁
          </div>
          <h2 className="text-xl font-bold text-yellow-400">Bienvenue sur Zonarena</h2>
          <div className="mx-auto mt-2 h-0.5 w-10 rounded bg-yellow-400 opacity-50" />
        </div>

        {/* Tickets offerts */}
        <div
          className="mb-4 rounded-xl px-4 py-3"
          style={{ background: "rgba(250,204,21,0.07)", border: "0.5px solid rgba(250,204,21,0.2)" }}
        >
          <p className="text-sm text-white leading-relaxed">
            🎉 Nous t&apos;offrons{" "}
            <span className="font-semibold text-yellow-400">3 tickets découverte</span>{" "}
            pour participer aux tournois sponsorisés du lancement.
          </p>
        </div>

        {/* Infos */}
        <div className="mb-5 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <span className="text-lg">🎫</span>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Les <span className="text-white">tickets</span> servent à rejoindre les{" "}
              <span className="text-yellow-400">tournois sponsorisés</span>.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">🪙</span>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Les <span className="text-white">coins</span> servent à rejoindre les{" "}
              <span className="text-yellow-400">tournois Pro</span>. —{" "}
              <span className="text-zinc-500">1 coin = 1 GDS</span>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">🏆</span>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Les tournois Pro arrivent bientôt — vous pourriez gagner tous les jours, monter au
              classement et <span className="text-yellow-400">devenir le meilleur</span>.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">💳</span>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Tu peux acheter des tickets ou des coins dans la section{" "}
              <span className="text-yellow-400">Coins / Tickets</span>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="mb-4 pb-4 text-center"
          style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)", paddingTop: "14px" }}
        >
          <p className="text-xs text-zinc-600 leading-relaxed">
            Merci d&apos;avoir choisi Zonarena.<br />
            Amuse-toi, progresse et tente de gagner. 🚀
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-xl py-3 text-sm font-bold text-black transition hover:opacity-90"
          style={{ background: "#facc15" }}
        >
          C&apos;est parti ! 🎮
        </button>
      </div>

      <style>{`
        @keyframes zonarena-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
// ===== FIN WELCOME MODAL =====

export default function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false); // ← AJOUT
  const router = useRouter();

  // 🔐 LOAD USER
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
      console.log("👤 ID connecté:", session.user.id);

      // ← AJOUT : affiche le modal si première connexion
      const key = `zonarena_welcome_seen_${session.user.id}`;
      if (!localStorage.getItem(key)) {
        setShowWelcomeModal(true);
      }

      setLoading(false);
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        loadUser();
      }
      if (event === "SIGNED_OUT") {
        router.replace("/login");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  // ← AJOUT : fermeture du modal + marque comme vu
  const handleCloseWelcome = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      localStorage.setItem(`zonarena_welcome_seen_${session.user.id}`, "true");
    }
    setShowWelcomeModal(false);
  };

  // 🔄 POLLING DUELS
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const checkPendingDuels = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log("🔍 Je cherche des duels pour:", user.id);

      const { data: pendingDuels, error } = await supabase
        .from("duels")
        .select("id")
        .eq("player_b", user.id)
        .eq("status", "pending")
        .limit(1);

      console.log("📦 Résultat:", pendingDuels, "Erreur:", error);

      if (pendingDuels && pendingDuels.length > 0) {
        const duelId = pendingDuels[0].id;
        router.push(`/duel/${duelId}/respond`);
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
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_35%),linear-gradient(to_bottom,_#09090b,_#000)] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
          <p className="text-zinc-400">Chargement...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_35%),linear-gradient(to_bottom,_#09090b,_#000)] text-white">

      {/* ← AJOUT : Modal de bienvenue */}
      {showWelcomeModal && <WelcomeModal onClose={handleCloseWelcome} />}

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute right-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-yellow-400/15 blur-3xl" />
        <div className="absolute bottom-[-160px] left-[-100px] h-[420px] w-[420px] rounded-full bg-yellow-500/10 blur-3xl" />
      </div>

      {/* ===== MENU HAMBURGER MOBILE ===== */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-black/50 backdrop-blur-xl border border-yellow-400/30"
        >
          <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* ===== SIDEBAR MOBILE (overlay) ===== */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed left-0 top-0 h-screen w-72 z-50 border-r border-yellow-400/20 bg-zinc-950/95 backdrop-blur-xl p-5 lg:hidden">
            <div className="flex justify-end mb-4">
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-zinc-400">
                ✕
              </button>
            </div>
            <Link href="/" className="flex items-center gap-2 text-xl font-black text-yellow-400 mb-8">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-400 text-black">
                Z
              </span>
              Zonarena
            </Link>

            <div className="rounded-2xl border border-yellow-400/10 bg-black/30 p-4 mb-6">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Connecté</p>
              <p className="mt-2 text-sm font-semibold text-white">{userData.full_name}</p>
            </div>

            <nav className="space-y-2">
              <Link href="/dashboard" className="block rounded-2xl bg-yellow-400 px-4 py-3 font-bold text-black" onClick={() => setMobileMenuOpen(false)}>
                Dashboard
              </Link>
              <Link href="/tournaments" className="block rounded-2xl px-4 py-3 text-zinc-300" onClick={() => setMobileMenuOpen(false)}>
                Tournois Pro
              </Link>
              <Link href="/tournamentsponsorise" className="block rounded-2xl px-4 py-3 text-zinc-300" onClick={() => setMobileMenuOpen(false)}>
                Tournois Sponsorisé
              </Link>
              <Link href="/duel" className="block rounded-2xl px-4 py-3 text-zinc-300" onClick={() => setMobileMenuOpen(false)}>
                Duel 1 VS 1
              </Link>
              <Link href="/training" className="block rounded-2xl px-4 py-3 text-zinc-300" onClick={() => setMobileMenuOpen(false)}>
                Entrainement
              </Link>
              <Link href="/withdraw" className="block rounded-2xl px-4 py-3 text-zinc-300" onClick={() => setMobileMenuOpen(false)}>
                Retrait
              </Link>
              <Link href="/depot" className="block rounded-2xl px-4 py-3 text-zinc-300" onClick={() => setMobileMenuOpen(false)}>
                Coins/Tickets
              </Link>
              <Link href="/support" className="block rounded-2xl px-4 py-3 text-zinc-300" onClick={() => setMobileMenuOpen(false)}>
                Support
              </Link>
            </nav>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/login");
              }}
              className="absolute bottom-6 left-5 right-5 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm font-bold text-red-400"
            >
              Déconnexion
            </button>
          </aside>
        </>
      )}

      {/* ===== SIDEBAR DESKTOP ===== */}
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-yellow-400/10 bg-zinc-950/90 backdrop-blur-xl p-5 lg:block">
        <Link href="/" className="flex items-center gap-2 text-xl font-black text-yellow-400">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-400 text-black">
            Z
          </span>
          Zonarena
        </Link>

        <div className="mt-6 rounded-2xl border border-yellow-400/10 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Connecté</p>
          <p className="mt-2 text-sm font-semibold text-white">{userData.full_name}</p>
          <p className="text-xs text-zinc-400">Dashboard Premium</p>
        </div>

        <nav className="mt-8 space-y-2">
          <Link href="/dashboard" className="block rounded-2xl bg-yellow-400 px-4 py-3 font-bold text-black shadow-[0_0_0_1px_rgba(250,204,21,0.25)]">
            Dashboard
          </Link>
          <Link href="/tournaments/pro" className="block rounded-2xl px-4 py-3 text-zinc-300 transition hover:bg-white/5 hover:text-yellow-400">
            Tournois
          </Link>
          <Link href="/tournamentsponsorise" className="block rounded-2xl px-4 py-3 text-zinc-300 transition hover:bg-white/5 hover:text-yellow-400">
            Tournois Sponsorisé
          </Link>
          <Link href="/duel" className="block rounded-2xl px-4 py-3 text-zinc-300 transition hover:bg-white/5 hover:text-yellow-400">
            Duel 1v1
          </Link>
          <Link href="/training" className="block rounded-2xl px-4 py-3 text-zinc-300 transition hover:bg-white/5 hover:text-yellow-400">
            Entrainement
          </Link>
          <Link href="/withdraw" className="block rounded-2xl px-4 py-3 text-zinc-300 transition hover:bg-white/5 hover:text-yellow-400">
            Retrait
          </Link>
          <Link href="/depot" className="block rounded-2xl px-4 py-3 text-zinc-300 transition hover:bg-white/5 hover:text-yellow-400">
            Dépôt
          </Link>
          <Link href="/support" className="block rounded-2xl px-4 py-3 text-zinc-300 transition hover:bg-white/5 hover:text-yellow-400">
            Support
          </Link>
        </nav>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
          className="absolute bottom-6 left-5 right-5 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/10"
        >
          Déconnexion
        </button>
      </aside>

      {/* ===== CONTENT ===== */}
      <section className="pb-24 pt-6 lg:ml-72 p-4 sm:p-6">
        {/* Welcome */}
        <div className="rounded-3xl border border-yellow-400/10 bg-black/30 p-5 sm:p-6 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-yellow-400/70">Bienvenue</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-white">
            Salut, <span className="text-yellow-400">{userData.full_name}</span> 👋
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-zinc-400">
            Gère tes coins, tes tickets et ton activité.
          </p>
        </div>

        {/* Cartes stats - TES COINS, TICKETS, ETC */}
        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="Coins" value={userData.coins ?? 0} icon="🪙" />
          <Card title="Tickets" value={userData.tickets ?? 0} icon="🎫" />
          <Card title="Niveau" value={`Lv. ${userData.level ?? 1}`} icon="⭐" />
          <Card title="Classement" value={`#${userData.ranking ?? 0}`} icon="🏆" />
          <Card title="Cashback" value={`${userData.cashback ?? 0} HTG`} icon="💵" />
          <Card title="Statut" value="Actif" icon="✅" />
        </div>

        {/* Section Tournoi Sponsorisé pour MOBILE (apparaît en bas) */}
        <div className="mt-8 lg:hidden">
          <Link href="/tournamentsponsorise">
            <div className="rounded-3xl border-2 border-yellow-400/30 bg-gradient-to-r from-yellow-400/10 to-transparent p-5 backdrop-blur-xl hover:border-yellow-400/50 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⭐</span>
                <div>
                  <h3 className="font-bold text-yellow-400">Tournoi Sponsorisé</h3>
                  <p className="text-xs text-zinc-400">Gagne des récompenses exclusives !</p>
                </div>
                <span className="ml-auto text-yellow-400">→</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Actions rapides en bas pour mobile - scroll horizontal */}
        <div className="mt-8">
          <h3 className="text-sm uppercase tracking-wider text-zinc-500 mb-3">Actions rapides</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
            <QuickButton href="/tournaments" icon="🏆" label="Tournois" />
            <QuickButton href="/duel" icon="⚔️" label="Duel" />
            <QuickButton href="/training" icon="🎯" label="Training" />
            <QuickButton href="/depot" icon="💰" label="Dépôt" />
            <QuickButton href="/withdraw" icon="💸" label="Retrait" />
            <QuickButton href="/support" icon="💬" label="Support" />
          </div>
        </div>
      </section>
    </main>
  );
}

// Card pour les stats
function Card({ title, value, icon }: { title: string; value: string | number; icon: string }) {
  return (
    <div className="group rounded-2xl border border-yellow-400/10 bg-zinc-950/80 p-4 backdrop-blur-md transition hover:-translate-y-0.5 hover:border-yellow-400/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <div className="h-8 w-8 rounded-full bg-yellow-400/10 flex items-center justify-center">
          <span className="text-xs text-yellow-400">↑</span>
        </div>
      </div>
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="text-2xl font-bold text-yellow-400 mt-1">{value}</p>
    </div>
  );
}

// Bouton rapide pour mobile
function QuickButton({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="flex-shrink-0 w-20 text-center p-3 rounded-xl bg-zinc-950/80 border border-yellow-400/10 hover:border-yellow-400/30 transition-all">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-[11px] font-medium text-zinc-400">{label}</div>
    </Link>
  );
}