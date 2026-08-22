import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import flagsQuestions from "@/data/flags.json";

type FlagQuestion = {
  id: string | number;
  question: string;
  flag: string;
  answer: string;
  options: string[];
};

const QUESTION_LIMIT = 10;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Variables Supabase serveur manquantes.");
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(req: Request) {
  try {
    // ========================================================
    // AUTH
    // ========================================================

    const cookieStore = await cookies();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return NextResponse.json(
        { error: "Configuration Supabase invalide." },
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
      return NextResponse.json(
        { error: "Utilisateur non connecté." },
        { status: 401 }
      );
    }

    // ========================================================
    // INPUT
    // ========================================================

    const body = await req.json();

    const configId = String(body.configId || "").trim();
    const paymentMethod = String(body.paymentMethod || "").trim();

    if (!configId) {
      return NextResponse.json(
        { error: "Configuration du défi manquante." },
        { status: 400 }
      );
    }

    if (paymentMethod !== "gds" && paymentMethod !== "ticket") {
      return NextResponse.json(
        { error: "Méthode de paiement invalide." },
        { status: 400 }
      );
    }

    // ========================================================
    // CHOIX DES QUESTIONS CÔTÉ SERVEUR
    // ========================================================

    const allQuestions = flagsQuestions as FlagQuestion[];

    if (allQuestions.length < QUESTION_LIMIT) {
      return NextResponse.json(
        { error: "Pas assez de questions Drapeaux." },
        { status: 500 }
      );
    }

    const selectedQuestions = shuffle(allQuestions).slice(
      0,
      QUESTION_LIMIT
    );

    const questionIds = selectedQuestions.map((q) =>
      String(q.id)
    );

    // ========================================================
    // CRÉATION FINANCIÈRE ATOMIQUE
    // ========================================================

    const supabaseAdmin = getSupabaseAdmin();

    const { data: attempt, error: attemptError } =
      await supabaseAdmin.rpc("start_challenge_server", {
        p_user_id: user.id,
        p_config_id: configId,
        p_payment_method: paymentMethod,
        p_question_ids: questionIds,
      });

    if (attemptError) {
      console.error("START FLAGS CHALLENGE:", attemptError);

      const message =
        attemptError.message ||
        "Impossible de démarrer le défi.";

      if (
        message.includes("Solde GDS insuffisant") ||
        message.includes("Tickets insuffisants") ||
        message.includes("Ticket non accepté") ||
        message.includes("n'est pas disponible")
      ) {
        return NextResponse.json(
          { error: message },
          { status: 400 }
        );
      }

      if (message.includes("déjà en cours")) {
        return NextResponse.json(
          { error: message },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }

    // ========================================================
    // VERSION PUBLIQUE DES QUESTIONS
    //
    // JAMAIS DE "answer"
    // ========================================================

    const publicQuestions = selectedQuestions.map((q) => ({
      id: String(q.id),
      question: q.question,
      flag: q.flag,
      options: shuffle(q.options),
    }));

    return NextResponse.json({
      success: true,

      attemptId: attempt.attempt_id,

      targetScore: attempt.target_score,
      rewardGds: attempt.reward_gds,

      xpWin: attempt.xp_win,
      xpLoss: attempt.xp_loss,

      paymentMethod,

      questions: publicQuestions,
    });
  } catch (error) {
    console.error("FLAGS START ERROR:", error);

    return NextResponse.json(
      { error: "Erreur serveur pendant le démarrage." },
      { status: 500 }
    );
  }
}