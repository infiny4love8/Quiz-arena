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

export default function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
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

  // 🔄 POLLING DUELS (toutes les 3s — plus fiable que realtime)
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_35%),linear-gradient(to_bottom,_#09090b,_#000)] text-white overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute right-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-yellow-400/15 blur-3xl" />
        <div className="absolute bottom-[-160px] left-[-100px] h-[420px] w-[420px] rounded-full bg-yellow-500/10 blur-3xl" />
      </div>

      {/* Sidebar desktop */}
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-yellow-400/10 bg-zinc-950/90 backdrop-blur-xl p-5 lg:block">
        <Link href="/" className="flex items-center gap-2 text-xl font-black text-yellow-400">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-400 text-black">
            Q
          </span>
          QuizArena
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
          <Link href="/tournaments" className="block rounded-2xl px-4 py-3 text-zinc-300 transition hover:bg-white/5 hover:text-yellow-400">
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

      {/* Mobile navbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-yellow-400/10 bg-zinc-950/95 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          <Link href="/dashboard" className="flex flex-col items-center justify-center rounded-xl py-2 text-yellow-400">
            <span className="text-lg">🏠</span>
            <span className="text-[10px] font-semibold">Dashboard</span>
          </Link>
          <Link href="/tournaments" className="flex flex-col items-center justify-center rounded-xl py-2 text-zinc-400">
            <span className="text-lg">🏆</span>
            <span className="text-[10px] font-semibold">Tournois</span>
          </Link>
          <Link href="/tournamentsponsorise" className="flex flex-col items-center justify-center rounded-xl py-2 text-zinc-400">
            <span className="text-lg">⭐</span>
            <span className="text-[10px] font-semibold">Sponsorisé</span>
          </Link>
          <Link href="/duel" className="flex flex-col items-center justify-center rounded-xl py-2 text-zinc-400">
            <span className="text-lg">⚔️</span>
            <span className="text-[10px] font-semibold">Duel</span>
          </Link>

          <Link href="/classement" className="flex flex-col items-center justify-center rounded-xl py-2 text-zinc-400">
            <span className="text-lg">🏅</span>
            <span className="text-[10px] font-semibold">Classement</span>
          </Link>
          <Link href="/withdraw" className="flex flex-col items-center justify-center rounded-xl py-2 text-zinc-400">
            <span className="text-lg">💰</span>
            <span className="text-[10px] font-semibold">Retrait</span>
          </Link>
          <Link href="/depot" className="flex flex-col items-center justify-center rounded-xl py-2 text-zinc-400">
            <span className="text-lg">➕</span>
            <span className="text-[10px] font-semibold">Dépôt</span>
          </Link>
          <Link href="/support" className="flex flex-col items-center justify-center rounded-xl py-2 text-zinc-400">
            <span className="text-lg">💬</span>
            <span className="text-[10px] font-semibold">Support</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <section className="pb-36 pt-6 lg:ml-72 lg:pb-8 p-4 sm:p-6">
        <div className="rounded-3xl border border-yellow-400/10 bg-black/30 p-5 sm:p-6 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-yellow-400/70">Bienvenue</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-white">
            Salut, <span className="text-yellow-400">{userData.full_name}</span> 👋
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-zinc-400">
            Gère tes coins, tes tickets et ton activité depuis un dashboard plus moderne, rapide et responsive.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card title="Coins" value={userData.coins ?? 0} />
          <Card title="Tickets" value={userData.tickets ?? 0} />
          <Card title="Niveau" value={`Lv. ${userData.level ?? 1}`} />
          <Card title="Classement" value={`#${userData.ranking ?? 0}`} />
          <Card title="Cashback" value={`${userData.cashback ?? 0} HTG`} />
          <Card title="Statut" value="Actif" />
        </div>
      </section>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="group rounded-3xl border border-yellow-400/10 bg-zinc-950/80 p-5 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-yellow-400/30 hover:bg-zinc-900/90">
      <div className="mb-4 h-1.5 w-14 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-200" />
      <p className="text-sm text-zinc-400">{title}</p>
      <h3 className="mt-2 text-3xl font-black tracking-tight text-yellow-400">{value}</h3>
    </div>
  );
}