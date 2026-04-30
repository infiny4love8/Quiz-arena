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

  useEffect(() => {
    async function getUser() {
      // 🔒 check session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const user = session.user;

      // 📦 fetch user data
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        router.push("/login");
        return;
      }

      setUserData(data);
      setLoading(false);
    }

    getUser();

    // 🔁 auto logout listener
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          router.push("/login");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (loading || !userData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Chargement...
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

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-yellow-400/10 bg-zinc-950 p-5 lg:block">
        <Link href="/" className="text-xl font-black text-yellow-400">
          QuizArena
        </Link>

        <nav className="mt-10 space-y-2">
          <Link
            href="/dashboard"
            className="block rounded-xl bg-yellow-400 px-4 py-3 font-bold text-black"
          >
            Dashboard
          </Link>

          <Link
            href="/tournaments"
            className="block px-4 py-3 text-zinc-400 hover:text-yellow-400"
          >
            Tournois
          </Link>

          <Link
            href="/duel"
            className="block px-4 py-3 text-zinc-400 hover:text-yellow-400"
          >
            Duel 1v1
          </Link>

          <Link
            href="/training"
            className="block px-4 py-3 text-zinc-400 hover:text-yellow-400"
          >
            Entraînement
          </Link>

          <Link
            href="/tournamentsponsorise"
            className="block px-4 py-3 text-zinc-400 hover:text-yellow-400"
          >
            Tournois Sponsorise
          </Link>

          <Link
            href="/withdraw"
            className="block px-4 py-3 text-zinc-400 hover:text-yellow-400"
          >
            Retrait
          </Link>

          <Link
            href="/leaderboard"
            className="block px-4 py-3 text-zinc-400 hover:text-yellow-400"
          >
            Classement
          </Link>

          <Link
            href="/support"
            className="block px-4 py-3 text-zinc-400 hover:text-yellow-400"
          >
            Support
          </Link>
        </nav>
      </aside>

      {/* Content */}
      <section className="lg:ml-72 p-6">
        <h1 className="text-2xl font-black text-yellow-400">
          Salut, {userData.full_name} 👋
        </h1>

        {/* Stats */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card title="Coins" value={userData.coins} />
          <Card title="Tickets" value={userData.tickets} />
          <Card title="Niveau" value={`Lv. ${userData.level}`} />
          <Card title="Classement" value={`#${userData.ranking}`} />
          <Card title="Cashback" value={`${userData.cashback} HTG`} />
        </div>
      </section>
    </main>
  );
}

/* 🧱 Card component */
function Card({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-sm text-zinc-500">{title}</p>
      <h3 className="text-3xl font-black text-yellow-400">
        {value ?? 0}
      </h3>
    </div>
  );
}