"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── CONSTANTES ───────────────────────────────────────────────────────────────
const W = 800;
const H = 320;
const GROUND = 230;
const GRAVITY = 0.55;
const JUMP_FORCE = -13;
const HOLD_BOOST = -0.38;
const HOLD_MAX_FRAMES = 18;
const DUCK_H = 28; // hauteur dino accroupi
const DINO_W = 44;
const DINO_H = 52;
const DINO_X = 90;

const RANKS = [
  { min: 0,    label: "DÉBUTANT",     color: "#888" },
  { min: 50,   label: "RUNNER",       color: "#3b82f6" },
  { min: 150,  label: "CYBER RUNNER", color: "#a855f7" },
  { min: 300,  label: "CYBER ATHLETE",color: "#f97316" },
  { min: 600,  label: "LEGEND",       color: "#fbbf24" },
  { min: 1000, label: "GOD MODE",     color: "#00ffcc" },
];

function getRank(score: number) {
  let r = RANKS[0];
  for (const rank of RANKS) { if (score >= rank.min) r = rank; }
  return r;
}

function getDinoColor(speed: number): string {
  const t = Math.min((speed - 5) / 11, 1);
  if (t < 0.33) return "#00ffcc";
  if (t < 0.66) return "#a855f7";
  return "#ef4444";
}

// ── TYPES ────────────────────────────────────────────────────────────────────
type ObstacleType = "tall" | "low" | "double" | "boost";
type Obstacle = {
  x: number; w: number; h: number; color: string;
  type: ObstacleType; gap?: number; x2?: number; w2?: number;
};
type Particle = {
  x: number; y: number; vx: number; vy: number;
  life: number; color: string; size: number;
};
type Ghost = { y: number; ducking: boolean };
type GameMode = "menu" | "playing" | "dead";

const OBS_COLORS = ["#f97316", "#ec4899", "#3b82f6", "#a855f7"];

function randomObs(x: number, score: number): Obstacle {
  const color = OBS_COLORS[Math.floor(Math.random() * OBS_COLORS.length)];
  const r = Math.random();

  // Zone boost (couloir doré) — rare
  if (r < 0.07) {
    return { x, w: 60, h: 0, color: "#fbbf24", type: "boost" };
  }
  // Obstacle bas (duck) — apparaît après score 80
  if (score > 80 && r < 0.22) {
    return { x, w: 32, h: 22, color, type: "low" };
  }
  // Double obstacle — apparaît après score 150
  if (score > 150 && r < 0.38) {
    const h1 = 28 + Math.random() * 36;
    const h2 = 24 + Math.random() * 30;
    const gap = 55 + Math.random() * 40;
    return { x, w: 16, h: h1, color, type: "double", gap, x2: x + 16 + gap, w2: 16, };
  }
  // Obstacle normal
  const h = 28 + Math.random() * 48;
  const w = 14 + Math.random() * 18;
  return { x, w, h, color, type: "tall" };
}

// ── SON ───────────────────────────────────────────────────────────────────────
function playJumpSound() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(200, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(460, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.18);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

function playDuckSound() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(400, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.12);
    setTimeout(() => ctx.close(), 300);
  } catch {}
}

function playBoostSound() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "triangle"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.15);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.06); o.stop(ctx.currentTime + i * 0.06 + 0.15);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch {}
}

function playDeathSound() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [180, 140, 100].forEach((freq, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.28);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.1); o.stop(ctx.currentTime + i * 0.1 + 0.28);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}

// ── DESSIN DINO ───────────────────────────────────────────────────────────────
function drawDino(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  frame: number,
  dead: boolean,
  ducking: boolean,
  color: string,
  alpha = 1
) {
  const c = dead ? "#ef4444" : color;
  const shadow = "#001a14";
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = c;
  ctx.shadowBlur = alpha < 1 ? 4 : 14;

  if (ducking && !dead) {
    // Forme aplatie
    ctx.fillStyle = shadow;
    ctx.fillRect(x + 2, y + DINO_H - DUCK_H + 4, 44, DUCK_H - 4);
    ctx.fillStyle = c;
    ctx.fillRect(x, y + DINO_H - DUCK_H, 44, DUCK_H);
    // Oeil
    ctx.fillStyle = "#000";
    ctx.fillRect(x + 32, y + DINO_H - DUCK_H + 4, 5, 5);
    // Jambes
    const legOff = Math.sin(frame * 0.5) * 4;
    ctx.fillRect(x + 8,  y + DINO_H - 10, 8, 10 + legOff);
    ctx.fillRect(x + 22, y + DINO_H - 10, 8, 10 - legOff);
  } else {
    // Corps
    ctx.fillStyle = shadow;
    ctx.fillRect(x + 6, y + 8, 30, 36);
    ctx.fillStyle = c;
    ctx.fillRect(x + 4, y + 6, 28, 34);
    // Tête
    ctx.fillStyle = shadow;
    ctx.fillRect(x + 18, y, 22, 20);
    ctx.fillStyle = c;
    ctx.fillRect(x + 16, y - 2, 20, 18);
    // Oeil
    ctx.fillStyle = dead ? "#fff" : "#000";
    ctx.fillRect(x + 28, y + 2, 5, 5);
    if (!dead) { ctx.fillStyle = c; ctx.fillRect(x + 30, y + 3, 2, 2); }
    if (dead) { ctx.fillStyle = "#fff"; ctx.fillRect(x + 22, y + 10, 8, 2); }
    // Jambes
    const legOff = onGround(y) ? Math.sin(frame * 0.35) * 6 : 0;
    ctx.fillStyle = c;
    ctx.fillRect(x + 8,  y + 40, 8, 10 + legOff);
    ctx.fillRect(x + 20, y + 40, 8, 10 - legOff);
    ctx.fillRect(x + 2, y + 14, 6, 14);
  }
  ctx.restore();
}

function onGround(y: number) { return y >= GROUND - 1; }

// ── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
export default function DinoRunGame() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const modeRef     = useRef<GameMode>("menu");
  const rafRef      = useRef<number>(0);

  // Physics refs
  const dinoYRef      = useRef(GROUND);
  const dinoVYRef     = useRef(0);
  const onGroundRef   = useRef(true);
  const holdFrames    = useRef(0);
  const isHolding     = useRef(false);
  const isDucking     = useRef(false);
  const frameRef      = useRef(0);
  const speedRef      = useRef(5);
  const distRef       = useRef(0);
  const scoreRef      = useRef(0);
  const obstaclesRef  = useRef<Obstacle[]>([]);
  const particlesRef  = useRef<Particle[]>([]);
  const shakeRef      = useRef(0);
  const nextObsRef    = useRef(320);
  const bgOffsetRef   = useRef(0);
  const boostRef      = useRef(0); // frames restantes de boost x2
  const ghostsRef     = useRef<Ghost[]>([]); // traînée fantôme
  const starsRef      = useRef<{ x: number; y: number; s: number; layer: number }[]>([]);
  const milestoneRef  = useRef(0); // dernier palier animé
  const nightRef      = useRef(false);
  const solPulseRef   = useRef(0);
  const streakRef     = useRef(0);
  const lastScoreRef  = useRef(0);

  // UI state
  const [mode, setMode]           = useState<GameMode>("menu");
  const [score, setScore]         = useState(0);
  const [best, setBest]           = useState(0);
  const [streak, setStreak]       = useState(0);
  const [flashDead, setFlashDead] = useState(false);
  const [flashBoost, setFlashBoost] = useState(false);
  const [rankLabel, setRankLabel] = useState("");
  const [milestoneAnim, setMilestoneAnim] = useState<string | null>(null);

  // Init étoiles
  useEffect(() => {
    starsRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * W,
      y: Math.random() * (GROUND - 20),
      s: Math.random(),
      layer: Math.floor(Math.random() * 3),
    }));
    if (typeof window !== "undefined") {
      const b = localStorage.getItem("dino_best");
      if (b) setBest(parseInt(b));
      const sk = localStorage.getItem("dino_streak");
      if (sk) setStreak(parseInt(sk));
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const spawnParticles = useCallback((x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 2,
        life: 1, color,
        size: 3 + Math.random() * 5,
      });
    }
  }, []);

  const jump = useCallback(() => {
    if (!onGroundRef.current || isDucking.current) return;
    dinoVYRef.current = JUMP_FORCE;
    onGroundRef.current = false;
    holdFrames.current = 0;
    spawnParticles(DINO_X + 22, dinoYRef.current + DINO_H, getDinoColor(speedRef.current), 8);
    playJumpSound();
  }, [spawnParticles]);

  const duck = useCallback((active: boolean) => {
    if (active && !isDucking.current) { isDucking.current = true; playDuckSound(); }
    if (!active) isDucking.current = false;
  }, []);

  const die = useCallback(() => {
    if (modeRef.current !== "playing") return;
    modeRef.current = "dead";
    setMode("dead");
    playDeathSound();
    shakeRef.current = 20;
    setFlashDead(true);
    setTimeout(() => setFlashDead(false), 300);
    spawnParticles(DINO_X + 22, dinoYRef.current + 20, "#ef4444", 24);
    const s = scoreRef.current;
    lastScoreRef.current = s;
    setScore(s);

    // Streak : si on meurt avant 100 pts, streak reset
    if (s < 100) {
      streakRef.current = 0;
      setStreak(0);
      localStorage.setItem("dino_streak", "0");
    } else {
      streakRef.current += 1;
      setStreak(streakRef.current);
      localStorage.setItem("dino_streak", String(streakRef.current));
    }

    setBest(prev => {
      const nb = Math.max(prev, s);
      if (typeof window !== "undefined") {
        localStorage.setItem("dino_best", String(nb));
        localStorage.setItem("training_score_dino", JSON.stringify({ score: `${s} pts`, points: s }));
      }
      return nb;
    });
    cancelAnimationFrame(rafRef.current);
  }, [spawnParticles]);

  const startGame = useCallback(() => {
    dinoYRef.current    = GROUND;
    dinoVYRef.current   = 0;
    onGroundRef.current = true;
    holdFrames.current  = 0;
    isHolding.current   = false;
    isDucking.current   = false;
    frameRef.current    = 0;
    speedRef.current    = 5;
    distRef.current     = 0;
    scoreRef.current    = 0;
    boostRef.current    = 0;
    obstaclesRef.current  = [];
    particlesRef.current  = [];
    ghostsRef.current     = [];
    shakeRef.current    = 0;
    nextObsRef.current  = 340;
    bgOffsetRef.current = 0;
    milestoneRef.current = 0;
    nightRef.current    = false;
    solPulseRef.current = 0;
    setScore(0);
    setFlashDead(false);
    setFlashBoost(false);
    setMilestoneAnim(null);
    setRankLabel(RANKS[0].label);
    modeRef.current = "playing";
    setMode("playing");
  }, []);

  // ── GAME LOOP ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function loop() {
      if (modeRef.current !== "playing") return;
      frameRef.current++;
      const f = frameRef.current;
      const spd = speedRef.current;

      // Vitesse
      speedRef.current = Math.min(5 + f * 0.0045, 18);
      distRef.current += speedRef.current;
      const newScore = Math.floor(distRef.current / 10) * (boostRef.current > 0 ? 2 : 1);
      scoreRef.current = newScore;
      if (f % 5 === 0) {
        setScore(newScore);
        const rank = getRank(newScore);
        setRankLabel(rank.label);
      }

      // Mode nuit après 300 pts
      nightRef.current = newScore >= 300;

      // Boost décompte
      if (boostRef.current > 0) boostRef.current--;

      // Paliers (100, 200, 500...)
      const milestones = [100, 200, 300, 500, 750, 1000];
      for (const m of milestones) {
        if (newScore >= m && milestoneRef.current < m) {
          milestoneRef.current = m;
          setMilestoneAnim(`${m} pts !`);
          setTimeout(() => setMilestoneAnim(null), 1800);
        }
      }

      // Physique dino
      if (!onGroundRef.current) {
        if (isHolding.current && holdFrames.current < HOLD_MAX_FRAMES) {
          dinoVYRef.current += HOLD_BOOST;
          holdFrames.current++;
        }
        dinoVYRef.current += GRAVITY;
        dinoYRef.current  += dinoVYRef.current;
        if (dinoYRef.current >= GROUND) {
          dinoYRef.current    = GROUND;
          dinoVYRef.current   = 0;
          onGroundRef.current = true;
        }
      }

      // Ghost trail (traînée fantôme)
      ghostsRef.current.unshift({ y: dinoYRef.current, ducking: isDucking.current });
      if (ghostsRef.current.length > 5) ghostsRef.current.pop();

      // Spawn obstacles
      nextObsRef.current -= spd;
      if (nextObsRef.current <= 0) {
        obstaclesRef.current.push(randomObs(W + 20, newScore));
        const minGap = Math.max(160, 280 - newScore * 0.2);
        nextObsRef.current = minGap + Math.random() * 180;
      }

      // Déplacer obstacles + double obstacles
      obstaclesRef.current = obstaclesRef.current.filter(o => {
        o.x -= spd;
        if (o.x2 !== undefined) o.x2 -= spd;
        return (o.x + o.w > -20);
      });

      // Collision + boost
      const dinoLeft  = DINO_X + 6;
      const dinoRight = DINO_X + DINO_W - 6;
      const dinoTop   = isDucking.current
        ? dinoYRef.current + DINO_H - DUCK_H + 4
        : dinoYRef.current + 4;
      const dinoBot   = dinoYRef.current + DINO_H;

      for (const obs of obstaclesRef.current) {
        if (obs.type === "boost") {
          // Zone boost : toucher = activer le boost
          const boostTop = GROUND - 60;
          if (
            dinoRight > obs.x + 4 && dinoLeft < obs.x + obs.w - 4 &&
            dinoBot > boostTop && dinoTop < GROUND + DINO_H
          ) {
            if (boostRef.current === 0) {
              boostRef.current = 300;
              setFlashBoost(true);
              setTimeout(() => setFlashBoost(false), 400);
              playBoostSound();
              spawnParticles(obs.x + 30, GROUND - 30, "#fbbf24", 20);
            }
            obs.x = -1000; // retirer
          }
          continue;
        }

        const obsH   = obs.h;
        const lowObs = obs.type === "low";
        const obsTop = lowObs
          ? GROUND + DINO_H - obsH
          : GROUND + DINO_H - obsH;

        const checkCol = (ox: number, ow: number) =>
          dinoRight > ox + 3 && dinoLeft < ox + ow - 3 &&
          dinoBot > obsTop + 3 && dinoTop < GROUND + DINO_H;

        if (checkCol(obs.x, obs.w)) { die(); return; }
        if (obs.x2 !== undefined && obs.w2 !== undefined && checkCol(obs.x2, obs.w2)) { die(); return; }
      }

      // Particules
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.life -= 0.04;
      });

      // Shake
      if (shakeRef.current > 0) shakeRef.current -= 1.5;
      solPulseRef.current += 0.08 + spd * 0.01;

      // ── DESSIN ─────────────────────────────────────────────────────────────
      const sx = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current * 0.8 : 0;
      const sy = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current * 0.8 : 0;

      ctx.save();
      ctx.translate(sx, sy);

      // Fond
      const night = nightRef.current;
      ctx.fillStyle = night ? "#04040e" : "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      // Étoiles parallaxe (3 couches)
      const layerSpeeds = [0.2, 0.5, 1.0];
      for (const star of starsRef.current) {
        star.x -= layerSpeeds[star.layer] * (spd / 5);
        if (star.x < 0) star.x = W;
        const brightness = night ? (0.4 + star.s * 0.6) : (0.1 + star.s * 0.15);
        const sz = 0.8 + star.s * 1.5;
        ctx.fillStyle = `rgba(255,255,255,${brightness})`;
        ctx.fillRect(star.x, star.y, sz, sz);
      }

      // Grille perspective
      bgOffsetRef.current = (bgOffsetRef.current + spd * 0.25) % 60;
      ctx.strokeStyle = night ? "rgba(0,255,180,0.1)" : "rgba(0,255,180,0.06)";
      ctx.lineWidth = 1;
      for (let gx = -bgOffsetRef.current; gx < W; gx += 60) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }

      // Horizon glow
      const horizonColor = boostRef.current > 0 ? "#fbbf24" : "#00ffcc";
      const grad = ctx.createLinearGradient(0, GROUND - 30, 0, GROUND + 60);
      grad.addColorStop(0, `${horizonColor}22`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, GROUND - 30, W, 90);

      // Sol pulsant
      const pulse = Math.sin(solPulseRef.current) * 0.5 + 0.5;
      const solAlpha = 0.5 + pulse * 0.5;
      ctx.save();
      ctx.shadowColor = horizonColor;
      ctx.shadowBlur = 8 + pulse * 12;
      ctx.strokeStyle = `rgba(${boostRef.current > 0 ? "251,191,36" : "0,255,180"},${solAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND + DINO_H);
      ctx.lineTo(W, GROUND + DINO_H);
      ctx.stroke();
      ctx.restore();

      // Obstacles
      for (const obs of obstaclesRef.current) {
        if (obs.type === "boost") {
          // Couloir doré
          ctx.save();
          ctx.shadowColor = "#fbbf24";
          ctx.shadowBlur = 20;
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(obs.x, GROUND - 55, obs.w, 55);
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(251,191,36,0.08)";
          ctx.fillRect(obs.x, GROUND - 55, obs.w, 55);
          ctx.fillStyle = "#fbbf24";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.fillText("x2", obs.x + obs.w / 2, GROUND - 62);
          ctx.restore();
          continue;
        }

        const drawOneObs = (ox: number, ow: number, oh: number) => {
          const oy = GROUND + DINO_H - oh;
          ctx.save();
          ctx.shadowColor = obs.color;
          ctx.shadowBlur = night ? 22 : 14;
          ctx.fillStyle = obs.color + "33";
          ctx.fillRect(ox, oy, ow, oh);
          ctx.strokeStyle = obs.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(ox, oy, ow, oh);
          // Scanlines
          ctx.strokeStyle = obs.color + "44";
          ctx.lineWidth = 1;
          for (let sl = oy + 6; sl < oy + oh; sl += 8) {
            ctx.beginPath(); ctx.moveTo(ox + 2, sl); ctx.lineTo(ox + ow - 2, sl); ctx.stroke();
          }
          ctx.restore();
        };

        drawOneObs(obs.x, obs.w, obs.h);
        if (obs.x2 !== undefined && obs.w2 !== undefined) drawOneObs(obs.x2, obs.w2, obs.h * 0.85);
      }

      // Ghost trail (traînée fantôme)
      const dinoColor = getDinoColor(spd);
      for (let i = ghostsRef.current.length - 1; i >= 1; i--) {
        const g = ghostsRef.current[i];
        const alpha = (1 - i / ghostsRef.current.length) * 0.18;
        drawDino(ctx, DINO_X - i * 6, g.y, f, false, g.ducking, dinoColor, alpha);
      }

      // Dino principal
      drawDino(ctx, DINO_X, dinoYRef.current, f, false, isDucking.current, dinoColor);

      // Particules
      for (const p of particlesRef.current) {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();
      }

      // Boost timer bar
      if (boostRef.current > 0) {
        const pct = boostRef.current / 300;
        ctx.fillStyle = "rgba(251,191,36,0.2)";
        ctx.fillRect(0, H - 6, W, 6);
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(0, H - 6, W * pct, 6);
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mode, die, spawnParticles]);

  // ── INPUTS ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (modeRef.current === "menu" || modeRef.current === "dead") startGame();
        else { isHolding.current = true; jump(); }
      }
      if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        if (modeRef.current === "playing") duck(true);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") isHolding.current = false;
      if (e.code === "ArrowDown" || e.code === "KeyS") duck(false);
    };

    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchStartY = e.touches[0].clientY;
      if (modeRef.current === "menu" || modeRef.current === "dead") { startGame(); return; }
      isHolding.current = true;
      jump();
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const dy = e.touches[0].clientY - touchStartY;
      if (dy > 30 && modeRef.current === "playing") duck(true);
    };
    const onTouchEnd = () => { isHolding.current = false; duck(false); };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove",  onTouchMove,  { passive: false });
    window.addEventListener("touchend",   onTouchEnd);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove",  onTouchMove);
      window.removeEventListener("touchend",   onTouchEnd);
    };
  }, [jump, duck, startGame]);

  // ── RENDER ─────────────────────────────────────────────────────────────────
  const rank = getRank(score);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-2 py-6 select-none"
      style={{ background: "#06060f" }}
    >
      {/* Flashes */}
      {flashDead && (
        <div className="fixed inset-0 pointer-events-none z-50" style={{ background: "rgba(239,68,68,0.2)" }} />
      )}
      {flashBoost && (
        <div className="fixed inset-0 pointer-events-none z-50" style={{ background: "rgba(251,191,36,0.15)" }} />
      )}

      {/* Header */}
      <div className="w-full max-w-3xl mb-3 flex items-center justify-between px-2 flex-wrap gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] mb-0.5" style={{ color: "#00ffcc55", fontFamily: "monospace" }}>
            Entraînement
          </p>
          <h1 className="text-2xl font-black tracking-tight" style={{
            color: "#00ffcc", textShadow: "0 0 20px #00ffcc55", fontFamily: "monospace",
          }}>
            DINO<span style={{ color: "#f97316" }}>RUN</span>
          </h1>
        </div>

        <div className="flex gap-4 items-center flex-wrap">
          {/* Rang */}
          <div className="text-center">
            <p className="text-xs font-mono" style={{ color: rank.color, textShadow: `0 0 8px ${rank.color}` }}>
              {rankLabel || rank.label}
            </p>
          </div>
          {/* Streak */}
          {streak >= 3 && (
            <div className="text-center px-3 py-1 rounded-lg" style={{ background: "#fbbf2422", border: "1px solid #fbbf2444" }}>
              <p className="text-xs font-mono" style={{ color: "#fbbf24" }}>🔥 Streak ×{streak}</p>
            </div>
          )}
          <div className="text-center">
            <p className="text-xs font-mono" style={{ color: "#ffffff33" }}>SCORE</p>
            <p className="text-xl font-black font-mono" style={{ color: "#fff" }}>{score}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-mono" style={{ color: "#ffffff33" }}>BEST</p>
            <p className="text-xl font-black font-mono" style={{ color: "#f97316" }}>{best}</p>
          </div>
        </div>
      </div>

      {/* Canvas container */}
      <div className="relative w-full max-w-3xl" style={{
        borderRadius: "16px",
        border: "1.5px solid #00ffcc2a",
        boxShadow: "0 0 50px #00ffcc10, inset 0 0 40px #00000088",
        overflow: "hidden",
      }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ display: "block", width: "100%", height: "auto", cursor: "pointer", touchAction: "none" }}
          onClick={() => {
            if (modeRef.current === "menu" || modeRef.current === "dead") startGame();
            else { isHolding.current = true; jump(); }
          }}
          onMouseUp={() => { isHolding.current = false; }}
        />

        {/* Milestone flash */}
        {milestoneAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-4xl font-black font-mono animate-ping" style={{
              color: "#fbbf24", textShadow: "0 0 30px #fbbf24",
            }}>
              {milestoneAnim}
            </p>
          </div>
        )}

        {/* MENU */}
        {mode === "menu" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "rgba(6,6,15,0.85)" }}>
            <p className="text-xs uppercase tracking-widest mb-2 font-mono" style={{ color: "#00ffcc66" }}>Prêt à courir ?</p>
            <p className="text-5xl font-black mb-2 font-mono" style={{ color: "#00ffcc", textShadow: "0 0 30px #00ffcc" }}>
              DINO RUN
            </p>
            <p className="text-sm mb-6 font-mono" style={{ color: "#ffffff33" }}>Évite les obstacles · Collecte les boosts</p>
            <div className="flex flex-wrap justify-center gap-4 mb-6 text-xs font-mono" style={{ color: "#ffffff44" }}>
              <span>↑ ESPACE — sauter</span>
              <span>↓ BAS — se baisser</span>
              <span>📱 TAP — sauter · SWIPE BAS — duck</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6 text-center text-xs font-mono" style={{ color: "#ffffff33" }}>
              <div><p style={{ color: "#fbbf24" }}>▬▬</p><p>zone boost x2</p></div>
              <div><p style={{ color: "#ec4899" }}>█</p><p>obstacle haut</p></div>
              <div><p style={{ color: "#3b82f6" }}>▬</p><p>obstacle bas (duck!)</p></div>
            </div>
            <div className="px-8 py-3 rounded-xl font-black text-sm cursor-pointer font-mono" style={{
              background: "#00ffcc1a", border: "1.5px solid #00ffcc",
              color: "#00ffcc", textShadow: "0 0 10px #00ffcc",
            }}>
              ► DÉMARRER
            </div>
          </div>
        )}

        {/* MORT */}
        {mode === "dead" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "rgba(6,6,15,0.9)" }}>
            <p className="text-xs uppercase tracking-widest mb-2 font-mono" style={{ color: "#ef444466" }}>Game Over</p>
            <p className="text-4xl font-black mb-3 font-mono" style={{ color: "#ef4444", textShadow: "0 0 20px #ef4444" }}>
              T&apos;ES MORT
            </p>
            <div className="flex gap-8 mb-3">
              <div className="text-center">
                <p className="text-xs font-mono" style={{ color: "#ffffff44" }}>SCORE</p>
                <p className="text-3xl font-black font-mono" style={{ color: score >= best ? "#fbbf24" : "#f97316" }}>{score}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-mono" style={{ color: "#ffffff44" }}>MEILLEUR</p>
                <p className="text-3xl font-black font-mono" style={{ color: "#fff" }}>{best}</p>
              </div>
            </div>
            {score >= best && score > 0 && (
              <p className="text-sm font-mono mb-1" style={{ color: "#fbbf24" }}>★ NOUVEAU RECORD !</p>
            )}
            <p className="text-xs font-mono mb-1" style={{ color: getRank(score).color }}>
              {getRank(score).label}
            </p>
            {streak >= 3 && (
              <p className="text-xs font-mono mb-3" style={{ color: "#fbbf24" }}>🔥 Streak ×{streak} — skin spécial débloqué !</p>
            )}
            <div className="mt-4 px-8 py-3 rounded-xl font-black text-sm cursor-pointer font-mono" style={{
              background: "#f9731622", border: "1.5px solid #f97316",
              color: "#f97316", textShadow: "0 0 10px #f97316",
            }}
              onClick={startGame}
            >
              ► REJOUER
            </div>
            <p className="mt-3 text-xs font-mono" style={{ color: "#ffffff22" }}>ESPACE / CLIC / TAP</p>
          </div>
        )}
      </div>

      {/* Instructions mobile */}
      <div className="mt-3 flex flex-wrap justify-center gap-6 text-xs font-mono" style={{ color: "#ffffff1a" }}>
        <span>PC : ESPACE sauter · ↓ duck</span>
        <span>Mobile : TAP sauter · SWIPE BAS duck</span>
      </div>
    </main>
  );
}