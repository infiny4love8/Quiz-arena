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

// ─────────────────────────────────────────────────────────────
// RATE LIMITING (en mémoire, même logique que /api/register et
// /api/login) — mais ici par utilisateur plutôt que par IP, car
// la route est déjà authentifiée (session obligatoire) et c'est
// un compte précis qu'on veut protéger d'un spam de demandes de
// retrait, qu'il vienne d'un script ou d'une IP partagée.
//
// Limite: 3 tentatives / 10 minutes / utilisateur.
//
// ⚠️ Même limite connue qu'ailleurs: compteur par instance
// serverless, repart à zéro sur cold start. Suffisant pour freiner
// un abus basique sans ajouter d'infra externe (Redis/Upstash) ni
// toucher au schéma Supabase.
// ─────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 3;

type RateEntry = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateEntry>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count += 1;
  return false;
}

function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Certains projets Supabase/Next.js nomment cette variable
    // NEXT_PUBLIC_SUPABASE_ANON_KEY plutôt que SUPABASE_ANON_KEY.
    // On accepte les deux noms pour éviter un 500 silencieux si le
    // nom exact diffère de ce qui est dans ton .env — à vérifier
    // de ton côté, mais ça ne peut pas casser ce qui marchait avant.
    const anonKey =
      process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
      data: { session },
    } = await supabaseAuth.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = session.user;

    cleanupRateLimitStore();
    if (isRateLimited(user.id)) {
      return NextResponse.json(
        { error: "Trop de demandes de retrait. Réessaie dans quelques minutes." },
        { status: 429 }
      );
    }

    const body = await req.json();

    const cleanText = (value: unknown) =>
      String(value || "")
        .replace(/[<>/{}[\]$`"'\\]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60);

    const cleanPhone = (value: unknown) =>
      String(value || "")
        .replace(/[^\d+]/g, "")
        .trim()
        .slice(0, 15);

    const fullName = cleanText(body.fullName);
    const moncashNumber = cleanPhone(body.moncashNumber);
    const amount = Number(body.amount);

    if (!fullName || !moncashNumber || !amount) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    if (fullName.length < 3) {
      return NextResponse.json(
        { error: "Nom complet invalide" },
        { status: 400 }
      );
    }

    if (moncashNumber.length < 8) {
      return NextResponse.json(
        { error: "Numéro MonCash invalide" },
        { status: 400 }
      );
    }

    // Le montant doit être un entier positif — évite les soldes avec
    // décimales bizarres (250.4 GDS, etc.)
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    if (amount < 250) {
      return NextResponse.json({ error: "Minimum 250 GDS" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // On récupère aussi le nom et le numéro MonCash enregistrés à
    // l'inscription — pas de nouvelle colonne, ces champs existent
    // déjà dans la table users.
    const { data: userData, error } = await supabaseAdmin
      .from("users")
      .select("coins, full_name, moncash_number")
      .eq("id", user.id)
      .single();

    if (error || !userData) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Le retrait doit correspondre au profil enregistré — empêche un
    // compte compromis (session volée) de rediriger l'argent vers un
    // autre numéro MonCash que celui du titulaire du compte.
    const registeredName = String(userData.full_name || "").trim().toLowerCase();
    const registeredMoncash = String(userData.moncash_number || "").trim();

    if (
      registeredName !== fullName.trim().toLowerCase() ||
      registeredMoncash !== moncashNumber
    ) {
      return NextResponse.json(
        {
          error:
            "Le nom ou le numéro MonCash ne correspond pas à ton profil. Contacte le support pour retirer vers un autre numéro.",
        },
        { status: 400 }
      );
    }

    const currentCoins = Number(userData.coins) || 0;

    if (amount > currentCoins) {
      return NextResponse.json(
        { error: "Solde insuffisant" },
        { status: 400 }
      );
    }

    const newBalance = currentCoins - amount;

    // ── Déduction atomique par verrouillage optimiste (CAS) ──
    // On ne fait pas juste "update coins" après avoir lu la valeur:
    // on conditionne l'update au fait que coins vaut ENCORE
    // currentCoins au moment de l'écriture. Si une autre requête a
    // déjà modifié le solde entre notre lecture et notre écriture
    // (double-clic, requête rejouée, script), 0 ligne est affectée
    // et on renvoie une erreur au lieu de déduire deux fois le même
    // montant. Aucune fonction SQL/RPC à ajouter côté Supabase.
    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from("users")
      .update({ coins: newBalance })
      .eq("id", user.id)
      .eq("coins", currentCoins)
      .select("id");

    if (updateError) {
      return NextResponse.json(
        { error: "Erreur update coins" },
        { status: 500 }
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      // Le solde a changé entre la lecture et l'écriture (ex: une
      // autre demande de retrait traitée entre-temps) — on refuse
      // plutôt que de risquer une double déduction.
      return NextResponse.json(
        { error: "Ton solde a changé entre-temps, réessaie." },
        { status: 409 }
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from("withdraw_requests")
      .insert({
        user_id: user.id,
        full_name: fullName,
        moncash_number: moncashNumber,
        amount,
        status: "pending",
      });

    if (insertError) {
      // Rollback lui aussi conditionné (CAS): on ne remet
      // currentCoins que si coins vaut encore newBalance, pour ne
      // pas écraser une opération survenue entre-temps.
      const { error: rollbackError } = await supabaseAdmin
        .from("users")
        .update({ coins: currentCoins })
        .eq("id", user.id)
        .eq("coins", newBalance);

      if (rollbackError) {
        console.error("❌ WITHDRAW ROLLBACK ERROR:", rollbackError, "userId:", user.id);
      }

      return NextResponse.json(
        { error: "Erreur demande retrait" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, newBalance });
  } catch (err) {
    console.error("❌ WITHDRAW ERROR:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}