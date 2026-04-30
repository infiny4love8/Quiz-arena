import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// 🔥 admin client safe
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

    // 🔍 DEBUG TEMPORAIRE
    const allCookies = cookieStore.getAll();
    console.log("🍪 NB COOKIES:", allCookies.length);
    console.log("🍪 NOMS:", allCookies.map(c => c.name));

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    console.log("🔑 URL OK:", !!url);
    console.log("🔑 ANON KEY OK:", !!anonKey);

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

    console.log("👤 SESSION:", session ? `OK - ${session.user.id}` : "NULL");

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = session.user;

    const body = await req.json();

    const fullName = body.fullName;
    const moncashNumber = body.moncashNumber;
    const amount = Number(body.amount);

    if (!fullName || !moncashNumber || !amount) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    if (isNaN(amount)) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 🔥 fetch user coins
    const { data: userData, error } = await supabaseAdmin
      .from("users")
      .select("coins")
      .eq("id", user.id)
      .single();

    if (error || !userData) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // 💰 rules
    if (amount < 250) {
      return NextResponse.json({ error: "Minimum 250 GDS" }, { status: 400 });
    }

    if (amount > userData.coins) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    // ⚡ transaction SAFE
    const newBalance = userData.coins - amount;

    // 1. update coins FIRST
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ coins: newBalance })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "Erreur update coins" }, { status: 500 });
    }

    // 2. insert request
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
      // rollback simple
      await supabaseAdmin
        .from("users")
        .update({ coins: userData.coins })
        .eq("id", user.id);

      return NextResponse.json({ error: "Erreur demande retrait" }, { status: 500 });
    }

    return NextResponse.json({ success: true, newBalance });

  } catch (err) {
    console.error("❌ WITHDRAW ERROR:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}