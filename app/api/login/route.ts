import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email et mot de passe requis" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 401 }
    );
  }

  return NextResponse.json({
    message: "Connexion réussie",
    user: data.user,
  });
}