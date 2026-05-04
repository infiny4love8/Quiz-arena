"use client";

import { useEffect, useRef, useState } from "react";

type Ball = {
  x: number;
  y: number;
  vy: number;
  radius: number;
  colorIndex: number;
};

type Ring = {
  y: number;
  radius: number;
  rotation: number;
  gapAngle: number;
  colors: string[];
};

type GameState = {
  ball: Ball;
  rings: Ring[];
  gravity: number;
  jumpPower: number;
  speed: number;
};

const COLORS = ["#ff4d6d", "#4cc9f0", "#f9c74f", "#9b5de5"];

function createInitialGame(): GameState {
  return {
    ball: { x: 180, y: 520, vy: 0, radius: 14, colorIndex: 0 },
    rings: Array.from({ length: 6 }, (_, i) => ({
      y: 620 - i * 120,
      radius: 88,
      rotation: Math.random() * Math.PI * 2,
      gapAngle: Math.PI * 0.72,
      colors: COLORS,
    })),
    gravity: 0.35,
    jumpPower: -7.5,
    speed: 2.35,
  };
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const stateRef = useRef<GameState>(createInitialGame());

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const resetGame = () => {
    stateRef.current = createInitialGame();
    setScore(0);
    setGameOver(false);
    setStarted(true);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 420;
    const height = 720;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#020617");
      gradient.addColorStop(0.5, "#111827");
      gradient.addColorStop(1, "#030712");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 24; i++) {
        const x = (i * 53 + (Date.now() * 0.03)) % width;
        const y = (i * 91 + (Date.now() * 0.02)) % height;
        ctx.beginPath();
        ctx.fillStyle = `rgba(34, 211, 238, ${0.05 + (i % 4) * 0.02})`;
        ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = () => {
      const { ball, rings, gravity, speed } = stateRef.current;

      drawBackground();

      ball.vy += gravity;
      ball.y += ball.vy;

      rings.forEach((ring) => {
        ring.y -= speed;
        ring.rotation += 0.01;
      });

      if (rings.length && rings[0].y < -100) {
        rings.shift();
        const lastY = rings[rings.length - 1]?.y ?? 620;
        rings.push({
          y: lastY + 120,
          radius: 88,
          rotation: Math.random() * Math.PI * 2,
          gapAngle: Math.PI * 0.72,
          colors: COLORS,
        });

        setScore((s) => {
          const next = s + 1;
          setBest((b) => Math.max(b, next));
          return next;
        });
      }

      for (const ring of rings) {
        if (ring.y > -120 && ring.y < height + 120) {
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.strokeStyle = ring.colors[i];
            ctx.lineWidth = 16;
            ctx.lineCap = "round";
            const start = ring.rotation + i * (Math.PI / 2);
            const end = start + Math.PI / 2 - 0.04;
            ctx.arc(width / 2, ring.y, ring.radius, start, end);
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.strokeStyle = "rgba(255,255,255,0.08)";
          ctx.lineWidth = 2;
          ctx.arc(width / 2, ring.y, ring.radius + 10, 0, Math.PI * 2);
          ctx.stroke();

          const dy = ball.y - ring.y;
          if (Math.abs(dy) < 18) {
            const angle = Math.atan2(ball.y - ring.y, ball.x - width / 2);
            const normalized = (angle - ring.rotation + Math.PI * 2) % (Math.PI * 2);
            const inGap =
              Math.abs(normalized - Math.PI) < ring.gapAngle / 2;

            if (!inGap) {
              const segment = Math.floor(normalized / (Math.PI / 2));
              const ringColor = ring.colors[segment];
              const ballColor = COLORS[ball.colorIndex];

              if (ringColor !== ballColor) {
                setGameOver(true);
                setStarted(false);
              }
            }
          }
        }
      }

      if (ball.y > height + 40) {
        setGameOver(true);
        setStarted(false);
      }

      const glow = ctx.createRadialGradient(
        ball.x,
        ball.y,
        2,
        ball.x,
        ball.y,
        38
      );
      glow.addColorStop(0, `${COLORS[ball.colorIndex]}ff`);
      glow.addColorStop(1, `${COLORS[ball.colorIndex]}00`);
      ctx.beginPath();
      ctx.fillStyle = glow;
      ctx.arc(ball.x, ball.y, 38, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = COLORS[ball.colorIndex];
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.arc(ball.x - 4, ball.y - 4, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.shadowColor = "rgba(34,211,238,0.7)";
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 30px system-ui, sans-serif";
      ctx.fillText(String(score), 24, 48);
      ctx.restore();

      if (gameOver) {
        ctx.fillStyle = "rgba(2,6,23,0.64)";
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.shadowColor = "rgba(34,211,238,0.65)";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#ffffff";
        ctx.font = "800 40px system-ui, sans-serif";
        ctx.fillText("Game Over", 106, 320);
        ctx.restore();

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "500 18px system-ui, sans-serif";
        ctx.fillText("Appuie sur Restart", 126, 356);
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [score, gameOver]);

  const jump = () => {
    if (gameOver) return;

    if (!started) {
      resetGame();
      return;
    }

    stateRef.current.ball.vy = stateRef.current.jumpPower;
    stateRef.current.ball.colorIndex =
      (stateRef.current.ball.colorIndex + 1) % COLORS.length;
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.15),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(168,85,247,0.14),_transparent_45%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-200">
              Arcade Reflex
            </div>

            <h1 className="max-w-2xl text-4xl font-black leading-tight md:text-6xl">
              Color Switch
              <span className="block bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-yellow-300 bg-clip-text text-transparent">
                Gaming vibe addictive
              </span>
            </h1>

            <p className="max-w-xl text-sm leading-6 text-slate-300 md:text-base">
              Une balle, des anneaux colorés, des réflexes rapides. Le score
              monte à chaque niveau atteint, avec un rendu neon très visuel.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Score", String(score)],
                ["Best", String(best)],
                ["Mode", "Arcade"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
                >
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    {label}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-white">{value}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={jump}
                className="rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.35)] transition hover:scale-[1.02]"
              >
                Play / Jump
              </button>
              <button
                onClick={resetGame}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Restart
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Astuce: clique sur le canvas ou sur Play / Jump.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-cyan-400/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur-xl">
              <canvas
                ref={canvasRef}
                className="block w-full rounded-[1.5rem] bg-black"
                onPointerDown={jump}
              />
              <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}