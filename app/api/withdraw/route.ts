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

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

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

    if (isNaN(amount)) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: userData, error } = await supabaseAdmin
      .from("users")
      .select("coins")
      .eq("id", user.id)
      .single();

    if (error || !userData) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const currentCoins = Number(userData.coins) || 0;

    if (amount < 250) {
      return NextResponse.json({ error: "Minimum 250 GDS" }, { status: 400 });
    }

    if (amount > currentCoins) {
      return NextResponse.json(
        { error: "Solde insuffisant" },
        { status: 400 }
      );
    }

    const newBalance = currentCoins - amount;

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ coins: newBalance })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Erreur update coins" },
        { status: 500 }
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
      await supabaseAdmin
        .from("users")
        .update({ coins: currentCoins })
        .eq("id", user.id);

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