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
      color: urgent ? "#D4AF6A" : status === "active" ? "rgba(111,191,142,.75)" : "rgba(243,233,210,.32)",
      fontWeight: urgent || status === "active" ? 600 : 400,
      margin: 0,
    }}>
      {status === "active" && (
        <span style={{
          display: "inline-block", width: 5, height: 5, borderRadius: "50%",
          background: "#6FBF8E", marginRight: 6, verticalAlign: "middle",
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
            background: "rgba(212,175,106,.08)",
            animation: "lockHalo 2s ease-in-out infinite",
          }} />
        )}

        {/* Cercle principal */}
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: phase === "unlocking"
            ? "rgba(111,191,142,.12)" : "rgba(212,175,106,.08)",
          border: phase === "unlocking"
            ? "1px solid rgba(111,191,142,.35)"
            : "0.5px solid rgba(212,175,106,.22)",
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
              color: phase === "unlocking" ? "#8FD9AF" : "#D4AF6A",
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
                background: "#8FD9AF",
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
          fontSize: 12, color: "rgba(243,233,210,.4)",
          textAlign: "center", lineHeight: 1.5, margin: 0,
        }}>
          Disponible bientôt · Notification à l&apos;ouverture
        </p>
      )}
      {phase === "unlocking" && (
        <p style={{
          fontSize: 13, color: "#8FD9AF", fontWeight: 600,
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
  const pct       = Math.min(100, Math.round((t.player_count / t.max_players) * 100));
  const isFull    = t.player_count >= t.max_players;
  const hasCoins  = !!user && user.coins >= t.entry_coins;
  const prizeNow  = getPrize(Math.max(t.player_count, t.min_players));
  const isJoining = joining === t.id;
  const canJoin   = t.status === "active" && !isFull && hasCoins && !hasPlayed;
  const isActive   = t.status === "active";
  const isFinished = t.status === "finished" || t.status === "cancelled";

  return (
    <div style={{
      background: "linear-gradient(160deg,#0E1F16,#081209)",
      border: isActive
        ? "1px solid rgba(212,175,106,.3)"
        : isFinished
          ? "0.5px solid rgba(212,175,106,.09)"
          : "0.5px solid rgba(212,175,106,.16)",
      borderRadius: 6, overflow: "hidden",
      display: "flex", flexDirection: "column",
      animation: "cardIn .4s ease both",
      boxShadow: isActive ? "0 8px 24px rgba(0,0,0,.4)" : "0 6px 18px rgba(0,0,0,.28)",
      transition: "border .6s, box-shadow .6s",
    }}>

      {/* Header */}
      <div style={{
        padding: "13px 15px",
        borderBottom: "0.5px solid rgba(212,175,106,.14)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 4, flexShrink: 0,
          background: isActive ? "rgba(111,191,142,.1)" : "rgba(212,175,106,.09)",
          border: isActive
            ? "0.5px solid rgba(111,191,142,.24)"
            : "0.5px solid rgba(212,175,106,.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: isActive ? "#8FD9AF" : "#D4AF6A",
          transition: "all .5s",
        }}>
          <i className={`ti ${GAME_ICONS[t.game_type]}`} style={{ fontSize: 17 }} aria-hidden="true" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14, fontWeight: 600, color: "#F3E9D2",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            fontFamily: "'Playfair Display', serif",
          }}>{t.name}</p>
          <p style={{ fontSize: 11, color: "rgba(243,233,210,.42)", marginTop: 2 }}>
            {GAME_LABELS[t.game_type]} · {t.play_window} min · {t.entry_coins} coins
          </p>
        </div>

        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 11, fontWeight: 600, padding: "3px 9px",
          borderRadius: 4, flexShrink: 0,
          background: isActive ? "rgba(111,191,142,.1)"
            : isFinished ? "rgba(243,233,210,.04)"
            : "rgba(212,175,106,.09)",
          color: isActive ? "#8FD9AF"
            : isFinished ? "rgba(243,233,210,.38)"
            : "#D4AF6A",
          border: isActive ? "0.5px solid rgba(111,191,142,.28)"
            : isFinished ? "0.5px solid rgba(243,233,210,.08)"
            : "0.5px solid rgba(212,175,106,.24)",
          transition: "all .5s",
        }}>
          {isActive && (
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#6FBF8E", flexShrink: 0,
              animation: "pulseDot 1.5s infinite",
            }} />
          )}
          {t.status === "upcoming" ? "À venir"
            : t.status === "active" ? "En cours"
            : t.status === "finished" ? "Terminé" : "Annulé"}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "13px 15px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>

        {/* Prizes */}
        {[
          {
            bg: "rgba(212,175,106,.08)", bd: "rgba(212,175,106,.26)",
            ic: "ti-medal", icC: "#D4AF6A", lbl: "1er place",
            // FIX 4 : affichage prix dynamique
            val: isActive ? `${prizeNow} gds` : "220 – 440 gds", vc: "#D4AF6A",
          },
          {
            bg: "rgba(243,233,210,.03)", bd: "rgba(243,233,210,.09)",
            ic: "ti-ticket", icC: "rgba(243,233,210,.55)", lbl: "2e place",
            val: "1 ticket sponsorisé", vc: "rgba(243,233,210,.7)",
          },
          {
            bg: "rgba(243,233,210,.02)", bd: "rgba(243,233,210,.07)",
            ic: "ti-users", icC: "rgba(243,233,210,.32)", lbl: "Autres",
            val: "5 coins + XP", vc: "rgba(243,233,210,.4)",
          },
        ].map((p, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "7px 10px", borderRadius: 4,
            background: p.bg, border: `0.5px solid ${p.bd}`,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(243,233,210,.55)" }}>
              <i className={`ti ${p.ic}`} style={{ fontSize: 13, color: p.icC }} aria-hidden="true" />
              {p.lbl}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: p.vc }}>{p.val}</span>
          </div>
        ))}

        {/* FIX 4 : Grille prix selon joueurs — upcoming seulement */}
        {t.status === "upcoming" && (
          <div style={{
            background: "rgba(243,233,210,.02)",
            border: "0.5px solid rgba(243,233,210,.06)",
            borderRadius: 4, padding: "9px 11px",
          }}>
            <p style={{
              fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em",
              color: "rgba(243,233,210,.3)", marginBottom: 7, fontWeight: 700,
            }}>
              Prize 1er selon joueurs
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
              {[5, 6, 7, 8, 9, 10].map((n) => (
                <div key={n} style={{
                  textAlign: "center", padding: "4px", borderRadius: 4,
                  background: t.player_count >= n ? "rgba(212,175,106,.09)" : "rgba(243,233,210,.02)",
                  border: `0.5px solid ${t.player_count >= n ? "rgba(212,175,106,.24)" : "rgba(243,233,210,.05)"}`,
                }}>
                  <div style={{ fontSize: 10, color: "rgba(243,233,210,.32)" }}>{n}j</div>
                  <div style={{
                    fontSize: 11, fontWeight: 600,
                    color: t.player_count >= n ? "#D4AF6A" : "rgba(243,233,210,.42)",
                  }}>
                    {getPrize(n)}{n === 10 ? " ✦" : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FIX 2 : Cadenas — animé selon statut, stable entre re-renders */}
        <LockDisplay status={t.status} />

        {/* Compteur joueurs */}
        {!isFinished && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 12, color: "rgba(243,233,210,.42)",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                  background: isFull ? "#C4432D" : isActive ? "#6FBF8E" : "#D4AF6A",
                  animation: isActive ? "pulseDot 1.5s infinite" : "none",
                }} />
                {t.player_count} / {t.max_players} joueurs
              </span>
              <span>min {t.min_players}</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: "rgba(243,233,210,.08)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                background: isActive
                  ? "linear-gradient(90deg,#6FBF8E,#B9DEC6)"
                  : "linear-gradient(90deg,#B08A46,#D4AF6A)",
                width: `${pct}%`, transition: "width .6s ease",
              }} />
            </div>
          </div>
        )}

        {/* Alertes */}
        {!hasCoins && user && isActive && !hasPlayed && (
          <div style={{
            background: "rgba(196,67,45,.08)", border: "0.5px solid rgba(196,67,45,.22)",
            borderRadius: 4, padding: "7px 10px", fontSize: 12,
            color: "#E39485", display: "flex", gap: 6, lineHeight: 1.5,
          }}>
            <i className="ti ti-coin-off" style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            Coins insuffisants — tu as {user.coins} coins, il en faut {t.entry_coins}.
          </div>
        )}

        {hasPlayed && isActive && (
          <div style={{
            background: "rgba(111,191,142,.08)", border: "0.5px solid rgba(111,191,142,.22)",
            borderRadius: 4, padding: "7px 10px", fontSize: 12,
            color: "#8FD9AF", display: "flex", alignItems: "center", gap: 6,
          }}>
            <i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden="true" />
            Score enregistré · Attends la fin du tournoi.
          </div>
        )}

        {/* FIX 3 : Countdown stable */}
        <Countdown startsAt={t.starts_at} playWindow={t.play_window} status={t.status} />

        {/* Boutons */}
        <div style={{ marginTop: "auto" }}>
          {isActive && !hasPlayed && (
            <button
              disabled={!canJoin || isJoining}
              onClick={() => onJoin(t.id)}
              style={{
                width: "100%", borderRadius: 4, padding: 10,
                fontSize: 13, fontWeight: 700,
                cursor: canJoin ? "pointer" : "not-allowed",
                background: canJoin
                  ? "linear-gradient(135deg,#D4AF6A,#B08A46)"
                  : "rgba(243,233,210,.04)",
                border: canJoin
                  ? "1px solid #D4AF6A"
                  : "0.5px solid rgba(243,233,210,.09)",
                color: canJoin ? "#1a1204" : "rgba(243,233,210,.28)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                opacity: canJoin ? 1 : .5,
                transition: "all .2s",
              }}
            >
              {isJoining ? (
                <>
                  <span style={{
                    width: 12, height: 12, borderRadius: "50%",
                    border: "2px solid rgba(26,18,4,.3)",
                    borderTopColor: "#1a1204",
                    animation: "spin .7s linear infinite",
                    display: "inline-block",
                  }} />
                  Paiement…
                </>
              ) : isFull ? "Complet" : !hasCoins ? "Coins insuffisants" : (
                <>
                  <i className="ti ti-player-play" style={{ fontSize: 13 }} aria-hidden="true" />
                  Miser — {t.entry_coins} coins
                </>
              )}
            </button>
          )}

          {isFinished && (
            <Link href={`/tournaments/pro/${t.id}/results`} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              width: "100%", borderRadius: 4, padding: 10, fontSize: 13, fontWeight: 600,
              background: "rgba(243,233,210,.03)",
              border: "0.5px solid rgba(243,233,210,.08)",
              color: "rgba(243,233,210,.42)", textDecoration: "none",
            }}>
              <i className="ti ti-trophy" style={{ fontSize: 13 }} aria-hidden="true" />
              Voir les résultats
            </Link>
          )}
        </div>
      </div>
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
      background: "#0E1F16",
      border: "0.5px solid rgba(212,175,106,.18)",
      borderRadius: 6, overflow: "hidden", zIndex: 100,
      boxShadow: "0 20px 60px rgba(0,0,0,.75)",
      animation: "fadeUp .2s ease",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "11px 13px",
        borderBottom: "0.5px solid rgba(212,175,106,.12)",
      }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#F3E9D2", fontFamily: "'Playfair Display', serif" }}>Notifications</p>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(243,233,210,.4)", padding: 2,
        }}>
          <i className="ti ti-x" style={{ fontSize: 15 }} aria-hidden="true" />
        </button>
      </div>
      {notifs.length === 0 ? (
        <p style={{ padding: "20px", textAlign: "center", fontSize: 13, color: "rgba(243,233,210,.3)" }}>
          Aucune notification
        </p>
      ) : (
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {notifs.map((n) => (
            <div key={n.id} onClick={() => onRead(n.id)} style={{
              padding: "10px 13px",
              borderBottom: "0.5px solid rgba(212,175,106,.08)",
              cursor: "pointer",
              background: !n.is_read ? "rgba(212,175,106,.04)" : "transparent",
              display: "flex", gap: 9, alignItems: "flex-start",
            }}>
              <i className={`ti ${ICONS[n.type] ?? "ti-bell"}`}
                style={{ fontSize: 14, color: "#D4AF6A", flexShrink: 0, marginTop: 1 }}
                aria-hidden="true" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#F3E9D2" }}>{n.title}</p>
                <p style={{ fontSize: 12, color: "rgba(243,233,210,.42)", lineHeight: 1.5, marginTop: 2 }}>{n.message}</p>
              </div>
              {!n.is_read && (
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#D4AF6A", flexShrink: 0, marginTop: 3,
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
      background: "radial-gradient(circle at top,rgba(212,175,106,.07),transparent 40%),#08130D",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", margin: "0 auto 12px",
          border: "2px solid rgba(212,175,106,.22)", borderTopColor: "#D4AF6A",
          animation: "spin .8s linear infinite",
        }} />
        <p style={{ fontSize: 13, color: "rgba(243,233,210,.35)" }}>Chargement…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );

  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Inter:wght@400;500;600;700&display=swap" />
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
        .nav-l:hover          { background:rgba(212,175,106,.07)!important; color:#D4AF6A!important }
        @media(max-width:768px){ .lg-sd{display:none!important} .main-c{margin-left:0!important;padding-top:62px!important} }
      `}</style>

      <main style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 65% 0%,rgba(212,175,106,.05),transparent 35%),#08130D",
        color: "#F3E9D2", fontFamily: "'Inter',var(--font-sans,sans-serif)",
      }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", top: 18, right: 18, zIndex: 300,
            display: "flex", alignItems: "center", gap: 8,
            background: toast.ok ? "rgba(15,58,38,.94)" : "rgba(90,32,26,.94)",
            border: `0.5px solid ${toast.ok ? "rgba(111,191,142,.4)" : "rgba(196,67,45,.4)"}`,
            borderRadius: 6, padding: "9px 15px",
            fontSize: 13, fontWeight: 600, color: "#F3E9D2",
            animation: "toastIn .3s ease", backdropFilter: "blur(12px)",
          }}>
            <i className={`ti ${toast.ok ? "ti-check" : "ti-x"}`} style={{ fontSize: 14, color: toast.ok ? "#8FD9AF" : "#E39485" }} aria-hidden="true" />
            {toast.msg}
          </div>
        )}

        {/* Sidebar desktop */}
        <aside className="lg-sd" style={{
          position: "fixed", left: 0, top: 0, width: 268, height: "100vh",
          background: "#0A1810",
          borderRight: "0.5px solid rgba(212,175,106,.14)",
          padding: 18, display: "flex", flexDirection: "column", zIndex: 30,
        }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 18 }}>
            <span style={{
              width: 34, height: 34, borderRadius: 4, background: "#D4AF6A",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 16, color: "#1a1204",
              fontFamily: "'Playfair Display', serif",
            }}>Q</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#D4AF6A", fontFamily: "'Playfair Display', serif", letterSpacing: ".02em" }}>QuizArena</span>
          </Link>

          <div style={{
            background: "rgba(212,175,106,.04)",
            border: "0.5px solid rgba(212,175,106,.14)",
            borderRadius: 6, padding: "10px 12px", marginBottom: 13,
          }}>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(243,233,210,.32)" }}>Connecté</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#F3E9D2", marginTop: 3 }}>{user?.full_name}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
              <span style={{ fontSize: 11, color: "#D4AF6A" }}>
                <i className="ti ti-coin" style={{ fontSize: 10 }} aria-hidden="true" /> {user?.coins}
              </span>
              <span style={{ fontSize: 11, color: "rgba(243,233,210,.4)" }}>
                <i className="ti ti-ticket" style={{ fontSize: 10 }} aria-hidden="true" /> {user?.tickets}
              </span>
            </div>
          </div>

          <nav style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
            {NAV.map(([href, lbl]) => (
              <Link key={href} href={href} className="nav-l" style={{
                display: "block", padding: "8px 12px", borderRadius: 4,
                fontSize: 13, textDecoration: "none", transition: "all .15s",
                background: href === "/tournaments/pro" ? "rgba(212,175,106,.1)" : "transparent",
                color: href === "/tournaments/pro" ? "#D4AF6A" : "rgba(243,233,210,.5)",
                border: href === "/tournaments/pro" ? "0.5px solid rgba(212,175,106,.2)" : "0.5px solid transparent",
                fontWeight: href === "/tournaments/pro" ? 600 : 400,
              }}>{lbl}</Link>
            ))}
          </nav>

          <button
            onClick={async () => { await supabase.auth.signOut(); router.replace("/login"); }}
            style={{
              marginTop: 10, width: "100%", borderRadius: 4, padding: "8px 12px",
              fontSize: 13, cursor: "pointer",
              background: "rgba(196,67,45,.06)",
              border: "0.5px solid rgba(196,67,45,.18)",
              color: "#E39485", fontWeight: 600,
            }}
          >Déconnexion</button>
        </aside>

        {/* Hamburger mobile */}
        <div style={{ position: "fixed", top: 13, left: 13, zIndex: 60 }}>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              width: 36, height: 36, borderRadius: 4, cursor: "pointer",
              background: "rgba(10,24,16,.9)",
              border: "0.5px solid rgba(212,175,106,.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(12px)",
            }}
          >
            <i className={`ti ${mobileOpen ? "ti-x" : "ti-menu-2"}`}
              style={{ fontSize: 17, color: "#D4AF6A" }} aria-hidden="true" />
          </button>
        </div>

        {mobileOpen && (
          <>
            <div onClick={() => setMobileOpen(false)} style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 40,
            }} />
            <aside style={{
              position: "fixed", left: 0, top: 0, width: 268, height: "100vh",
              background: "#0A1810",
              borderRight: "0.5px solid rgba(212,175,106,.14)",
              padding: 18, zIndex: 50, display: "flex", flexDirection: "column", overflowY: "auto",
            }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button onClick={() => setMobileOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(243,233,210,.35)" }}>
                  <i className="ti ti-x" style={{ fontSize: 19 }} aria-hidden="true" />
                </button>
              </div>
              <Link href="/" onClick={() => setMobileOpen(false)} style={{
                display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 13,
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 4, background: "#D4AF6A",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 15, color: "#1a1204",
                  fontFamily: "'Playfair Display', serif",
                }}>Q</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#D4AF6A", fontFamily: "'Playfair Display', serif" }}>QuizArena</span>
              </Link>
              <div style={{
                background: "rgba(212,175,106,.04)",
                border: "0.5px solid rgba(212,175,106,.14)",
                borderRadius: 5, padding: "8px 11px", marginBottom: 11,
              }}>
                <p style={{ fontSize: 12, color: "#F3E9D2", fontWeight: 600 }}>{user?.full_name}</p>
                <p style={{ fontSize: 11, color: "#D4AF6A", marginTop: 2 }}>
                  {user?.coins} coins · {user?.tickets} tickets
                </p>
              </div>
              <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {NAV.map(([href, lbl]) => (
                  <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{
                    display: "block", padding: "8px 11px", borderRadius: 4,
                    fontSize: 13, textDecoration: "none",
                    background: href === "/tournaments/pro" ? "rgba(212,175,106,.1)" : "transparent",
                    color: href === "/tournaments/pro" ? "#D4AF6A" : "rgba(243,233,210,.48)",
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
            background: "rgba(212,175,106,.025)",
            border: "0.5px solid rgba(212,175,106,.16)",
            borderRadius: 6, padding: "18px 20px", marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", color: "#D4AF6A", marginBottom: 5, fontWeight: 700 }}>
                  Table Pro · Compétition payante
                </p>
                <h1 style={{ fontSize: 22, fontWeight: 600, color: "#F3E9D2", marginBottom: 4, fontFamily: "'Playfair Display', serif" }}>Tournois Pro</h1>
                <p style={{ fontSize: 13, color: "rgba(243,233,210,.55)", lineHeight: 1.6, maxWidth: 420 }}>
                  50 coins · Prize 220–440 gds · Cadenas retiré automatiquement à l&apos;heure H
                </p>
              </div>

              {/* Cloche */}
              <div ref={notifRef} style={{ position: "relative", flexShrink: 0 }}>
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  aria-label="Notifications"
                  style={{
                    width: 36, height: 36, borderRadius: 4, cursor: "pointer",
                    background: "rgba(212,175,106,.06)",
                    border: "0.5px solid rgba(212,175,106,.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <i className="ti ti-bell" style={{ fontSize: 16, color: "rgba(243,233,210,.6)" }} aria-hidden="true" />
                  {unread > 0 && (
                    <span style={{
                      position: "absolute", top: -4, right: -4,
                      width: 15, height: 15, borderRadius: "50%",
                      background: "#C4432D", color: "#fff",
                      fontSize: 9, fontWeight: 600,
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

            {/* Stats header — commission retirée */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 14 }}>
              {[
                { val: "50",      label: "coins entrée", c: "#D4AF6A" },
                { val: "5–10",    label: "joueurs",      c: "#F3E9D2" },
                { val: "220–440", label: "gds 1er",      c: "#8FD9AF" },
              ].map(m => (
                <div key={m.label} style={{
                  background: "rgba(212,175,106,.04)",
                  border: "0.5px solid rgba(212,175,106,.12)",
                  borderRadius: 4, padding: "8px 10px", textAlign: "center",
                }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: m.c, fontFamily: "'Playfair Display', serif" }}>{m.val}</p>
                  <p style={{ fontSize: 10, color: "rgba(243,233,210,.32)", marginTop: 1 }}>{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* En cours */}
          {active.length > 0 && (
            <div style={{ marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6FBF8E", animation: "pulseDot 1.5s infinite" }} />
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(243,233,210,.4)" }}>
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
                <i className="ti ti-lock" style={{ fontSize: 11, color: "rgba(212,175,106,.4)" }} aria-hidden="true" />
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(243,233,210,.4)" }}>
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
                <i className="ti ti-flag-check" style={{ fontSize: 11, color: "rgba(212,175,106,.3)" }} aria-hidden="true" />
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(243,233,210,.35)" }}>
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
              <p style={{ fontSize: 15, fontWeight: 600, color: "#F3E9D2", marginBottom: 5, fontFamily: "'Playfair Display', serif" }}>Aucun tournoi disponible</p>
              <p style={{ fontSize: 12, color: "rgba(243,233,210,.32)" }}>
                Les tournois apparaîtront ici dès qu&apos;ils seront créés dans Supabase.
              </p>
            </div>
          )}

        </section>
      </main>
    </>
  );
}