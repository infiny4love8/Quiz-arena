import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_WITHDRAWAL = 250;
const MAX_WITHDRAWAL = 9_999_999;
const MAX_BODY_BYTES = 2_048;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

type RateEntry = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateEntry>();

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase env manquantes");

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function isRateLimited(key: string) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count += 1;
  return false;
}

function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}

function normalizeName(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[<>/{}[\]$`"\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function comparableName(value: unknown) {
  return normalizeName(value).toLocaleLowerCase("fr");
}

function normalizeMonCashNumber(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (/^\d{8}$/.test(digits)) return digits;
  if (/^509\d{8}$/.test(digits)) return digits.slice(3);
  return null;
}

function isValidPersonName(value: string) {
  return value.length >= 3 && value.length <= 60 && /^[\p{L}\p{M} .'-]+$/u.test(value);
}

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(req.url).origin;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) {
      return jsonResponse({ error: "Origine de requête refusée" }, 403);
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return jsonResponse({ error: "Format de requête invalide" }, 415);
    }

    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Requête trop volumineuse" }, 413);
    }

    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return jsonResponse({ error: "Config serveur invalide" }, 500);
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
      return jsonResponse({ error: "Non autorisé" }, 401);
    }

    cleanupRateLimitStore();
    if (isRateLimited(user.id)) {
      return jsonResponse(
        { error: "Trop de demandes de retrait. Réessaie dans quelques minutes." },
        429
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "JSON invalide" }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse({ error: "Données invalides" }, 400);
    }

    const input = body as Record<string, unknown>;
    const allowedKeys = new Set(["fullName", "moncashNumber", "amount"]);

    if (Object.keys(input).some((key) => !allowedKeys.has(key))) {
      return jsonResponse({ error: "Champs non autorisés dans la requête" }, 400);
    }

    const fullName = normalizeName(input.fullName);
    const moncashNumber = normalizeMonCashNumber(input.moncashNumber);
    const amount = Number(input.amount);

    if (!isValidPersonName(fullName) || !moncashNumber || !Number.isSafeInteger(amount)) {
      return jsonResponse({ error: "Informations invalides" }, 400);
    }

    if (amount < MIN_WITHDRAWAL) {
      return jsonResponse({ error: `Minimum ${MIN_WITHDRAWAL} GDS` }, 400);
    }

    if (amount > MAX_WITHDRAWAL) {
      return jsonResponse({ error: "Montant trop élevé" }, 400);
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: userData, error: profileError } = await supabaseAdmin
      .from("users")
      .select("coins, full_name, moncash_number")
      .eq("id", user.id)
      .single();

    if (profileError || !userData) {
      return jsonResponse({ error: "Utilisateur introuvable" }, 404);
    }

    const registeredName = comparableName(userData.full_name);
    const submittedName = comparableName(fullName);
    const registeredMoncash = normalizeMonCashNumber(userData.moncash_number);

    if (
      !registeredName ||
      registeredName !== submittedName ||
      !registeredMoncash ||
      registeredMoncash !== moncashNumber
    ) {
      return jsonResponse(
        {
          error:
            "Le nom ou le numéro MonCash ne correspond pas à ton profil. Contacte le support pour effectuer une modification.",
        },
        400
      );
    }

    const recentThreshold = new Date(Date.now() - 60_000).toISOString();
    const { data: recentRequest, error: recentRequestError } = await supabaseAdmin
      .from("withdraw_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .eq("amount", amount)
      .gte("created_at", recentThreshold)
      .limit(1)
      .maybeSingle();

    if (recentRequestError) {
      console.error("WITHDRAW RECENT REQUEST CHECK ERROR:", recentRequestError);
      return jsonResponse({ error: "Impossible de vérifier la demande" }, 500);
    }

    if (recentRequest) {
      return jsonResponse(
        { error: "Une demande identique vient déjà d’être envoyée. Vérifie avant de recommencer." },
        409
      );
    }

    const currentCoins = Number(userData.coins) || 0;
    if (!Number.isSafeInteger(currentCoins) || currentCoins < 0) {
      return jsonResponse({ error: "Solde du compte invalide" }, 500);
    }

    if (amount > currentCoins) {
      return jsonResponse({ error: "Solde insuffisant" }, 400);
    }

    const newBalance = currentCoins - amount;

    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from("users")
      .update({ coins: newBalance })
      .eq("id", user.id)
      .eq("coins", currentCoins)
      .select("id");

    if (updateError) {
      console.error("WITHDRAW UPDATE ERROR:", updateError);
      return jsonResponse({ error: "Erreur lors de la mise à jour du solde" }, 500);
    }

    if (!updatedRows || updatedRows.length !== 1) {
      return jsonResponse(
        { error: "Ton solde a changé entre-temps. Actualise puis réessaie." },
        409
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
      const { data: rollbackRows, error: rollbackError } = await supabaseAdmin
        .from("users")
        .update({ coins: currentCoins })
        .eq("id", user.id)
        .eq("coins", newBalance)
        .select("id");

      if (rollbackError || !rollbackRows || rollbackRows.length !== 1) {
        console.error("CRITICAL WITHDRAW ROLLBACK ERROR:", {
          rollbackError,
          userId: user.id,
          amount,
          currentCoins,
          newBalance,
        });
      }

      console.error("WITHDRAW INSERT ERROR:", insertError);
      return jsonResponse({ error: "Erreur lors de la création du retrait" }, 500);
    }

    return jsonResponse({ success: true, newBalance });
  } catch (error) {
    console.error("WITHDRAW ERROR:", error);
    return jsonResponse({ error: "Erreur serveur" }, 500);
  }
}