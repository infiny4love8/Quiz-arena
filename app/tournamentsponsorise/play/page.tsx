"use client";

// ============================================================
// app/tournamentsponsorise/play/page.tsx
// ============================================================

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type GameState = "loading" | "ready" | "playing" | "submitting" | "done" | "error";

type Tournament = {
  id: string;
  title: string;
  game_type: string;
  ends_at: string;
  max_players: number;
  prize_1: number;
  prize_2: number;
};

// ── Compte à rebours ──
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
  return secs;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

// ============================================================
// MINI-JEU FLAGS — Quiz drapeaux
// Remplace le contenu de cette fonction par ton vrai jeu
// Le seul contrat : appeler onScore(score) quand c'est terminé
// ============================================================
function GameFlags({ onScore }: { onScore: (score: number) => void }) {
  const questions = [
    { flag: "🇫🇷", options: ["France", "Belgique", "Italie", "Espagne"], answer: "France" },
    { flag: "🇧🇷", options: ["Argentine", "Brésil", "Mexique", "Colombie"], answer: "Brésil" },
    { flag: "🇯🇵", options: ["Chine", "Corée", "Japon", "Vietnam"], answer: "Japon" },
    { flag: "🇩🇪", options: ["Autriche", "Suisse", "Pays-Bas", "Allemagne"], answer: "Allemagne" },
    { flag: "🇸🇳", options: ["Mali", "Sénégal", "Ghana", "Côte d'Ivoire"], answer: "Sénégal" },
  ];

  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [startTime] = useState(Date.now());

  const handleAnswer = (opt: string) => {
    if (chosen) return;
    setChosen(opt);
    const correct = opt === questions[idx].answer;
    const newScore = correct ? score + 200 : score;
    setTimeout(() => {
      if (idx + 1 >= questions.length) {
        // Bonus temps : plus vite = plus de points
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const timeBonus = Math.max(0, 300 - elapsed * 5);
        onScore(newScore + timeBonus);
      } else {
        setScore(newScore);
        setIdx(idx + 1);
        setChosen(null);
      }
    }, 800);
  };

  const q = questions[idx];

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: "#4a5568", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          Question {idx + 1} / {questions.length}
        </div>
        <div style={{ fontSize: 88, lineHeight: 1, marginBottom: 16 }}>{q.flag}</div>
        <div style={{ fontSize: 15, color: "#8892a4" }}>Quel pays est ce drapeau ?</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {q.options.map(opt => {
          const isCorrect = opt === q.answer;
          const isChosen = opt === chosen;
          let bg = "#111420";
          let border = "#1e2130";
          let color = "#c8c0b0";
          if (chosen) {
            if (isCorrect) { bg = "#0d2e1f"; border = "#22c55e"; color = "#22c55e"; }
            else if (isChosen) { bg = "#2d0f0f"; border = "#ef4444"; color = "#ef4444"; }
          }
          return (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              disabled={!!chosen}
              style={{
                background: bg, border: `2px solid ${border}`,
                borderRadius: 12, padding: "14px 10px",
                fontSize: 14, fontWeight: 600, color,
                cursor: chosen ? "default" : "pointer",
                transition: "all 0.15s",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#4a5568" }}>
        Score actuel : <span style={{ color: "#f59e0b", fontWeight: 700 }}>{score} pts</span>
      </div>
    </div>
  );
}

// ============================================================
// MINI-JEU MEMORY — Branche sur ton vrai jeu ici
// ============================================================
function GameMemory({ onScore }: { onScore: (score: number) => void }) {
  // Remplace par ton composant Memory existant
  // Appelle onScore(score) quand la partie est terminée
  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
      <p style={{ color: "#8892a4", marginBottom: 20 }}>Jeu Mémoire</p>
      <p style={{ color: "#4a5568", fontSize: 13, marginBottom: 24 }}>
        Branche ton composant Memory ici via onScore()
      </p>
      <button
        onClick={() => onScore(Math.floor(Math.random() * 800) + 200)}
        style={{ background: "#22c55e", border: "none", borderRadius: 10, color: "#0a0c10", padding: "12px 24px", fontWeight: 700, cursor: "pointer" }}
      >
        Terminer (test)
      </button>
    </div>
  );
}

// ============================================================
// MINI-JEU TANK — Branche sur ton vrai jeu ici
// ============================================================
function GameTank({ onScore }: { onScore: (score: number) => void }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
      <p style={{ color: "#8892a4", marginBottom: 20 }}>Jeu Tank</p>
      <p style={{ color: "#4a5568", fontSize: 13, marginBottom: 24 }}>
        Branche ton composant Tank ici via onScore()
      </p>
      <button
        onClick={() => onScore(Math.floor(Math.random() * 800) + 200)}
        style={{ background: "#22c55e", border: "none", borderRadius: 10, color: "#0a0c10", padding: "12px 24px", fontWeight: 700, cursor: "pointer" }}
      >
        Terminer (test)
      </button>
    </div>
  );
}

// ============================================================
// MINI-JEU RUSH — Branche sur ton vrai jeu ici
// ============================================================
function GameRush({ onScore }: { onScore: (score: number) => void }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
      <p style={{ color: "#8892a4", marginBottom: 20 }}>Jeu Rush</p>
      <p style={{ color: "#4a5568", fontSize: 13, marginBottom: 24 }}>
        Branche ton composant Rush ici via onScore()
      </p>
      <button
        onClick={() => onScore(Math.floor(Math.random() * 800) + 200)}
        style={{ background: "#22c55e", border: "none", borderRadius: 10, color: "#0a0c10", padding: "12px 24px", fontWeight: 700, cursor: "pointer" }}
      >
        Terminer (test)
      </button>
    </div>
  );
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================
export default function TournamentPlayPage() {
  const router = useRouter();
  const params = useSearchParams();
  const tournamentId = params.get("id");
  const gameType = params.get("game") ?? "flags";

  const [gameState, setGameState] = useState<GameState>("loading");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const submitted = useRef(false);

  const secsLeft = useCountdown(tournament?.ends_at ?? new Date(Date.now() + 999999).toISOString());

  useEffect(() => {
    const init = async () => {
      if (!tournamentId) { router.push("/tournamentsponsorise"); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Vérifier l'entrée existe
      const { data: entry } = await supabase
        .from("tournament_entries")
        .select("finished, score")
        .eq("tournament_id", tournamentId)
        .eq("user_id", user.id)
        .single();

      if (!entry) {
        router.push("/tournamentsponsorise");
        return;
      }

      // Déjà joué
      if (entry.finished) {
        router.push("/tournamentsponsorise");
        return;
      }

      // Récupérer le tournois
      const { data: t } = await supabase
        .from("tournaments")
        .select("id, title, game_type, ends_at, max_players, prize_1, prize_2")
        .eq("id", tournamentId)
        .single();

      if (!t) { router.push("/tournamentsponsorise"); return; }

      setTournament(t);
      setGameState("ready");
    };
    init();
  }, [tournamentId, router]);

  // Si le temps est écoulé pendant le jeu → soumission automatique avec score 0
  useEffect(() => {
    if (secsLeft <= 0 && gameState === "playing" && !submitted.current) {
      handleScore(0);
    }
  }, [secsLeft, gameState]);

  const handleScore = useCallback(async (score: number) => {
    if (submitted.current) return;
    submitted.current = true;
    setFinalScore(score);
    setGameState("submitting");

    const { data, error } = await supabase.rpc("submit_tournament_score", {
      p_tournament_id: tournamentId,
      p_score: score,
    });

    if (error || !data?.ok) {
      setErrorMsg("Erreur lors de la soumission du score.");
      setGameState("error");
      return;
    }

    // Récupérer le classement actuel pour afficher le rang provisoire
    const { data: scores } = await supabase
      .from("tournament_entries")
      .select("user_id, score")
      .eq("tournament_id", tournamentId)
      .eq("finished", true)
      .order("score", { ascending: false });

    const { data: { user } } = await supabase.auth.getUser();
    if (scores && user) {
      const pos = scores.findIndex((s: any) => s.user_id === user.id);
      setRank(pos + 1);
    }

    setGameState("done");
  }, [tournamentId]);

  const formatTime = (s: number) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

  // ── LOADING ──
  if (gameState === "loading") {
    return (
      <>
        <style>{css}</style>
        <div style={pageCentered}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, color: "#8892a4", letterSpacing: "0.1em" }}>Chargement…</div>
        </div>
      </>
    );
  }

  // ── ERREUR ──
  if (gameState === "error") {
    return (
      <>
        <style>{css}</style>
        <div style={pageCentered}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ color: "#ef4444", marginBottom: 20 }}>{errorMsg}</div>
          <button onClick={() => router.push("/tournamentsponsorise")} style={btnBack}>
            Retour aux tournois
          </button>
        </div>
      </>
    );
  }

  // ── PRÊT ──
  if (gameState === "ready") {
    return (
      <>
        <style>{css}</style>
        <div style={pageWrap}>
          <div style={card}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>
                {{ flags: "🌍", memory: "🧠", tank: "🎯", rush: "⚡" }[gameType] ?? "🎮"}
              </div>
              <div style={{ fontSize: 11, color: "#4a5568", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 }}>
                Tournois sponsorisé
              </div>
              <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 26, color: "#f0ede6", letterSpacing: "0.05em", margin: "0 0 8px" }}>
                {tournament?.title}
              </h1>
              <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                Tu as <span style={{ color: "#f59e0b", fontWeight: 700 }}>{formatTime(secsLeft)}</span> restant pour terminer ta partie.
                <br />Ton score sera soumis automatiquement à la fin du temps.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              <div style={infoBox}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>🏆</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#f59e0b", fontFamily: "'Bebas Neue', cursive" }}>
                  {tournament?.prize_1} GDS
                </div>
                <div style={{ fontSize: 11, color: "#4a5568" }}>1er prix</div>
              </div>
              <div style={infoBox}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>⏱</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#22c55e", fontFamily: "'Bebas Neue', cursive" }}>
                  {formatTime(secsLeft)}
                </div>
                <div style={{ fontSize: 11, color: "#4a5568" }}>Temps restant</div>
              </div>
            </div>

            <div style={{ background: "#0d2e1f", border: "1px solid #22c55e30", borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 12, color: "#22c55e" }}>
              ✓ Ton ticket a été utilisé · Bonne chance !
            </div>

            <button
              onClick={() => setGameState("playing")}
              style={{
                width: "100%", border: "none", borderRadius: 14,
                background: "linear-gradient(135deg, #f59e0b, #f97316)",
                color: "#0a0c10", padding: "16px",
                fontSize: 18, fontWeight: 900,
                fontFamily: "'Bebas Neue', cursive", letterSpacing: "0.08em",
                cursor: "pointer",
                boxShadow: "0 6px 24px #f59e0b30",
              }}
            >
              LANCER LA PARTIE →
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── EN JEU ──
  if (gameState === "playing") {
    return (
      <>
        <style>{css}</style>
        <div style={pageWrap}>
          {/* Barre du haut */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 20, background: "#111420",
            border: "1px solid #1e2130", borderRadius: 12, padding: "12px 16px",
          }}>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{tournament?.title}</div>
            <div style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 18, fontWeight: 700,
              color: secsLeft < 60 ? "#ef4444" : secsLeft < 120 ? "#f59e0b" : "#22c55e",
            }}>
              ⏱ {formatTime(secsLeft)}
            </div>
          </div>

          <div style={card}>
            {gameType === "flags"  && <GameFlags  onScore={handleScore} />}
            {gameType === "memory" && <GameMemory onScore={handleScore} />}
            {gameType === "tank"   && <GameTank   onScore={handleScore} />}
            {gameType === "rush"   && <GameRush   onScore={handleScore} />}
          </div>
        </div>
      </>
    );
  }

  // ── SOUMISSION ──
  if (gameState === "submitting") {
    return (
      <>
        <style>{css}</style>
        <div style={pageCentered}>
          <div style={{ width: 40, height: 40, border: "3px solid #f59e0b40", borderTopColor: "#f59e0b", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 16 }} />
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, color: "#8892a4", letterSpacing: "0.1em" }}>
            Soumission du score…
          </div>
        </div>
      </>
    );
  }

  // ── TERMINÉ ──
  if (gameState === "done") {
    const isTop2 = rank !== null && rank <= 2;
    return (
      <>
        <style>{css}</style>
        <div style={pageWrap}>
          <div style={card}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>
                {rank === 1 ? "🏆" : rank === 2 ? "🥈" : "💪"}
              </div>
              <h2 style={{
                fontFamily: "'Bebas Neue', cursive",
                fontSize: 32, letterSpacing: "0.06em",
                color: rank === 1 ? "#f59e0b" : rank === 2 ? "#9ca3af" : "#f0ede6",
                margin: "0 0 8px",
              }}>
                {rank === 1 ? "VICTOIRE !" : rank === 2 ? "2ÈME PLACE !" : "BELLE PARTIE !"}
              </h2>
              <p style={{ fontSize: 13, color: "#6b7280" }}>
                {rank === 1 && "Tu es en tête du classement !"}
                {rank === 2 && "Tu es en 2ème position !"}
                {rank && rank > 2 && `Tu es actuellement #${rank} — le classement peut encore changer !`}
              </p>
            </div>

            {/* Score */}
            <div style={{
              background: "#0d0f14", borderRadius: 14,
              padding: "20px", textAlign: "center", marginBottom: 16,
              border: "1px solid #1e2130",
            }}>
              <div style={{ fontSize: 11, color: "#4a5568", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                Ton score
              </div>
              <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 42, color: "#f59e0b", letterSpacing: "0.04em" }}>
                {finalScore.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: "#4a5568" }}>points</div>
            </div>

            {/* Position provisoire */}
            {rank && (
              <div style={{
                background: isTop2 ? "#0d2e1f" : "#111420",
                border: `1px solid ${isTop2 ? "#22c55e40" : "#1e2130"}`,
                borderRadius: 12, padding: "14px 16px",
                textAlign: "center", marginBottom: 16,
              }}>
                <div style={{ fontSize: 13, color: isTop2 ? "#22c55e" : "#8892a4", fontWeight: 600 }}>
                  Position provisoire : #{rank}
                </div>
                {isTop2 && (
                  <div style={{ fontSize: 12, color: "#4a5568", marginTop: 4 }}>
                    Si tu gardes cette position, tu gagneras{" "}
                    <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                      {rank === 1 ? tournament?.prize_1 : tournament?.prize_2} GDS
                    </span>
                    {" "}automatiquement !
                  </div>
                )}
                {!isTop2 && (
                  <div style={{ fontSize: 12, color: "#4a5568", marginTop: 4 }}>
                    Continuez à vous entraîner pour le prochain tournois 💪
                  </div>
                )}
              </div>
            )}

            <div style={{ background: "#1a1d2a", borderRadius: 10, padding: "12px 14px", marginBottom: 24, fontSize: 12, color: "#6b7280", textAlign: "center", lineHeight: 1.6 }}>
              Le classement final sera affiché après la fin du tournois.<br />
              Les coins sont crédités automatiquement.
            </div>

            <button
              onClick={() => router.push("/tournamentsponsorise")}
              style={{
                width: "100%", border: "1px solid #1e2130", borderRadius: 12,
                background: "#111420", color: "#8892a4",
                padding: "14px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Retour aux tournois
            </button>
          </div>
        </div>
      </>
    );
  }

  return null;
}

// ── STYLES ──
const pageWrap: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0a0c10",
  padding: "24px 16px 60px",
  maxWidth: 520,
  margin: "0 auto",
  fontFamily: "'DM Sans', sans-serif",
};

const pageCentered: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0a0c10",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'DM Sans', sans-serif",
  color: "#f0ede6",
};

const card: React.CSSProperties = {
  background: "#111420",
  border: "1px solid #1e2130",
  borderRadius: 20,
  padding: "24px 20px",
};

const infoBox: React.CSSProperties = {
  background: "#0d0f14",
  border: "1px solid #1e2130",
  borderRadius: 12,
  padding: "16px",
  textAlign: "center",
};

const btnBack: React.CSSProperties = {
  background: "#111420",
  border: "1px solid #1e2130",
  borderRadius: 10,
  color: "#8892a4",
  padding: "12px 24px",
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800&family=Share+Tech+Mono&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0c10; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;