"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const UNLOCK_AT = new Date("2026-08-16T18:00:00-04:00").getTime();

type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  finished: boolean;
};

function getCountdown(): Countdown {
  const distance = UNLOCK_AT - Date.now();

  if (distance <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      finished: true,
    };
  }

  return {
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    ),
    minutes: Math.floor(
      (distance % (1000 * 60 * 60)) / (1000 * 60)
    ),
    seconds: Math.floor((distance % (1000 * 60)) / 1000),
    finished: false,
  };
}

export default function ProTournamentsLockedPage() {
  const [countdown, setCountdown] = useState<Countdown>({
    days: 5,
    hours: 0,
    minutes: 0,
    seconds: 0,
    finished: false,
  });

  const unlockLabel = useMemo(() => {
    return new Intl.DateTimeFormat("fr-HT", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "America/Port-au-Prince",
    }).format(new Date(UNLOCK_AT));
  }, []);

  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(getCountdown());
    };

    updateCountdown();

    const interval = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#061009] px-4 py-6 text-white sm:px-6">
      <style>{`
        @keyframes lockFloat {
          0%, 100% {
            transform: translateY(0) scale(1);
          }

          50% {
            transform: translateY(-9px) scale(1.025);
          }
        }

        @keyframes lockGlow {
          0%, 100% {
            box-shadow:
              0 0 25px rgba(212, 175, 106, 0.18),
              0 0 60px rgba(212, 175, 106, 0.08);
          }

          50% {
            box-shadow:
              0 0 40px rgba(212, 175, 106, 0.34),
              0 0 95px rgba(212, 175, 106, 0.15);
          }
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shine {
          0% {
            transform: translateX(-140%);
          }

          100% {
            transform: translateX(240%);
          }
        }

        @keyframes pulseDot {
          0%, 100% {
            opacity: 0.45;
            transform: scale(0.9);
          }

          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        .pro-card {
          background:
            linear-gradient(
              150deg,
              rgba(16, 36, 24, 0.97),
              rgba(7, 18, 11, 0.99)
            );
          border: 1px solid rgba(212, 175, 106, 0.28);
          box-shadow:
            0 30px 90px rgba(0, 0, 0, 0.58),
            inset 0 1px 0 rgba(255, 255, 255, 0.035);
        }

        .gold-text {
          background:
            linear-gradient(
              110deg,
              #9e7737 0%,
              #d4af6a 28%,
              #f1d79b 50%,
              #d4af6a 72%,
              #9e7737 100%
            );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .gold-button {
          background:
            linear-gradient(
              110deg,
              #9e7737 0%,
              #d4af6a 38%,
              #efd18e 52%,
              #bd9149 100%
            );
          box-shadow:
            0 14px 35px rgba(212, 175, 106, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .countdown-box {
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.035),
              rgba(255, 255, 255, 0.012)
            );
          border: 1px solid rgba(212, 175, 106, 0.17);
        }

        @media (max-width: 480px) {
          .countdown-number {
            font-size: 26px;
          }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-190px] h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-emerald-900/20 blur-[90px]" />

        <div className="absolute bottom-[-230px] left-[-160px] h-[430px] w-[430px] rounded-full bg-[#d4af6a]/[0.055] blur-[100px]" />

        <div className="absolute right-[-170px] top-[38%] h-[360px] w-[360px] rounded-full bg-emerald-950/35 blur-[90px]" />

        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(212,175,106,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,106,.25) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
      </div>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-3xl items-center justify-center">
        <div className="pro-card w-full overflow-hidden rounded-[26px] p-5 sm:p-8">
          <div className="relative">
            <div className="mb-5 flex items-center justify-between">
              <Link
                href="/dashboard"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d4af6a]/20 bg-black/20 text-lg text-[#d4af6a] transition hover:border-[#d4af6a]/40 hover:bg-[#d4af6a]/5 active:scale-95"
                aria-label="Retour au dashboard"
              >
                ←
              </Link>

              <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af6a]/20 bg-[#d4af6a]/[0.07] px-3 py-2">
                <span
                  className="h-2 w-2 rounded-full bg-[#d4af6a]"
                  style={{
                    animation: "pulseDot 1.8s ease-in-out infinite",
                  }}
                />

                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4af6a]">
                  Ouverture prochaine
                </span>
              </div>

              <div className="h-11 w-11" aria-hidden="true" />
            </div>

            <div
              className="mx-auto flex h-[108px] w-[108px] items-center justify-center rounded-full border border-[#d4af6a]/30 bg-black/25"
              style={{
                animation:
                  "lockFloat 4.5s ease-in-out infinite, lockGlow 3s ease-in-out infinite",
              }}
            >
              <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full border border-[#d4af6a]/20 bg-gradient-to-b from-[#153020] to-[#09150d]">
                <svg
                  width="38"
                  height="38"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#D4AF6A"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect
                    width="15"
                    height="11"
                    x="4.5"
                    y="10"
                    rx="2"
                  />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  <path d="M12 14v3" />
                </svg>
              </div>
            </div>

            <div
              className="mt-7 text-center"
              style={{
                animation: "fadeUp 0.8s ease both",
              }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#d4af6a]/60">
                Zonarena présente
              </p>

              <h1 className="gold-text mt-3 text-4xl font-black leading-[0.98] sm:text-6xl">
                TOURNOIS PRO
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#b8b4aa] sm:text-base sm:leading-7">
                L’arène Pro sera disponible dans cinq jours.
                <br className="hidden sm:block" /> Prépare-toi à viser les récompenses les plus
                importantes de Zonarena.
              </p>
            </div>

            {!countdown.finished ? (
              <div
                className="mt-7 grid grid-cols-4 gap-2 sm:gap-3"
                style={{
                  animation: "fadeUp 0.8s 0.12s ease both",
                }}
              >
                <CountdownBox
                  value={countdown.days}
                  label="Jours"
                />

                <CountdownBox
                  value={countdown.hours}
                  label="Heures"
                />

                <CountdownBox
                  value={countdown.minutes}
                  label="Minutes"
                />

                <CountdownBox
                  value={countdown.seconds}
                  label="Secondes"
                />
              </div>
            ) : (
              <div className="mt-7 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-4 text-center">
                <p className="font-black text-emerald-300">
                  L’arène Pro est maintenant ouverte.
                </p>
              </div>
            )}

            <div
              className="mt-7 grid gap-3 sm:grid-cols-3"
              style={{
                animation: "fadeUp 0.8s 0.2s ease both",
              }}
            >
              <Feature
                icon="💰"
                title="Gagne plus"
                description="Des récompenses adaptées au nombre de joueurs."
              />

              <Feature
                icon="⭐"
                title="Progresse"
                description="Gagne de l’XP à chaque tournoi terminé."
              />

              <Feature
                icon="🎫"
                title="Sois récompensé"
                description="Ticket ou cashback selon ton classement."
              />
            </div>

            <div
              className="mt-7 rounded-2xl border border-[#d4af6a]/15 bg-black/20 px-4 py-4 text-center"
              style={{
                animation: "fadeUp 0.8s 0.28s ease both",
              }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d4af6a]/55">
                Ouverture officielle
              </p>

              <p className="mt-1 text-sm font-black text-[#e4ddce]">
                {unlockLabel}
              </p>
            </div>

            <div
              className="mt-5"
              style={{
                animation: "fadeUp 0.8s 0.34s ease both",
              }}
            >
              {countdown.finished ? (
                <Link
                  href="/tournaments/pro"
                  className="gold-button relative flex w-full items-center justify-center overflow-hidden rounded-xl px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-[#132016] transition hover:scale-[1.01] active:scale-[0.99]"
                >
                  Entrer dans l’arène Pro
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="relative w-full cursor-not-allowed overflow-hidden rounded-xl border border-[#d4af6a]/18 bg-[#d4af6a]/[0.055] px-5 py-4 text-sm font-black uppercase tracking-[0.1em] text-[#d4af6a]/50"
                >
                  <span
                    className="absolute inset-y-0 left-[-35%] w-[30%] skew-x-[-20deg] bg-white/[0.08]"
                    style={{
                      animation: "shine 3.8s ease-in-out infinite",
                    }}
                  />

                  🔒 Arène verrouillée
                </button>
              )}

              <p className="mt-3 text-center text-xs leading-5 text-[#77756f]">
                Disponible pour les joueurs qui veulent dépasser leurs limites,
                grimper dans le classement et tenter de gagner de vraies
                récompenses.
              </p>
            </div>

            <div className="mt-6 border-t border-[#d4af6a]/10 pt-5 text-center">
              <p className="text-xs leading-5 text-[#77756f]">
                En attendant, entraîne-toi et participe aux tournois
                sponsorisés pour préparer ton arrivée dans l’arène Pro.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link
                  href="/training"
                  className="rounded-xl border border-[#d4af6a]/15 bg-white/[0.025] px-3 py-3 text-xs font-bold text-[#c8c2b5] transition hover:border-[#d4af6a]/35 hover:text-[#d4af6a]"
                >
                  🎯 S’entraîner
                </Link>

                <Link
                  href="/tournamentsponsorise"
                  className="rounded-xl border border-[#d4af6a]/15 bg-white/[0.025] px-3 py-3 text-xs font-bold text-[#c8c2b5] transition hover:border-[#d4af6a]/35 hover:text-[#d4af6a]"
                >
                  🎫 Jouer gratuitement
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function CountdownBox({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="countdown-box rounded-xl px-2 py-3 text-center sm:px-3 sm:py-4">
      <p className="countdown-number text-3xl font-black leading-none text-[#d4af6a] sm:text-4xl">
        {String(value).padStart(2, "0")}
      </p>

      <p className="mt-2 text-[8px] font-black uppercase tracking-[0.12em] text-[#77756f] sm:text-[10px]">
        {label}
      </p>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[#d4af6a]/12 bg-white/[0.02] p-4 text-center">
      <div className="text-2xl" aria-hidden="true">
        {icon}
      </div>

      <h2 className="mt-2 text-sm font-black text-[#e6dfd0]">
        {title}
      </h2>

      <p className="mt-1 text-[11px] leading-5 text-[#77756f]">
        {description}
      </p>
    </div>
  );
}