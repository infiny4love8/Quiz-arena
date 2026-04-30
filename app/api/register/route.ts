import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();

  const {
    fullName,
    moncashNumber,
    whatsappNumber,
    age,
    email,
    password,
  } = body;

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email et mot de passe requis" },
      { status: 400 }
    );
  }

  // ✅ 1. Création user sécurisé
  const { data, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return NextResponse.json(
      { message: authError.message },
      { status: 400 }
    );
  }

  const userId = data.user?.id;

  // ✅ 2. Sauvegarde profil
  const { error: dbError } = await supabase.from("users").insert([
    {
      id: userId,
      full_name: fullName,
      moncash_number: moncashNumber,
      whatsapp_number: whatsappNumber,
      age: Number(age),
    },
  ]);

  if (dbError) {
    return NextResponse.json(
      { message: "Erreur insertion profil" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Compte créé avec succès",
  });
}