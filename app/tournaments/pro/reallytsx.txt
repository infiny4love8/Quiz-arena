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

// ─── Étapes du parcours — juste de la pédagogie, aucune logique ──────────────
const HOW_IT_WORKS = [
  { icon: "ti-coin",         text: "Utilise 50 Gourdes pour rejoindre le tournoi" },
  { icon: "ti-player-play",  text: "Joue une seule fois par tournois" },
  { icon: "ti-hourglass",    text: "Attends la fin du temps pour voir les resultats " },
  { icon: "ti-gift",         text: "Recevez votre Recompense automatiquement" },
];

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
      fontSize: 13,
      fontVariantNumeric: "tabular-nums",
      color: urgent ? "#4EDB8E" : status === "active" ? "#6EE8A8" : "#8FA089",
      fontWeight: urgent || status === "active" ? 600 : 400,
      margin: 0,
    }}>
      {status === "active" && (
        <span style={{
          display: "inline-block", width: 5, height: 5, borderRadius: "50%",
          background: "#39D97A", marginRight: 6, verticalAlign: "middle",
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
            background: "rgba(78,219,142,.14)",
            animation: "lockHalo 2s ease-in-out infinite",
          }} />
        )}

        {/* Cercle principal */}
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: phase === "unlocking" ? "#16261B" : "#1D2E22",
          border: phase === "unlocking"
            ? "1px solid #3FCB7D"
            : "0.5px solid #3A5940",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: phase === "locked" ? "lockFloat 3s ease-in-out infinite"
            : phase === "unlocking" ? "lockBurst .8s ease forwards"
            : "none",
          transition: "background .4s, border .4s",
        }}>
          <i
            className={phase === "unlocking" ? "ti ti-lock-open" : "ti ti-lock"}
            style={{
              fontSize: 24,
              color: phase === "unlocking" ? "#6EE8A8" : "#4EDB8E",
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
                background: "#39D97A",
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
          fontSize: 13, color: "#8FA089",
          textAlign: "center", lineHeight: 1.5, margin: 0,
        }}>
          Disponible bientôt · Notification à l&apos;ouverture
        </p>
      )}
      {phase === "unlocking" && (
        <p style={{
          fontSize: 14, color: "#6EE8A8", fontWeight: 600,
          animation: "fadeUp .4s ease", margin: 0,
        }}>
          🔓 Tournoi déverrouillé !
        </p>
      )}
    </div>
  );
}

// ─── Bandeau "Comment ça marche" — pédagogie uniquement ──────────────────────
function HowItWorksStrip() {
  return (
    <div style={{
      background: "#1B221C",
      border: "0.5px solid #2E3830",
      borderRadius: 6, padding: "16px 18px", marginBottom: 16,
    }}>
      <p style={{
        fontSize: 12, textTransform: "uppercase", letterSpacing: ".14em",
        color: "#4EDB8E", marginBottom: 12, fontWeight: 700,
      }}>
        Comment ça marche
      </p>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
        gap: 10,
      }}>
        {HOW_IT_WORKS.map((s, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#232B24",
            border: "0.5px solid #28312B",
            borderRadius: 5, padding: "10px 12px",
          }}>
            <span style={{
              width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
              background: "#1D2E22",
              border: "0.5px solid #3A5940",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: "#4EDB8E",
              fontFamily: "'Playfair Display', serif",
            }}>
              {i + 1}
            </span>
            <p style={{ fontSize: 14, color: "#C7D6C4", lineHeight: 1.4, margin: 0 }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: 13, color: "#8FA089", marginRight: 5 }} aria-hidden="true" />
              {s.text}
            </p>
          </div>
        ))}
      </div>
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
      background: "#232B24",
      border: isActive
        ? "1px solid #4EDB8E"
        : isFinished
          ? "0.5px solid #28312B"
          : "0.5px solid #2E3830",
      borderRadius: 6, overflow: "hidden",
      display: "flex", flexDirection: "column",
      animation: "cardIn .4s ease both",
      boxShadow: isActive ? "0 6px 18px rgba(0,0,0,.07)" : "0 2px 10px rgba(0,0,0,.04)",
      transition: "border .6s, box-shadow .6s",
    }}>

      {/* Header */}
      <div style={{
        padding: "13px 15px",
        borderBottom: "0.5px solid #28312B",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 4, flexShrink: 0,
          background: isActive ? "#16261B" : "#1D2E22",
          border: isActive
            ? "0.5px solid #7ED957"
            : "0.5px solid #3A5940",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: isActive ? "#6EE8A8" : "#8FA089",
          transition: "all .5s",
        }}>
          <i className={`ti ${GAME_ICONS[t.game_type]}`} style={{ fontSize: 18 }} aria-hidden="true" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 15, fontWeight: 600, color: "#F0F7EE",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            fontFamily: "'Playfair Display', serif",
          }}>{t.name}</p>
          <p style={{ fontSize: 13, color: "#8FA089", marginTop: 2 }}>
            {GAME_LABELS[t.game_type]} · {t.play_window} min
          </p>
        </div>

        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 13, fontWeight: 600, padding: "3px 9px",
          borderRadius: 4, flexShrink: 0,
          background: isActive ? "#16261B"
            : isFinished ? "#1B221C"
            : "#1D2E22",
          color: isActive ? "#6EE8A8"
            : isFinished ? "#5E6E5C"
            : "#4EDB8E",
          border: isActive ? "0.5px solid #7ED957"
            : isFinished ? "0.5px solid #28312B"
            : "0.5px solid #3A5940",
          transition: "all .5s",
        }}>
          {isActive && (
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#39D97A", flexShrink: 0,
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

        {/* Résumé rapide — clarté immédiate : coût, gain max, tentative unique */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[
            { icon: "ti-coin",         text: `${t.entry_coins} GDS` },
            { icon: "ti-trophy",       text: "1er : 220–440 GDS" },
            { icon: "ti-target-arrow", text: "1 tentative" },
          ].map((chip, i) => (
            <span key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 13, fontWeight: 600, color: "#C7D6C4",
              background: "#1B221C",
              border: "0.5px solid #28312B",
              borderRadius: 4, padding: "3px 8px",
            }}>
              <i className={`ti ${chip.icon}`} style={{ fontSize: 13, color: "#4EDB8E" }} aria-hidden="true" />
              {chip.text}
            </span>
          ))}
        </div>

        {/* Prizes */}
        {[
          {
            bg: "#1D2E22", bd: "#3A5940",
            ic: "ti-medal", icC: "#4EDB8E", lbl: "1er place",
            // FIX 4 : affichage prix dynamique
            val: isActive ? `${prizeNow} GDS` : "220 – 440 GDS + 40xp", vc: "#4EDB8E",
          },
          {
            bg: "#1B221C", bd: "#28312B",
            ic: "ti-ticket", icC: "#8FA089", lbl: "2e place",
            val: "1 ticket sponsorisé + 25xp", vc: "#F0F7EE",
          },
          {
            bg: "#12160F", bd: "#28312B",
            ic: "ti-medal-2", icC: "#5E6E5C", lbl: "3e place",
            val: "10 GDS + 20 XP", vc: "#C7D6C4",
          },
          {
            bg: "#12160F", bd: "#28312B",
            ic: "ti-refresh", icC: "#5E6E5C", lbl: "Autres joueurs",
            val: "5 GDS + 15 XP", vc: "#8FA089",
          },
        ].map((p, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "7px 10px", borderRadius: 4,
            background: p.bg, border: `0.5px solid ${p.bd}`,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#C7D6C4" }}>
              <i className={`ti ${p.ic}`} style={{ fontSize: 14, color: p.icC }} aria-hidden="true" />
              {p.lbl}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: p.vc }}>{p.val}</span>
          </div>
        ))}

        {/* FIX 4 : Grille prix selon joueurs — upcoming seulement */}
        {t.status === "upcoming" && (
          <div style={{
            background: "#12160F",
            border: "0.5px solid #28312B",
            borderRadius: 4, padding: "9px 11px",
          }}>
            <p style={{
              fontSize: 12, textTransform: "uppercase", letterSpacing: ".1em",
              color: "#8FA089", marginBottom: 7, fontWeight: 700,
            }}>
              Gain 1er selon le nombre de joueurs
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
              {[5, 6, 7, 8, 9, 10].map((n) => (
                <div key={n} style={{
                  textAlign: "center", padding: "4px", borderRadius: 4,
                  background: t.player_count >= n ? "#1D2E22" : "#232B24",
                  border: `0.5px solid ${t.player_count >= n ? "#3A5940" : "#28312B"}`,
                }}>
                  <div style={{ fontSize: 12, color: "#5E6E5C" }}>{n}j</div>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: t.player_count >= n ? "#4EDB8E" : "#8FA089",
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
              fontSize: 13, color: "#C7D6C4",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                  background: isFull ? "#F0938F" : isActive ? "#39D97A" : "#4EDB8E",
                  animation: isActive ? "pulseDot 1.5s infinite" : "none",
                }} />
                {t.player_count} / {t.max_players} joueurs
              </span>
              <span>min {t.min_players}</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: "#28312B", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                background: isActive
                  ? "linear-gradient(90deg,#3FCB7D,#7ED957)"
                  : "linear-gradient(90deg,#1FA362,#4EDB8E)",
                width: `${pct}%`, transition: "width .6s ease",
              }} />
            </div>
          </div>
        )}

        {/* Alertes */}
        {!hasCoins && user && isActive && !hasPlayed && (
          <div style={{
            background: "#2E1717", border: "0.5px solid #6B2E2E",
            borderRadius: 4, padding: "7px 10px", fontSize: 13,
            color: "#F0938F", display: "flex", gap: 6, lineHeight: 1.5,
          }}>
            <i className="ti ti-coin-off" style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            Gourdes insuffisantes — tu as {user.coins} GDS, il en faut {t.entry_coins} GDS.
          </div>
        )}

        {hasPlayed && isActive && (
          <div style={{
            background: "#16261B", border: "0.5px solid #3FCB7D",
            borderRadius: 4, padding: "7px 10px", fontSize: 13,
            color: "#6EE8A8", display: "flex", alignItems: "center", gap: 6,
          }}>
            <i className="ti ti-check" style={{ fontSize: 14 }} aria-hidden="true" />
            Score enregistré · Une seule tentative — attends la fin du tournoi.
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
                fontSize: 14, fontWeight: 700,
                cursor: canJoin ? "pointer" : "not-allowed",
                background: canJoin
                  ? "linear-gradient(135deg,#4EDB8E,#1FA362)"
                  : "#1B221C",
                border: canJoin
                  ? "1px solid #4EDB8E"
                  : "0.5px solid #28312B",
                color: canJoin ? "#04150C" : "#5E6E5C",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                opacity: canJoin ? 1 : .5,
                transition: "all .2s",
              }}
            >
              {isJoining ? (
                <>
                  <span style={{
                    width: 12, height: 12, borderRadius: "50%",
                    border: "2px solid rgba(4,21,12,.3)",
                    borderTopColor: "#04150C",
                    animation: "spin .7s linear infinite",
                    display: "inline-block",
                  }} />
                  Paiement…
                </>
              ) : isFull ? "Complet" : !hasCoins ? "Gourdes insuffisantes" : (
                <>
                  <i className="ti ti-player-play" style={{ fontSize: 14 }} aria-hidden="true" />
                  Rejoindre — {t.entry_coins} GDS
                </>
              )}
            </button>
          )}

          {isFinished && (
            <Link href={`/tournaments/pro/${t.id}/results`} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              width: "100%", borderRadius: 4, padding: 10, fontSize: 14, fontWeight: 600,
              background: "#1B221C",
              border: "0.5px solid #28312B",
              color: "#8FA089", textDecoration: "none",
            }}>
              <i className="ti ti-trophy" style={{ fontSize: 14 }} aria-hidden="true" />
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
      background: "#232B24",
      border: "0.5px solid #2E3830",
      borderRadius: 6, overflow: "hidden", zIndex: 100,
      boxShadow: "0 20px 60px rgba(0,0,0,.12)",
      animation: "fadeUp .2s ease",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "11px 13px",
        borderBottom: "0.5px solid #28312B",
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#F0F7EE", fontFamily: "'Playfair Display', serif" }}>Notifications</p>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#5E6E5C", padding: 2,
        }}>
          <i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden="true" />
        </button>
      </div>
      {notifs.length === 0 ? (
        <p style={{ padding: "20px", textAlign: "center", fontSize: 14, color: "#5E6E5C" }}>
          Aucune notification
        </p>
      ) : (
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {notifs.map((n) => (
            <div key={n.id} onClick={() => onRead(n.id)} style={{
              padding: "10px 13px",
              borderBottom: "0.5px solid #28312B",
              cursor: "pointer",
              background: !n.is_read ? "#1D2E22" : "transparent",
              display: "flex", gap: 9, alignItems: "flex-start",
            }}>
              <i className={`ti ${ICONS[n.type] ?? "ti-bell"}`}
                style={{ fontSize: 15, color: "#4EDB8E", flexShrink: 0, marginTop: 1 }}
                aria-hidden="true" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#F0F7EE" }}>{n.title}</p>
                <p style={{ fontSize: 13, color: "#C7D6C4", lineHeight: 1.5, marginTop: 2 }}>{n.message}</p>
              </div>
              {!n.is_read && (
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#4EDB8E", flexShrink: 0, marginTop: 3,
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
      background: "radial-gradient(circle at top,rgba(78,219,142,.10),transparent 40%),#12160F",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", margin: "0 auto 12px",
          border: "2px solid #3A5940", borderTopColor: "#4EDB8E",
          animation: "spin .8s linear infinite",
        }} />
        <p style={{ fontSize: 14, color: "#8FA089" }}>Chargement…</p>
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
        .nav-l:hover          { background:#1D2E22!important; color:#4EDB8E!important }
        @media(max-width:768px){ .lg-sd{display:none!important} .main-c{margin-left:0!important;padding-top:62px!important} }
      `}</style>

      <main style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 65% 0%,rgba(78,219,142,.08),transparent 35%),#12160F",
        color: "#F0F7EE", fontFamily: "'Inter',var(--font-sans,sans-serif)",
      }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", top: 18, right: 18, zIndex: 300,
            display: "flex", alignItems: "center", gap: 8,
            background: toast.ok ? "#16261B" : "#2E1717",
            border: `0.5px solid ${toast.ok ? "#3FCB7D" : "#6B2E2E"}`,
            borderRadius: 6, padding: "9px 15px",
            fontSize: 14, fontWeight: 600, color: toast.ok ? "#8FF0BE" : "#F5B8B6",
            animation: "toastIn .3s ease", boxShadow: "0 8px 24px rgba(0,0,0,.1)",
          }}>
            <i className={`ti ${toast.ok ? "ti-check" : "ti-x"}`} style={{ fontSize: 15, color: toast.ok ? "#6EE8A8" : "#F0938F" }} aria-hidden="true" />
            {toast.msg}
          </div>
        )}

        {/* Sidebar desktop */}
        <aside className="lg-sd" style={{
          position: "fixed", left: 0, top: 0, width: 268, height: "100vh",
          background: "#232B24",
          borderRight: "0.5px solid #2E3830",
          padding: 18, display: "flex", flexDirection: "column", zIndex: 30,
        }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 18 }}>
            <span style={{
              width: 34, height: 34, borderRadius: 4, background: "#4EDB8E",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 17, color: "#F0F7EE",
              fontFamily: "'Playfair Display', serif",
            }}>Z</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: "#4EDB8E", fontFamily: "'Playfair Display', serif", letterSpacing: ".02em" }}>Zonarena</span>
          </Link>

          <div style={{
            background: "#1B221C",
            border: "0.5px solid #2E3830",
            borderRadius: 6, padding: "10px 12px", marginBottom: 13,
          }}>
            <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".1em", color: "#8FA089" }}>Connecté</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#F0F7EE", marginTop: 3 }}>{user?.full_name}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
              <span style={{ fontSize: 13, color: "#4EDB8E" }}>
                <i className="ti ti-coin" style={{ fontSize: 12 }} aria-hidden="true" /> {user?.coins} GDS
              </span>
              <span style={{ fontSize: 13, color: "#8FA089" }}>
                <i className="ti ti-ticket" style={{ fontSize: 12 }} aria-hidden="true" /> {user?.tickets}
              </span>
            </div>
          </div>

          <nav style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
            {NAV.map(([href, lbl]) => (
              <Link key={href} href={href} className="nav-l" style={{
                display: "block", padding: "8px 12px", borderRadius: 4,
                fontSize: 14, textDecoration: "none", transition: "all .15s",
                background: href === "/tournaments/pro" ? "#1D2E22" : "transparent",
                color: href === "/tournaments/pro" ? "#4EDB8E" : "#C7D6C4",
                border: href === "/tournaments/pro" ? "0.5px solid #3A5940" : "0.5px solid transparent",
                fontWeight: href === "/tournaments/pro" ? 600 : 400,
              }}>{lbl}</Link>
            ))}
          </nav>

          <button
            onClick={async () => { await supabase.auth.signOut(); router.replace("/login"); }}
            style={{
              marginTop: 10, width: "100%", borderRadius: 4, padding: "8px 12px",
              fontSize: 14, cursor: "pointer",
              background: "#2E1717",
              border: "0.5px solid #6B2E2E",
              color: "#F0938F", fontWeight: 600,
            }}
          >Déconnexion</button>
        </aside>

        {/* Hamburger mobile */}
        <div style={{ position: "fixed", top: 13, left: 13, zIndex: 60 }}>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              width: 36, height: 36, borderRadius: 4, cursor: "pointer",
              background: "rgba(35,43,36,.92)",
              border: "0.5px solid #2E3830",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 10px rgba(0,0,0,.06)",
            }}
          >
            <i className={`ti ${mobileOpen ? "ti-x" : "ti-menu-2"}`}
              style={{ fontSize: 18, color: "#4EDB8E" }} aria-hidden="true" />
          </button>
        </div>

        {mobileOpen && (
          <>
            <div onClick={() => setMobileOpen(false)} style={{
              position: "fixed", inset: 0, background: "rgba(6,10,7,.55)", zIndex: 40,
            }} />
            <aside style={{
              position: "fixed", left: 0, top: 0, width: 268, height: "100vh",
              background: "#232B24",
              borderRight: "0.5px solid #2E3830",
              padding: 18, zIndex: 50, display: "flex", flexDirection: "column", overflowY: "auto",
            }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button onClick={() => setMobileOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#5E6E5C" }}>
                  <i className="ti ti-x" style={{ fontSize: 20 }} aria-hidden="true" />
                </button>
              </div>
              <Link href="/" onClick={() => setMobileOpen(false)} style={{
                display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 13,
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 4, background: "#4EDB8E",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 16, color: "#F0F7EE",
                  fontFamily: "'Playfair Display', serif",
                }}>Z</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#4EDB8E", fontFamily: "'Playfair Display', serif" }}>Zonarena</span>
              </Link>
              <div style={{
                background: "#1B221C",
                border: "0.5px solid #2E3830",
                borderRadius: 5, padding: "8px 11px", marginBottom: 11,
              }}>
                <p style={{ fontSize: 13, color: "#F0F7EE", fontWeight: 600 }}>{user?.full_name}</p>
                <p style={{ fontSize: 13, color: "#4EDB8E", marginTop: 2 }}>
                  {user?.coins} GDS · {user?.tickets} tickets
                </p>
              </div>
              <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {NAV.map(([href, lbl]) => (
                  <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{
                    display: "block", padding: "8px 11px", borderRadius: 4,
                    fontSize: 14, textDecoration: "none",
                    background: href === "/tournaments/pro" ? "#1D2E22" : "transparent",
                    color: href === "/tournaments/pro" ? "#4EDB8E" : "#C7D6C4",
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
            background: "#1B221C",
            border: "0.5px solid #2E3830",
            borderRadius: 6, padding: "18px 20px", marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".14em", color: "#4EDB8E", marginBottom: 5, fontWeight: 700 }}>
                  Table Pro · Compétition payante
                </p>
                <h1 style={{ fontSize: 24, fontWeight: 600, color: "#F0F7EE", marginBottom: 4, fontFamily: "'Playfair Display', serif" }}>Tournois Pro</h1>
                <p style={{ fontSize: 14, color: "#C7D6C4", lineHeight: 1.6, maxWidth: 460 }}>
                  50 GDS pour jouer · Gain de 220 à 440 GDS selon le nombre de joueurs
                </p>
              </div>

              {/* Cloche */}
              <div ref={notifRef} style={{ position: "relative", flexShrink: 0 }}>
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  aria-label="Notifications"
                  style={{
                    width: 36, height: 36, borderRadius: 4, cursor: "pointer",
                    background: "#232B24",
                    border: "0.5px solid #2E3830",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <i className="ti ti-bell" style={{ fontSize: 17, color: "#C7D6C4" }} aria-hidden="true" />
                  {unread > 0 && (
                    <span style={{
                      position: "absolute", top: -4, right: -4,
                      width: 15, height: 15, borderRadius: "50%",
                      background: "#F0938F", color: "#fff",
                      fontSize: 11, fontWeight: 600,
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
                { val: "50",      label: "GDS entrée",  c: "#4EDB8E" },
                { val: "5–10",    label: "joueurs",      c: "#F0F7EE" },
                { val: "220–440", label: "GDS 1er",      c: "#6EE8A8" },
              ].map(m => (
                <div key={m.label} style={{
                  background: "#232B24",
                  border: "0.5px solid #2E3830",
                  borderRadius: 4, padding: "8px 10px", textAlign: "center",
                }}>
                  <p style={{ fontSize: 16, fontWeight: 600, color: m.c, fontFamily: "'Playfair Display', serif" }}>{m.val}</p>
                  <p style={{ fontSize: 12, color: "#8FA089", marginTop: 1 }}>{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Comment ça marche — nouveau bandeau pédagogique */}
          <HowItWorksStrip />

          {/* En cours */}
          {active.length > 0 && (
            <div style={{ marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#39D97A", animation: "pulseDot 1.5s infinite" }} />
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#8FA089" }}>
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
                <i className="ti ti-lock" style={{ fontSize: 13, color: "#4EDB8E" }} aria-hidden="true" />
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#8FA089" }}>
                  À venir — ouverture automatique
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
                <i className="ti ti-flag-check" style={{ fontSize: 13, color: "#5E6E5C" }} aria-hidden="true" />
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#5E6E5C" }}>
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
              <p style={{ fontSize: 40, marginBottom: 12 }}>🏆</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: "#F0F7EE", marginBottom: 5, fontFamily: "'Playfair Display', serif" }}>Aucun tournoi disponible</p>
              <p style={{ fontSize: 13, color: "#8FA089" }}>
                Les tournois apparaîtront ici dès qu&apos;ils seront créés dans Supabase.
              </p>
            </div>
          )}

        </section>
      </main>
    </>
  );
}