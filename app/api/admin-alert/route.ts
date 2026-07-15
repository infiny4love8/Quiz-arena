import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }

  return value;
}

function getSupabaseAdmin() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function getSupabaseAuthClient() {
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!anonKey) {
    throw new Error(
      "Variable d'environnement manquante : NEXT_PUBLIC_SUPABASE_ANON_KEY ou SUPABASE_ANON_KEY"
    );
  }

  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!accessToken) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const supabaseAuth = getSupabaseAuthClient();

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Session invalide" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const requestId = String(body?.requestId ?? "").trim();
    const alertType = String(body?.alertType ?? "").trim();

    if (!requestId || alertType !== "deposit") {
      return NextResponse.json(
        { error: "Données invalides" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: deposit, error: depositError } = await supabaseAdmin
      .from("deposits")
      .select("id,user_id,amount,type,status,created_at")
      .eq("id", requestId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();

    if (depositError || !deposit) {
      return NextResponse.json(
        { error: "Demande introuvable" },
        { status: 404 }
      );
    }

    const adminEmail = getRequiredEnv("ADMIN_ALERT_EMAIL");
    const fromEmail = getRequiredEnv("RESEND_FROM_EMAIL");
    const resend = new Resend(getRequiredEnv("RESEND_API_KEY"));

    const requestLabel =
      deposit.type === "tickets"
        ? "achat de tickets sponsorisés"
        : "achat de coins";

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: "🔔 Nouvelle demande d'achat Zonarena",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;background:#0d0f14;color:#ffffff;border-radius:14px">
          <h2 style="margin:0 0 16px;color:#facc15">
            Nouvelle demande reçue
          </h2>

          <p style="font-size:16px;line-height:1.6">
            Un utilisateur vient d'effectuer une demande d'${requestLabel}.
          </p>

          <div style="margin:20px 0;padding:16px;background:#16181f;border-radius:10px">
            <p style="margin:0 0 8px">
              <strong>Type :</strong> ${requestLabel}
            </p>

            <p style="margin:0">
              <strong>Montant :</strong> ${deposit.amount} GDS
            </p>
          </div>

          <p style="font-size:14px;line-height:1.5;color:#a1a1aa">
            Connecte-toi à Supabase pour vérifier le screenshot MonCash et traiter la demande.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("ADMIN EMAIL ERROR:", emailError);

      return NextResponse.json(
        { error: "Notification non envoyée" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ADMIN ALERT ERROR:", error);

    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}