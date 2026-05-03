"use client";

import { useEffect, useRef, useState } from "react";

type GameState = "menu" | "playing" | "gameover";
type Ring = {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  speed: number;
  targetColor: number;
  passed: boolean;
};
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
};

const COLORS = ["#ff4d4d", "#ffd84d", "#4dff88", "#4da3ff"];
const BG = "#080814";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const inputRef = useRef({
    pressing: false,
    pointerId: null as number | null,
  });

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameState, setGameState] = useState<GameState>("menu");

  const resetAndStart = () => setGameState("playing");

  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const state = {
      width: 0,
      height: 0,
      time: 0,
      last: 0,
      gravity: 1600,
      lift: -850,
      speedBase: 140,
      speedBoost: 18,
      scroll: 0,
      shake: 0,
      running: true,
      ball: {
        x: 0,
        y: 0,
        vy: 0,
        r: 14,
        colorIndex: 0,
      },
      rings: [] as Ring[],
      particles: [] as Particle[],
      stars: Array.from({ length: 70 }, () => ({
        x: Math.random(),
        y: Math.random(),
        s: 0.3 + Math.random() * 1.8,
        a: 0.2 + Math.random() * 0.8,
      })),
      tutorialTimer: 0,
    };

    const audioCtx =
      audioRef.current ??
      new (window.AudioContext || (window as any).webkitAudioContext)();
    audioRef.current = audioCtx;

    const resize = () => {
      state.width = window.innerWidth;
      state.height = window.innerHeight;
      canvas.width = Math.floor(state.width * dpr);
      canvas.height = Math.floor(state.height * dpr);
      canvas.style.width = `${state.width}px`;
      canvas.style.height = `${state.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state.ball.x = state.width / 2;
      state.ball.y = state.height * 0.72;
    };

    const playSound = (freq: number, duration = 0.08, vol = 0.08) => {
      if (audioCtx.state === "suspended") audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    };

    const spawnParticles = (x: number, y: number, color: string, count = 18) => {
      for (let i = 0; i < count; i++) {
        state.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 360,
          vy: (Math.random() - 0.5) * 360,
          life: 1,
          color,
          size: 1.5 + Math.random() * 3,
        });
      }
    };

    const makeRing = (y: number): Ring => {
      const color = Math.floor(Math.random() * COLORS.length);
      return {
        x: state.width / 2,
        y,
        radius: 84 + Math.random() * 26,
        rotation: Math.random() * Math.PI * 2,
        speed: (Math.random() > 0.5 ? 1 : -1) * (0.35 + Math.random() * 0.22),
        targetColor: color,
        passed: false,
      };
    };

    const initRings = () => {
      state.rings = [];
      const gap = 180;
      for (let i = 0; i < 8; i++) {
        state.rings.push(makeRing(state.height - 220 - i * gap));
      }
    };

    const gameOver = () => {
      state.running = false;
      setBest((b) => Math.max(b, score));
      setGameState("gameover");
      playSound(120, 0.18, 0.09);
      state.shake = 18;
    };

    const handlePress = () => {
      if (gameState !== "playing") return;
      inputRef.current.pressing = true;
      if (navigator.vibrate) navigator.vibrate(12);
    };

    const handleRelease = () => {
      inputRef.current.pressing = false;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || e.pointerType === "touch" || e.pointerType === "pen") {
        inputRef.current.pointerId = e.pointerId;
        handlePress();
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (inputRef.current.pointerId === e.pointerId) {
        inputRef.current.pointerId = null;
      }
      handleRelease();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "Enter") {
        e.preventDefault();
        handlePress();
      }
      if (e.code === "KeyR" && gameState === "gameover") {
        setScore(0);
        setGameState("playing");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "Enter") {
        handleRelease();
      }
    };

    const update = (now: number) => {
      if (!state.running) return;
      const dt = Math.min(0.032, (now - state.last) / 1000 || 0.016);
      state.last = now;
      state.time += dt;

      const w = state.width;
      const h = state.height;
      const ball = state.ball;

      if (state.shake > 0) state.shake = Math.max(0, state.shake - 40 * dt);

      if (inputRef.current.pressing) {
        ball.vy += state.lift * dt;
      } else {
        ball.vy += state.gravity * dt;
      }
      ball.vy = Math.max(-900, Math.min(900, ball.vy));
      ball.y += ball.vy * dt;

      const targetScrollY = h * 0.62;
      if (ball.y < targetScrollY) {
        const delta = targetScrollY - ball.y;
        ball.y = targetScrollY;
        state.rings.forEach((r) => (r.y += delta));
      }

      const difficulty = 1 + score * 0.04;
      const ringSpeed = state.speedBase + score * state.speedBoost;

      state.rings.forEach((ring, index) => {
        ring.y += ringSpeed * dt;
        ring.rotation += ring.speed * dt * difficulty;

        const dx = ball.x - ring.x;
        const dy = ball.y - ring.y;
        const dist = Math.hypot(dx, dy);

        const passWindow = Math.abs(dist - ring.radius) < ball.r + 12;
        if (passWindow && !ring.passed) {
          const angle = (Math.atan2(dy, dx) - ring.rotation + Math.PI * 2) % (Math.PI * 2);
          const sector = Math.floor(angle / (Math.PI / 2));

          if (sector !== ball.colorIndex) {
            gameOver();
            return;
          }

          ring.passed = true;
          setScore((s) => s + 1);
          ball.colorIndex = ring.targetColor;
          ball.vy = Math.min(ball.vy, -180);

          playSound(560, 0.06, 0.06);
          spawnParticles(ball.x, ball.y, COLORS[ball.colorIndex], 22);

          const nextIndex = (ring.targetColor + 1 + Math.floor(Math.random() * 3)) % 4;
          ring.targetColor = nextIndex;
        }

        if (ring.y - ring.radius > h + 120) {
          const topY = Math.min(...state.rings.map((r) => r.y));
          Object.assign(ring, makeRing(topY - 190 - Math.random() * 40));
        }
      });

      if (ball.y - ball.r > h + 60) {
        gameOver();
        return;
      }

      if (ball.y + ball.r < -80) {
        ball.y = -80;
        ball.vy = 0;
      }

      state.particles = state.particles.filter((p) => p.life > 0);
      state.particles.forEach((p) => {
        p.life -= dt * 1.8;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
      });

      draw();
      animationRef.current = requestAnimationFrame(update);
    };

    const draw = () => {
      const w = state.width;
      const h = state.height;
      const ball = state.ball;

      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);

      const grd = ctx.createRadialGradient(w / 2, h / 3, 40, w / 2, h / 3, Math.max(w, h));
      grd.addColorStop(0, "rgba(78, 119, 255, 0.14)");
      grd.addColorStop(1, "rgba(8, 8, 20, 0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      for (const s of state.stars) {
        ctx.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.s, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const ring of state.rings) {
        for (let i = 0; i < 4; i++) {
          const start = ring.rotation + (i * Math.PI) / 2;
          const end = ring.rotation + ((i + 1) * Math.PI) / 2;
          ctx.beginPath();
          ctx.lineWidth = 14;
          ctx.lineCap = "round";
          ctx.shadowBlur = 18;
          ctx.shadowColor = COLORS[i];
          ctx.strokeStyle = COLORS[i];
          ctx.arc(ring.x, ring.y, ring.radius, start, end);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        const coreGlow = ctx.createRadialGradient(ring.x, ring.y, ring.radius - 20, ring.x, ring.y, ring.radius + 22);
        coreGlow.addColorStop(0, "rgba(255,255,255,0)");
        coreGlow.addColorStop(1, "rgba(255,255,255,0.08)");
        ctx.fillStyle = coreGlow;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius + 22, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of state.particles) {
        const alpha = Math.max(0, p.life / 1.8);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.save();
      if (state.shake > 0) {
        ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
      }

      const ballGlow = ctx.createRadialGradient(ball.x, ball.y, 2, ball.x, ball.y, 42);
      ballGlow.addColorStop(0, "rgba(255,255,255,0.9)");
      ballGlow.addColorStop(1, COLORS[ball.colorIndex] + "00");

      ctx.shadowBlur = 25;
      ctx.shadowColor = COLORS[ball.colorIndex];
      ctx.fillStyle = COLORS[ball.colorIndex];
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = ballGlow;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r + 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "600 22px system-ui, sans-serif";
      ctx.fillText(`Score: ${score}`, 20, 34);

      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "500 14px system-ui, sans-serif";
      ctx.fillText("Hold / tap to rise", 20, 56);

      if (state.tutorialTimer < 4) {
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "700 28px system-ui, sans-serif";
        ctx.fillText("Traverse le bon segment", w / 2, h * 0.18);
        ctx.font = "500 16px system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText("Maintiens pour monter, relâche pour descendre", w / 2, h * 0.18 + 28);
        ctx.textAlign = "left";
      }
    };

    const cleanup = () => {
      state.running = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };

    resize();
    initRings();

    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerUp, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    setScore(0);
    state.last = performance.now();
    animationRef.current = requestAnimationFrame(update);

    return cleanup;
  }, [gameState, score]);

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: BG }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          touchAction: "none",
          cursor: "pointer",
        }}
      />

      {gameState === "menu" && (
        <div style={overlayStyle}>
          <h1 style={titleStyle}>Color Orbit</h1>
          <p style={textStyle}>Maintiens ou tappe pour faire monter la balle et traverse les anneaux de la bonne couleur.</p>
          <button style={buttonStyle} onClick={resetAndStart}>Start</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div style={overlayStyle}>
          <h1 style={titleStyle}>Game Over</h1>
          <p style={textStyle}>Score: {score}</p>
          <p style={textStyle}>Best: {best}</p>
          <button
            style={buttonStyle}
            onClick={() => {
              setScore(0);
              setGameState("playing");
            }}
          >
            Restart
          </button>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "radial-gradient(circle at center, rgba(15,15,30,0.55), rgba(0,0,0,0.85))",
  color: "white",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "16px",
  padding: "24px",
  textAlign: "center",
  backdropFilter: "blur(8px)",
};

const titleStyle: React.CSSProperties = {
  fontSize: "clamp(40px, 8vw, 72px)",
  margin: 0,
  letterSpacing: "0.04em",
};

const textStyle: React.CSSProperties = {
  margin: 0,
  maxWidth: 520,
  color: "rgba(255,255,255,0.82)",
  lineHeight: 1.5,
};

const buttonStyle: React.CSSProperties = {
  padding: "14px 28px",
  borderRadius: 999,
  border: "none",
  background: "linear-gradient(135deg, #4da3ff, #7c4dff)",
  color: "white",
  fontWeight: 700,
  fontSize: 18,
  boxShadow: "0 10px 30px rgba(77,163,255,0.35)",
};