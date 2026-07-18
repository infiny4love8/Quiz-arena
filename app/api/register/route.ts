import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service role = contourne le RLS, uniquement côté serveur
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← clé service role, jamais exposée au client
);

// ─────────────────────────────────────────────────────────────
// RATE LIMITING (en mémoire, sans nouvelle table/infra)
//
// Limite: 5 tentatives d'inscription / 15 minutes / IP.
//
// ⚠️ Limite connue: ce compteur vit dans la mémoire de l'instance
// serverless. Sur Vercel/Next en prod, plusieurs instances peuvent
// tourner en parallèle (donc la limite réelle peut être un peu plus
// haute que 5 dans de rares cas), et le compteur repart à zéro à
// chaque redémarrage à froid (cold start). C'est la meilleure option
// SANS ajouter d'infra externe (Redis/Upstash) ni toucher au schéma
// Supabase. Si le farming de comptes devient un vrai problème, la
// suite logique est un rate limit partagé (ex: Upstash Redis) — mais
// ce n'est pas nécessaire pour bloquer l'abus basique aujourd'hui.
// ─────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5;

type RateEntry = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateEntry>();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count += 1;
  return false;
}

// Purge périodique légère pour éviter que la Map ne grossisse indéfiniment
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(ip);
  }
}

// ─────────────────────────────────────────────────────────────
// Messages d'erreur "safe" à renvoyer au client.
// On ne renvoie JAMAIS authError.message / dbError.message bruts:
// certains messages Supabase peuvent exposer des détails internes
// (contraintes, structure de table). On mappe seulement les cas
// utiles à l'utilisateur, tout le reste devient un message générique.
// ─────────────────────────────────────────────────────────────
function safeAuthErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "Cet email est déjà utilisé.";
  }
  if (lower.includes("password")) {
    return "Le mot de passe ne respecte pas les critères requis (6 caractères minimum).";
  }
  if (lower.includes("email")) {
    return "Adresse email invalide.";
  }
  return "Impossible de créer le compte. Vérifie tes informations et réessaie.";
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    cleanupRateLimitStore();
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { message: "Trop de tentatives. Réessaie dans quelques minutes." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { fullName, moncashNumber, whatsappNumber, age, email, password } = body;

    if (!email || !password || !fullName || !moncashNumber || !whatsappNumber || !age) {
      return NextResponse.json({ message: "Champs requis manquants" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { message: "Le mot de passe doit contenir au moins 6 caractères" },
        { status: 400 },
      );
    }

    const cleanName = String(fullName).trim().toLowerCase();
    const cleanMoncash = String(moncashNumber).trim();
    const cleanWhatsapp = String(whatsappNumber).trim();

    // Vérifie le nom, le numéro MonCash et le numéro WhatsApp déjà pris.
    // (mitigation multi-comptes/farming de tickets — n'utilise que des
    // colonnes déjà existantes, aucun changement de schéma nécessaire)
    const { data: existingUsers, error: lookupError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, moncash_number, whatsapp_number")
      .or(
        `full_name.eq.${cleanName},moncash_number.eq.${cleanMoncash},whatsapp_number.eq.${cleanWhatsapp}`,
      );

    if (lookupError) {
      console.error("LOOKUP ERROR:", lookupError);
      return NextResponse.json(
        { message: "Une erreur est survenue. Réessaie plus tard." },
        { status: 500 },
      );
    }

    if (existingUsers && existingUsers.length > 0) {
      const nameTaken = existingUsers.some((u) => u.full_name === cleanName);
      const moncashTaken = existingUsers.some((u) => u.moncash_number === cleanMoncash);
      const whatsappTaken = existingUsers.some((u) => u.whatsapp_number === cleanWhatsapp);

      if (nameTaken) {
        return NextResponse.json({ message: "Nom déjà utilisé, choisis-en un autre" }, { status: 400 });
      }
      if (moncashTaken) {
        return NextResponse.json({ message: "Ce numéro MonCash est déjà associé à un compte" }, { status: 400 });
      }
      if (whatsappTaken) {
        return NextResponse.json({ message: "Ce numéro WhatsApp est déjà associé à un compte" }, { status: 400 });
      }
    }

    // Créer le compte auth
    const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // garde la confirmation email
    });

    if (authError) {
      console.error("AUTH ERROR:", authError);
      return NextResponse.json({ message: safeAuthErrorMessage(authError.message) }, { status: 400 });
    }

    const userId = data.user?.id;
    if (!userId) {
      console.error("AUTH ERROR: pas d'id utilisateur retourné", data);
      return NextResponse.json({ message: "Impossible de créer le compte. Réessaie." }, { status: 500 });
    }

    // Insert profil complet — service role bypass RLS, pas de conflit trigger
    const { error: dbError } = await supabaseAdmin.from("users").insert([{
      id: userId,
      full_name: cleanName,
      moncash_number: cleanMoncash,
      whatsapp_number: cleanWhatsapp,
      age: Number(age),
      tickets: 5,
    }]);

    if (dbError) {
      console.error("DB ERROR:", dbError);

      // Compte auth créé mais profil non inséré → on nettoie pour éviter
      // un compte orphelin (email "pris" à vie sans profil fonctionnel)
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (cleanupError) {
        console.error("CLEANUP ERROR (orphan auth user not deleted):", cleanupError, "userId:", userId);
      }

      return NextResponse.json(
        { message: "Impossible de finaliser l'inscription. Réessaie." },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Compte créé avec succès" });
  } catch (err) {
    console.error("UNEXPECTED ERROR:", err);
    return NextResponse.json({ message: "Une erreur est survenue. Réessaie plus tard." }, { status: 500 });
  }
}