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

      const { data: { session } } = await supabase.auth.getSession();

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

  // 🔥 LISTENER DUELS (LE FIX IMPORTANT)
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupListener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const myUserId = user.id;

      channel = supabase
        .channel("incoming-duels")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "duels",
          },
          (payload) => {
            const duel = payload.new;

            // 🎯 Si je suis le joueur B → je reçois le défi
            if (duel.player_b === myUserId && duel.status === "pending") {
              console.log("🔥 Duel reçu :", duel.id);

              // 🚀 Redirection automatique
              router.push(`/duel/${duel.id}/negotiate`);
            }
          }
        )
        .subscribe();
    };

    setupListener();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  if (loading || !userData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
          <p className="text-zinc-400">Chargement...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute right-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-yellow-400/20 blur-3xl" />
        <div className="absolute bottom-[-160px] left-[-100px] h-[420px] w-[420px] rounded-full bg-yellow-500/10 blur-3xl" />
      </div>

      {/* Sidebar desktop */}
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-yellow-400/10 bg-zinc-950 p-5 lg:block">
        <Link href="/" className="text-xl font-black text-yellow-400">
          QuizArena
        </Link>

        <nav className="mt-10 space-y-2">
          <Link href="/dashboard" className="block rounded-xl bg-yellow-400 px-4 py-3 font-bold text-black">
            Dashboard
          </Link>
          <Link href="/tournaments" className="block px-4 py-3 text-zinc-400 hover:text-yellow-400">
            Tournois
          </Link>
          <Link href="/duel" className="block px-4 py-3 text-zinc-400 hover:text-yellow-400">
            Duel 1v1
          </Link>
          <Link href="/training" className="block px-4 py-3 text-zinc-400 hover:text-yellow-400">
            Entraînement
          </Link>
          <Link href="/tournamentsponsorise" className="block px-4 py-3 text-zinc-400 hover:text-yellow-400">
            Tournois Sponsorisé
          </Link>
          <Link href="/withdraw" className="block px-4 py-3 text-zinc-400 hover:text-yellow-400">
            Retrait
          </Link>
          <Link href="/leaderboard" className="block px-4 py-3 text-zinc-400 hover:text-yellow-400">
            Classement
          </Link>
          <Link href="/support" className="block px-4 py-3 text-zinc-400 hover:text-yellow-400">
            Support
          </Link>
        </nav>

        {/* Logout */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
          className="absolute bottom-6 left-5 right-5 rounded-xl border border-red-500/30 px-4 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/10"
        >
          Déconnexion
        </button>
      </aside>

      {/* Mobile navbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-yellow-400/10 bg-zinc-950 px-2 py-3 lg:hidden">
        <Link href="/dashboard" className="flex flex-col items-center gap-1">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] text-yellow-400">Dashboard</span>
        </Link>
        <Link href="/tournaments" className="flex flex-col items-center gap-1">
          <span className="text-xl">🏆</span>
          <span className="text-[10px] text-zinc-400">Tournois</span>
        </Link>
        <Link href="/duel" className="flex flex-col items-center gap-1">
          <span className="text-xl">⚔️</span>
          <span className="text-[10px] text-zinc-400">Duel</span>
        </Link>
        <Link href="/training" className="flex flex-col items-center gap-1">
          <span className="text-xl">🎯</span>
          <span className="text-[10px] text-zinc-400">Training</span>
        </Link>
        <Link href="/withdraw" className="flex flex-col items-center gap-1">
          <span className="text-xl">💰</span>
          <span className="text-[10px] text-zinc-400">Retrait</span>
        </Link>
        <Link href="/support" className="flex flex-col items-center gap-1">
          <span className="text-xl">💬</span>
          <span className="text-[10px] text-zinc-400">Support</span>
        </Link>
      </nav>

      {/* Content */}
      <section className="pb-24 lg:ml-72 lg:pb-6 p-6">
        <h1 className="text-2xl font-black text-yellow-400">
          Salut, {userData.full_name} 👋
        </h1>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Card title="Coins" value={userData.coins ?? 0} />
          <Card title="Tickets" value={userData.tickets ?? 0} />
          <Card title="Niveau" value={`Lv. ${userData.level ?? 1}`} />
          <Card title="Classement" value={`#${userData.ranking ?? 0}`} />
          <Card title="Cashback" value={`${userData.cashback ?? 0} HTG`} />
        </div>
      </section>

    </main>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-sm text-zinc-500">{title}</p>
      <h3 className="text-3xl font-black text-yellow-400">{value}</h3>
    </div>
  );
}