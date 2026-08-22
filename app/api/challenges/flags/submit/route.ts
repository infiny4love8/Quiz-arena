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

type SubmittedAnswer = {
  questionId: string;
  selected: string | null;
};

const POINTS_PER_CORRECT = 100;
const QUESTION_LIMIT = 10;

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
    // 1. AUTHENTIFICATION
    // ========================================================

    const cookieStore = await cookies();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const anonKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return NextResponse.json(
        {
          error: "Configuration Supabase invalide.",
        },
        {
          status: 500,
        }
      );
    }

    const supabaseAuth = createServerClient(
      url,
      anonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Utilisateur non connecté.",
        },
        {
          status: 401,
        }
      );
    }

    // ========================================================
    // 2. DONNÉES ENVOYÉES
    // ========================================================

    const body = await req.json();

    const attemptId = String(
      body.attemptId || ""
    ).trim();

    const answers = Array.isArray(body.answers)
      ? (body.answers as SubmittedAnswer[])
      : [];

    if (!attemptId) {
      return NextResponse.json(
        {
          error: "Tentative manquante.",
        },
        {
          status: 400,
        }
      );
    }

    if (answers.length !== QUESTION_LIMIT) {
      return NextResponse.json(
        {
          error: `Il faut exactement ${QUESTION_LIMIT} réponses.`,
        },
        {
          status: 400,
        }
      );
    }

    const supabaseAdmin =
      getSupabaseAdmin();

    // ========================================================
    // 3. RÉCUPÉRER LA TENTATIVE
    // ========================================================

    const {
      data: attempt,
      error: attemptError,
    } = await supabaseAdmin
      .from("challenge_attempts")
      .select(
        `
          id,
          user_id,
          game_key,
          level_name,
          result,
          question_ids,
          target_score,
          started_at
        `
      )
      .eq("id", attemptId)
      .eq("user_id", user.id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        {
          error: "Tentative introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    if (attempt.game_key !== "flags") {
      return NextResponse.json(
        {
          error:
            "Cette tentative ne correspond pas au jeu Drapeaux.",
        },
        {
          status: 400,
        }
      );
    }

    if (attempt.result !== "started") {
      return NextResponse.json(
        {
          error:
            "Cette tentative est déjà terminée.",
        },
        {
          status: 409,
        }
      );
    }

    // ========================================================
    // 4. QUESTIONS OFFICIELLES
    // ========================================================

    const questionIds =
      Array.isArray(attempt.question_ids)
        ? attempt.question_ids.map(String)
        : [];

    if (
      questionIds.length !== QUESTION_LIMIT
    ) {
      return NextResponse.json(
        {
          error:
            "Questions de la tentative invalides.",
        },
        {
          status: 500,
        }
      );
    }

    const questionBank =
      flagsQuestions as FlagQuestion[];

    const questionMap = new Map(
      questionBank.map((question) => [
        String(question.id),
        question,
      ])
    );

    // ========================================================
    // 5. PROTECTION CONTRE QUESTIONS INVENTÉES / DOUBLONS
    // ========================================================

    const submittedIds = answers.map(
      (answer) =>
        String(answer.questionId)
    );

    if (
      new Set(submittedIds).size !==
      QUESTION_LIMIT
    ) {
      return NextResponse.json(
        {
          error: "Réponses dupliquées.",
        },
        {
          status: 400,
        }
      );
    }

    for (const id of submittedIds) {
      if (!questionIds.includes(id)) {
        return NextResponse.json(
          {
            error:
              "Une question envoyée n'appartient pas à cette partie.",
          },
          {
            status: 400,
          }
        );
      }
    }

    // ========================================================
    // 6. RECALCUL DU SCORE CÔTÉ SERVEUR
    // ========================================================

    let correctAnswers = 0;

    const verifiedAnswers: {
      questionId: string;
      selected: string;
      correct: boolean;
    }[] = [];

    for (const questionId of questionIds) {
      const officialQuestion =
        questionMap.get(questionId);

      if (!officialQuestion) {
        return NextResponse.json(
          {
            error:
              "Question officielle introuvable.",
          },
          {
            status: 500,
          }
        );
      }

      const submitted =
        answers.find(
          (answer) =>
            String(answer.questionId) ===
            questionId
        );

      const selected =
        typeof submitted?.selected ===
        "string"
          ? submitted.selected
          : "";

      const correct =
        selected ===
        officialQuestion.answer;

      if (correct) {
        correctAnswers += 1;
      }

      verifiedAnswers.push({
        questionId,
        selected,
        correct,
      });
    }

    // 1 bonne réponse = 100 points.
    // 7/10 = 700
    // 8/10 = 800
    // 9/10 = 900
    // 10/10 = 1000

    const verifiedScore =
      correctAnswers *
      POINTS_PER_CORRECT;

    // ========================================================
    // 7. TEMPS RÉEL
    // ========================================================

    const startedAt = new Date(
      attempt.started_at
    ).getTime();

    const completionTimeMs = Math.max(
      0,
      Date.now() - startedAt
    );

    // ========================================================
    // 8. SETTLEMENT + PROGRESSION AUTOMATIQUE
    // ========================================================

    const {
      data: settlement,
      error: settlementError,
    } = await supabaseAdmin.rpc(
      "settle_challenge_server",
      {
        p_user_id: user.id,
        p_attempt_id: attemptId,
        p_verified_score:
          verifiedScore,
        p_correct_answers:
          correctAnswers,
        p_completion_time_ms:
          completionTimeMs,
        p_answers_data:
          verifiedAnswers,
      }
    );

    if (
      settlementError ||
      !settlement
    ) {
      console.error(
        "FLAGS SETTLEMENT ERROR:",
        settlementError
      );

      return NextResponse.json(
        {
          error:
            settlementError?.message ||
            "Impossible de terminer le défi.",
        },
        {
          status: 500,
        }
      );
    }

    // ========================================================
    // 9. RÉSULTAT
    // ========================================================

    return NextResponse.json({
      success: true,

      won: settlement.won,

      score: settlement.score,

      correctAnswers,

      targetScore:
        settlement.target_score,

      rewardGds:
        settlement.reward_gds,

      xpAwarded:
        settlement.xp_awarded,

      oldLevel:
        settlement.old_level,

      currentLevel:
        settlement.current_level,

      winsInLevel:
        settlement.wins_in_level,

      winsNeeded:
        settlement.wins_needed,

      promoted:
        settlement.promoted,
    });
  } catch (error) {
    console.error(
      "FLAGS SUBMIT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erreur serveur pendant la validation du défi.",
      },
      {
        status: 500,
      }
    );
  }
}