import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

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

  return createClient(
    url,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function GET() {
  try {
    // ========================================================
    // 1. AUTHENTIFICATION DE L'UTILISATEUR
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

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Non autorisé.",
        },
        {
          status: 401,
        }
      );
    }

    // ========================================================
    // 2. VÉRIFICATION ADMIN
    //
    // Mets TON UUID Supabase dans :
    // CONTROL_CENTER_ADMIN_ID
    //
    // Exemple dans .env.local :
    //
    // CONTROL_CENTER_ADMIN_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    //
    // ========================================================

    const adminId =
      process.env
        .CONTROL_CENTER_ADMIN_ID;

    if (!adminId) {
      console.error(
        "CONTROL_CENTER_ADMIN_ID manquant"
      );

      return NextResponse.json(
        {
          error:
            "Configuration admin manquante.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      user.id !== adminId
    ) {
      console.warn(
        "CONTROL CENTER ACCESS DENIED:",
        user.id
      );

      return NextResponse.json(
        {
          error:
            "Accès refusé.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // 3. SUPABASE SERVICE ROLE
    // ========================================================

    const supabaseAdmin =
      getSupabaseAdmin();

    // ========================================================
    // 4. RÉCUPÉRER LES DONNÉES DU CONTROL CENTER
    // ========================================================

    const {
      data,
      error,
    } =
      await supabaseAdmin.rpc(
        "get_control_center_today"
      );

    if (error) {
      console.error(
        "CONTROL CENTER RPC ERROR:",
        {
          message:
            error.message,

          details:
            error.details,

          hint:
            error.hint,

          code:
            error.code,
        }
      );

      return NextResponse.json(
        {
          error:
            "Impossible de charger le Control Center.",

          code:
            error.code ?? null,
        },
        {
          status: 500,
        }
      );
    }

    // ========================================================
    // 5. ANTI-CACHE
    //
    // Important :
    // on veut les chiffres actuels, pas une ancienne réponse
    // mise en cache par Next/Vercel.
    // ========================================================

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma:
            "no-cache",

          Expires:
            "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "CONTROL CENTER API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erreur serveur.",
      },
      {
        status: 500,
      }
    );
  }
}