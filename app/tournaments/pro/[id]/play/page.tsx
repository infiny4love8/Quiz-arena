"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Tournament = {
  id: string;
  name: string;
  game_type: string;
  entry_coins: number;
  min_players: number;
  max_players: number;
  play_window: number;
  status: string;
};

type Entry = {
  id: string;
  score: number | null;
  game_started_at: string | null;
  score_submitted_at: string | null;
};

const gameLabels: Record<string, string> = {
  drapeaux: "Quiz Drapeaux",
  memory: "Mémoire",
  memory_cards: "Trouver les paires",
  tank_arena: "Tank Arena",
};

const gameEmoji: Record<string, string> = {
  drapeaux: "🌍",
  memory: "🧠",
  memory_cards: "🃏",
  tank_arena: "🛡️",
};

/**
 * Décor "Aura de combat" : anneaux de choc qui se propagent + particules
 * d'énergie qui montent en arrière-plan. Purement visuel — ne lit, n'écrit
 * et ne touche à aucune donnée ni logique de la page.
 */
function AuraBackground() {
  const [flames, setFlames] = useState<{ left: number; duration: number; delay: number }[]>([]);

  useEffect(() => {
    setFlames(
      Array.from({ length: 22 }, () => ({
        left: Math.random() * 100,
        duration: 2 + Math.random() * 2,
        delay: Math.random() * 2,
      }))
    );
  }, []);

  return (
    <>
      <style jsx global>{`
        @keyframes auraRing {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(14); opacity: 0; }
        }
        @keyframes auraRise {
          0% { transform: translateY(0) scaleY(1); opacity: 0.9; }
          100% { transform: translateY(-100vh) scaleY(0.4); opacity: 0; }
        }
        @keyframes auraPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(251,146,60,0.4); }
          50% { box-shadow: 0 0 60px rgba(250,204,21,0.6); }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        {[0, 0.6, 1.2].map((delay) => (
          <span
            key={delay}
            className="absolute h-16 w-16 rounded-full border-2 border-orange-400/50"
            style={{ animation: `auraRing 1.8s ease-out ${delay}s infinite` }}
          />
        ))}
      </div>

      <div className="pointer-events-none fixed inset-0">
        {flames.map((f, i) => (
          <span
            key={i}
            className="absolute bottom-[-10%] h-[60px] w-[3px] rounded-sm"
            style={{
              left: `${f.left}vw`,
              background: "linear-gradient(to top, rgba(251,146,60,0.9), transparent)",
              animation: `auraRise ${f.duration}s linear ${f.delay}s infinite`,
            }}
          />
        ))}
      </div>
    </>
  );
}

export default function ProPlayPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = String(params.id);

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entry, setEntry] = useState<Entry | null>(null);

  // --- Flair 100% visuel pour le design "Aura de combat" ---
  // N'affecte ni les données, ni les vérifications, ni la navigation.
  const [power, setPower] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/login");
          return;
        }

        const { data: tournamentData, error: tournamentError } = await supabase
          .from("tournaments_pro")
          .select("id,name,game_type,entry_coins,min_players,max_players,play_window,status")
          .eq("id", tournamentId)
          .single();

        if (tournamentError || !tournamentData) {
          setError("Tournoi introuvable.");
          return;
        }

        setTournament(tournamentData);

        const { data: entryData, error: entryError } = await supabase
          .from("tournament_pro_entries")
          .select("id,score,game_started_at,score_submitted_at")
          .eq("tournament_id", tournamentId)
          .eq("user_id", session.user.id)
          .single();

        if (entryError || !entryData) {
          setError("Tu n'es pas encore inscrit à ce challenge.");
          return;
        }

        setEntry(entryData);
      } catch (err) {
        console.error(err);
        setError("Erreur lors du chargement.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, tournamentId]);

  // Montée de puissance animée — uniquement décorative, se déclenche sur
  // l'écran "prêt à jouer". N'a aucune incidence sur le reste de la page.
  useEffect(() => {
    const isReadyScreen =
      !loading && !error && !!tournament && !!entry && !entry.score_submitted_at && !entry.game_started_at;
    if (!isReadyScreen) return;

    let raf = 0;
    let val = 0;
    const target = 9001;
    const step = () => {
      val += Math.ceil((target - val) / 7) + 30;
      if (val >= target) {
        setPower(target);
        return;
      }
      setPower(val);
      raf = requestAnimationFrame(step);
    };
    step();

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [loading, error, tournament, entry]);

  const playChargeSound = () => {
    const AudioCtxClass: typeof AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioCtxClass();
    const ctx = audioCtxRef.current;
    const t0 = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(90, t0);
    osc.frequency.exponentialRampToValueAtTime(420, t0 + 1.0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 1.35);
  };

  const toggleSound = () => {
    setSoundOn((prev) => {
      const next = !prev;
      if (next) playChargeSound();
      return next;
    });
  };

  const startChallenge = async () => {
    setStarting(true);
    setError("");

    try {
      const res = await fetch("/api/tournaments/pro/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ tournamentId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Impossible de démarrer le challenge.");
        return;
      }

      router.push(data.gameUrl);
    } catch (err) {
      console.error(err);
      setError("Erreur serveur.");
    } finally {
      setStarting(false);
    }
  };

  const handleStartClick = () => {
    if (soundOn) playChargeSound();
    startChallenge();
  };

  if (loading) {
    return (
      <main
        className="relative min-h-screen overflow-hidden bg-black text-white flex items-center justify-center px-5"
        style={{ background: "radial-gradient(circle at 50% 70%, #2a1200 0%, #0a0604 60%, #050302 100%)" }}
      >
        <AuraBackground />
        <div className="relative z-10 rounded-3xl border border-orange-400/30 bg-zinc-950/80 px-8 py-6 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-400/20 border-t-yellow-400" />
          <p className="font-black uppercase tracking-wide text-zinc-300">Préparation de ton arène...</p>
        </div>
      </main>
    );
  }

  if (error || !tournament || !entry) {
    return (
      <main
        className="relative min-h-screen overflow-hidden bg-black text-white flex items-center justify-center px-5"
        style={{ background: "radial-gradient(circle at 50% 70%, #2a1200 0%, #0a0604 60%, #050302 100%)" }}
      >
        <AuraBackground />
        <div className="relative z-10 w-full max-w-lg rounded-3xl border border-red-500/30 bg-zinc-950/90 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-3xl">
            🚫
          </div>
          <h1 className="mt-5 text-2xl font-black uppercase tracking-wide text-red-400">Accès indisponible</h1>
          <p className="mt-3 text-zinc-400">{error}</p>
          <button
            onClick={() => router.push("/tournaments/pro")}
            className="mt-6 rounded-xl bg-gradient-to-r from-orange-400 to-yellow-400 px-6 py-3 font-black text-black"
          >
            Retour aux tournois
          </button>
        </div>
      </main>
    );
  }

  const gameName = gameLabels[tournament.game_type] || tournament.game_type;
  const emoji = gameEmoji[tournament.game_type] || "🎮";

  if (entry.score_submitted_at) {
    return (
      <main
        className="relative min-h-screen overflow-hidden bg-black text-white flex items-center justify-center px-5"
        style={{ background: "radial-gradient(circle at 50% 70%, #2a1200 0%, #0a0604 60%, #050302 100%)" }}
      >
        <AuraBackground />
        <div className="relative z-10 w-full max-w-lg rounded-3xl border border-green-400/30 bg-zinc-950/90 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-400 text-3xl text-black">
            ✅
          </div>
          <h1 className="mt-5 text-2xl font-black uppercase tracking-wide">Score envoyé</h1>
          <p className="mt-3 text-zinc-400">
            Belle tentative ! Ton score est enregistré pour le classement final.
          </p>
          <p
            className="mt-5 text-4xl font-black text-yellow-400"
            style={{ textShadow: "0 0 18px rgba(250,204,21,0.5)" }}
          >
            {entry.score || 0} pts
          </p>
          <button
            onClick={() => router.push("/tournaments/pro")}
            className="mt-6 rounded-xl bg-gradient-to-r from-orange-400 to-yellow-400 px-6 py-3 font-black text-black"
          >
            Voir les tournois
          </button>
        </div>
      </main>
    );
  }

  if (entry.game_started_at) {
    return (
      <main
        className="relative min-h-screen overflow-hidden bg-black text-white flex items-center justify-center px-5"
        style={{ background: "radial-gradient(circle at 50% 70%, #2a1200 0%, #0a0604 60%, #050302 100%)" }}
      >
        <AuraBackground />
        <div className="relative z-10 w-full max-w-lg rounded-3xl border border-yellow-400/30 bg-zinc-950/90 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400 text-3xl text-black">
            🎮
          </div>
          <h1 className="mt-5 text-2xl font-black uppercase tracking-wide">Arène déjà lancée</h1>
          <p className="mt-3 text-zinc-400">
            Ta tentative a déjà commencé. Le score final sera conservé dès qu’il sera envoyé.
          </p>
          <button
            onClick={() => router.push("/tournaments/pro")}
            className="mt-6 rounded-xl bg-gradient-to-r from-orange-400 to-yellow-400 px-6 py-3 font-black text-black"
          >
            Retour aux tournois
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-black text-white flex items-center justify-center px-4 py-6"
      style={{
        background:
          "radial-gradient(circle at 50% 70%, #2a1200 0%, #0a0604 60%, #050302 100%)",
      }}
    >
      <AuraBackground />

      <div
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-orange-400/40 bg-zinc-950/90 p-5 shadow-2xl sm:p-7"
        style={{ boxShadow: "0 0 70px rgba(251,146,60,0.25)" }}
      >
        <div className="relative text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-400/30 bg-green-400/10 px-4 py-2 text-xs font-black text-green-400">
            ✅ Accès Pro validé
          </div>

          <div
            className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full text-5xl"
            style={{
              background:
                "radial-gradient(circle, rgba(251,146,60,0.45), transparent 70%)",
              animation: "auraPulse 1.1s ease-in-out infinite",
            }}
          >
            {emoji}
          </div>

          <h1 className="mt-3 text-2xl font-black leading-tight tracking-wide sm:text-3xl">
            {tournament.name}
          </h1>

          <p className="mt-2 text-sm font-semibold text-orange-400">
            {gameName}
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/60 p-4 text-left">
            <h2 className="text-sm font-black uppercase tracking-widest text-yellow-400">
              🏆 Récompenses
            </h2>

            <div className="mt-3 space-y-2 text-sm text-zinc-300">
              <p>💰 De 220 GDS jusqu&apos;à 440 GDS pour le 1er</p>
              <p>⭐ De 15 à 40 XP pour tous les participants</p>
              <p>🎫 1 ticket sponsorisé pour le 2e</p>
              <p>💚 Cashback pour le 3e et les autres joueurs</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 px-4 py-3">
            <p className="text-sm font-black text-yellow-400">
              🎯 Une seule tentative
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              Ton score sera envoyé automatiquement à la fin du jeu.
            </p>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleStartClick}
            disabled={starting}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-orange-400 to-yellow-400 py-4 text-sm font-black uppercase tracking-wide text-black shadow-lg transition hover:scale-[1.03] disabled:opacity-50"
            style={{ boxShadow: "0 8px 30px rgba(251,146,60,0.3)" }}
          >
            {starting ? "Ouverture du jeu..." : "Commencer le jeu 🚀"}
          </button>

          <button
            onClick={() => router.replace("/dashboard")}
            className="mt-3 w-full rounded-xl border border-white/15 py-3 text-sm font-semibold text-zinc-400 transition hover:border-yellow-400/40 hover:text-yellow-400"
          >
            ← Retour au Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}