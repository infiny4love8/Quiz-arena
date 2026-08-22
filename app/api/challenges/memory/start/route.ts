import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const ROUNDS = 10;

const EMOJIS = [
  "🍎", "🍌", "🍇", "🍉", "🍓", "🍍",
  "🚗", "✈️", "🚀", "🚲", "🛵", "🚁",
  "🐶", "🐱", "🦁", "🐼", "🐸", "🦊",
  "⭐", "🔥", "💎", "⚡", "🎯", "🏆",
];

type PrivateRound = {
  id: number;
  items: string[];
  target: string;
  options: string[];
};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function createRounds(): PrivateRound[] {
  return Array.from(
    { length: ROUNDS },
    (_, index) => {
      const items = shuffle(EMOJIS).slice(0, 6);

      const target =
        items[
          Math.floor(
            Math.random() * items.length
          )
        ];

      const wrongOptions = shuffle(
        EMOJIS.filter(
          (emoji) => !items.includes(emoji)
        )
      ).slice(0, 3);

      const options = shuffle([
        target,
        ...wrongOptions,
      ]);

      return {
        id: index + 1,
        items,
        target,
        options,
      };
    }
  );
}

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

    const cookieStore = await cookies();

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

    const body = await req.json();

    const configId = String(
      body.configId || ""
    ).trim();

    const paymentMethod = String(
      body.paymentMethod || ""
    ).trim();

    if (!configId) {
      return NextResponse.json(
        {
          error:
            "Configuration du défi manquante.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      paymentMethod !== "gds" &&
      paymentMethod !== "ticket"
    ) {
      return NextResponse.json(
        {
          error:
            "Méthode de paiement invalide.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // ROUNDS CRÉÉS CÔTÉ SERVEUR
    // ========================================================

    const privateRounds =
      createRounds();

    // ========================================================
    // START FINANCIER
    // ========================================================

    const supabaseAdmin =
      getSupabaseAdmin();

    const {
      data: attempt,
      error: attemptError,
    } = await supabaseAdmin.rpc(
      "start_challenge_server",
      {
        p_user_id: user.id,
        p_config_id: configId,
        p_payment_method:
          paymentMethod,

        // On stocke les rounds COMPLETS
        // côté serveur dans challenge_attempts.
        p_question_ids:
          privateRounds,
      }
    );

    if (attemptError) {
      console.error(
        "MEMORY START ERROR:",
        attemptError
      );

      const message =
        attemptError.message ||
        "Impossible de démarrer le défi.";

      if (
        message.includes(
          "Solde GDS insuffisant"
        ) ||
        message.includes(
          "Tickets insuffisants"
        ) ||
        message.includes(
          "Ticket non accepté"
        ) ||
        message.includes(
          "n'est pas disponible"
        ) ||
        message.includes(
          "niveau actuel"
        )
      ) {
        return NextResponse.json(
          {
            error: message,
          },
          {
            status: 400,
          }
        );
      }

      if (
        message.includes(
          "déjà en cours"
        )
      ) {
        return NextResponse.json(
          {
            error: message,
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
          error: message,
        },
        {
          status: 500,
        }
      );
    }

    // ========================================================
    // VERSION PUBLIQUE
    //
    // NE JAMAIS ENVOYER target.
    // ========================================================

    const publicRounds =
      privateRounds.map((round) => ({
        id: round.id,
        items: round.items,
        options: round.options,
      }));

    return NextResponse.json({
      success: true,

      attemptId:
        attempt.attempt_id,

      level:
        attempt.level_name,

      targetScore:
        attempt.target_score,

      rewardGds:
        attempt.reward_gds,

      xpWin:
        attempt.xp_win,

      xpLoss:
        attempt.xp_loss,

      winsInLevel:
        attempt.wins_in_level,

      winsNeeded:
        attempt.wins_needed,

      rounds:
        publicRounds,
    });
  } catch (error) {
    console.error(
      "MEMORY START SERVER ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erreur serveur pendant le démarrage de Memory.",
      },
      {
        status: 500,
      }
    );
  }
}