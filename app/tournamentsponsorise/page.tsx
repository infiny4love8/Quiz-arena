"use client";

// ============================================================
// app/tournamentsponsorise/page.tsx
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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

const GAME_ICONS: Record<string, string> = {
  flags: "🌍", memory: "🧠", tank: "🎯", rush: "⚡",
};
const GAME_LABELS: Record<string, string> = {
  flags: "Drapeaux", memory: "Mémoire", tank: "Tank", rush: "Rush",
};
const GAME_TIPS: Record<string, string> = {
  flags: "Entraînez-vous à reconnaître les drapeaux du monde",
  memory: "Entraînez-vous dans le jeu de mémoire",
  tank: "Pratiquez le jeu de tank pour améliorer votre précision",
  rush: "Entraînez-vous en mode Rush pour battre le chrono",
};

function useCountdown(target: string) {
  const calc = useCallback(() =>
    Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000)),
  [target]);
  const [secs, setSecs] = useState(calc);
  useEffect(() => {
    setSecs(calc());
    const t = setInterval(() => setSecs(calc()), 1000);
    return () => clearInterval(t);
  }, [calc]);
  return {
    secs,
    h: Math.floor(secs / 3600),
    m: Math.floor((secs % 3600) / 60),
    s: secs % 60,
  };
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function CountdownDisplay({ target }: { target: string }) {
  const { secs, h, m, s } = useCountdown(target);
  if (secs <= 0) return <span style={{ color: "#22c55e" }}>C'est parti !</span>;
  return (
    <span style={{ fontFamily: "'Share Tech Mono', monospace" }}>
      {h > 0 ? `${pad(h)}:` : ""}{pad(m)}:{pad(s)}
    </span>
  );
}

function TournamentCard({
  t, myEntry, leaderboard, tickets, myId,
  onEnter, onPlay, entering,
}: {
  t: Tournament;
  myEntry?: Entry;
  leaderboard: LeaderEntry[];
  tickets: number;
  myId: string | null;
  onEnter: (id: string) => void;
  onPlay: (t: Tournament) => void;
  entering: boolean;
}) {
  const now = Date.now();
  const isUpcoming = t.status === "upcoming" || now < new Date(t.starts_at).getTime();
  const isActive   = t.status === "active" && now >= new Date(t.starts_at).getTime() && now < new Date(t.ends_at).getTime();
  const isFinished = t.status === "finished" || now >= new Date(t.ends_at).getTime();

  const hasEntered = !!myEntry;
  const hasPlayed  = myEntry?.finished;

  const accentColor = isFinished ? "#6b7280" : isActive ? "#22c55e" : "#f59e0b";

  return (
    <div style={{
      background: "#111420",
      border: `1px solid ${accentColor}30`,
      borderRadius: 20,
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Bande colorée en haut */}
      <div style={{
        height: 4,
        background: isFinished
          ? "#6b728040"
          : isActive
          ? "linear-gradient(90deg, #22c55e, #16a34a)"
          : "linear-gradient(90deg, #f59e0b, #f97316)",
      }} />

      <div style={{ padding: "22px 20px" }}>

        {/* ── HEADER CARTE ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{
              width: 52, height: 52,
              background: accentColor + "18",
              border: `1px solid ${accentColor}30`,
              borderRadius: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26,
            }}>
              {GAME_ICONS[t.game_type]}
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#4a5568", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 3 }}>
                Sponsorisé par {t.sponsor}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#f0ede6", fontFamily: "'Bebas Neue', cursive", letterSpacing: "0.05em" }}>
                {t.title}
              </div>
              <div style={{ fontSize: 12, color: accentColor, fontWeight: 600, marginTop: 2 }}>
                {GAME_LABELS[t.game_type]}
              </div>
            </div>
          </div>
          <div style={{
            fontSize: 10, fontWeight: 800,
            letterSpacing: "0.1em",
            color: accentColor,
            background: accentColor + "18",
            border: `1px solid ${accentColor}40`,
            borderRadius: 6,
            padding: "4px 10px",
            whiteSpace: "nowrap" as const,
          }}>
            {isFinished ? "TERMINÉ" : isActive ? "● EN COURS" : "● BIENTÔT"}
          </div>
        </div>

        {/* ── MESSAGE / DESCRIPTION ── */}
        <div style={{
          background: "#0d0f14",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 16,
          borderLeft: `3px solid ${accentColor}`,
        }}>
          <p style={{ fontSize: 13, color: "#c8c0b0", lineHeight: 1.6, margin: 0 }}>
            {t.description || `Bienvenue au tournois ${GAME_LABELS[t.game_type]} sponsorisé par ${t.sponsor} !`}
          </p>
          <p style={{ fontSize: 12, color: "#4a5568", margin: "8px 0 0", fontStyle: "italic" }}>
            💡 {GAME_TIPS[t.game_type]}
          </p>
        </div>

        {/* ── PRIZES ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#4a5568", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Gains
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={prizeBox("#f59e0b")}>
              <span style={{ fontSize: 18 }}>🥇</span>
              <span style={{ fontSize: 16, fontWeight: 900, fontFamily: "'Bebas Neue', cursive", color: "#f59e0b" }}>{t.prize_1} GDS</span>
            </div>
            <div style={prizeBox("#9ca3af")}>
              <span style={{ fontSize: 18 }}>🥈</span>
              <span style={{ fontSize: 16, fontWeight: 900, fontFamily: "'Bebas Neue', cursive", color: "#9ca3af" }}>{t.prize_2} GDS</span>
            </div>
            {t.prize_3 > 0 && (
              <div style={prizeBox("#cd7f32")}>
                <span style={{ fontSize: 18 }}>🥉</span>
                <span style={{ fontSize: 16, fontWeight: 900, fontFamily: "'Bebas Neue', cursive", color: "#cd7f32" }}>{t.prize_3} GDS</span>
              </div>
            )}
          </div>
          <p style={{ fontSize: 11, color: "#4a5568", marginTop: 8 }}>
            💰 1 coin = 1 GDS · Coins crédités automatiquement après le tournois
          </p>
        </div>

        {/* ── RÈGLES ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 8, marginBottom: 16,
        }}>
          {[
            { icon: "🎟", label: "1 ticket par tournois" },
            { icon: "👥", label: `${t.max_players} places max` },
            { icon: "⏱", label: "Max 2 tournois/jour" },
            { icon: "🚫", label: "2 victoires = pause" },
          ].map(({ icon, label }) => (
            <div key={label} style={{
              background: "#0d0f14",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              color: "#6b7280",
              display: "flex", gap: 7, alignItems: "center",
            }}>
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
        </div>

        {/* ── COMPTE À REBOURS ── */}
        <div style={{
          background: "#0d0f14",
          borderRadius: 12,
          padding: "14px 18px",
          marginBottom: 16,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          {isUpcoming && (
            <>
              <div>
                <div style={{ fontSize: 10, color: "#4a5568", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>
                  Commence dans
                </div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  Ne soyez pas en retard !
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#f59e0b" }}>
                <CountdownDisplay target={t.starts_at} />
              </div>
            </>
          )}
          {isActive && (
            <>
              <div>
                <div style={{ fontSize: 10, color: "#4a5568", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>
                  Se termine dans
                </div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  Soumettez votre score avant la fin
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#22c55e" }}>
                <CountdownDisplay target={t.ends_at} />
              </div>
            </>
          )}
          {isFinished && (
            <span style={{ fontSize: 13, color: "#6b7280", width: "100%", textAlign: "center" }}>
              Tournois terminé — voir le classement ci-dessous
            </span>
          )}
        </div>

        {/* ── CLASSEMENT ── */}
        {leaderboard.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#4a5568", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              Classement {isFinished ? "Final" : "en cours"}
            </div>
            {leaderboard.map((e, i) => {
              const medals = ["🥇", "🥈", "🥉"];
              const isMe = e.user_id === myId;
              return (
                <div key={e.user_id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 10, marginBottom: 4,
                  background: isMe ? accentColor + "18" : i < 2 ? "#ffffff06" : "transparent",
                  border: isMe ? `1px solid ${accentColor}40` : "1px solid transparent",
                }}>
                  <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>
                    {medals[i] ?? `#${i + 1}`}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: isMe ? "#f0ede6" : "#8892a4", fontWeight: isMe ? 700 : 400 }}>
                    {e.username}{isMe ? " (toi)" : ""}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? "#f59e0b" : "#6b7280" }}>
                    {e.score.toLocaleString()} pts
                  </span>
                  {isFinished && i === 0 && (
                    <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>+{t.prize_1} GDS</span>
                  )}
                  {isFinished && i === 1 && (
                    <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>+{t.prize_2} GDS</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── RÉSULTAT PERSO si terminé ── */}
        {isFinished && myEntry && (
          <div style={{
            borderRadius: 12, padding: "14px 16px", textAlign: "center",
            background: myEntry.rank === 1 ? "#f59e0b18" : myEntry.rank === 2 ? "#9ca3af18" : "#ffffff08",
            border: `1px solid ${myEntry.rank === 1 ? "#f59e0b40" : myEntry.rank === 2 ? "#9ca3af40" : "#ffffff10"}`,
            marginBottom: 4,
          }}>
            {myEntry.rank === 1 && <div style={{ fontSize: 24, marginBottom: 4 }}>🏆 Victoire !</div>}
            {myEntry.rank === 2 && <div style={{ fontSize: 22, marginBottom: 4 }}>🥈 2ème place !</div>}
            {myEntry.rank && myEntry.rank > 2 && (
              <div style={{ fontSize: 15, color: "#8892a4", marginBottom: 4 }}>#{myEntry.rank} — Beau jeu 💪 Continuez à vous entraîner !</div>
            )}
            {myEntry.prize_awarded > 0 && (
              <div style={{ fontSize: 14, color: "#22c55e", fontWeight: 700 }}>
                +{myEntry.prize_awarded} coins crédités sur votre compte ✓
              </div>
            )}
          </div>
        )}

        {/* ── BOUTON ACTION ── */}
        {!isFinished && (
          <>
            {!hasEntered && isActive && tickets >= 1 && (
              <button
                onClick={() => onEnter(t.id)}
                disabled={entering}
                style={{
                  width: "100%", border: "none", borderRadius: 12,
                  background: "linear-gradient(135deg, #f59e0b, #f97316)",
                  color: "#0a0c10", padding: "15px",
                  fontSize: 16, fontWeight: 900,
                  fontFamily: "'Bebas Neue', cursive", letterSpacing: "0.06em",
                  cursor: entering ? "not-allowed" : "pointer",
                  opacity: entering ? 0.7 : 1,
                  boxShadow: "0 4px 20px #f59e0b30",
                }}>
                {entering ? "…" : "PARTICIPER — 1 TICKET"}
              </button>
            )}

            {!hasEntered && isActive && tickets < 1 && (
              <div style={{
                background: "#1e2130", borderRadius: 12, padding: "14px",
                textAlign: "center", fontSize: 13, color: "#6b7280",
              }}>
                Plus de tickets · Revenez demain 👋
              </div>
            )}

            {hasEntered && !hasPlayed && isActive && (
              <button
                onClick={() => onPlay(t)}
                style={{
                  width: "100%", border: "none", borderRadius: 12,
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  color: "#0a0c10", padding: "15px",
                  fontSize: 16, fontWeight: 900,
                  fontFamily: "'Bebas Neue', cursive", letterSpacing: "0.06em",
                  cursor: "pointer",
                  boxShadow: "0 4px 20px #22c55e30",
                }}>
                JOUER MAINTENANT →
              </button>
            )}

            {hasPlayed && (
              <div style={{
                background: "#0d2e1f", border: "1px solid #22c55e40",
                borderRadius: 12, padding: "14px", textAlign: "center",
              }}>
                <div style={{ fontSize: 13, color: "#22c55e", fontWeight: 700 }}>
                  ✓ Score soumis — {myEntry!.score.toLocaleString()} pts
                </div>
                <div style={{ fontSize: 12, color: "#4a5568", marginTop: 4 }}>
                  Revenez voir le classement final après la fin du tournois
                </div>
              </div>
            )}

            {!hasEntered && isUpcoming && (
              <div style={{
                background: "#1a1d2a", border: "1px solid #f59e0b20",
                borderRadius: 12, padding: "14px", textAlign: "center",
              }}>
                <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600 }}>
                  Préparez-vous — le tournois commence bientôt !
                </div>
                <div style={{ fontSize: 12, color: "#4a5568", marginTop: 4 }}>
                  Allez vous entraîner en attendant 💪
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── PAGE PRINCIPALE ──
export default function TournamentSponsorisePage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderEntry[]>>({});
  const [tickets, setTickets] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const ERRORS: Record<string, string> = {
    no_tickets: "Tu n'as plus de tickets. Revenez demain 👋",
    daily_limit_reached: "Tu as déjà joué 2 tournois aujourd'hui. Revenez demain !",
    monopoly_limit: "Tu as déjà gagné 2 fois aujourd'hui — laisse une chance aux autres 😄",
    already_entered: "Tu es déjà inscrit à ce tournois.",
    tournament_not_active: "Ce tournois n'est pas encore actif.",
  };

  const fetchLeaderboards = useCallback(async (list: Tournament[], uid: string) => {
    const lb: Record<string, LeaderEntry[]> = {};
    for (const t of list) {
      const { data: scores } = await supabase
        .from("tournament_entries")
        .select("user_id, score, rank")
        .eq("tournament_id", t.id)
        .eq("finished", true)
        .order("score", { ascending: false })
        .limit(5);

      if (scores && scores.length > 0) {
        const uids = scores.map((s: any) => s.user_id);
        const { data: names } = await supabase
          .from("users").select("id, full_name").in("id", uids);
        const nameMap: Record<string, string> = {};
        (names ?? []).forEach((n: any) => { nameMap[n.id] = n.full_name ?? "Joueur"; });
        lb[t.id] = scores.map((s: any) => ({
          user_id: s.user_id,
          score: s.score,
          rank: s.rank,
          username: nameMap[s.user_id] ?? "Joueur",
        }));
      } else {
        lb[t.id] = [];
      }
    }
    setLeaderboards(lb);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const { data: userData } = await supabase
        .from("users").select("tickets").eq("id", user.id).single();
      if (userData) setTickets(userData.tickets ?? 0);

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: tData } = await supabase
        .from("tournaments")
        .select("*")
        .gte("starts_at", today.toISOString())
        .lt("starts_at", tomorrow.toISOString())
        .order("starts_at", { ascending: true });

      const list: Tournament[] = tData ?? [];
      setTournaments(list);

      if (list.length > 0) {
        const { data: eData } = await supabase
          .from("tournament_entries")
          .select("tournament_id, score, finished, rank, prize_awarded")
          .eq("user_id", user.id)
          .in("tournament_id", list.map(t => t.id));
        setEntries((eData ?? []) as Entry[]);
        await fetchLeaderboards(list, user.id);
      }
      setLoading(false);
    };
    load();
  }, [router, fetchLeaderboards]);

  // Realtime scores
  useEffect(() => {
    if (!tournaments.length) return;
    const ch = supabase.channel("lb-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_entries" }, () => {
        if (userId) fetchLeaderboards(tournaments, userId);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tournaments, userId, fetchLeaderboards]);

  const handleEnter = async (tournamentId: string) => {
    setErrorMsg(null);
    setEntering(true);
    const { data, error } = await supabase.rpc("enter_tournament", { p_tournament_id: tournamentId });
    setEntering(false);
    if (error || !data?.ok) {
      setErrorMsg(ERRORS[data?.error] ?? "Une erreur est survenue.");
      return;
    }
    setTickets(data.tickets_left);
    setEntries(prev => [...prev, { tournament_id: tournamentId, score: 0, finished: false, rank: null, prize_awarded: 0 }]);
  };

  const handlePlay = (t: Tournament) => {
    router.push(`/tournamentsponsorise/play?id=${t.id}&game=${t.game_type}`);
  };

  if (loading) {
    return (
      <>
        <style>{css}</style>
        <div style={{ minHeight: "100vh", background: "#0a0c10", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "#4a5568" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: "0.1em" }}>Chargement…</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: "#0a0c10", padding: "0 16px 60px", maxWidth: 560, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>

        {/* HEADER */}
        <div style={{ padding: "40px 0 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#4a5568", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>
              4Infiny présente
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Bebas Neue', cursive", fontSize: 36, color: "#f0ede6", letterSpacing: "0.06em", lineHeight: 1 }}>
              TOURNOIS<br />
              <span style={{ color: "#f59e0b" }}>SPONSORISÉS</span>
            </h1>
          </div>
          <div style={{
            background: "#111420",
            border: tickets > 0 ? "1px solid #f59e0b40" : "1px solid #ef444430",
            borderRadius: 16, padding: "14px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "'Bebas Neue', cursive", color: tickets > 0 ? "#f59e0b" : "#ef4444", lineHeight: 1 }}>
              {tickets}
            </div>
            <div style={{ fontSize: 10, color: "#4a5568", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>
              ticket{tickets !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* ERREUR */}
        {errorMsg && (
          <div style={{
            background: "#2d0f0f", border: "1px solid #ef444440",
            borderRadius: 12, padding: "13px 16px", color: "#ef4444",
            fontSize: 13, marginBottom: 16,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            ⚠️ {errorMsg}
            <button onClick={() => setErrorMsg(null)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* TOURNOIS */}
        {tournaments.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "80px 20px",
            background: "#111420", borderRadius: 20, border: "1px solid #1e2130",
          }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🏆</div>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, color: "#8892a4", letterSpacing: "0.06em" }}>
              Aucun tournois aujourd'hui
            </div>
            <div style={{ fontSize: 13, color: "#4a5568", marginTop: 8 }}>Revenez demain pour de nouveaux tournois !</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {tournaments.map((t, i) => (
              <div key={t.id}>
                <div style={{ fontSize: 11, color: "#4a5568", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
                  Tournois #{i + 1}
                </div>
                <TournamentCard
                  t={t}
                  myEntry={entries.find(e => e.tournament_id === t.id)}
                  leaderboard={leaderboards[t.id] ?? []}
                  tickets={tickets}
                  myId={userId}
                  onEnter={handleEnter}
                  onPlay={handlePlay}
                  entering={entering}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── STYLES ──
function prizeBox(color: string): React.CSSProperties {
  return {
    flex: 1,
    background: color + "12",
    border: `1px solid ${color}30`,
    borderRadius: 10,
    padding: "10px 8px",
    display: "flex", flexDirection: "column" as const,
    alignItems: "center", gap: 4,
  };
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800&family=Share+Tech+Mono&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0c10; }
`;