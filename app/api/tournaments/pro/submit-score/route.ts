import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase env manquantes");
  }

  return createClient(url, serviceKey);
}

function isValidScore(score: number) {
  return Number.isInteger(score) && score >= 0 && score <= 1000000;
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return NextResponse.json({ error: "Config serveur invalide" }, { status: 500 });
    }

    const supabaseAuth = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();

    const tournamentId = String(body.tournamentId || "").trim();
    const gameToken = String(body.gameToken || "").trim();
    const score = Number(body.score);
    const completionTimeMs =
      body.completionTimeMs !== undefined && body.completionTimeMs !== null
        ? Number(body.completionTimeMs)
        : null;

    if (!tournamentId || !gameToken) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    if (!isValidScore(score)) {
      return NextResponse.json({ error: "Score invalide" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: tournament, error: tournamentError } = await supabaseAdmin
      .from("tournaments_pro")
      .select("id,status,starts_at,play_window")
      .eq("id", tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: "Tournoi introuvable" }, { status: 404 });
    }

    if (tournament.status !== "active") {
      return NextResponse.json({ error: "Tournoi fermé" }, { status: 400 });
    }

    const { data: entry, error: entryError } = await supabaseAdmin
      .from("tournament_pro_entries")
      .select("id,game_token,game_started_at,score_submitted_at")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .single();

    if (entryError || !entry) {
      return NextResponse.json({ error: "Participation introuvable" }, { status: 403 });
    }

    if (!entry.game_started_at) {
      return NextResponse.json({ error: "Challenge non commencé" }, { status: 400 });
    }

    if (entry.score_submitted_at) {
      return NextResponse.json({ error: "Score déjà soumis" }, { status: 400 });
    }

    if (entry.game_token !== gameToken) {
      return NextResponse.json({ error: "Token invalide" }, { status: 403 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("tournament_pro_entries")
      .update({
        score,
        completion_time_ms: completionTimeMs,
        score_submitted_at: new Date().toISOString(),
      })
      .eq("id", entry.id)
      .is("score_submitted_at", null);

    if (updateError) {
      return NextResponse.json({ error: "Erreur sauvegarde score" }, { status: 500 });
    }

    let remainingText = "Calcul en cours";
    if (tournament.starts_at && tournament.play_window) {
      const endTime =
        new Date(tournament.starts_at).getTime() + Number(tournament.play_window) * 60 * 1000;
      const diff = Math.max(0, endTime - Date.now());
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      remainingText =
        diff <= 0 ? "Le concours est terminé" : `${minutes} min ${seconds} sec restantes`;
    }

    return NextResponse.json({
      success: true,
      score,
      remainingText,
      message: `Bravo ! Ton score de ${score} points est enregistré. Il reste ${remainingText} avant la fin du concours.`,
    });
  } catch (err) {
    console.error("PRO SUBMIT SCORE ERROR:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}