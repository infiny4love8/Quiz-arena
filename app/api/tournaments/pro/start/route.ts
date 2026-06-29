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

const gameRoutes: Record<string, string> = {
  drapeaux: "/games/pro/flags",
  memory: "/games/pro/memory",
  memory_cards: "/games/pro/cards",
  tank_arena: "/games/pro/tank",
};

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return NextResponse.json(
        { error: "Config serveur invalide" },
        { status: 500 }
      );
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

    if (!tournamentId) {
      return NextResponse.json({ error: "Tournoi manquant" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: tournament, error: tournamentError } = await supabaseAdmin
      .from("tournaments_pro")
      .select("id,game_type,status")
      .eq("id", tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: "Tournoi introuvable" }, { status: 404 });
    }

    if (tournament.status !== "active") {
      return NextResponse.json({ error: "Ce tournoi n'est pas actif" }, { status: 400 });
    }

    const { data: entry, error: entryError } = await supabaseAdmin
      .from("tournament_pro_entries")
      .select("id,game_token,game_started_at,score_submitted_at")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .single();

    if (entryError || !entry) {
      return NextResponse.json(
        { error: "Inscription au tournoi introuvable" },
        { status: 403 }
      );
    }

    if (entry.score_submitted_at) {
      return NextResponse.json({ error: "Score déjà soumis" }, { status: 400 });
    }

    if (entry.game_started_at) {
      return NextResponse.json({ error: "Challenge déjà commencé" }, { status: 400 });
    }

    const gameToken = entry.game_token || crypto.randomUUID();

    const { error: updateError } = await supabaseAdmin
      .from("tournament_pro_entries")
      .update({
        game_started_at: new Date().toISOString(),
        game_token: gameToken,
      })
      .eq("id", entry.id)
      .is("game_started_at", null)
      .is("score_submitted_at", null);

    if (updateError) {
      return NextResponse.json(
        { error: "Impossible de démarrer le challenge" },
        { status: 500 }
      );
    }

    const baseRoute = gameRoutes[tournament.game_type];

    if (!baseRoute) {
      return NextResponse.json(
        { error: `Jeu non supporté: ${tournament.game_type}` },
        { status: 400 }
      );
    }

    const gameUrl = `${baseRoute}?mode=pro&tournamentId=${tournamentId}&token=${gameToken}`;

    return NextResponse.json({
      success: true,
      gameUrl,
      gameToken,
      gameType: tournament.game_type,
    });
  } catch (err) {
    console.error("PRO START ERROR:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}