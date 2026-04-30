"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const FRUITS = ["🍎","🍊","🍋","🍇","🍓","🍑","🍍","🥭","🍌","🫐"];
const FRUIT_COLORS: Record<string, string> = {
  "🍎": "red","🍊": "orange","🍋": "yellow","🍇": "purple",
  "🍓": "red","🍑": "orange","🍍": "yellow","🥭": "orange",
  "🍌": "yellow","🫐": "purple",
};

type GameMode = "classic" | "rush" | "color" | "survival";

type FruitObj = {
  id: number;
  emoji: string;
  isBomb: boolean;
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  sliced: boolean;
  missed: boolean;
  opacity: number;
};

type SlashParticle = {
  id: number;
  x: number;
  y: number;
  emoji: string;
  vx: number;
  vy: number;
  opacity: number;
  scale: number;
};

type ModeConfig = {
  id: GameMode;
  title: string;
  desc: string;
  icon: string;
  duration: number;
  targetScore?: number;
  colorFilter?: string;
  lives?: number;
  // Nouveau : nombre max de fruits ratés avant game over (classic/color)
  maxMissed?: number;
};

const MODES: ModeConfig[] = [
  {
    id: "classic",
    title: "Classique",
    desc: "60 secondes. Coupe le max de fruits. 5 ratés = game over !",
    icon: "⚔️",
    duration: 60,
    maxMissed: 5,
  },
  {
    id: "rush",
    title: "Rush",
    desc: "Atteins 50 points en 30 secondes.",
    icon: "⚡",
    duration: 30,
    targetScore: 50, // 100 était irréaliste, 50 est atteignable
  },
  {
    id: "color",
    title: "Couleur",
    desc: "Coupe uniquement les fruits rouges ! Autres = -5. 5 ratés = fin.",
    icon: "🎨",
    duration: 45,
    colorFilter: "red",
    maxMissed: 5,
  },
  {
    id: "survival",
    title: "Survie",
    desc: "3 vies. Chaque bombe coupée ou fruit raté = -1 vie.",
    icon: "❤️",
    duration: 999,
    lives: 3,
  },
];

// Constantes de physique — on contrôle tout ici
const PHYSICS = {
  // Vitesse verticale initiale (négatif = monte). Valeur absolue max.
  vyMin: 7,
  vyMax: 10,
  // Vitesse horizontale max (dérive gauche/droite)
  vxMax: 2.5,
  // Gravité appliquée chaque frame
  gravity: 0.22,
  // Vitesse max autorisée (plafond absolu pour éviter l'effet "trop rapide")
  vyAbsMax: 13,
  // Accélération progressive avec le temps : multiplicateur max
  speedRampMax: 1.5,
  // Intervalle de spawn initial (ms)
  spawnInitial: 1300,
  // Intervalle de spawn minimum (ms) — jamais en dessous
  spawnMin: 500,
  // Probabilité de bombe
  bombChance: 0.22,
};

let fruitIdCounter = 0;
let particleIdCounter = 0;

function playSound(type: "slice" | "bomb" | "win" | "lose" | "combo") {
  if (typeof window === "undefined") return;
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    if (type === "slice") {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(800, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.15);
    } else if (type === "bomb") {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(100, ctx.currentTime);
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.4);
    } else if (type === "win") {
      [523, 659, 784, 1047].forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "sine"; o.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        g.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.12 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.12); o.stop(ctx.currentTime + i * 0.12 + 0.3);
      });
    } else if (type === "lose") {
      [400, 300, 200].forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "sawtooth"; o.frequency.value = freq;
        g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.2);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.3);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.2); o.stop(ctx.currentTime + i * 0.2 + 0.3);
      });
    } else if (type === "combo") {
      [660, 880, 1100].forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "triangle"; o.frequency.value = freq;
        g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.2);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.07); o.stop(ctx.currentTime + i * 0.07 + 0.2);
      });
    }
    setTimeout(() => ctx.close(), 2000);
  } catch {}
}

export default function FruitSlashGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fruitsRef = useRef<FruitObj[]>([]);
  const particlesRef = useRef<SlashParticle[]>([]);
  const slashPathRef = useRef<{ x: number; y: number }[]>([]);
  const isSlashingRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);
  const spawnIntervalRef = useRef(PHYSICS.spawnInitial);
  const gameStartTimeRef = useRef(0);
  const missedCountRef = useRef(0);

  const [phase, setPhase] = useState<"menu" | "playing" | "result">("menu");
  const [selectedMode, setSelectedMode] = useState<ModeConfig>(MODES[0]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [multiplier, setMultiplier] = useState(1);
  const [missedCount, setMissedCount] = useState(0);
  const [flashMsg, setFlashMsg] = useState<{ text: string; color: string } | null>(null);
  const [result, setResult] = useState<{ won: boolean; score: number; mode: string } | null>(null);

  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const livesRef = useRef(3);
  const multiplierRef = useRef(1);
  const phaseRef = useRef<"menu" | "playing" | "result">("menu");
  const modeRef = useRef<ModeConfig>(MODES[0]);

  const showFlash = useCallback((text: string, color: string) => {
    setFlashMsg({ text, color });
    setTimeout(() => setFlashMsg(null), 900);
  }, []);

  const endGame = useCallback((won: boolean) => {
    if (phaseRef.current !== "playing") return;
    phaseRef.current = "result";
    setPhase("result");
    cancelAnimationFrame(animFrameRef.current);
    if (typeof window !== "undefined") {
      localStorage.setItem("training_score_fruitslash", JSON.stringify({
        score: `${scoreRef.current} pts`,
        points: scoreRef.current,
      }));
    }
    setResult({ won, score: scoreRef.current, mode: modeRef.current.title });
    won ? playSound("win") : playSound("lose");
  }, []);

  const sliceFruit = useCallback((fruit: FruitObj) => {
    if (fruit.sliced || fruit.isBomb) return;
    fruit.sliced = true;
    const mode = modeRef.current;
    let pts = 5;

    if (mode.id === "color" && mode.colorFilter) {
      if (FRUIT_COLORS[fruit.emoji] !== mode.colorFilter) {
        // Fruit de mauvaise couleur : pénalité réduite à -5 (était -10, trop punitif)
        pts = -5;
        playSound("bomb");
        showFlash("-5", "#ef4444");
        comboRef.current = 0; setCombo(0);
        multiplierRef.current = 1; setMultiplier(1);
      } else {
        playSound("slice");
        comboRef.current += 1; setCombo(comboRef.current);
      }
    } else {
      playSound("slice");
      comboRef.current += 1; setCombo(comboRef.current);
    }

    // Combo x2 toutes les 3 coupes
    if (pts > 0 && comboRef.current > 0 && comboRef.current % 3 === 0) {
      multiplierRef.current = 2; setMultiplier(2);
      playSound("combo");
      showFlash("x2 COMBO!", "#facc15");
      setTimeout(() => { multiplierRef.current = 1; setMultiplier(1); }, 3000);
    }

    const finalPts = pts > 0 ? pts * multiplierRef.current : pts;
    scoreRef.current = Math.max(0, scoreRef.current + finalPts); // score ne passe pas négatif
    setScore(scoreRef.current);
    if (pts > 0) showFlash(`+${finalPts}`, "#4ade80");

    for (let i = 0; i < 5; i++) {
      particlesRef.current.push({
        id: particleIdCounter++,
        x: fruit.x, y: fruit.y,
        emoji: fruit.emoji,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 3,
        opacity: 1, scale: 0.8,
      });
    }

    // Rush : victoire si score atteint
    if (mode.id === "rush" && mode.targetScore && scoreRef.current >= mode.targetScore) {
      endGame(true);
    }
  }, [showFlash, endGame]);

  const sliceBomb = useCallback((fruit: FruitObj) => {
    if (fruit.sliced) return;
    fruit.sliced = true;
    playSound("bomb");
    scoreRef.current = Math.max(0, scoreRef.current - 10);
    setScore(scoreRef.current);
    comboRef.current = 0; setCombo(0);
    multiplierRef.current = 1; setMultiplier(1);
    showFlash("BOMBE! -10", "#ef4444");

    if (modeRef.current.id === "survival") {
      livesRef.current -= 1; setLives(livesRef.current);
      if (livesRef.current <= 0) endGame(false);
    }

    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        id: particleIdCounter++,
        x: fruit.x, y: fruit.y,
        emoji: "💥",
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12 - 4,
        opacity: 1, scale: 1.2,
      });
    }
  }, [showFlash, endGame]);

  const checkSlash = useCallback((path: { x: number; y: number }[]) => {
    if (path.length < 2) return;
    const last = path[path.length - 1];
    const prev = path[path.length - 2];
    fruitsRef.current.forEach(fruit => {
      if (fruit.sliced || fruit.missed) return;
      const dist = Math.hypot(last.x - fruit.x, last.y - fruit.y);
      const prevDist = Math.hypot(prev.x - fruit.x, prev.y - fruit.y);
      const radius = fruit.size / 2;
      if (dist < radius || prevDist < radius) {
        fruit.isBomb ? sliceBomb(fruit) : sliceFruit(fruit);
      }
    });
  }, [sliceFruit, sliceBomb]);

  const spawnFruit = useCallback((canvas: HTMLCanvasElement, elapsed: number) => {
    const isBomb = Math.random() < PHYSICS.bombChance;
    const emoji = isBomb ? "💣" : FRUITS[Math.floor(Math.random() * FRUITS.length)];
    const size = 52 + Math.random() * 20;
    const x = size + Math.random() * (canvas.width - size * 2);

    // Rampe de vitesse progressive mais plafonnée
    const speedMult = Math.min(1 + elapsed / 40, PHYSICS.speedRampMax);
    const baseVy = PHYSICS.vyMin + Math.random() * (PHYSICS.vyMax - PHYSICS.vyMin);
    // On applique le multiplicateur puis on plafonne
    const vy = -Math.min(baseVy * speedMult, PHYSICS.vyAbsMax);
    const vx = (Math.random() - 0.5) * 2 * PHYSICS.vxMax;

    fruitsRef.current.push({
      id: fruitIdCounter++,
      emoji, isBomb, x,
      y: canvas.height + size,
      vy, vx, size,
      sliced: false, missed: false, opacity: 1,
    });
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    if (phaseRef.current !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const elapsed = (timestamp - gameStartTimeRef.current) / 1000;
    const mode = modeRef.current;
    const remaining = Math.max(0, mode.duration - elapsed);
    setTimeLeft(Math.ceil(remaining));

    // Fin de temps (sauf survival)
    if (mode.id !== "survival" && remaining <= 0) {
      if (mode.id === "rush") {
        // Rush : gagné seulement si on a atteint le score cible
        endGame(scoreRef.current >= (mode.targetScore || 50));
      } else {
        // Classic et Color : toujours gagné si le temps s'écoule sans game over
        endGame(true);
      }
      return;
    }

    // Spawn
    if (timestamp - lastSpawnRef.current > spawnIntervalRef.current) {
      spawnFruit(canvas, elapsed);
      lastSpawnRef.current = timestamp;
      // Intervalle décroît progressivement mais jamais sous spawnMin
      spawnIntervalRef.current = Math.max(PHYSICS.spawnMin, PHYSICS.spawnInitial - elapsed * 8);
    }

    // Mise à jour et filtre des fruits
    let newMisses = 0;
    fruitsRef.current = fruitsRef.current.filter(f => {
      if (f.sliced) {
        f.opacity -= 0.08;
        return f.opacity > 0;
      }
      f.y += f.vy;
      f.x += f.vx;
      f.vy += PHYSICS.gravity;
      if (f.y > canvas.height + f.size) {
        if (!f.isBomb) {
          // Fruit raté (pas une bombe)
          newMisses++;
          if (mode.id === "survival") {
            livesRef.current -= 1;
            setLives(livesRef.current);
            showFlash("Raté! -1❤️", "#f87171");
            if (livesRef.current <= 0) { endGame(false); return false; }
          }
        }
        f.missed = true;
        return false;
      }
      return true;
    });

    // Comptage des ratés pour les modes avec maxMissed
    if (newMisses > 0 && mode.maxMissed) {
      missedCountRef.current += newMisses;
      setMissedCount(missedCountRef.current);
      if (missedCountRef.current >= mode.maxMissed) {
        endGame(false);
        return;
      }
    }

    // Dessin des fruits
    fruitsRef.current.forEach(fruit => {
      ctx.save();
      ctx.globalAlpha = fruit.sliced ? fruit.opacity : 1;
      ctx.font = `${fruit.size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(fruit.emoji, fruit.x, fruit.y);
      ctx.restore();
    });

    // Dessin des particules
    particlesRef.current = particlesRef.current.filter(p => p.opacity > 0.05);
    particlesRef.current.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.3;
      p.opacity -= 0.04; p.scale = Math.max(0.1, p.scale - 0.01);
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.font = `${Math.max(8, 28 * p.scale)}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(p.emoji, p.x, p.y);
      ctx.restore();
    });

    // Dessin du slash
    if (isSlashingRef.current && slashPathRef.current.length > 1) {
      const path = slashPathRef.current.slice(-14);
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(255,200,80,0.7)"; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
      ctx.restore();
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [spawnFruit, endGame, showFlash]);

  const startGame = useCallback((mode: ModeConfig) => {
    modeRef.current = mode;
    setSelectedMode(mode);
    fruitsRef.current = []; particlesRef.current = []; slashPathRef.current = [];
    scoreRef.current = 0; comboRef.current = 0;
    livesRef.current = mode.lives || 3;
    multiplierRef.current = 1;
    missedCountRef.current = 0;
    fruitIdCounter = 0; particleIdCounter = 0;
    setScore(0); setCombo(0); setLives(mode.lives || 3);
    setMultiplier(1); setTimeLeft(mode.duration); setFlashMsg(null); setMissedCount(0);
    phaseRef.current = "playing";
    setPhase("playing");
    const now = performance.now();
    gameStartTimeRef.current = now;
    lastSpawnRef.current = now;
    spawnIntervalRef.current = PHYSICS.spawnInitial;
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || phase !== "playing") return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const getPos = (e: MouseEvent | Touch) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (canvas.width / r.width),
        y: (e.clientY - r.top) * (canvas.height / r.height),
      };
    };
    const onDown = (e: MouseEvent) => { isSlashingRef.current = true; slashPathRef.current = [getPos(e)]; };
    const onMove = (e: MouseEvent) => { if (!isSlashingRef.current) return; slashPathRef.current.push(getPos(e)); checkSlash(slashPathRef.current); };
    const onUp = () => { isSlashingRef.current = false; slashPathRef.current = []; };
    const onTS = (e: TouchEvent) => { e.preventDefault(); isSlashingRef.current = true; slashPathRef.current = [getPos(e.touches[0])]; };
    const onTM = (e: TouchEvent) => { e.preventDefault(); if (!isSlashingRef.current) return; slashPathRef.current.push(getPos(e.touches[0])); checkSlash(slashPathRef.current); };
    const onTE = () => { isSlashingRef.current = false; slashPathRef.current = []; };
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onTS, { passive: false });
    canvas.addEventListener("touchmove", onTM, { passive: false });
    canvas.addEventListener("touchend", onTE);
    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("touchstart", onTS);
      canvas.removeEventListener("touchmove", onTM);
      canvas.removeEventListener("touchend", onTE);
    };
  }, [phase, checkSlash]);

  useEffect(() => () => cancelAnimationFrame(animFrameRef.current), []);

  // ── MENU ──────────────────────────────────────────────
  if (phase === "menu") {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-10 overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-orange-500/10 blur-3xl" />
        </div>
        <div className="relative z-10 text-center mb-10">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40 mb-3">Entraînement</p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">
            Fruit<span className="text-orange-400">Slash</span>
          </h1>
          <p className="mt-3 text-white/50 text-sm">Slash les fruits · Évite les bombes · Bats ton score</p>
        </div>
        <div className="relative z-10 grid gap-4 md:grid-cols-2 w-full max-w-2xl">
          {MODES.map(mode => (
            <button key={mode.id} onClick={() => startGame(mode)}
              className="group rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-orange-400/50 hover:bg-orange-500/10">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{mode.icon}</span>
                <div>
                  <h3 className="font-black text-lg group-hover:text-orange-400 transition">{mode.title}</h3>
                  <span className="text-xs text-white/40">
                    {mode.id === "survival" ? "∞ temps · 3 vies" : `${mode.duration}s`}
                  </span>
                </div>
              </div>
              <p className="text-sm text-white/50">{mode.desc}</p>
            </button>
          ))}
        </div>
        <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-6 text-sm text-white/30">
          <span>🍎 Fruit = +5 pts</span>
          <span>💣 Bombe = -10 pts</span>
          <span>🔥 Combo x3 = ×2</span>
        </div>
      </main>
    );
  }

  // ── RESULT ────────────────────────────────────────────
  if (phase === "result" && result) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-zinc-950 p-8 text-center shadow-2xl">
          <div className="text-6xl mb-4">{result.won ? "🏆" : "💀"}</div>
          <p className="text-white/40 text-sm uppercase tracking-widest mb-2">{result.mode}</p>
          <h1 className="text-6xl font-black mb-2">{result.score}</h1>
          <p className="text-white/50 mb-2">points</p>
          <p className="text-lg font-bold mt-4 mb-8"
            style={{ color: result.won ? "#4ade80" : "#f87171" }}>
            {result.won ? "Bravo ! Tu as gagné 🎉" : "Dommage... Réessaie ! 💪"}
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => startGame(modeRef.current)}
              className="rounded-xl bg-orange-500 px-6 py-3 font-black text-black transition hover:bg-orange-400">
              Rejouer
            </button>
            <button onClick={() => { phaseRef.current = "menu"; setPhase("menu"); }}
              className="rounded-xl border border-white/20 px-6 py-3 font-bold text-white transition hover:border-orange-400 hover:text-orange-400">
              Menu
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── GAME ──────────────────────────────────────────────
  return (
    <main className="relative w-full h-screen bg-black overflow-hidden select-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,146,60,0.06),transparent_60%)]" />

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair touch-none" />

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-4 pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm px-4 py-2">
            <span className="text-2xl font-black text-white">{score}</span>
            <span className="text-xs text-white/40 ml-1">pts</span>
          </div>
          {multiplier > 1 && (
            <div className="rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 animate-pulse">
              <span className="text-sm font-black text-yellow-300">x{multiplier}</span>
            </div>
          )}
          {combo > 1 && (
            <div className="rounded-2xl border border-orange-400/40 bg-orange-400/10 px-3 py-2">
              <span className="text-sm font-black text-orange-300">🔥 {combo}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Vies (survival) */}
          {selectedMode.id === "survival" && (
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="text-lg" style={{ opacity: i < lives ? 1 : 0.2 }}>❤️</span>
              ))}
            </div>
          )}
          {/* Fruits ratés (classic / color) */}
          {selectedMode.maxMissed && (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2">
              <span className="text-sm font-black text-red-300">
                💨 {missedCount}/{selectedMode.maxMissed}
              </span>
            </div>
          )}
          {/* Timer */}
          {selectedMode.id !== "survival" && (
            <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm px-4 py-2">
              <span className="text-2xl font-black" style={{ color: timeLeft <= 10 ? "#f87171" : "white" }}>
                {timeLeft}s
              </span>
            </div>
          )}
          {/* Objectif Rush */}
          {selectedMode.id === "rush" && selectedMode.targetScore && (
            <div className="rounded-2xl border border-orange-400/30 bg-orange-500/10 px-3 py-2">
              <span className="text-sm font-black text-orange-300">
                {score}/{selectedMode.targetScore}
              </span>
            </div>
          )}
          {/* Indicateur mode couleur */}
          {selectedMode.id === "color" && (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2">
              <span className="text-sm font-black text-red-300">🍎 Rouges only</span>
            </div>
          )}
        </div>
      </div>

      {/* Flash message */}
      {flashMsg && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none text-4xl font-black"
          style={{ color: flashMsg.color, textShadow: `0 0 20px ${flashMsg.color}` }}>
          {flashMsg.text}
        </div>
      )}

      <button
        onClick={() => { phaseRef.current = "menu"; setPhase("menu"); cancelAnimationFrame(animFrameRef.current); }}
        className="absolute bottom-5 right-5 z-10 rounded-xl border border-white/20 bg-black/60 px-4 py-2 text-sm font-bold text-white/60 backdrop-blur-sm transition hover:text-white hover:border-white/40">
        Quitter
      </button>
    </main>
  );
}