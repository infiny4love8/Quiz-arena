"use client";

// ============================================================
// app/tournamentsponsorise/page.tsx
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type Tournament = {
  id: string;
  title: string;
  description: string;
  game_type: "flags" | "memory" | "tank" | "rush";
  sponsor: string;
  starts_at: string;
  ends_at: string;
  max_players: number;
  prize_1: number;
  prize_2: number;
  prize_3: number;
  status: "upcoming" | "active" | "finished";
};

type Entry = {
  tournament_id: string;
  score: number;
  finished: boolean;
  rank: number | null;
  prize_awarded: number;
};

type LeaderEntry = {
  user_id: string;
  score: number;
  rank: number | null;
  username: string;
};

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────
const GAME_ICONS: Record<string, string>  = { flags:"🌍", memory:"🧠", tank:"🎯", rush:"⚡" };
const GAME_LABELS: Record<string, string> = { flags:"Drapeaux", memory:"Mémoire", tank:"Tank Arena", rush:"Rush" };
const GAME_TIPS: Record<string, string>   = {
  flags:  "Entraînez-vous à reconnaître les drapeaux du monde",
  memory: "Entraînez-vous dans le jeu de mémoire",
  tank:   "Pratiquez le jeu Tank Arena pour améliorer votre score",
  rush:   "Entraînez-vous en mode Rush pour battre le chrono",
};

// ─────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────
function useCountdown(target: string) {
  const calc = useCallback(
    () => Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000)),
    [target]
  );
  const [secs, setSecs] = useState(calc);
  useEffect(() => {
    setSecs(calc());
    const t = setInterval(() => setSecs(calc()), 1000);
    return () => clearInterval(t);
  }, [calc]);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return { secs, h, m, s };
}

function pad(n: number) { return String(n).padStart(2, "0"); }

// ─────────────────────────────────────────────
// COMPOSANTS
// ─────────────────────────────────────────────
function CountdownDisplay({ target, size = 28, color }: { target: string; size?: number; color?: string }) {
  const { secs, h, m, s } = useCountdown(target);
  if (secs <= 0) return <span style={{ color: "#22c55e", fontSize: size }}>C'est parti !</span>;
  return (
    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: size, color: color ?? "inherit", letterSpacing: "0.04em" }}>
      {h > 0 ? `${pad(h)}:` : ""}{pad(m)}:{pad(s)}
    </span>
  );
}

function PrizeSection({ t }: { t: Tournament }) {
  const prizes = [
    { place: "1ère place", emoji: "🥇", amount: t.prize_1, color: "#f59e0b" },
    { place: "2ème place", emoji: "🥈", amount: t.prize_2, color: "#9ca3af" },
    ...(t.prize_3 > 0 ? [{ place: "3ème place", emoji: "🥉", amount: t.prize_3, color: "#cd7f32" }] : []),
  ];
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={sectionLabel}>💰 Gains à remporter</div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        {prizes.map((p, i) => (
          <div key={p.place} style={{
            flex: i === 0 ? 1.3 : 1,
            background: `linear-gradient(160deg, ${p.color}16 0%, ${p.color}06 100%)`,
            border: `1px solid ${p.color}35`, borderRadius: 16,
            padding: i === 0 ? "18px 12px" : "14px 10px",
            textAlign: "center" as const, position: "relative" as const, overflow: "hidden" as const,
          }}>
            <div style={{ position: "absolute" as const, top: 0, left: "10%", right: "10%", height: 1, background: `linear-gradient(90deg, transparent, ${p.color}60, transparent)` }} />
            <div style={{ fontSize: i === 0 ? 30 : 24, lineHeight: 1, marginBottom: 8 }}>{p.emoji}</div>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: i === 0 ? 32 : 24, color: p.color, lineHeight: 1, textShadow: `0 0 20px ${p.color}50`, marginBottom: 2 }}>
              {p.amount} <span style={{ fontSize: i === 0 ? 16 : 13 }}>GDS</span>
            </div>
            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>{p.place}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: "#4a5568", marginTop: 8, textAlign: "center" as const }}>Coins crédités automatiquement · 1 coin = 1 GDS</p>
    </div>
  );
}

function Leaderboard({ entries, myId, accentColor, t, isFinished }: {
  entries: LeaderEntry[]; myId: string | null;
  accentColor: string; t: Tournament; isFinished: boolean;
}) {
  if (!entries.length) return null;
  const medals = ["🥇", "🥈", "🥉"];
  const prizeAmounts = [t.prize_1, t.prize_2, t.prize_3];
  const prizeColors  = ["#f59e0b", "#9ca3af", "#cd7f32"];
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ ...sectionLabel, display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: isFinished ? "#6b7280" : "#22c55e", boxShadow: isFinished ? "none" : "0 0 8px #22c55e", animation: isFinished ? "none" : "pulse 1.4s ease-in-out infinite" }} />
        Classement {isFinished ? "final" : "en direct"}
      </div>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
        {entries.map((e, i) => {
          const isMe = e.user_id === myId;
          const prize = prizeAmounts[i] ?? 0;
          const pc = prizeColors[i] ?? "#6b7280";
          return (
            <div key={e.user_id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "11px 14px", borderRadius: 12,
              background: isMe ? accentColor + "18" : i === 0 ? "#f59e0b08" : "#ffffff04",
              border: `1px solid ${isMe ? accentColor + "45" : i === 0 ? "#f59e0b20" : "#1e2130"}`,
            }}>
              <span style={{ fontSize: 20, width: 26, textAlign: "center" as const, flexShrink: 0 }}>{medals[i] ?? `#${i + 1}`}</span>
              <span style={{ flex: 1, fontSize: 14, color: isMe ? "#f0ede6" : "#8892a4", fontWeight: isMe ? 700 : 400 }}>{e.username}{isMe ? " (toi)" : ""}</span>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 14, fontWeight: 800, color: i === 0 ? "#f59e0b" : "#6b7280" }}>
                {e.score.toLocaleString()}<span style={{ fontSize: 10, color: "#4a5568", marginLeft: 3 }}>pts</span>
              </span>
              {isFinished && prize > 0 && (
                <span style={{ fontSize: 11, color: pc, fontWeight: 800, background: pc + "18", border: `1px solid ${pc}35`, borderRadius: 6, padding: "2px 8px" }}>
                  +{prize} GDS
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TournamentCard({ t, myEntry, leaderboard, tickets, myId, onEnter, onPlay, entering }: {
  t: Tournament; myEntry?: Entry; leaderboard: LeaderEntry[];
  tickets: number; myId: string | null;
  onEnter: (id: string) => void; onPlay: (t: Tournament) => void; entering: boolean;
}) {
  const now        = Date.now();
  const isUpcoming = t.status === "upcoming" || now < new Date(t.starts_at).getTime();
  const isActive   = t.status === "active" && now >= new Date(t.starts_at).getTime() && now < new Date(t.ends_at).getTime();
  const isFinished = t.status === "finished" || now >= new Date(t.ends_at).getTime();
  const hasEntered = !!myEntry;
  const hasPlayed  = myEntry?.finished;
  const accent     = isFinished ? "#6b7280" : isActive ? "#22c55e" : "#f59e0b";

  return (
    <div style={{
      background: "linear-gradient(180deg, #13172480 0%, #0d0f1480 100%)",
      border: `1px solid ${accent}30`, borderRadius: 24, overflow: "hidden",
      position: "relative" as const,
      boxShadow: isActive ? `0 8px 48px ${accent}18, inset 0 1px 0 ${accent}20` : "inset 0 1px 0 #ffffff08",
    }}>
      <div style={{ height: 3, background: isFinished ? "#6b728040" : `linear-gradient(90deg, transparent, ${accent}, ${accent}80, ${accent}, transparent)`, backgroundSize: "200% 100%", animation: !isFinished ? "shimmer 2.5s linear infinite" : "none" }} />
      {isActive && <div style={{ position: "absolute" as const, top: -40, right: -40, width: 150, height: 150, background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`, pointerEvents: "none" as const }} />}

      <div style={{ padding: "24px 20px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 58, height: 58, background: accent + "18", border: `1px solid ${accent}35`, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, boxShadow: `0 4px 20px ${accent}25`, flexShrink: 0 }}>
              {GAME_ICONS[t.game_type]}
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#4a5568", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.14em", marginBottom: 3 }}>Sponsorisé · {t.sponsor}</div>
              <div style={{ fontSize: 23, fontWeight: 900, color: "#f0ede6", fontFamily: "'Bebas Neue', cursive", letterSpacing: "0.04em", lineHeight: 1.1 }}>{t.title}</div>
              <div style={{ fontSize: 13, color: accent, fontWeight: 700, marginTop: 3 }}>{GAME_LABELS[t.game_type]}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: accent, background: accent + "18", border: `1px solid ${accent}40`, borderRadius: 8, padding: "6px 12px", whiteSpace: "nowrap" as const, flexShrink: 0 }}>
            {!isFinished && <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, display: "inline-block", boxShadow: `0 0 6px ${accent}`, animation: "pulse 1.4s ease-in-out infinite" }} />}
            {isFinished ? "TERMINÉ" : isActive ? "EN COURS" : "BIENTÔT"}
          </div>
        </div>

        {/* Description */}
        {t.description && (
          <div style={{ background: "#0a0c1080", borderRadius: 12, padding: "13px 15px", marginBottom: 20, borderLeft: `3px solid ${accent}` }}>
            <p style={{ fontSize: 13, color: "#c8c0b0", lineHeight: 1.7, margin: 0 }}>{t.description}</p>
            <p style={{ fontSize: 11, color: "#4a5568", margin: "7px 0 0", fontStyle: "italic" as const }}>💡 {GAME_TIPS[t.game_type]}</p>
          </div>
        )}

        <PrizeSection t={t} />

        {/* Infos */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {[{ icon: "🎟", label: "1 ticket requis" }, { icon: "⏱", label: "Max 2 tournois / jour" }].map(({ icon, label }) => (
            <div key={label} style={{ flex: 1, background: "#0a0c1060", border: "1px solid #1e2130", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "#6b7280", display: "flex", gap: 7, alignItems: "center" }}>
              <span style={{ fontSize: 14 }}>{icon}</span><span>{label}</span>
            </div>
          ))}
        </div>

        {/* Countdown */}
        <div style={{ background: "#0a0c1080", border: `1px solid ${accent}30`, borderRadius: 16, padding: "18px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {isUpcoming && (<><div><div style={{ fontSize: 10, color: "#4a5568", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 3 }}>Commence dans</div><div style={{ fontSize: 12, color: "#6b7280" }}>Préparez-vous !</div></div><CountdownDisplay target={t.starts_at} size={32} color="#f59e0b" /></>)}
          {isActive && (<><div><div style={{ fontSize: 10, color: "#4a5568", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 3 }}>Se termine dans</div><div style={{ fontSize: 12, color: "#6b7280" }}>Soumettez avant la fin</div></div><CountdownDisplay target={t.ends_at} size={32} color="#22c55e" /></>)}
          {isFinished && <span style={{ fontSize: 13, color: "#6b7280", width: "100%", textAlign: "center" as const }}>Tournoi terminé — classement final ci-dessous</span>}
        </div>

        <Leaderboard entries={leaderboard} myId={myId} accentColor={accent} t={t} isFinished={isFinished} />

        {/* Résultat perso */}
        {isFinished && myEntry && (
          <div style={{ borderRadius: 16, padding: "18px 16px", textAlign: "center" as const, marginBottom: 8, background: myEntry.rank === 1 ? "#f59e0b14" : myEntry.rank === 2 ? "#9ca3af12" : "#ffffff06", border: `1px solid ${myEntry.rank === 1 ? "#f59e0b40" : myEntry.rank === 2 ? "#9ca3af30" : "#ffffff10"}` }}>
            {myEntry.rank === 1 && <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>}
            {myEntry.rank === 2 && <div style={{ fontSize: 30, marginBottom: 8 }}>🥈</div>}
            {myEntry.rank && myEntry.rank > 2 && <div style={{ fontSize: 15, color: "#8892a4", marginBottom: 6 }}>#{myEntry.rank} — Beau jeu 💪</div>}
            {myEntry.prize_awarded > 0 && <div style={{ fontSize: 15, color: "#22c55e", fontWeight: 800 }}>+{myEntry.prize_awarded} GDS crédités ✓</div>}
          </div>
        )}

        {/* Bouton action */}
        {!isFinished && (
          <>
            {!hasEntered && isActive && tickets >= 1 && (
              <button onClick={() => onEnter(t.id)} disabled={entering} style={{ width: "100%", border: "none", borderRadius: 14, background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "#0a0c10", padding: "18px", fontSize: 18, fontWeight: 900, fontFamily: "'Bebas Neue', cursive", letterSpacing: "0.08em", cursor: entering ? "not-allowed" : "pointer", opacity: entering ? 0.7 : 1, boxShadow: "0 6px 28px #f59e0b40" }}>
                {entering ? "…" : "PARTICIPER · 1 TICKET"}
              </button>
            )}
            {!hasEntered && isActive && tickets < 1 && (
              <div style={{ background: "#1e213080", border: "1px solid #1e2130", borderRadius: 12, padding: "14px", textAlign: "center" as const, fontSize: 13, color: "#6b7280" }}>Plus de tickets disponibles · Revenez demain 👋</div>
            )}
            {hasEntered && !hasPlayed && isActive && (
              <button onClick={() => onPlay(t)} style={{ width: "100%", border: "none", borderRadius: 14, background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#0a0c10", padding: "18px", fontSize: 18, fontWeight: 900, fontFamily: "'Bebas Neue', cursive", letterSpacing: "0.08em", cursor: "pointer", boxShadow: "0 6px 28px #22c55e40" }}>
                JOUER MAINTENANT →
              </button>
            )}
            {hasPlayed && (
              <div style={{ background: "#0d2e1f", border: "1px solid #22c55e40", borderRadius: 14, padding: "16px", textAlign: "center" as const }}>
                <div style={{ fontSize: 14, color: "#22c55e", fontWeight: 700 }}>✓ Score soumis — {myEntry!.score.toLocaleString()} pts</div>
                <div style={{ fontSize: 12, color: "#4a5568", marginTop: 5 }}>Classement final à la clôture du tournoi</div>
              </div>
            )}
            {!hasEntered && isUpcoming && (
              <div style={{ background: "#1a1d2a", border: "1px solid #f59e0b20", borderRadius: 12, padding: "16px", textAlign: "center" as const }}>
                <div style={{ fontSize: 14, color: "#f59e0b", fontWeight: 700 }}>Tournoi bientôt disponible — préparez-vous !</div>
                <div style={{ fontSize: 12, color: "#4a5568", marginTop: 5 }}>Allez vous entraîner en attendant 💪</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CARTE HISTORIQUE
// ─────────────────────────────────────────────
function HistoryCard({ t, myEntry, leaderboard, myId }: {
  t: Tournament; myEntry?: Entry; leaderboard: LeaderEntry[]; myId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const participated = !!myEntry;
  const rankColors: Record<number, string> = { 1: "#f59e0b", 2: "#9ca3af", 3: "#cd7f32" };
  const rankEmojis: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const myRank = myEntry?.rank ?? null;
  const borderAccent = participated
    ? myRank && myRank <= 3 ? rankColors[myRank] : "#22c55e"
    : "#1e2130";

  const dateStr = new Date(t.starts_at).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div style={{
      background: "#0d0f1480",
      border: `1px solid ${borderAccent}30`,
      borderRadius: 18, overflow: "hidden",
      opacity: 0.9,
    }}>
      {/* Bande top */}
      <div style={{ height: 2, background: participated ? `linear-gradient(90deg, transparent, ${borderAccent}60, transparent)` : "#1e2130" }} />

      <div style={{ padding: "16px 18px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          {/* Icône jeu */}
          <div style={{ width: 44, height: 44, background: "#111420", border: "1px solid #1e2130", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
            {GAME_ICONS[t.game_type]}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "#4a5568", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 2 }}>
              {dateStr} · {t.sponsor}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f0ede6", fontFamily: "'Bebas Neue', cursive", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
              {t.title}
            </div>
          </div>

          {/* Badge participation */}
          {participated ? (
            <div style={{
              flexShrink: 0, textAlign: "center" as const,
              background: myRank && myRank <= 3 ? rankColors[myRank] + "20" : "#22c55e18",
              border: `1px solid ${myRank && myRank <= 3 ? rankColors[myRank] + "50" : "#22c55e40"}`,
              borderRadius: 10, padding: "6px 10px",
            }}>
              <div style={{ fontSize: myRank && myRank <= 3 ? 20 : 14 }}>
                {myRank && myRank <= 3 ? rankEmojis[myRank] : `#${myRank}`}
              </div>
              <div style={{ fontSize: 10, color: "#4a5568", fontWeight: 700 }}>
                {myEntry!.score.toLocaleString()} pts
              </div>
            </div>
          ) : (
            <div style={{ flexShrink: 0, background: "#111420", border: "1px solid #1e2130", borderRadius: 10, padding: "6px 10px", textAlign: "center" as const }}>
              <div style={{ fontSize: 14 }}>👁</div>
              <div style={{ fontSize: 9, color: "#4a5568", fontWeight: 700, marginTop: 2 }}>NON JOUÉ</div>
            </div>
          )}
        </div>

        {/* Résumé condensé */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: expanded ? 14 : 0 }}>
          {/* Prizes mini */}
          <div style={{ flex: 1, display: "flex", gap: 5 }}>
            {[{ e:"🥇",a:t.prize_1,c:"#f59e0b" },{ e:"🥈",a:t.prize_2,c:"#9ca3af" }].map((p,i) => (
              <div key={i} style={{ fontSize: 11, color: p.c, background: p.c+"12", border:`1px solid ${p.c}25`, borderRadius: 6, padding: "3px 7px", fontWeight: 700 }}>
                {p.e} {p.a} GDS
              </div>
            ))}
          </div>
          {/* GDS gagnés */}
          {participated && myEntry!.prize_awarded > 0 && (
            <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 800, background: "#22c55e15", border: "1px solid #22c55e30", borderRadius: 6, padding: "3px 8px" }}>
              +{myEntry!.prize_awarded} GDS ✓
            </div>
          )}
          {/* Bouton expand */}
          <button onClick={() => setExpanded(p => !p)} style={{
            background: "none", border: "1px solid #1e2130",
            borderRadius: 8, color: "#4a5568",
            padding: "4px 10px", fontSize: 11, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
          }}>
            {expanded ? "Moins ↑" : "Détails ↓"}
          </button>
        </div>

        {/* Contenu déroulé */}
        {expanded && (
          <div style={{ animation: "fadeUp 0.2s ease", borderTop: "1px solid #1e2130", paddingTop: 14 }}>

            {/* Leaderboard final */}
            {leaderboard.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#4a5568", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 8 }}>
                  Classement final
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                  {leaderboard.slice(0, 5).map((e, i) => {
                    const isMe = e.user_id === myId;
                    const medals = ["🥇","🥈","🥉"];
                    const prizes = [t.prize_1,t.prize_2,t.prize_3];
                    const pc = ["#f59e0b","#9ca3af","#cd7f32"][i];
                    return (
                      <div key={e.user_id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 12px", borderRadius: 10,
                        background: isMe ? "#22c55e18" : "#ffffff04",
                        border: `1px solid ${isMe ? "#22c55e35" : "#1e2130"}`,
                      }}>
                        <span style={{ fontSize: 16, width: 22, textAlign: "center" as const }}>{medals[i] ?? `#${i+1}`}</span>
                        <span style={{ flex: 1, fontSize: 13, color: isMe ? "#f0ede6" : "#6b7280", fontWeight: isMe ? 700 : 400 }}>
                          {e.username}{isMe ? " (toi)" : ""}
                        </span>
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: pc ?? "#4a5568", fontWeight: 800 }}>
                          {e.score.toLocaleString()} pts
                        </span>
                        {prizes[i] > 0 && (
                          <span style={{ fontSize: 10, color: pc, fontWeight: 800, background: (pc ?? "#4a5568")+"18", borderRadius: 5, padding: "1px 6px" }}>
                            +{prizes[i]} GDS
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mon résultat si participé */}
            {participated && !myEntry!.rank && (
              <div style={{ fontSize: 12, color: "#4a5568", textAlign: "center" as const, padding: "8px 0" }}>
                Score soumis · classement en attente de finalisation
              </div>
            )}

            {/* Non participé */}
            {!participated && (
              <div style={{ fontSize: 12, color: "#4a5568", textAlign: "center" as const, padding: "8px 0" }}>
                Tu n'as pas participé à ce tournoi
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────
export default function TournamentSponsorisePage() {
  const router = useRouter();

  // État tournois du jour
  const [tournaments, setTournaments]   = useState<Tournament[]>([]);
  const [entries, setEntries]           = useState<Entry[]>([]);
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderEntry[]>>({});
  const [tickets, setTickets]           = useState(0);
  const [userId, setUserId]             = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [entering, setEntering]         = useState(false);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);

  // État historique
  const [historyDays, setHistoryDays]         = useState<7 | 14>(7);
  const [historyTournaments, setHistoryTournaments] = useState<Tournament[]>([]);
  const [historyEntries, setHistoryEntries]   = useState<Entry[]>([]);
  const [historyLeaderboards, setHistoryLeaderboards] = useState<Record<string, LeaderEntry[]>>({});
  const [historyLoading, setHistoryLoading]   = useState(false);

  const ERRORS: Record<string, string> = {
    no_tickets:            "Tu n'as plus de tickets. Revenez demain 👋",
    daily_limit_reached:   "Tu as atteint la limite de 2 tournois par jour. Revenez demain !",
    monopoly_limit:        "Tu as déjà remporté 2 tournois aujourd'hui — place aux autres joueurs 😄",
    already_entered:       "Tu es déjà inscrit à ce tournoi.",
    tournament_not_active: "Ce tournoi n'est pas encore actif.",
  };

  // ── Fetch leaderboard pour une liste
  const fetchLeaderboards = useCallback(async (list: Tournament[]) => {
    const lb: Record<string, LeaderEntry[]> = {};
    for (const t of list) {
      const { data: scores } = await supabase
        .from("tournament_entries").select("user_id, score, rank")
        .eq("tournament_id", t.id).eq("finished", true)
        .order("score", { ascending: false }).limit(5);
      if (scores?.length) {
        const uids = scores.map((s: any) => s.user_id);
        const { data: names } = await supabase.from("users").select("id, full_name").in("id", uids);
        const nameMap: Record<string, string> = {};
        (names ?? []).forEach((n: any) => { nameMap[n.id] = n.full_name ?? "Joueur"; });
        lb[t.id] = scores.map((s: any) => ({ user_id: s.user_id, score: s.score, rank: s.rank, username: nameMap[s.user_id] ?? "Joueur" }));
      } else { lb[t.id] = []; }
    }
    return lb;
  }, []);

  // ── Chargement initial (tournois du jour)
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const { data: userData } = await supabase.from("users").select("tickets").eq("id", user.id).single();
      if (userData) setTickets(userData.tickets ?? 0);

      const today    = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: tData } = await supabase.from("tournaments").select("*")
        .gte("starts_at", today.toISOString())
        .lt("starts_at", tomorrow.toISOString())
        .order("starts_at", { ascending: true });

      const list: Tournament[] = tData ?? [];
      setTournaments(list);

      if (list.length > 0) {
        const { data: eData } = await supabase
          .from("tournament_entries").select("tournament_id, score, finished, rank, prize_awarded")
          .eq("user_id", user.id).in("tournament_id", list.map(t => t.id));
        setEntries((eData ?? []) as Entry[]);
        const lb = await fetchLeaderboards(list);
        setLeaderboards(lb);
      }
      setLoading(false);
    };
    load();
  }, [router, fetchLeaderboards]);

  // ── Realtime leaderboards
  useEffect(() => {
    if (!tournaments.length) return;
    const ch = supabase.channel("lb-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_entries" }, async () => {
        const lb = await fetchLeaderboards(tournaments);
        setLeaderboards(lb);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tournaments, fetchLeaderboards]);

  // ── Chargement historique
  useEffect(() => {
    if (!userId) return;
    const loadHistory = async () => {
      setHistoryLoading(true);
      const today    = new Date(); today.setHours(0, 0, 0, 0);
      const pastDate = new Date(today); pastDate.setDate(pastDate.getDate() - historyDays);

      const { data: tData } = await supabase.from("tournaments").select("*")
        .gte("starts_at", pastDate.toISOString())
        .lt("starts_at", today.toISOString())
        .order("starts_at", { ascending: false });

      const list: Tournament[] = tData ?? [];
      setHistoryTournaments(list);

      if (list.length > 0) {
        const { data: eData } = await supabase
          .from("tournament_entries").select("tournament_id, score, finished, rank, prize_awarded")
          .eq("user_id", userId).in("tournament_id", list.map(t => t.id));
        setHistoryEntries((eData ?? []) as Entry[]);
        const lb = await fetchLeaderboards(list);
        setHistoryLeaderboards(lb);
      } else {
        setHistoryEntries([]);
        setHistoryLeaderboards({});
      }
      setHistoryLoading(false);
    };
    loadHistory();
  }, [userId, historyDays, fetchLeaderboards]);

  // ── Actions
  const handleEnter = async (tournamentId: string) => {
    setErrorMsg(null);
    setEntering(true);
    const { data, error } = await supabase.rpc("enter_tournament", { p_tournament_id: tournamentId });
    setEntering(false);
    if (error || !data?.ok) { setErrorMsg(ERRORS[data?.error] ?? "Une erreur est survenue."); return; }
    setTickets(data.tickets_left);
    setEntries(prev => [...prev, { tournament_id: tournamentId, score: 0, finished: false, rank: null, prize_awarded: 0 }]);
  };

  const handlePlay = (t: Tournament) => {
    router.push(`/tournamentsponsorise/play?id=${t.id}&game=${t.game_type}`);
  };

  // ─── Statistiques historique ───
  const historyStats = {
    total:       historyTournaments.length,
    played:      historyEntries.filter(e => e.finished).length,
    gdsEarned:   historyEntries.reduce((sum, e) => sum + (e.prize_awarded ?? 0), 0),
    wins:        historyEntries.filter(e => e.rank === 1).length,
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  if (loading) return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: "#080a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" as const }}>
          <div style={{ fontSize: 40, marginBottom: 14, animation: "floatUp 1s ease-in-out infinite alternate", display: "inline-block" }}>🏆</div>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: "0.12em", color: "#f59e0b" }}>Chargement…</div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 50% 0%, #1a150620 0%, #080a0f 55%)", padding: "0 16px 80px", maxWidth: 580, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── HEADER ── */}
        <div style={{ padding: "44px 0 32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, color: "#4a5568", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.18em", marginBottom: 8 }}>4Infiny présente</div>
              <h1 style={{ margin: 0, fontFamily: "'Bebas Neue', cursive", fontSize: 44, lineHeight: 0.95, letterSpacing: "0.04em", color: "#f0ede6" }}>
                TOURNOIS<br />
                <span style={{ color: "#f59e0b", textShadow: "0 0 40px #f59e0b60, 0 0 80px #f59e0b20" }}>SPONSORISÉS</span>
              </h1>
            </div>
            {/* Tickets */}
            <div style={{ background: tickets > 0 ? "linear-gradient(160deg, #f59e0b20, #f9731608)" : "linear-gradient(160deg, #ef444420, #ef444408)", border: tickets > 0 ? "1px solid #f59e0b45" : "1px solid #ef444435", borderRadius: 20, padding: "16px 20px", textAlign: "center" as const, boxShadow: tickets > 0 ? "0 0 30px #f59e0b20" : "none", minWidth: 82 }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>🎟</div>
              <div style={{ fontSize: 40, fontWeight: 900, fontFamily: "'Bebas Neue', cursive", color: tickets > 0 ? "#f59e0b" : "#ef4444", lineHeight: 1, textShadow: tickets > 0 ? "0 0 20px #f59e0b60" : "none" }}>{tickets}</div>
              <div style={{ fontSize: 10, color: "#4a5568", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginTop: 4 }}>ticket{tickets !== 1 ? "s" : ""}</div>
            </div>
          </div>
          <div style={{ height: 1, marginTop: 24, background: "linear-gradient(90deg, transparent, #f59e0b30, #f59e0b60, #f59e0b30, transparent)" }} />
        </div>

        {/* ── ERREUR ── */}
        {errorMsg && (
          <div style={{ background: "#2d0f0f", border: "1px solid #ef444445", borderRadius: 14, padding: "14px 18px", color: "#ef4444", fontSize: 13, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", animation: "slideDown 0.2s ease", boxShadow: "0 4px 20px #ef444420" }}>
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 18, padding: "0 0 0 14px", lineHeight: 1 }}>✕</button>
          </div>
        )}

        {/* ── SECTION AUJOURD'HUI ── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, #f59e0b30, transparent)" }} />
            <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.14em" }}>
              📅 Aujourd'hui
            </div>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(270deg, #f59e0b30, transparent)" }} />
          </div>

          {tournaments.length === 0 ? (
            <div style={{ textAlign: "center" as const, padding: "60px 20px", background: "#111420", borderRadius: 24, border: "1px solid #1e2130" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
              <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, color: "#8892a4", letterSpacing: "0.06em", marginBottom: 6 }}>Aucun tournoi aujourd'hui</div>
              <div style={{ fontSize: 12, color: "#4a5568" }}>Consultez l'historique ci-dessous</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 24 }}>
              {tournaments.map((t, i) => (
                <div key={t.id} style={{ animation: `fadeUp 0.4s ease ${i * 0.1}s both` }}>
                  <div style={{ fontSize: 11, color: "#4a5568", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.14em", marginBottom: 10, paddingLeft: 4 }}>Tournoi #{i + 1}</div>
                  <TournamentCard
                    t={t}
                    myEntry={entries.find(e => e.tournament_id === t.id)}
                    leaderboard={leaderboards[t.id] ?? []}
                    tickets={tickets} myId={userId}
                    onEnter={handleEnter} onPlay={handlePlay} entering={entering}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SECTION HISTORIQUE ── */}
        <div>
          {/* Titre + filtre */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: "none", height: 1, width: 32, background: "#6b728040" }} />
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.14em" }}>
                📂 Historique
              </div>
            </div>
            {/* Filtre jours */}
            <div style={{ display: "flex", gap: 4, background: "#111420", border: "1px solid #1e2130", borderRadius: 10, padding: 4 }}>
              {([7, 14] as const).map(d => (
                <button key={d} onClick={() => setHistoryDays(d)} style={{
                  background: historyDays === d ? "#1e2130" : "transparent",
                  border: historyDays === d ? "1px solid #2a2f45" : "1px solid transparent",
                  borderRadius: 7, padding: "5px 12px",
                  fontSize: 12, fontWeight: 700,
                  color: historyDays === d ? "#f0ede6" : "#4a5568",
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.15s ease",
                }}>
                  {d}j
                </button>
              ))}
            </div>
          </div>

          {/* Stats résumé */}
          {historyTournaments.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
              {[
                { label: "Tournois", value: historyStats.total, color: "#6b7280" },
                { label: "Joués",    value: historyStats.played, color: "#22c55e" },
                { label: "Victoires",value: historyStats.wins,   color: "#f59e0b" },
                { label: "GDS +",    value: historyStats.gdsEarned, color: "#06b6d4" },
              ].map(s => (
                <div key={s.label} style={{ background: "#0d0f1480", border: "1px solid #1e2130", borderRadius: 12, padding: "10px 8px", textAlign: "center" as const }}>
                  <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: "#4a5568", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Liste historique */}
          {historyLoading ? (
            <div style={{ textAlign: "center" as const, padding: "40px 0", color: "#4a5568", fontSize: 13 }}>
              <div style={{ display: "inline-block", width: 24, height: 24, border: "2px solid #1e2130", borderTopColor: "#6b7280", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 10 }} />
              <div>Chargement de l'historique…</div>
            </div>
          ) : historyTournaments.length === 0 ? (
            <div style={{ textAlign: "center" as const, padding: "48px 20px", background: "#0d0f1480", borderRadius: 20, border: "1px solid #1e2130" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
              <div style={{ fontSize: 14, color: "#4a5568" }}>Aucun tournoi dans les {historyDays} derniers jours</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
              {historyTournaments.map((t, i) => (
                <div key={t.id} style={{ animation: `fadeUp 0.3s ease ${i * 0.06}s both` }}>
                  <HistoryCard
                    t={t}
                    myEntry={historyEntries.find(e => e.tournament_id === t.id)}
                    leaderboard={historyLeaderboards[t.id] ?? []}
                    myId={userId}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// STYLES GLOBAUX
// ─────────────────────────────────────────────
const sectionLabel: React.CSSProperties = {
  fontSize: 10, color: "#4a5568", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10,
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800;900&family=Share+Tech+Mono&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #080a0f; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.4; transform: scale(0.8); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes floatUp {
    from { transform: translateY(0px); }
    to   { transform: translateY(-6px); }
  }
`;