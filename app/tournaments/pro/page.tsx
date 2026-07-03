"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Config ───────────────────────────────────────────────────────────────────
const GAME_ICONS: Record<string, string> = {
  drapeaux:     "ti-flag",
  memory:       "ti-brain",
  memory_cards: "ti-cards",
  tank_arena:   "ti-tank",
};
const GAME_LABELS: Record<string, string> = {
  drapeaux:     "Quiz Drapeaux",
  memory:       "Memory",
  memory_cards: "Memory Cards",
  tank_arena:   "Tank Arena",
};

// ─── FIX 4 : Prix corrects ────────────────────────────────────────────────────
// 5j=220, 6j=260, 7j=305, 8j=350, 9j=395, 10j=440
function getPrize(n: number): number {
  if (n <= 5) return 220;
  if (n === 6) return 260;
  if (n === 7) return 305;
  if (n === 8) return 350;
  if (n === 9) return 395;
  return 440;
}

// ─── FIX 3 : Countdown — timer stable, jamais interrompu ─────────────────────
// On monte le composant une seule fois avec key={t.id}
// Le setInterval tourne indépendamment des re-renders parent
function Countdown({ startsAt, playWindow, status }: {
  startsAt: string; playWindow: number; status: string;
}) {
  const [txt, setTxt]       = useState("");
  const [urgent, setUrgent] = useState(false);
  const intervalRef         = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function calc() {
      const now   = Date.now();
      const start = new Date(startsAt).getTime();
      const end   = start + playWindow * 60000;

      if (status === "active") {
        const diff = end - now;
        if (diff <= 0) { setTxt("Fenêtre fermée"); setUrgent(false); return; }
        setUrgent(diff < 300000);
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTxt(`Ferme dans ${m}min ${String(s).padStart(2, "0")}s`);
      } else if (status === "upcoming") {
        const diff = start - now;
        if (diff <= 0) { setTxt("Démarrage imminent…"); setUrgent(false); return; }
        setUrgent(diff < 600000);
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTxt(h > 0
          ? `Disponible dans ${h}h ${String(m).padStart(2, "0")}min ${String(s).padStart(2, "0")}s`
          : `Disponible dans ${m}min ${String(s).padStart(2, "0")}s`
        );
      } else {
        setTxt(""); setUrgent(false);
      }
    }

    // Calcul immédiat au mount
    calc();

    // FIX PRINCIPAL : on démarre l'interval immédiatement et on ne le détruit
    // que quand startsAt ou status change réellement
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(calc, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // startsAt et status sont les seules vraies dépendances du calcul
  }, [startsAt, playWindow, status]);

  if (!txt) return null;

  return (
    <p style={{
      textAlign: "center",
      fontSize: 12,
      fontVariantNumeric: "tabular-nums",
      color: urgent ? "#FAC775" : status === "active" ? "rgba(192,221,151,.7)" : "rgba(255,255,255,.3)",
      fontWeight: urgent || status === "active" ? 500 : 400,
      margin: 0,
    }}>
      {status === "active" && (
        <span style={{
          display: "inline-block", width: 5, height: 5, borderRadius: "50%",
          background: "#97C459", marginRight: 6, verticalAlign: "middle",
          animation: "pulseDot 1.5s infinite",
        }} />
      )}
      {txt}
    </p>
  );
}

// ─── FIX 2 : Cadenas — animations correctes selon statut ─────────────────────
// - Arrivée sur upcoming → cadenas fermé animé immédiatement
// - Arrivée sur active → déjà unlocked, pas d'animation
// - upcoming → active via Realtime → animation de déverrouillage
function LockDisplay({ status }: { status: string }) {
  // Phase initiale selon le statut à l'arrivée
  const [phase, setPhase] = useState<"locked" | "unlocking" | "unlocked">(() => {
    if (status === "active") return "unlocked";
    if (status === "upcoming") return "locked";
    return "unlocked";
  });

  const prevStatusRef = useRef(status);
  const mountedRef    = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      // Premier render : on définit la phase selon le statut actuel
      mountedRef.current = true;
      if (status === "upcoming") setPhase("locked");
      else setPhase("unlocked");
      prevStatusRef.current = status;
      return;
    }

    // Changement de statut via Realtime
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (prev === "upcoming" && status === "active") {
      // Animation de déverrouillage !
      setPhase("unlocking");
      setTimeout(() => setPhase("unlocked"), 1000);
    } else if (status === "active") {
      setPhase("unlocked");
    } else if (status === "upcoming") {
      setPhase("locked");
    }
  }, [status]);

  if (phase === "unlocked") return null;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: 10, padding: "14px 0",
    }}>
      <div style={{ position: "relative", width: 52, height: 52 }}>
        {/* Halo pulsant — locked seulement */}
        {phase === "locked" && (
          <div style={{
            position: "absolute", inset: -5, borderRadius: "50%",
            background: "rgba(250,199,117,.08)",
            animation: "lockHalo 2s ease-in-out infinite",
          }} />
        )}

        {/* Cercle principal */}
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: phase === "unlocking"
            ? "rgba(192,221,151,.12)" : "rgba(250,199,117,.08)",
          border: phase === "unlocking"
            ? "1px solid rgba(192,221,151,.35)"
            : "0.5px solid rgba(250,199,117,.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: phase === "locked" ? "lockFloat 3s ease-in-out infinite"
            : phase === "unlocking" ? "lockBurst .8s ease forwards"
            : "none",
          transition: "background .4s, border .4s",
        }}>
          <i
            className={phase === "unlocking" ? "ti ti-lock-open" : "ti ti-lock"}
            style={{
              fontSize: 22,
              color: phase === "unlocking" ? "#C0DD97" : "#FAC775",
              transition: "color .3s",
            }}
            aria-hidden="true"
          />
        </div>

        {/* Éclats autour lors du unlock */}
        {phase === "unlocking" && (
          <>
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <div key={deg} style={{
                position: "absolute",
                top: "50%", left: "50%",
                width: 5, height: 5, borderRadius: "50%",
                background: "#C0DD97",
                transform: `rotate(${deg}deg) translateY(-28px)`,
                animation: "sparkle .7s ease-out forwards",
                opacity: 0,
              }} />
            ))}
          </>
        )}
      </div>

      {phase === "locked" && (
        <p style={{
          fontSize: 12, color: "rgba(255,255,255,.3)",
          textAlign: "center", lineHeight: 1.5, margin: 0,
        }}>
          Disponible bientôt · Notification à l&apos;ouverture
        </p>
      )}
      {phase === "unlocking" && (
        <p style={{
          fontSize: 13, color: "#C0DD97", fontWeight: 600,
          animation: "fadeUp .4s ease", margin: 0,
        }}>
          🔓 Tournoi déverrouillé !
        </p>
      )}
    </div>
  );
}

// ─── Carte tournoi ────────────────────────────────────────────────────────────
function TournamentCard({
  t, user, onJoin, joining, hasPlayed,
}: {
  t: Tournament; user: User | null;
  onJoin: (id: string) => void; joining: string | null; hasPlayed: boolean;
}) {
  const pct = Math.min(100, Math.round((t.player_count / t.max_players) * 100));
  const isFull = t.player_count >= t.max_players;
  const hasCoins = !!user && user.coins >= t.entry_coins;
  const prizeNow = getPrize(Math.max(t.player_count, t.min_players));
  const isJoining = joining === t.id;
  const canJoin = t.status === "active" && !isFull && hasCoins && !hasPlayed;
  const isActive = t.status === "active";
  const isFinished = t.status === "finished" || t.status === "cancelled";

  const statusLabel =
    t.status === "upcoming"
      ? "Bientôt"
      : t.status === "active"
      ? "En cours"
      : t.status === "finished"
      ? "Terminé"
      : "Annulé";

  return (
    <div
      style={{
        background: isActive
          ? "linear-gradient(180deg,#141b12,#0d0f0d)"
          : "linear-gradient(180deg,#171713,#0d0d0b)",
        border: isActive
          ? "1px solid rgba(192,221,151,.38)"
          : "1px solid rgba(250,204,21,.16)",
        borderRadius: 18,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: isActive
          ? "0 0 34px rgba(151,196,89,.10)"
          : "0 0 24px rgba(250,204,21,.04)",
        animation: "cardIn .35s ease both",
      }}
    >
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid rgba(255,255,255,.07)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            flexShrink: 0,
            background: isActive ? "rgba(192,221,151,.13)" : "rgba(250,204,21,.10)",
            border: isActive
              ? "1px solid rgba(192,221,151,.35)"
              : "1px solid rgba(250,204,21,.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isActive ? "#C0DD97" : "#facc15",
          }}
        >
          <i className={`ti ${GAME_ICONS[t.game_type]}`} style={{ fontSize: 21 }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {t.name}
          </p>

          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,.62)",
              marginTop: 5,
            }}
          >
            {GAME_LABELS[t.game_type]} · {t.play_window} min · {t.entry_coins} coins
          </p>
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            padding: "6px 10px",
            borderRadius: 999,
            flexShrink: 0,
            background: isActive
              ? "rgba(192,221,151,.14)"
              : isFinished
              ? "rgba(255,255,255,.07)"
              : "rgba(250,204,21,.12)",
            color: isActive ? "#C0DD97" : isFinished ? "rgba(255,255,255,.48)" : "#facc15",
            border: isActive
              ? "1px solid rgba(192,221,151,.34)"
              : isFinished
              ? "1px solid rgba(255,255,255,.10)"
              : "1px solid rgba(250,204,21,.25)",
          }}
        >
          {isActive && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#97C459",
                animation: "pulseDot 1.5s infinite",
              }}
            />
          )}
          {statusLabel}
        </span>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 8,
          }}
        >
          <PrizeLine icon="🥇" label="1ère place" value={isActive ? `${prizeNow} GDS` : "220–440 GDS"} color="#facc15" />
          <PrizeLine icon="🥈" label="2ème place" value="1 ticket sponsorisé" color="#85B7EB" />
          <PrizeLine icon="💪" label="Autres" value="Cashback + XP bientôt" color="rgba(255,255,255,.72)" />
        </div>

        {t.status === "upcoming" && (
          <div
            style={{
              background: "rgba(250,204,21,.06)",
              border: "1px solid rgba(250,204,21,.14)",
              borderRadius: 13,
              padding: 12,
            }}
          >
            <p
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                color: "rgba(250,204,21,.75)",
                marginBottom: 8,
                fontWeight: 700,
              }}
            >
              Gain 1er selon joueurs
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
              {[5, 6, 7, 8, 9, 10].map((n) => (
                <div
                  key={n}
                  style={{
                    textAlign: "center",
                    padding: "7px 4px",
                    borderRadius: 10,
                    background: t.player_count >= n ? "rgba(250,204,21,.12)" : "rgba(255,255,255,.04)",
                    border: t.player_count >= n
                      ? "1px solid rgba(250,204,21,.24)"
                      : "1px solid rgba(255,255,255,.06)",
                  }}
                >
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.58)" }}>{n}j</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#facc15" }}>
                    {getPrize(n)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <LockDisplay status={t.status} />

        {!isFinished && (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                color: "rgba(255,255,255,.66)",
              }}
            >
              <span>
                {t.player_count} / {t.max_players} joueurs
              </span>
              <span>min {t.min_players}</span>
            </div>

            <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  borderRadius: 999,
                  background: isActive
                    ? "linear-gradient(90deg,#97C459,#C0DD97)"
                    : "linear-gradient(90deg,#facc15,#f59e0b)",
                  width: `${pct}%`,
                  transition: "width .6s ease",
                }}
              />
            </div>
          </div>
        )}

        {!hasCoins && user && isActive && !hasPlayed && (
          <div
            style={{
              background: "rgba(239,68,68,.10)",
              border: "1px solid rgba(239,68,68,.28)",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 13,
              color: "#fca5a5",
              lineHeight: 1.45,
            }}
          >
            Coins insuffisants — tu as {user.coins} coins, il en faut {t.entry_coins}.
          </div>
        )}

        {hasPlayed && isActive && (
          <div
            style={{
              background: "rgba(192,221,151,.09)",
              border: "1px solid rgba(192,221,151,.24)",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 13,
              color: "#C0DD97",
            }}
          >
            ✅ Score enregistré · Attends la fin du tournoi.
          </div>
        )}

        <Countdown startsAt={t.starts_at} playWindow={t.play_window} status={t.status} />

        <div style={{ marginTop: "auto" }}>
          {isActive && !hasPlayed && (
            <button
              disabled={!canJoin || isJoining}
              onClick={() => onJoin(t.id)}
              style={{
                width: "100%",
                borderRadius: 14,
                padding: "14px 12px",
                fontSize: 15,
                fontWeight: 900,
                cursor: canJoin ? "pointer" : "not-allowed",
                background: canJoin
                  ? "linear-gradient(135deg,#C0DD97,#97C459)"
                  : "rgba(255,255,255,.05)",
                border: canJoin
                  ? "1px solid rgba(192,221,151,.55)"
                  : "1px solid rgba(255,255,255,.10)",
                color: canJoin ? "#101807" : "rgba(255,255,255,.35)",
                opacity: canJoin ? 1 : 0.6,
              }}
            >
              {isJoining ? "Préparation..." : isFull ? "Complet" : !hasCoins ? "Coins insuffisants" : `Jouer — ${t.entry_coins} coins`}
            </button>
          )}

          {isFinished && (
            <Link
              href={`/tournaments/pro/${t.id}/results`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                borderRadius: 14,
                padding: "14px 12px",
                fontSize: 14,
                fontWeight: 800,
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.12)",
                color: "rgba(255,255,255,.72)",
                textDecoration: "none",
              }}
            >
              Voir les résultats 🏆
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function PrizeLine({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        padding: "11px 12px",
        borderRadius: 12,
        background: "rgba(255,255,255,.045)",
        border: "1px solid rgba(255,255,255,.075)",
      }}
    >
      <span style={{ fontSize: 13, color: "rgba(255,255,255,.68)" }}>
        {icon} {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 800, color }}>{value}</span>
    </div>
  );
}

// ─── Panel notifications ──────────────────────────────────────────────────────
function NotifPanel({ notifs, onRead, onClose }: {
  notifs: Notif[]; onRead: (id: string) => void; onClose: () => void;
}) {
  const ICONS: Record<string, string> = {
    tournament_start: "ti-lock-open",
    prize_winner:     "ti-medal",
    prize_second:     "ti-ticket",
    prize_cashback:   "ti-coin",
    refund:           "ti-refresh",
    score_saved:      "ti-check",
    tournament_end:   "ti-flag-check",
  };
  return (
    <div style={{
      position: "absolute", right: 0, top: 46, width: 296,
      background: "#191923",
      border: "0.5px solid rgba(255,255,255,.1)",
      borderRadius: 14, overflow: "hidden", zIndex: 100,
      boxShadow: "0 20px 60px rgba(0,0,0,.75)",
      animation: "fadeUp .2s ease",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "11px 13px",
        borderBottom: "0.5px solid rgba(255,255,255,.06)",
      }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>Notifications</p>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,.35)", padding: 2,
        }}>
          <i className="ti ti-x" style={{ fontSize: 15 }} aria-hidden="true" />
        </button>
      </div>
      {notifs.length === 0 ? (
        <p style={{ padding: "20px", textAlign: "center", fontSize: 13, color: "rgba(255,255,255,.25)" }}>
          Aucune notification
        </p>
      ) : (
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {notifs.map((n) => (
            <div key={n.id} onClick={() => onRead(n.id)} style={{
              padding: "10px 13px",
              borderBottom: "0.5px solid rgba(255,255,255,.04)",
              cursor: "pointer",
              background: !n.is_read ? "rgba(250,199,117,.03)" : "transparent",
              display: "flex", gap: 9, alignItems: "flex-start",
            }}>
              <i className={`ti ${ICONS[n.type] ?? "ti-bell"}`}
                style={{ fontSize: 14, color: "#FAC775", flexShrink: 0, marginTop: 1 }}
                aria-hidden="true" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{n.title}</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,.38)", lineHeight: 1.5, marginTop: 2 }}>{n.message}</p>
              </div>
              {!n.is_read && (
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#EF9F27", flexShrink: 0, marginTop: 3,
                }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
const NAV = [
  ["/dashboard",            "Dashboard"],
  ["/tournaments/pro",      "Tournois Pro"],
  ["/tournamentsponsorise", "Tournois Sponsorisé"],
  ["/duel",                 "Duel 1v1"],
  ["/training",             "Entraînement"],
  ["/withdraw",             "Retrait"],
  ["/depot",                "Dépôt"],
  ["/support",              "Support"],
];

// ─── Page principale ──────────────────────────────────────────────────────────
export default function TournamentsProPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [user, setUser]               = useState<User | null>(null);
  const [playedIds, setPlayedIds]     = useState<Set<string>>(new Set());
  const [notifs, setNotifs]           = useState<Notif[]>([]);
  const [showNotifs, setShowNotifs]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [joining, setJoining]         = useState<string | null>(null);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const router   = useRouter();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotifs(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const loadData = useCallback(async () => {
    const { data: { user: au } } = await supabase.auth.getUser();
    if (!au) { router.replace("/login"); return; }

    const { data: ud } = await supabase
      .from("users").select("id,full_name,coins,tickets")
      .eq("id", au.id).single();
    if (!ud) { router.replace("/login"); return; }
    setUser(ud);

    const { data: td } = await supabase
      .from("tournaments_pro")
      .select("*, tournament_pro_entries(count)")
      .order("starts_at", { ascending: true });

    if (td) {
      setTournaments(td.map((t: any) => ({
        ...t,
        player_count: t.tournament_pro_entries?.[0]?.count ?? 0,
      })));
    }

    const { data: played } = await supabase
      .from("tournament_pro_entries")
      .select("tournament_id")
      .eq("user_id", au.id)
      .not("score_submitted_at", "is", null);
    if (played) setPlayedIds(new Set(played.map((e: any) => e.tournament_id)));

    const { data: nd } = await supabase
      .from("notifications").select("*")
      .eq("user_id", au.id)
      .order("created_at", { ascending: false }).limit(25);
    if (nd) setNotifs(nd);

    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();

    // FIX 1 : Realtime — on écoute les changements de statut des tournois
    // Quand un tournoi passe upcoming → active, loadData est appelé
    // ce qui met à jour t.status, ce qui déclenche l'animation dans LockDisplay
    const c1 = supabase.channel("pro-entries")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "tournament_pro_entries" },
        loadData)
      .subscribe();

    const c2 = supabase.channel("pro-tournaments")
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "tournaments_pro" },
        loadData)
      .subscribe();

    const c3 = supabase.channel("pro-notifs")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(c1);
      supabase.removeChannel(c2);
      supabase.removeChannel(c3);
    };
  }, [loadData]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleJoin(tid: string) {
    if (!user) return;
    setJoining(tid);
    const { data, error } = await supabase.rpc("join_tournament_pro", {
      p_tournament_id: tid,
    });
    if (error || !data?.ok) {
      showToast(data?.error ?? error?.message ?? "Erreur", false);
    } else {
      showToast("C'est parti ! Bonne chance 🏆", true);
      setTimeout(() => router.push(`/tournaments/pro/${tid}/play`), 700);
    }
    setJoining(null);
  }

  async function handleReadNotif(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  const unread   = notifs.filter(n => !n.is_read).length;
  const active   = tournaments.filter(t => t.status === "active");
  const upcoming = tournaments.filter(t => t.status === "upcoming");
  const finished = tournaments.filter(t => t.status === "finished" || t.status === "cancelled");

  if (loading) return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(circle at top,rgba(239,159,39,.07),transparent 40%),#09090b",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", margin: "0 auto 12px",
          border: "2px solid rgba(239,159,39,.22)", borderTopColor: "#EF9F27",
          animation: "spin .8s linear infinite",
        }} />
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.3)" }}>Chargement…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );

  return (
    <>
      <style>{`
        @keyframes spin       { to { transform: rotate(360deg) } }
        @keyframes pulseDot   { 0%,100%{opacity:.55;transform:scale(1)} 50%{opacity:1;transform:scale(1.35)} }
        @keyframes lockHalo   { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.2);opacity:.85} }
        @keyframes lockFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes lockBurst  { 0%{transform:scale(1) rotate(0);opacity:1} 50%{transform:scale(1.5) rotate(-20deg);opacity:1} 100%{transform:scale(0) rotate(30deg);opacity:0} }
        @keyframes sparkle    { 0%{opacity:1;transform:rotate(var(--r,0deg)) translateY(-28px) scale(1)} 100%{opacity:0;transform:rotate(var(--r,0deg)) translateY(-50px) scale(0)} }
        @keyframes cardIn     { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastIn    { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }
        .nav-l:hover          { background:rgba(255,255,255,.05)!important; color:#FAC775!important }
        @media(max-width:768px){ .lg-sd{display:none!important} .main-c{margin-left:0!important;padding-top:62px!important} }
      `}</style>

      <main style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 65% 0%,rgba(239,159,39,.04),transparent 35%),#09090b",
        color: "#fff", fontFamily: "var(--font-sans,sans-serif)",
      }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", top: 18, right: 18, zIndex: 300,
            display: "flex", alignItems: "center", gap: 8,
            background: toast.ok ? "rgba(85,136,28,.92)" : "rgba(158,42,42,.92)",
            border: `0.5px solid ${toast.ok ? "rgba(192,221,151,.35)" : "rgba(240,149,117,.35)"}`,
            borderRadius: 11, padding: "9px 15px",
            fontSize: 13, fontWeight: 500, color: "#fff",
            animation: "toastIn .3s ease", backdropFilter: "blur(12px)",
          }}>
            <i className={`ti ${toast.ok ? "ti-check" : "ti-x"}`} style={{ fontSize: 14 }} aria-hidden="true" />
            {toast.msg}
          </div>
        )}

        {/* Sidebar desktop */}
        <aside className="lg-sd" style={{
          position: "fixed", left: 0, top: 0, width: 268, height: "100vh",
          background: "#0d0d14",
          borderRight: "0.5px solid rgba(255,255,255,.06)",
          padding: 18, display: "flex", flexDirection: "column", zIndex: 30,
        }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 18 }}>
            <span style={{
              width: 34, height: 34, borderRadius: 9, background: "#EF9F27",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 16, color: "#412402",
            }}>Q</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#FAC775" }}>QuizArena</span>
          </Link>

          <div style={{
            background: "rgba(255,255,255,.03)",
            border: "0.5px solid rgba(255,255,255,.06)",
            borderRadius: 11, padding: "10px 12px", marginBottom: 13,
          }}>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(255,255,255,.22)" }}>Connecté</p>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#fff", marginTop: 3 }}>{user?.full_name}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
              <span style={{ fontSize: 11, color: "#FAC775" }}>
                <i className="ti ti-coin" style={{ fontSize: 10 }} aria-hidden="true" /> {user?.coins}
              </span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>
                <i className="ti ti-ticket" style={{ fontSize: 10 }} aria-hidden="true" /> {user?.tickets}
              </span>
            </div>
          </div>

          <nav style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
            {NAV.map(([href, lbl]) => (
              <Link key={href} href={href} className="nav-l" style={{
                display: "block", padding: "8px 12px", borderRadius: 8,
                fontSize: 13, textDecoration: "none", transition: "all .15s",
                background: href === "/tournaments/pro" ? "rgba(239,159,39,.09)" : "transparent",
                color: href === "/tournaments/pro" ? "#FAC775" : "rgba(255,255,255,.48)",
                border: href === "/tournaments/pro" ? "0.5px solid rgba(239,159,39,.16)" : "0.5px solid transparent",
                fontWeight: href === "/tournaments/pro" ? 500 : 400,
              }}>{lbl}</Link>
            ))}
          </nav>

          <button
            onClick={async () => { await supabase.auth.signOut(); router.replace("/login"); }}
            style={{
              marginTop: 10, width: "100%", borderRadius: 8, padding: "8px 12px",
              fontSize: 13, cursor: "pointer",
              background: "rgba(226,75,74,.05)",
              border: "0.5px solid rgba(226,75,74,.15)",
              color: "#F09595", fontWeight: 500,
            }}
          >Déconnexion</button>
        </aside>

        {/* Hamburger mobile */}
        <div style={{ position: "fixed", top: 13, left: 13, zIndex: 60 }}>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              width: 36, height: 36, borderRadius: 9, cursor: "pointer",
              background: "rgba(13,13,20,.88)",
              border: "0.5px solid rgba(255,255,255,.09)",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(12px)",
            }}
          >
            <i className={`ti ${mobileOpen ? "ti-x" : "ti-menu-2"}`}
              style={{ fontSize: 17, color: "#FAC775" }} aria-hidden="true" />
          </button>
        </div>

        {mobileOpen && (
          <>
            <div onClick={() => setMobileOpen(false)} style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 40,
            }} />
            <aside style={{
              position: "fixed", left: 0, top: 0, width: 268, height: "100vh",
              background: "#0d0d14",
              borderRight: "0.5px solid rgba(255,255,255,.06)",
              padding: 18, zIndex: 50, display: "flex", flexDirection: "column", overflowY: "auto",
            }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button onClick={() => setMobileOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.3)" }}>
                  <i className="ti ti-x" style={{ fontSize: 19 }} aria-hidden="true" />
                </button>
              </div>
              <Link href="/" onClick={() => setMobileOpen(false)} style={{
                display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 13,
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 9, background: "#EF9F27",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 15, color: "#412402",
                }}>Q</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#FAC775" }}>QuizArena</span>
              </Link>
              <div style={{
                background: "rgba(255,255,255,.03)",
                border: "0.5px solid rgba(255,255,255,.06)",
                borderRadius: 10, padding: "8px 11px", marginBottom: 11,
              }}>
                <p style={{ fontSize: 12, color: "#fff", fontWeight: 500 }}>{user?.full_name}</p>
                <p style={{ fontSize: 11, color: "#FAC775", marginTop: 2 }}>
                  {user?.coins} coins · {user?.tickets} tickets
                </p>
              </div>
              <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {NAV.map(([href, lbl]) => (
                  <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{
                    display: "block", padding: "8px 11px", borderRadius: 8,
                    fontSize: 13, textDecoration: "none",
                    background: href === "/tournaments/pro" ? "rgba(239,159,39,.09)" : "transparent",
                    color: href === "/tournaments/pro" ? "#FAC775" : "rgba(255,255,255,.45)",
                  }}>{lbl}</Link>
                ))}
              </nav>
            </aside>
          </>
        )}

        {/* Contenu */}
        <section className="main-c" style={{ marginLeft: 268, padding: "22px 22px 80px" }}>

          {/* Hero */}
          <div style={{
            background: "rgba(255,255,255,.022)",
            border: "0.5px solid rgba(255,255,255,.06)",
            borderRadius: 15, padding: "18px 20px", marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", color: "rgba(255,255,255,.22)", marginBottom: 5 }}>
                  Compétition payante
                </p>
                <h1 style={{ fontSize: 22, fontWeight: 500, color: "#fff", marginBottom: 4 }}>Tournois Pro</h1>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.38)", lineHeight: 1.6, maxWidth: 420 }}>
                  50 coins · Prize 220–440 gds · Cadenas retiré automatiquement à l&apos;heure H
                </p>
              </div>

              {/* Cloche */}
              <div ref={notifRef} style={{ position: "relative", flexShrink: 0 }}>
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  aria-label="Notifications"
                  style={{
                    width: 36, height: 36, borderRadius: 9, cursor: "pointer",
                    background: "rgba(255,255,255,.04)",
                    border: "0.5px solid rgba(255,255,255,.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <i className="ti ti-bell" style={{ fontSize: 16, color: "rgba(255,255,255,.5)" }} aria-hidden="true" />
                  {unread > 0 && (
                    <span style={{
                      position: "absolute", top: -4, right: -4,
                      width: 15, height: 15, borderRadius: "50%",
                      background: "#E24B4A", color: "#fff",
                      fontSize: 9, fontWeight: 500,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
                {showNotifs && (
                  <NotifPanel notifs={notifs} onRead={handleReadNotif} onClose={() => setShowNotifs(false)} />
                )}
              </div>
            </div>

            {/* Stats header */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginTop: 14 }}>
              {[
                { val: "50",      label: "coins entrée", c: "#FAC775" },
                { val: "5–10",    label: "joueurs",      c: "#fff" },
                { val: "220–440", label: "gds 1er",      c: "#C0DD97" },
                { val: "12%",     label: "commission",   c: "rgba(255,255,255,.35)" },
              ].map(m => (
                <div key={m.label} style={{
                  background: "rgba(255,255,255,.03)",
                  border: "0.5px solid rgba(255,255,255,.05)",
                  borderRadius: 10, padding: "8px 10px", textAlign: "center",
                }}>
                  <p style={{ fontSize: 15, fontWeight: 500, color: m.c }}>{m.val}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,.28)", marginTop: 1 }}>{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* En cours */}
          {active.length > 0 && (
            <div style={{ marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#97C459", animation: "pulseDot 1.5s infinite" }} />
                <p style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.32)" }}>
                  En cours — joue maintenant
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(275px,1fr))", gap: 12 }}>
                {active.map(t => (
                  <TournamentCard key={t.id} t={t} user={user}
                    onJoin={handleJoin} joining={joining} hasPlayed={playedIds.has(t.id)} />
                ))}
              </div>
            </div>
          )}

          {/* À venir */}
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <i className="ti ti-lock" style={{ fontSize: 11, color: "rgba(255,255,255,.28)" }} aria-hidden="true" />
                <p style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.32)" }}>
                  Bientôt — cadenas actif
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(275px,1fr))", gap: 12 }}>
                {upcoming.map(t => (
                  <TournamentCard key={t.id} t={t} user={user}
                    onJoin={handleJoin} joining={joining} hasPlayed={playedIds.has(t.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Terminés */}
          {finished.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <i className="ti ti-flag-check" style={{ fontSize: 11, color: "rgba(255,255,255,.22)" }} aria-hidden="true" />
                <p style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.28)" }}>
                  Terminés
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(275px,1fr))", gap: 12 }}>
                {finished.map(t => (
                  <TournamentCard key={t.id} t={t} user={user}
                    onJoin={handleJoin} joining={joining} hasPlayed={playedIds.has(t.id)} />
                ))}
              </div>
            </div>
          )}

          {tournaments.length === 0 && (
            <div style={{ textAlign: "center", padding: "70px 20px" }}>
              <p style={{ fontSize: 38, marginBottom: 12 }}>🏆</p>
              <p style={{ fontSize: 15, fontWeight: 500, color: "#fff", marginBottom: 5 }}>Aucun tournoi disponible</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,.28)" }}>
                Les tournois apparaîtront ici dès qu&apos;ils seront créés dans Supabase.
              </p>
            </div>
          )}

        </section>
      </main>
    </>
  );
}