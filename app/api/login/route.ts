import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────
// RATE LIMITING (en mémoire, même logique que /api/register)
//
// Limite: 8 tentatives / 10 minutes / IP.
// Un peu plus permissif que l'inscription car un utilisateur légitime
// peut se tromper de mot de passe plusieurs fois de suite.
//
// ⚠️ Même limite connue qu'ailleurs: compteur par instance serverless,
// repart à zéro sur cold start. Suffisant pour freiner un bruteforce
// basique sans ajouter d'infra externe (Redis/Upstash).
// ─────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 8;

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

function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(ip);
  }
}

// Ne jamais renvoyer error.message brut: certains messages Supabase
// (ex: "Email not confirmed") confirment qu'un email existe déjà,
// ce qui facilite l'énumération de comptes. On mappe vers un message
// unique et neutre pour tous les cas d'échec d'identifiants.
function safeLoginErrorMessage(): string {
  return "Email ou mot de passe incorrect.";
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
    const { email, password } = body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { message: "Email et mot de passe requis" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("LOGIN ERROR:", error.message);
      return NextResponse.json({ message: safeLoginErrorMessage() }, { status: 401 });
    }

    // On ne renvoie que ce dont le client a besoin, pas l'objet user complet
    return NextResponse.json({
      message: "Connexion réussie",
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    });
  } catch (err) {
    console.error("UNEXPECTED LOGIN ERROR:", err);
    return NextResponse.json(
      { message: "Une erreur est survenue. Réessaie plus tard." },
      { status: 500 },
    );
  }
}