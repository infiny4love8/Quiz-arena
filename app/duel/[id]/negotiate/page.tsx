"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Theme = "drapeaux" | "marques" | "films";
type Role = "a" | "b";

// ✅ FIX ICI
const THEMES: { id: Theme; label: string; icon: string; desc: string }[] = [
  { id: "drapeaux", label: "Drapeaux", icon: "🌍", desc: "Reconnais les drapeaux du monde" },
  { id: "marques", label: "Marques", icon: "🏷️", desc: "Identifie les logos de marques" },
  { id: "films", label: "Films & Séries", icon: "🎬", desc: "Quiz cinéma et séries" },
];

type DuelData = {
  id: string;
  player_a: string;
  player_b: string;
  status: string;
  theme: Theme | null;
  theme_proposed_by: string | null;
  theme_expires_at: string | null;
};

export default function DuelNegotiatePage() {
  const router = useRouter();
  const params = useParams();
  const duelId = params.id as string;

  const [duel, setDuel] = useState<DuelData | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [timeLeft, setTimeLeft] = useState(90);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [opponentName, setOpponentName] = useState("Adversaire");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const calcTimeLeft = useCallback((expiresAt: string | null) => {
    if (!expiresAt) return 90;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  }, []);

  const startTimer = useCallback((expiresAt: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const left = calcTimeLeft(expiresAt);
      setTimeLeft(left);
      if (left <= 0) clearInterval(timerRef.current!);
    }, 1000);
  }, [calcTimeLeft]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      setMyId(user.id);

      const { data: duelData, error } = await supabase
        .from("duels")
        .select("*")
        .eq("id", duelId)
        .single();

      if (error || !duelData) {
        router.push("/dashboard");
        return;
      }

      // 🔥 auto accept
      if (duelData.status === "pending") {
        await supabase
          .from("duels")
          .update({ status: "negotiating" })
          .eq("id", duelId);

        duelData.status = "negotiating";
      }

      if (!["negotiating"].includes(duelData.status)) {
        router.push(`/duel/${duelId}/bet`);
        return;
      }

      setDuel(duelData);

      const myRole = duelData.player_a === user.id ? "a" : "b";
      setRole(myRole);

      const opponentId = myRole === "a" ? duelData.player_b : duelData.player_a;

      const { data: opp } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", opponentId)
        .single();

      if (opp) setOpponentName(opp.full_name);

      if (duelData.theme_expires_at) {
        setTimeLeft(calcTimeLeft(duelData.theme_expires_at));
        startTimer(duelData.theme_expires_at);
      }

      setLoading(false);

      // realtime
      channelRef.current = supabase
        .channel(`negotiate-${duelId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "duels",
            filter: `id=eq.${duelId}`,
          },
          (payload) => {
            const updated = payload.new as DuelData;
            setDuel(updated);

            if (updated.status === "cancelled") {
              router.push("/dashboard");
              return;
            }

            if (updated.status === "ready") {
              router.push(`/duel/${duelId}/bet`);
              return;
            }

            if (updated.theme_expires_at) {
              setTimeLeft(calcTimeLeft(updated.theme_expires_at));
              startTimer(updated.theme_expires_at);
            }
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [duelId, router, calcTimeLeft, startTimer]);

  useEffect(() => {
    if (timeLeft === 0 && duel && duel.status === "negotiating") {
      supabase
        .from("duels")
        .update({ status: "cancelled" })
        .eq("id", duelId)
        .then(() => router.push("/dashboard"));
    }
  }, [timeLeft, duel, duelId, router]);

  const proposeTheme = async (theme: Theme) => {
    if (!myId || proposing) return;
    setProposing(true);

    const expiresAt = new Date(Date.now() + 90 * 1000).toISOString();

    await supabase
      .from("duels")
      .update({
        theme,
        theme_proposed_by: myId,
        theme_expires_at: expiresAt,
        status: "negotiating",
      })
      .eq("id", duelId);

    setProposing(false);
  };

  const acceptTheme = async () => {
    if (!duel?.theme || proposing) return;
    setProposing(true);

    await supabase
      .from("duels")
      .update({ status: "ready" })
      .eq("id", duelId);

    setProposing(false);
  };

  const cancelDuel = async () => {
    await supabase
      .from("duels")
      .update({ status: "cancelled" })
      .eq("id", duelId);

    router.push("/dashboard");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Connexion au duel...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div>
        <h1>Négociation vs {opponentName}</h1>
        <p>Temps restant: {timeLeft}s</p>

        {THEMES.map((t) => (
          <button key={t.id} onClick={() => proposeTheme(t.id)}>
            {t.label}
          </button>
        ))}

        <button onClick={acceptTheme}>Accepter</button>
        <button onClick={cancelDuel}>Annuler</button>
      </div>
    </main>
  );
}