"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DuelPage() {
  const router = useRouter();
  const [coins, setCoins] = useState<number | null>(null);

  useEffect(() => {
    const fetchCoins = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
      icon: "✉️",
      title: "Tu défies un ami",
      desc: "Entre l'email de ton adversaire. Il reçoit une notification instantanément dans l'app.",
    },
    {
      number: "02",
      icon: "🎯",
      title: "Vous choisissez le thème",
      desc: "Drapeaux, Marques ou Films & Séries. Proposez, contre-proposez — 90 secondes pour vous mettre d'accord.",
    },
    {
      number: "03",
      icon: "🪙",
      title: "Pari optionnel",
      desc: "Envie de pimenter ? Proposez une mise (min. 50 coins). Le gagnant empoche 90% du pot.",
    },
    {
      number: "04",
      icon: "⚡",
      title: "Vous jouez",
      desc: "Même thème, chacun de son côté. Répondez le plus vite et le plus juste possible.",
    },
    {
      number: "05",
      icon: "🏆",
      title: "Le meilleur gagne",
      desc: "Les scores sont comparés. En cas de pari, les coins sont transférés automatiquement.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/5 blur-[100px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color, #fff) 1px, transparent 1px), linear-gradient(90deg, var(--color, #fff) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-5 py-16">

        <div className="mb-14">
          <p className="text-xs uppercase tracking-[0.4em] text-white/30 mb-4">Mode</p>
          <div className="flex items-end gap-4 mb-5">
            <h1 className="text-6xl font-black tracking-tight leading-none">
              Duel<span className="text-orange-400"> 1v1</span>
            </h1>
            {coins !== null && (
              <span className="mb-1 text-sm text-white/40 font-medium">
                🪙 {coins} coins
              </span>
            )}
          </div>
          <p className="text-white/50 text-base leading-relaxed max-w-md">
            Mesure-toi directement à un ami. Choisis le thème ensemble,
            pariez si vous le voulez, et que le meilleur gagne.
          </p>
        </div>

        <div className="mb-12 space-y-0">
          {steps.map((step, i) => (
            <div key={step.number} className="flex gap-5 group">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:border-orange-400/50 group-hover:bg-orange-500/10 transition-all duration-300">
                  <span className="text-xs font-black text-white/40 group-hover:text-orange-400 transition-colors">
                    {step.number}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="w-px flex-1 bg-white/5 my-2" />
                )}
              </div>

              <div className={`pb-8 ${i === steps.length - 1 ? "pb-0" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: "16px" }}>{step.icon}</span>
                  <h3 className="font-bold text-white text-sm">{step.title}</h3>
                </div>
                <p className="text-white/40 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-10 rounded-2xl border border-white/8 bg-white/[0.03] p-5 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-black text-orange-400">90s</p>
            <p className="text-xs text-white/35 mt-1">pour choisir le thème</p>
          </div>
          <div className="border-x border-white/8">
            <p className="text-2xl font-black text-orange-400">50</p>
            <p className="text-xs text-white/35 mt-1">coins minimum pour parier</p>
          </div>
          <div>
            <p className="text-2xl font-black text-orange-400">90%</p>
            <p className="text-xs text-white/35 mt-1">du pot pour le gagnant</p>
          </div>
        </div>

        <button
          onClick={() => router.push("/duel/challenge")}
          className="w-full group relative rounded-2xl bg-orange-500 px-8 py-5 font-black text-lg text-black transition-all duration-300 hover:bg-orange-400 hover:scale-[1.01] active:scale-[0.99] overflow-hidden"
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            <span>Lancer un duel</span>
            <span className="text-xl group-hover:translate-x-1 transition-transform duration-200">→</span>
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </button>

        <p className="text-center text-xs text-white/20 mt-5">
          Le duel fun (sans pari) est gratuit · Aucun coin requis
        </p>
      </div>
    </main>
  );
}