"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────
type Tournament = {
  id: string;
  name: string;
  game_type: "drapeaux" | "memory" | "memory_cards" | "tank_arena";
  entry_coins: number;
  min_players: number;
  max_players: number;
  starts_at: string;
  play_window: number;
  status: "upcoming" | "active" | "finished" | "cancelled";
  player_count: number;
};

type User = {
  id: string;
  full_name: string;
  coins: number;
  tickets: number;
};

type Notif = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const GAME_LABELS: Record<string, string> = {
  drapeaux:     "Quiz Drapeaux",
  memory:       "Memory",
  memory_cards: "Memory Cards",
  tank_arena:   "Tank Arena",
};

const GAME_ICONS: Record<string, string> = {
  drapeaux:     "ti-flag",
  memory:       "ti-brain",
  memory_cards: "ti-cards",
  tank_arena:   "ti-tank",
};

const STATUS_LABELS: Record<string, string> = {
  upcoming:  "À venir",
  active:    "En cours",
  finished:  "Terminé",
  cancelled: "Annulé",
};

function calcPrize(n: number): number {
  if (n <= 5) return 200;
  if (n === 6) return 220;
  if (n === 7) return 245;
  if (n === 8) return 270;
  if (n === 9) return 305;
  return 350;
}

// ─── Countdown ───────────────────────────────────────────────────────────────
function useCountdown(startsAt: string, playWindow: number, status: string) {
  const [txt, setTxt] = useState("");

  useEffect(() => {
    function calc() {
      const now = Date.now();
      const start = new Date(startsAt).getTime();
      const end = start + playWindow * 60 * 1000;

      if (status === "active") {
        const diff = end - now;
        if (diff <= 0) { setTxt("Fenêtre fermée"); return; }
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTxt(`Fenêtre ferme dans ${m}min ${String(s).padStart(2,"0")}s`);
      } else if (status === "upcoming") {
        const diff = start - now;
        if (diff <= 0) { setTxt("Démarrage imminent…"); return; }
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTxt(`Démarre dans ${h}h ${String(m).padStart(2,"0")}min ${String(s).padStart(2,"0")}s`);
      } else {
        setTxt("");
      }
    }
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [startsAt, playWindow, status]);

  return txt;
}

// ─── Carte tournoi ────────────────────────────────────────────────────────────
function TournamentCard({
  t, user, onJoin, joining, isJoined,
}: {
  t: Tournament;
  user: User | null;
  onJoin: (id: string) => void;
  joining: string | null;
  isJoined: boolean;
}) {
  const countdown = useCountdown(t.starts_at, t.play_window, t.status);
  const pct       = Math.min(100, Math.round((t.player_count / t.max_players) * 100));
  const isFull    = t.player_count >= t.max_players;
  const hasCoins  = !!user && user.coins >= t.entry_coins;
  const missing   = Math.max(0, t.min_players - t.player_count);
  const prizeNow  = calcPrize(Math.max(t.player_count, t.min_players));
  const isJoining = joining === t.id;

  const canJoin = t.status === "upcoming" && !isFull && hasCoins && !isJoined;

  const statusColor: Record<string, string> = {
    upcoming:  "bg-[var(--color-background-info)] text-[var(--color-text-info)]",
    active:    "bg-[var(--color-background-success)] text-[var(--color-text-success)]",
    finished:  "bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)]",
    cancelled: "bg-[var(--color-background-danger)] text-[var(--color-text-danger)]",
  };

  return (
    <div className="rounded-[var(--border-radius-lg)] border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] overflow-hidden flex flex-col">

      {/* Header */}
      <div className="bg-[var(--color-background-secondary)] border-b border-[var(--color-border-tertiary)] px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <i className={`ti ${GAME_ICONS[t.game_type]} text-amber-600`} style={{fontSize:17,flexShrink:0}} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-[var(--color-text-primary)] truncate">{t.name}</p>
            <p className="text-[12px] text-[var(--color-text-secondary)]">
              {GAME_LABELS[t.game_type]} · {t.play_window} min · {t.entry_coins} coins
            </p>
          </div>
        </div>
        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-md flex-shrink-0 flex items-center gap-1.5 ${statusColor[t.status]}`}>
          {t.status === "active" && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
          )}
          {STATUS_LABELS[t.status]}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">

        {/* Prizes */}
        <div className="border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-md)] overflow-hidden">
          <div className="flex justify-between items-center px-3 py-2 border-b border-[var(--color-border-tertiary)]">
            <span className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
              <i className="ti ti-medal" style={{fontSize:14,color:"#BA7517"}} aria-hidden="true" />
              1er place
            </span>
            <span className="text-[13px] font-medium text-amber-700">
              {prizeNow} gds
              <span className="text-[11px] text-[var(--color-text-secondary)] ml-1">(200–350)</span>
            </span>
          </div>
          <div className="flex justify-between items-center px-3 py-2 border-b border-[var(--color-border-tertiary)]">
            <span className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
              <i className="ti ti-ticket" style={{fontSize:14,color:"#185FA5"}} aria-hidden="true" />
              2e place
            </span>
            <span className="text-[13px] font-medium text-blue-700">1 ticket sponsorisé</span>
          </div>
          <div className="flex justify-between items-center px-3 py-2">
            <span className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
              <i className="ti ti-users" style={{fontSize:14,color:"#0F6E56"}} aria-hidden="true" />
              Autres
            </span>
            <span className="text-[13px] font-medium text-teal-700">5 coins cashback + XP</span>
          </div>
        </div>

        {/* Prize scale */}
        <div className="bg-[var(--color-background-secondary)] rounded-[var(--border-radius-md)] px-3 py-2.5">
          <p className="text-[11px] text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
            Prize 1er selon joueurs
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {[5,6,7,8,9,10].map((n) => {
              const isActive = t.player_count >= n;
              return (
                <div key={n} className="flex justify-between text-[12px]">
                  <span className="text-[var(--color-text-secondary)]">{n} joueurs</span>
                  <span className={`font-medium ${isActive ? "text-amber-700" : "text-[var(--color-text-primary)]"}`}>
                    {calcPrize(n)} gds{n === 10 ? " ✦" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compteur joueurs */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isFull ? "bg-red-500" : t.status === "active" ? "bg-green-500" : "bg-amber-500"
              }`} />
              {t.player_count} / {t.max_players} joueurs inscrits
            </span>
            <span className="text-[11px] text-[var(--color-text-secondary)]">min {t.min_players}</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--color-border-tertiary)] overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-600 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Alerte minimum pas atteint */}
        {missing > 0 && t.status === "upcoming" && (
          <div className="flex items-start gap-2 bg-[var(--color-background-warning)] border border-[var(--color-border-warning)] rounded-[var(--border-radius-md)] px-3 py-2.5 text-[13px] text-[var(--color-text-warning)] leading-relaxed">
            <i className="ti ti-alert-triangle" style={{fontSize:15,flexShrink:0,marginTop:1}} aria-hidden="true" />
            <span>
              Il faut encore <strong>{missing} joueur{missing > 1 ? "s" : ""}</strong> pour que le tournoi démarre.
              Si le minimum n&apos;est pas atteint, tes coins sont remboursés automatiquement.
            </span>
          </div>
        )}

        {/* Alerte coins insuffisants */}
        {!hasCoins && user && t.status === "upcoming" && !isJoined && (
          <div className="flex items-start gap-2 bg-[var(--color-background-danger)] border border-[var(--color-border-danger)] rounded-[var(--border-radius-md)] px-3 py-2.5 text-[13px] text-[var(--color-text-danger)]">
            <i className="ti ti-coin-off" style={{fontSize:15,flexShrink:0,marginTop:1}} aria-hidden="true" />
            <span>Coins insuffisants — tu as {user.coins} coins, il en faut {t.entry_coins}.</span>
          </div>
        )}

        {/* Déjà inscrit */}
        {isJoined && t.status === "upcoming" && (
          <div className="flex items-center gap-2 bg-[var(--color-background-success)] border border-[var(--color-border-success)] rounded-[var(--border-radius-md)] px-3 py-2.5 text-[13px] text-[var(--color-text-success)]">
            <i className="ti ti-check" style={{fontSize:15}} aria-hidden="true" />
            <span>Tu es inscrit à ce tournoi. Attends le démarrage.</span>
          </div>
        )}

        {/* Timer */}
        {countdown && (
          <p className="text-center text-[12px] text-[var(--color-text-secondary)] font-medium tabular-nums">
            {t.status === "active" && (
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 align-middle" />
            )}
            {countdown}
          </p>
        )}

        {/* Boutons */}
        <div className="mt-auto flex flex-col gap-2">
          {/* Bouton rejoindre */}
          {t.status === "upcoming" && !isJoined && (
            <button
              disabled={!canJoin || isJoining}
              onClick={() => onJoin(t.id)}
              className={`w-full rounded-[var(--border-radius-md)] py-2.5 text-[13px] font-medium border flex items-center justify-center gap-2 transition ${
                canJoin
                  ? "border-[var(--color-border-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-secondary)] cursor-pointer"
                  : "opacity-40 cursor-not-allowed border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]"
              }`}
            >
              {isJoining ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Inscription…
                </>
              ) : (
                <>
                  <i className="ti ti-sword" style={{fontSize:14}} aria-hidden="true" />
                  Rejoindre — {t.entry_coins} coins
                </>
              )}
            </button>
          )}

          {/* Bouton jouer si actif et inscrit */}
          {t.status === "active" && isJoined && (
            <Link
              href={`/tournaments/pro/${t.id}/play`}
              className="w-full rounded-[var(--border-radius-md)] py-2.5 text-[13px] font-medium border border-green-600 text-green-700 hover:bg-green-50 flex items-center justify-center gap-2 transition text-center"
            >
              <i className="ti ti-player-play" style={{fontSize:14}} aria-hidden="true" />
              Jouer maintenant
            </Link>
          )}

          {/* Bouton résultats si terminé */}
          {(t.status === "finished" || t.status === "cancelled") && (
            <Link
              href={`/tournaments/pro/${t.id}/results`}
              className="w-full rounded-[var(--border-radius-md)] py-2.5 text-[13px] font-medium border border-[var(--color-border-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)] flex items-center justify-center gap-2 transition text-center"
            >
              <i className="ti ti-trophy" style={{fontSize:14}} aria-hidden="true" />
              Voir les résultats
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Panneau notifications ────────────────────────────────────────────────────
function NotifPanel({
  notifs, onRead, onClose,
}: {
  notifs: Notif[];
  onRead: (id: string) => void;
  onClose: () => void;
}) {
  const NOTIF_ICONS: Record<string, string> = {
    tournament_start: "ti-trophy",
    tournament_end:   "ti-flag-check",
    prize_winner:     "ti-medal",
    prize_second:     "ti-ticket",
    prize_cashback:   "ti-coin",
    refund:           "ti-refresh",
    score_saved:      "ti-check",
  };

  return (
    <div className="absolute right-0 top-12 w-80 bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] shadow-lg z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-tertiary)]">
        <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Notifications</p>
        <button onClick={onClose} className="text-[var(--color-text-secondary)]">
          <i className="ti ti-x" style={{fontSize:15}} aria-hidden="true" />
        </button>
      </div>
      {notifs.length === 0 ? (
        <div className="px-4 py-6 text-center text-[13px] text-[var(--color-text-secondary)]">
          Aucune notification
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto divide-y divide-[var(--color-border-tertiary)]">
          {notifs.map((n) => (
            <div
              key={n.id}
              onClick={() => onRead(n.id)}
              className={`px-4 py-3 cursor-pointer hover:bg-[var(--color-background-secondary)] transition ${
                !n.is_read ? "bg-[var(--color-background-info)]" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                <i className={`ti ${NOTIF_ICONS[n.type] ?? "ti-bell"} text-amber-600 flex-shrink-0`} style={{fontSize:15,marginTop:1}} aria-hidden="true" />
                <div>
                  <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{n.title}</p>
                  <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-0.5">{n.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function TournamentsProPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [user, setUser]               = useState<User | null>(null);
  const [joinedIds, setJoinedIds]     = useState<Set<string>>(new Set());
  const [notifs, setNotifs]           = useState<Notif[]>([]);
  const [showNotifs, setShowNotifs]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [joining, setJoining]         = useState<string | null>(null);
  const [toast, setToast]             = useState<{msg: string; ok: boolean} | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const unread = notifs.filter((n) => !n.is_read).length;

  // ── Chargement ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.replace("/login"); return; }

    // User
    const { data: userData } = await supabase
      .from("users")
      .select("id, full_name, coins, tickets")
      .eq("id", authUser.id)
      .single();
    if (!userData) { router.replace("/login"); return; }
    setUser(userData);

    // Tournois
    const { data: tData } = await supabase
      .from("tournaments_pro")
      .select("*, tournament_pro_entries(count)")
      .order("starts_at", { ascending: true });

    if (tData) {
      setTournaments(tData.map((t: any) => ({
        ...t,
        player_count: t.tournament_pro_entries?.[0]?.count ?? 0,
      })));
    }

    // Tournois où l'user est inscrit
    const { data: entries } = await supabase
      .from("tournament_pro_entries")
      .select("tournament_id")
      .eq("user_id", authUser.id);
    if (entries) {
      setJoinedIds(new Set(entries.map((e: any) => e.tournament_id)));
    }

    // Notifications
    const { data: notifData } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (notifData) setNotifs(notifData);

    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();

    // Realtime — compteur joueurs
    const ch1 = supabase
      .channel("pro-entries-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_pro_entries" },
        () => loadData())
      .subscribe();

    // Realtime — statuts tournois
    const ch2 = supabase
      .channel("pro-tournaments-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tournaments_pro" },
        () => loadData())
      .subscribe();

    // Realtime — notifications
    const ch3 = supabase
      .channel("notifs-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" },
        () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
    };
  }, [loadData]);

  // ── Toast ───────────────────────────────────────────────────────────────────
  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Rejoindre ───────────────────────────────────────────────────────────────
  async function handleJoin(tournamentId: string) {
    if (!user) return;
    setJoining(tournamentId);

    const { data, error } = await supabase.rpc("join_tournament_pro", {
      p_tournament_id: tournamentId,
    });

    if (error || !data?.ok) {
      showToast(data?.error ?? error?.message ?? "Erreur inconnue", false);
      setJoining(null);
      return;
    }

    showToast("Inscrit avec succès ! Bonne chance 🏆", true);
    setJoining(null);
    loadData();
  }

  // ── Marquer notif lue ────────────────────────────────────────────────────────
  async function handleReadNotif(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090b] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
          <p className="text-zinc-400">Chargement…</p>
        </div>
      </main>
    );
  }

  // ── Nav links ───────────────────────────────────────────────────────────────
  const navLinks = [
    ["/dashboard",           "Dashboard"],
    ["/tournaments",         "Tournois classiques"],
    ["/tournaments/pro",     "Tournois Pro"],
    ["/tournamentsponsorise","Tournois Sponsorisé"],
    ["/duel",                "Duel 1v1"],
    ["/training",            "Entraînement"],
    ["/withdraw",            "Retrait"],
    ["/depot",               "Dépôt"],
    ["/support",             "Support"],
  ];

  const upcoming  = tournaments.filter((t) => t.status === "upcoming");
  const active    = tournaments.filter((t) => t.status === "active");
  const finished  = tournaments.filter((t) => ["finished","cancelled"].includes(t.status));

  return (
    <main className="min-h-screen bg-[#09090b] text-white">

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
          toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          <i className={`ti ${toast.ok ? "ti-check" : "ti-x"}`} style={{fontSize:15}} aria-hidden="true" />
          {toast.msg}
        </div>
      )}

      {/* ── Sidebar desktop ────────────────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-yellow-400/10 bg-zinc-950/90 backdrop-blur-xl p-5 lg:flex flex-col z-30">
        <Link href="/" className="flex items-center gap-2 text-xl font-black text-yellow-400">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-400 text-black">Q</span>
          QuizArena
        </Link>

        <div className="mt-5 rounded-2xl border border-yellow-400/10 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Connecté</p>
          <p className="mt-1 text-sm font-semibold text-white">{user?.full_name}</p>
          <div className="mt-1 flex items-center gap-3 text-xs">
            <span className="text-amber-500">
              <i className="ti ti-coin" style={{fontSize:11}} aria-hidden="true" /> {user?.coins} coins
            </span>
            <span className="text-zinc-400">
              <i className="ti ti-ticket" style={{fontSize:11}} aria-hidden="true" /> {user?.tickets} tickets
            </span>
          </div>
        </div>

        <nav className="mt-5 space-y-1 flex-1 overflow-y-auto">
          {navLinks.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`block rounded-xl px-4 py-2.5 text-sm transition ${
                href === "/tournaments/pro"
                  ? "bg-yellow-400 font-bold text-black"
                  : "text-zinc-300 hover:bg-white/5 hover:text-yellow-400"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <button
          onClick={async () => { await supabase.auth.signOut(); router.replace("/login"); }}
          className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 transition"
        >
          Déconnexion
        </button>
      </aside>

      {/* ── Hamburger mobile ───────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-black/60 backdrop-blur-xl border border-yellow-400/30"
        >
          <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed left-0 top-0 h-screen w-72 z-50 border-r border-yellow-400/20 bg-zinc-950/95 backdrop-blur-xl p-5 lg:hidden overflow-y-auto flex flex-col">
            <div className="flex justify-end mb-3">
              <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 p-1">
                <i className="ti ti-x" style={{fontSize:18}} aria-hidden="true" />
              </button>
            </div>
            <Link href="/" className="flex items-center gap-2 text-xl font-black text-yellow-400 mb-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-400 text-black">Q</span>
              QuizArena
            </Link>
            <div className="rounded-xl border border-yellow-400/10 bg-black/30 p-3 mb-4">
              <p className="text-xs text-zinc-500">Connecté</p>
              <p className="text-sm font-semibold text-white mt-0.5">{user?.full_name}</p>
              <p className="text-xs text-amber-500 mt-1">{user?.coins} coins · {user?.tickets} tickets</p>
            </div>
            <nav className="space-y-1 flex-1">
              {navLinks.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-xl px-4 py-2.5 text-sm ${
                    href === "/tournaments/pro"
                      ? "bg-yellow-400 font-bold text-black"
                      : "text-zinc-300"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* ── Contenu ────────────────────────────────────────────────────────── */}
      <section className="lg:ml-72 p-4 sm:p-6 pt-16 lg:pt-6 pb-24">

        {/* Hero + cloche notifs */}
        <div className="rounded-3xl border border-yellow-400/10 bg-black/30 p-5 sm:p-6 backdrop-blur-xl mb-6 relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-yellow-400/70">Compétition payante</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-black text-white">Tournois Pro</h1>
              <p className="mt-1 text-sm text-zinc-400 max-w-lg">
                50 coins d&apos;entrée. Plus il y a de joueurs, plus le prize monte.
                Minimum 5 joueurs — sinon remboursement automatique.
              </p>
            </div>

            {/* Cloche notifications */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-2.5 rounded-xl border border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] hover:bg-[var(--color-background-primary)] transition"
              >
                <i className="ti ti-bell text-[var(--color-text-secondary)]" style={{fontSize:18}} aria-hidden="true" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              {showNotifs && (
                <NotifPanel
                  notifs={notifs}
                  onRead={handleReadNotif}
                  onClose={() => setShowNotifs(false)}
                />
              )}
            </div>
          </div>

          {/* Métriques */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { val: "50",      label: "coins d'entrée",  color: "text-amber-500" },
              { val: "5 – 10",  label: "joueurs",         color: "text-white" },
              { val: "200–350", label: "gds 1er",         color: "text-green-400" },
              { val: "10%",     label: "commission",      color: "text-white" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-black/40 border border-white/5 px-3 py-2.5 text-center">
                <p className={`text-lg font-bold ${m.color}`}>{m.val}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Garantie remboursement */}
        <div className="flex items-start gap-3 rounded-2xl border border-yellow-400/10 bg-yellow-400/5 p-4 mb-6">
          <i className="ti ti-shield-check text-yellow-400 flex-shrink-0 mt-0.5" style={{fontSize:18}} aria-hidden="true" />
          <p className="text-sm text-zinc-400 leading-relaxed">
            <span className="text-white font-semibold">Remboursement garanti</span> — si moins de 5 joueurs
            sont inscrits à l&apos;heure de départ, tes{" "}
            <span className="text-white">50 coins</span> reviennent automatiquement sur ton compte.
          </p>
        </div>

        {/* Tournois actifs */}
        {active.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                En cours — joue maintenant
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {active.map((t) => (
                <TournamentCard
                  key={t.id} t={t} user={user}
                  onJoin={handleJoin} joining={joining}
                  isJoined={joinedIds.has(t.id)}
                />
              ))}
            </div>
          </>
        )}

        {/* Tournois à venir */}
        {upcoming.length > 0 && (
          <>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
              Inscriptions ouvertes
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {upcoming.map((t) => (
                <TournamentCard
                  key={t.id} t={t} user={user}
                  onJoin={handleJoin} joining={joining}
                  isJoined={joinedIds.has(t.id)}
                />
              ))}
            </div>
          </>
        )}

        {/* Tournois terminés */}
        {finished.length > 0 && (
          <>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
              Terminés
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {finished.map((t) => (
                <TournamentCard
                  key={t.id} t={t} user={user}
                  onJoin={handleJoin} joining={joining}
                  isJoined={joinedIds.has(t.id)}
                />
              ))}
            </div>
          </>
        )}

        {/* Aucun tournoi */}
        {tournaments.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🏆</p>
            <p className="text-lg font-semibold text-white mb-2">Aucun tournoi disponible</p>
            <p className="text-sm text-zinc-500">Crée un tournoi dans Supabase pour commencer.</p>
          </div>
        )}

      </section>
    </main>
  );
}