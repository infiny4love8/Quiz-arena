"use client";

// ============================================================
// app/tournamentsponsorise/play/page.tsx
// ============================================================

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import flagsQuestions from "@/data/flags.json";

// ── Types ──
type Question = {
  id: string | number;
  question: string;
  flag: string;
  answer: string;
  options: string[];
};

type AnswerState = {
  questionId: string | number;
  question: string;
  selected: string;
  correctAnswer: string;
  correct: boolean;
  timedOut?: boolean;
};

type Tournament = {
  id: string;
  title: string;
  game_type: string;
  ends_at: string;
  prize_1: number;
  prize_2: number;
};

type PageState = "loading" | "ready" | "playing" | "submitting" | "done" | "error";

// ── Helpers jeu drapeaux ──
const QUESTION_LIMIT = 10;
const TIME_PER_QUESTION = 10;

function fisherYates<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function prepareQuestions(): Question[] {
  return fisherYates(flagsQuestions as Question[])
    .slice(0, QUESTION_LIMIT)
    .map((q) => ({ ...q, options: fisherYates(q.options) }));
}

function playClickSound() {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 440;
  gain.gain.value = 0.03;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
  osc.stop(ctx.currentTime + 0.09);
  osc.onended = () => ctx.close();
}

// ── Countdown hook ──
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
  return secs;
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function formatTime(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }

// ============================================================
// COMPOSANT JEU DRAPEAUX
// Ton vrai jeu — appelle onScore(points) quand c'est terminé
// ============================================================
function GameFlags({ onScore, tournamentEndsAt }: {
  onScore: (score: number) => void;
  tournamentEndsAt: string;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [combo, setCombo] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scoreSent = useRef(false);

  const tournamentSecsLeft = useCountdown(tournamentEndsAt);

  useEffect(() => { setQuestions(prepareQuestions()); }, []);

  const currentQuestion = questions[currentIndex];
  const correctAnswers = useMemo(() => answers.filter((a) => a.correct).length, [answers]);
  const points = correctAnswers * 100 + combo * 25;
  const progress = questions.length
    ? ((currentIndex + (selectedAnswer ? 1 : 0)) / questions.length) * 100 : 0;

  // Envoyer le score dès que isFinished = true
  useEffect(() => {
    if (isFinished && !scoreSent.current) {
      scoreSent.current = true;
      onScore(points);
    }
  }, [isFinished, points, onScore]);

  // Si le tournois se termine pendant la partie → soumettre immédiatement
  useEffect(() => {
    if (tournamentSecsLeft <= 0 && !scoreSent.current) {
      scoreSent.current = true;
      onScore(points);
    }
  }, [tournamentSecsLeft, points, onScore]);

  // Timer par question
  useEffect(() => {
    if (!questions.length || selectedAnswer || isFinished) return;
    if (timeLeft <= 0) { handleTimeout(); return; }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, questions, selectedAnswer, isFinished]);

  function finishQuiz() { setIsFinished(true); }

  function handleAnswer(option: string) {
    if (selectedAnswer || !currentQuestion) return;
    playClickSound();
    setSelectedAnswer(option);
    const correct = option === currentQuestion.answer;
    setCombo((prev) => (correct ? prev + 1 : 0));
    setAnswers((prev) => [...prev, {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      selected: option,
      correctAnswer: currentQuestion.answer,
      correct,
    }]);
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer("");
        setTimeLeft(TIME_PER_QUESTION);
        setAnimKey((k) => k + 1);
      } else {
        finishQuiz();
      }
    }, 850);
  }

  function handleTimeout() {
    if (!currentQuestion || selectedAnswer) return;
    setCombo(0);
    setAnswers((prev) => [...prev, {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      selected: "Temps écoulé",
      correctAnswer: currentQuestion.answer,
      correct: false,
      timedOut: true,
    }]);
    setSelectedAnswer("timeout");
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer("");
        setTimeLeft(TIME_PER_QUESTION);
        setAnimKey((k) => k + 1);
      } else {
        finishQuiz();
      }
    }, 850);
  }

  if (!currentQuestion) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "#4a5568" }}>
        Chargement des questions…
      </div>
    );
  }

  return (
    <div>
      {/* Barre progression + stats */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: "#6b7280" }}>
          Question {currentIndex + 1} / {questions.length}
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {combo > 1 && (
            <span style={{
              fontSize: 12, fontWeight: 700, color: "#f59e0b",
              background: "#f59e0b18", border: "1px solid #f59e0b30",
              borderRadius: 20, padding: "3px 10px",
            }}>
              Combo x{combo}
            </span>
          )}
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: timeLeft <= 3 ? "#ef4444" : timeLeft <= 6 ? "#f59e0b" : "#22c55e",
            background: "#0d0f14", border: "1px solid #1e2130",
            borderRadius: 20, padding: "3px 10px",
          }}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Barre de progression */}
      <div style={{ height: 4, background: "#1e2130", borderRadius: 4, marginBottom: 20, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 4,
          background: "linear-gradient(90deg, #ef4444, #f59e0b)",
          width: `${progress}%`,
          transition: "width 0.5s ease",
        }} />
      </div>

      {/* Drapeau */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{
          display: "inline-block",
          background: "#0d0f14",
          border: "1px solid #1e2130",
          borderRadius: 16,
          padding: 12,
        }}>
          <img
            key={animKey}
            src={`https://flagcdn.com/w320/${currentQuestion.flag}.png`}
            alt="drapeau"
            style={{ height: 120, borderRadius: 8, objectFit: "cover", display: "block" }}
          />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f0ede6", marginTop: 14 }}>
          {currentQuestion.question}
        </h2>
      </div>

      {/* Options */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {currentQuestion.options.map((o) => {
          const isSelected = selectedAnswer === o;
          const isCorrect = o === currentQuestion.answer;
          const showResult = !!selectedAnswer;
          let bg = "#0d0f14";
          let border = "#1e2130";
          let color = "#c8c0b0";
          if (showResult && isCorrect) { bg = "#0d2e1f"; border = "#22c55e"; color = "#22c55e"; }
          else if (showResult && isSelected && !isCorrect) { bg = "#2d0f0f"; border = "#ef4444"; color = "#ef4444"; }
          return (
            <button
              key={o}
              onClick={() => handleAnswer(o)}
              disabled={!!selectedAnswer}
              style={{
                background: bg, border: `2px solid ${border}`,
                borderRadius: 12, padding: "13px 10px",
                fontSize: 14, fontWeight: 600, color,
                cursor: selectedAnswer ? "default" : "pointer",
                transition: "all 0.2s", textAlign: "left" as const,
              }}
            >
              {o}
              {showResult && isCorrect && <span style={{ float: "right" }}>✓</span>}
              {showResult && isSelected && !isCorrect && <span style={{ float: "right" }}>✗</span>}
            </button>
          );
        })}
      </div>

      {/* Score en cours */}
      <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#4a5568" }}>
        Score : <span style={{ color: "#f59e0b", fontWeight: 700 }}>{points} pts</span>
        {" "}· Fin tournois dans{" "}
        <span style={{ color: tournamentSecsLeft < 120 ? "#ef4444" : "#6b7280", fontWeight: 700 }}>
          {formatTime(tournamentSecsLeft)}
        </span>
      </div>
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

  const [pageState, setPageState] = useState<PageState>("loading");
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

      const { data: entry } = await supabase
        .from("tournament_entries")
        .select("finished")
        .eq("tournament_id", tournamentId)
        .eq("user_id", user.id)
        .single();

      if (!entry) { router.push("/tournamentsponsorise"); return; }
      if (entry.finished) { router.push("/tournamentsponsorise"); return; }

      const { data: t } = await supabase
        .from("tournaments")
        .select("id, title, game_type, ends_at, prize_1, prize_2")
        .eq("id", tournamentId)
        .single();

      if (!t) { router.push("/tournamentsponsorise"); return; }
      setTournament(t);
      setPageState("ready");
    };
    init();
  }, [tournamentId, router]);

  const handleScore = useCallback(async (score: number) => {
    if (submitted.current) return;
    submitted.current = true;
    setFinalScore(score);
    setPageState("submitting");

    const { data, error } = await supabase.rpc("submit_tournament_score", {
      p_tournament_id: tournamentId,
      p_score: score,
    });

    if (error || !data?.ok) {
      setErrorMsg("Erreur lors de la soumission du score.");
      setPageState("error");
      return;
    }

    // Rang provisoire
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
    setPageState("done");
  }, [tournamentId]);

  // ── LOADING ──
  if (pageState === "loading") {
    return (
      <div style={pageCentered}>
        <div style={spinner} />
        <div style={{ color: "#4a5568", marginTop: 16 }}>Chargement…</div>
      </div>
    );
  }

  // ── ERREUR ──
  if (pageState === "error") {
    return (
      <div style={pageCentered}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <div style={{ color: "#ef4444", marginBottom: 20 }}>{errorMsg}</div>
        <button onClick={() => router.push("/tournamentsponsorise")} style={btnSecondary}>
          Retour aux tournois
        </button>
      </div>
    );
  }

  // ── PRÊT ──
  if (pageState === "ready") {
    return (
      <div style={pageWrap}>
        <div style={card}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🌍</div>
            <div style={{ fontSize: 11, color: "#4a5568", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.14em", marginBottom: 6 }}>
              Tournois sponsorisé · 4Infiny
            </div>
            <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 26, color: "#f0ede6", letterSpacing: "0.05em", margin: "0 0 10px" }}>
              {tournament?.title}
            </h1>
            <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.7 }}>
              Réponds le plus vite possible.<br />
              Tu as <span style={{ color: "#f59e0b", fontWeight: 700 }}>{formatTime(secsLeft)}</span> avant la fin du tournois.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            <div style={infoBox}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>🥇</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#f59e0b", fontFamily: "'Bebas Neue', cursive" }}>
                {tournament?.prize_1} GDS
              </div>
              <div style={{ fontSize: 11, color: "#4a5568" }}>1er prix</div>
            </div>
            <div style={infoBox}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>⏱</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#22c55e", fontFamily: "'Bebas Neue', cursive" }}>
                {formatTime(secsLeft)}
              </div>
              <div style={{ fontSize: 11, color: "#4a5568" }}>Temps restant</div>
            </div>
          </div>

          <div style={{ background: "#111420", border: "1px solid #1e2130", borderRadius: 10, padding: "12px 14px", marginBottom: 24, fontSize: 12, color: "#6b7280" }}>
            🎟 Ticket utilisé · 10 questions · Bonus vitesse inclus
          </div>

          <button
            onClick={() => setPageState("playing")}
            style={{
              width: "100%", border: "none", borderRadius: 14,
              background: "linear-gradient(135deg, #f59e0b, #f97316)",
              color: "#0a0c10", padding: "16px",
              fontSize: 18, fontWeight: 900,
              fontFamily: "'Bebas Neue', cursive", letterSpacing: "0.08em",
              cursor: "pointer", boxShadow: "0 6px 24px #f59e0b30",
            }}
          >
            LANCER LA PARTIE →
          </button>
        </div>
      </div>
    );
  }

  // ── EN JEU ──
  if (pageState === "playing") {
    return (
      <div style={pageWrap}>
        {/* Barre tournois */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 16, background: "#111420",
          border: "1px solid #1e2130", borderRadius: 12, padding: "10px 16px",
        }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{tournament?.title}</div>
          <div style={{
            fontFamily: "'Share Tech Mono', monospace", fontSize: 16, fontWeight: 700,
            color: secsLeft < 60 ? "#ef4444" : secsLeft < 120 ? "#f59e0b" : "#22c55e",
          }}>
            ⏱ {formatTime(secsLeft)}
          </div>
        </div>

        <div style={card}>
          {gameType === "flags" && (
            <GameFlags onScore={handleScore} tournamentEndsAt={tournament!.ends_at} />
          )}
          {gameType !== "flags" && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#4a5568" }}>
              Jeu "{gameType}" — branche ton composant ici
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── SOUMISSION ──
  if (pageState === "submitting") {
    return (
      <div style={pageCentered}>
        <div style={spinner} />
        <div style={{ color: "#8892a4", marginTop: 16, fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: "0.1em" }}>
          Soumission du score…
        </div>
      </div>
    );
  }

  // ── RÉSULTAT ──
  if (pageState === "done") {
    const isTop2 = rank !== null && rank <= 2;
    return (
      <div style={pageWrap}>
        <div style={card}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>
              {rank === 1 ? "🏆" : rank === 2 ? "🥈" : "💪"}
            </div>
            <h2 style={{
              fontFamily: "'Bebas Neue', cursive", fontSize: 30,
              letterSpacing: "0.06em", margin: "0 0 8px",
              color: rank === 1 ? "#f59e0b" : rank === 2 ? "#9ca3af" : "#f0ede6",
            }}>
              {rank === 1 ? "VICTOIRE !" : rank === 2 ? "2ÈME PLACE !" : "BELLE PARTIE !"}
            </h2>
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              {rank === 1 && "Tu mènes le classement — tiens bon !"}
              {rank === 2 && "Tu es en 2ème position !"}
              {rank && rank > 2 && `Tu es #${rank} provisoirement`}
            </p>
          </div>

          {/* Score */}
          <div style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 14, padding: "20px", textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#4a5568", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 6 }}>
              Ton score
            </div>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 48, color: "#f59e0b", letterSpacing: "0.04em" }}>
              {finalScore.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: "#4a5568" }}>points</div>
          </div>

          {/* Position */}
          {rank && (
            <div style={{
              background: isTop2 ? "#0d2e1f" : "#111420",
              border: `1px solid ${isTop2 ? "#22c55e40" : "#1e2130"}`,
              borderRadius: 12, padding: "14px 16px",
              textAlign: "center", marginBottom: 14,
            }}>
              <div style={{ fontSize: 14, color: isTop2 ? "#22c55e" : "#8892a4", fontWeight: 700 }}>
                Position provisoire : #{rank}
              </div>
              {isTop2 && (
                <div style={{ fontSize: 12, color: "#4a5568", marginTop: 4 }}>
                  Si tu gardes cette place →{" "}
                  <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                    +{rank === 1 ? tournament?.prize_1 : tournament?.prize_2} GDS
                  </span>{" "}
                  crédités automatiquement
                </div>
              )}
            </div>
          )}

          <div style={{ background: "#1a1d2a", borderRadius: 10, padding: "12px 14px", marginBottom: 20, fontSize: 12, color: "#6b7280", textAlign: "center", lineHeight: 1.6 }}>
            Le classement final s'affiche après la fin du tournois.<br />
            Reviens voir qui a gagné !
          </div>

          <button onClick={() => router.push("/tournamentsponsorise")} style={btnSecondary}>
            Retour aux tournois
          </button>
        </div>
      </div>
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

const btnSecondary: React.CSSProperties = {
  width: "100%",
  background: "#111420",
  border: "1px solid #1e2130",
  borderRadius: 12,
  color: "#8892a4",
  padding: "14px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const spinner: React.CSSProperties = {
  width: 36,
  height: 36,
  border: "3px solid #1e2130",
  borderTopColor: "#f59e0b",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800&family=Share+Tech+Mono&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0c10; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

// Injection CSS globale
if (typeof document !== "undefined") {
  const id = "tournament-play-css";
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.textContent = globalCss;
    document.head.appendChild(s);
  }
}