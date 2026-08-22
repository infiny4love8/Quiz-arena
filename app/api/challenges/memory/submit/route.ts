import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type StoredRound = {
  id: number;
  items: string[];
  target: string;
  options: string[];
};

type SubmittedAnswer = {
  roundId: number;
  selected: string | null;
};

const ROUNDS = 10;
const POINTS_PER_CORRECT = 100;

function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Variables Supabase serveur manquantes."
    );
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

    const cookieStore =
      await cookies();

    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const anonKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return NextResponse.json(
        {
          error:
            "Configuration Supabase invalide.",
        },
        {
          status: 500,
        }
      );
    }

    const supabaseAuth =
      createServerClient(
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
    } =
      await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Utilisateur non connecté.",
        },
        {
          status: 401,
        }
      );
    }

    // ========================================================
    // INPUT
    // ========================================================

    const body =
      await req.json();

    const attemptId =
      String(
        body.attemptId || ""
      ).trim();

    const answers =
      Array.isArray(body.answers)
        ? (body.answers as SubmittedAnswer[])
        : [];

    if (!attemptId) {
      return NextResponse.json(
        {
          error:
            "Tentative manquante.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      answers.length !== ROUNDS
    ) {
      return NextResponse.json(
        {
          error:
            `Il faut exactement ${ROUNDS} réponses.`,
        },
        {
          status: 400,
        }
      );
    }

    const supabaseAdmin =
      getSupabaseAdmin();

    // ========================================================
    // RÉCUPÉRER TENTATIVE
    // ========================================================

    const {
      data: attempt,
      error: attemptError,
    } = await supabaseAdmin
      .from(
        "challenge_attempts"
      )
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
      .eq(
        "id",
        attemptId
      )
      .eq(
        "user_id",
        user.id
      )
      .single();

    if (
      attemptError ||
      !attempt
    ) {
      return NextResponse.json(
        {
          error:
            "Tentative introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      attempt.game_key !==
      "memory"
    ) {
      return NextResponse.json(
        {
          error:
            "Cette tentative ne correspond pas à Memory.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      attempt.result !==
      "started"
    ) {
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
    // ROUNDS OFFICIELS
    // ========================================================

    const storedRounds =
      Array.isArray(
        attempt.question_ids
      )
        ? (attempt.question_ids as StoredRound[])
        : [];

    if (
      storedRounds.length !==
      ROUNDS
    ) {
      return NextResponse.json(
        {
          error:
            "Rounds Memory invalides.",
        },
        {
          status: 500,
        }
      );
    }

    // ========================================================
    // ANTI DOUBLON / ROUND INVENTÉ
    // ========================================================

    const submittedIds =
      answers.map(
        (answer) =>
          Number(
            answer.roundId
          )
      );

    if (
      new Set(
        submittedIds
      ).size !== ROUNDS
    ) {
      return NextResponse.json(
        {
          error:
            "Réponses dupliquées.",
        },
        {
          status: 400,
        }
      );
    }

    const officialIds =
      storedRounds.map(
        (round) =>
          Number(round.id)
      );

    for (
      const roundId of submittedIds
    ) {
      if (
        !officialIds.includes(
          roundId
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Round non autorisé.",
          },
          {
            status: 400,
          }
        );
      }
    }

    // ========================================================
    // CALCUL OFFICIEL
    // ========================================================

    let correctAnswers = 0;

    const verifiedAnswers: {
      roundId: number;
      selected: string;
      correct: boolean;
    }[] = [];

    for (
      const round of storedRounds
    ) {
      const submitted =
        answers.find(
          (answer) =>
            Number(
              answer.roundId
            ) ===
            Number(round.id)
        );

      const selected =
        typeof submitted?.selected ===
        "string"
          ? submitted.selected
          : "";

      const correct =
        selected ===
        round.target;

      if (correct) {
        correctAnswers += 1;
      }

      verifiedAnswers.push({
        roundId: round.id,
        selected,
        correct,
      });
    }

    const verifiedScore =
      correctAnswers *
      POINTS_PER_CORRECT;

    // ========================================================
    // TEMPS SERVEUR
    // ========================================================

    const startedAt =
      new Date(
        attempt.started_at
      ).getTime();

    const completionTimeMs =
      Math.max(
        0,
        Date.now() -
          startedAt
      );

    // ========================================================
    // PAIEMENT + XP + PROGRESSION
    // ========================================================

    const {
      data: settlement,
      error: settlementError,
    } =
      await supabaseAdmin.rpc(
        "settle_challenge_server",
        {
          p_user_id:
            user.id,

          p_attempt_id:
            attemptId,

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
        "MEMORY SETTLEMENT ERROR:",
        settlementError
      );

      return NextResponse.json(
        {
          error:
            settlementError?.message ||
            "Impossible de terminer Memory.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,

      won:
        settlement.won,

      score:
        settlement.score,

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
      "MEMORY SUBMIT SERVER ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erreur serveur pendant la validation de Memory.",
      },
      {
        status: 500,
      }
    );
  }
}