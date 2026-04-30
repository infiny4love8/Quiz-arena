import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    // 🔥 IMPORTANT: session ONLY (plus fiable)
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié", coins: 0 },
        { status: 401 }
      );
    }

    const user = session.user;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Utilisateur introuvable", coins: 0 },
        { status: 404 }
      );
    }

    return NextResponse.json({
      coins: data.coins,
      tickets: data.tickets,
      level: data.level,
      ranking: data.ranking,
      cashback: data.cashback,
      full_name: data.full_name,
    });

  } catch (err) {
    console.error("API USER ERROR:", err);

    return NextResponse.json(
      { error: "Erreur serveur", coins: 0 },
      { status: 500 }
    );
  }
}