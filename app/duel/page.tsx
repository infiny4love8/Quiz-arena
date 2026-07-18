"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DuelPage() {
  const router = useRouter();
  const [coins, setCoins] = useState<number | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchCoins = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("coins")
        .eq("id", user.id)
        .single();

      if (data) setCoins(data.coins);
    };

    fetchCoins();
  }, []);

  const steps = [
    {
      number: "01",
      title: "Lance le défi",
      desc: "Choisis ton adversaire, ecris son nom et envoie-lui le duel.",
    },
    {
      number: "02",
      title: "Choisissez le jeu",
      desc: "Drapeaux, Mémoire ou Tank Arena.",
    },
    {
      number: "03",
      title: "Ajoutez une mise si vous voulez",
      desc: "Le duel peut aussi être joué gratuitement.",
    },
    {
      number: "04",
      title: "Jouez et comparez vos scores",
      desc: "Le meilleur score remporte le duel.",
    },
  ];

  function handleRipple(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = btnRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement("span");
    ripple.style.cssText = `
      position:absolute;
      width:${size}px;
      height:${size}px;
      left:${x}px;
      top:${y}px;
      border-radius:50%;
      background:rgba(255,122,26,0.25);
      transform:scale(0);
      animation:rippleAnim 0.7s ease-out forwards;
      pointer-events:none;
      z-index:2;
    `;

    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 750);
    router.push("/duel/challenge");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');

        @keyframes floatGlow {
          0%, 100% { transform: translateY(0px) scale(1); opacity: .7; }
          50% { transform: translateY(-10px) scale(1.05); opacity: 1; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: .7; }
          50% { transform: scale(1.2); opacity: 1; }
        }

        @keyframes rippleAnim {
          to { transform: scale(4.5); opacity: 0; }
        }

        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }

        .duel-card {
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(18,18,24,0.94), rgba(10,10,14,0.98));
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow:
            0 0 0 1px rgba(255,122,26,0.06),
            0 24px 80px rgba(0,0,0,0.55),
            inset 0 1px 0 rgba(255,255,255,0.06);
          backdrop-filter: blur(18px);
        }

        .duel-card::before {
          content: '';
          position: absolute;
          inset: 0;
          padding: 1px;
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(255,122,26,0.8), rgba(255,204,0,0.3), rgba(255,122,26,0.12));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: .7;
        }

        .duel-card::after {
          content: '';
          position: absolute;
          inset: -120px;
          background:
            radial-gradient(circle at 20% 20%, rgba(255,122,26,0.18), transparent 30%),
            radial-gradient(circle at 80% 0%, rgba(255,204,0,0.10), transparent 26%),
            radial-gradient(circle at 50% 110%, rgba(255,122,26,0.12), transparent 30%);
          pointer-events: none;
        }

        .duel-step:hover {
          transform: translateY(-2px);
          border-color: rgba(255,122,26,0.22);
          background: rgba(255,255,255,0.04) !important;
        }

        .duel-cta:hover {
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 20px 60px rgba(255,122,26,0.24);
        }

        .duel-cta-border {
          position: absolute;
          inset: -2px;
          border-radius: 18px;
          padding: 2px;
          background: linear-gradient(90deg, #ff7a1a, #ffcc33, #ff7a1a);
          background-size: 200% 200%;
          animation: shimmer 2.8s linear infinite;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: .95;
        }

        details summary {
          list-style: none;
        }

        details summary::-webkit-details-marker {
          display: none;
        }

        @media (max-width: 768px) {
          .duel-card {
            border-radius: 22px !important;
          }

          .duel-main {
            padding: 14px 12px 34px !important;
          }

          .duel-inner {
            padding: 18px !important;
          }

          .duel-title {
            font-size: 58px !important;
            margin-bottom: 8px !important;
          }

          .duel-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
            margin-top: 16px !important;
          }

          .duel-stat {
            padding: 12px 10px !important;
          }

          .duel-stat:last-child {
            grid-column: 1 / -1;
          }

          .duel-cta-wrap {
            margin-top: 18px !important;
          }

          .duel-explain {
            margin-top: 14px !important;
          }

          .duel-step {
            padding: 11px !important;
          }
        }
      `}</style>

      <main
        className="duel-main"
        style={{
          minHeight: "100vh",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at top, rgba(255,122,26,0.14), transparent 28%), radial-gradient(circle at 80% 20%, rgba(255,204,0,0.08), transparent 18%), linear-gradient(180deg, #09090b 0%, #0d0d12 100%)",
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          padding: "clamp(18px, 4vw, 32px) 16px 56px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            maskImage: "radial-gradient(circle at center, black 35%, transparent 100%)",
            pointerEvents: "none",
            opacity: 0.25,
          }}
        />

        <div
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,122,26,0.18) 0%, rgba(255,122,26,0.04) 35%, transparent 70%)",
            top: -160,
            left: "50%",
            transform: "translateX(-50%)",
            filter: "blur(10px)",
            animation: "floatGlow 6s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            className="duel-card duel-inner"
            style={{
              borderRadius: 28,
              padding: "clamp(18px, 4vw, 28px)",
            }}
          >
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.82)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  animation: "fadeUp .55s ease both",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#ff7a1a",
                    boxShadow: "0 0 14px rgba(255,122,26,0.9)",
                    animation: "pulseDot 1.5s ease-in-out infinite",
                  }}
                />
                Mode 1v1
                {coins !== null && (
                  <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
                    · 🪙 {coins}
                  </span>
                )}
              </div>

              <div>
                <div
                  className="duel-title"
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: "clamp(64px, 13vw, 104px)",
                    lineHeight: 0.88,
                    letterSpacing: "0.02em",
                    marginTop: 20,
                    marginBottom: 12,
                    animation: "fadeUp .6s .05s ease both",
                  }}
                >
                  DUEL
                  <span
                    style={{
                      display: "block",
                      color: "#ff7a1a",
                      textShadow: "0 0 26px rgba(255,122,26,0.35)",
                    }}
                  >
                    1 VS 1
                  </span>
                </div>

                <p
                  style={{
                    maxWidth: 560,
                    fontSize: "clamp(14px, 3.6vw, 17px)",
                    lineHeight: 1.55,
                    color: "rgba(255,255,255,0.68)",
                    margin: 0,
                    animation: "fadeUp .6s .12s ease both",
                  }}
                >
                  Défie un ami, choisissez un jeu et comparez vos scores.
                </p>

                <div
                  className="duel-stats"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                    marginTop: 22,
                    animation: "fadeUp .6s .18s ease both",
                  }}
                >
                  {[
                    { val: "90 s", label: "pour accepter" },
                    { val: "50", label: "GDS minimum avec mise" },
                    { val: "0", label: "GDS pour jouer gratuitement" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="duel-stat"
                      style={{
                        borderRadius: 16,
                        padding: "14px 12px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Bebas Neue', sans-serif",
                          fontSize: 34,
                          lineHeight: 1,
                          color: "#ff7a1a",
                          marginBottom: 5,
                        }}
                      >
                        {item.val}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          lineHeight: 1.4,
                          color: "rgba(255,255,255,0.6)",
                        }}
                      >
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className="duel-cta-wrap"
                  style={{
                    marginTop: 22,
                    animation: "fadeUp .6s .24s ease both",
                  }}
                >
                  <button
                    ref={btnRef}
                    onClick={handleRipple}
                    className="duel-cta"
                    style={{
                      width: "100%",
                      position: "relative",
                      overflow: "hidden",
                      cursor: "pointer",
                      border: "none",
                      borderRadius: 18,
                      background: "linear-gradient(135deg, #ffffff 0%, #f3f3f3 100%)",
                      padding: 0,
                      boxShadow: "0 16px 40px rgba(255,122,26,0.18)",
                      transition: "transform 0.18s ease, box-shadow 0.18s ease",
                    }}
                  >
                    <div className="duel-cta-border" />
                    <div
                      style={{
                        position: "relative",
                        zIndex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 12,
                        padding: "18px 20px",
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: "clamp(22px, 5vw, 26px)",
                        letterSpacing: "0.08em",
                        color: "#0b0b0f",
                      }}
                    >
                      <span>LANCER UN DUEL</span>
                      <span style={{ fontSize: 22 }}>→</span>
                    </div>
                  </button>

                  <p
                    style={{
                      textAlign: "center",
                      marginTop: 10,
                      fontSize: 12.5,
                      color: "rgba(255,255,255,0.46)",
                    }}
                  >
                    Gratuit sans mise · 50 GDS minimum avec mise
                  </p>
                </div>

                <details
                  className="duel-explain"
                  style={{
                    marginTop: 18,
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <summary
                    style={{
                      cursor: "pointer",
                      padding: "14px 16px",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "rgba(255,255,255,0.78)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Comment ça marche ?</span>
                    <span style={{ color: "#ff7a1a" }}>＋</span>
                  </summary>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      padding: "0 14px 14px",
                    }}
                  >
                    {steps.map((step) => (
                      <div
                        key={step.number}
                        className="duel-step"
                        style={{
                          display: "flex",
                          gap: 12,
                          padding: 12,
                          borderRadius: 16,
                          border: "1px solid rgba(255,255,255,0.06)",
                          background: "rgba(255,255,255,0.025)",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            background: "rgba(255,122,26,0.12)",
                            border: "1px solid rgba(255,122,26,0.22)",
                            color: "#ffb27b",
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                          }}
                        >
                          {step.number}
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#fff",
                              marginBottom: 3,
                            }}
                          >
                            {step.title}
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 12.5,
                              lineHeight: 1.5,
                              color: "rgba(255,255,255,0.62)",
                            }}
                          >
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}