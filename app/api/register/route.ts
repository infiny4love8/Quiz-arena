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

  if (!email || !password || !fullName) {
    return NextResponse.json(
      { message: "Champs requis manquants" },
      { status: 400 }
    );
  }

  const cleanName = fullName.trim().toLowerCase();

  // ✅ vérification exacte
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("full_name", cleanName);

  if (existingUser && existingUser.length > 0) {
    return NextResponse.json(
      { message: "Nom déjà utilisé, choisis-en un autre" },
      { status: 400 }
    );
  }

  // ✅ création auth
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

  if (!userId) {
    return NextResponse.json(
      { message: "Erreur création utilisateur" },
      { status: 500 }
    );
  }

  // ✅ insert profil
  const { error: dbError } = await supabase.from("users").insert([
    {
      id: userId,
      full_name: cleanName, // 👈 important
      moncash_number: moncashNumber,
      whatsapp_number: whatsappNumber,
      age: Number(age),
    },
  ]);

  if (dbError) {
    console.log("DB ERROR:", dbError); // 👈 ajoute ça pour debug

    if (dbError.code === "23505") {
      return NextResponse.json(
        { message: "Nom déjà utilisé" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: dbError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Compte créé avec succès",
  });
}