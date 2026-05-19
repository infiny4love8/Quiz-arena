import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service role = contourne le RLS, uniquement côté serveur
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← clé service role, jamais exposée au client
);

export async function POST(req: Request) {
  const body = await req.json();
  const { fullName, moncashNumber, whatsappNumber, age, email, password } = body;

  if (!email || !password || !fullName) {
    return NextResponse.json({ message: "Champs requis manquants" }, { status: 400 });
  }

  const cleanName = fullName.trim().toLowerCase();

  // Vérifier si le nom est déjà pris
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("full_name", cleanName);

  if (existingUser && existingUser.length > 0) {
    return NextResponse.json({ message: "Nom déjà utilisé, choisis-en un autre" }, { status: 400 });
  }

  // Créer le compte auth
  const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // garde la confirmation email
  });

  if (authError) {
    return NextResponse.json({ message: authError.message }, { status: 400 });
  }

  const userId = data.user?.id;
  if (!userId) {
    return NextResponse.json({ message: "Erreur création utilisateur" }, { status: 500 });
  }

  // Insert profil complet — service role bypass RLS, pas de conflit trigger
  const { error: dbError } = await supabaseAdmin.from("users").insert([{
    id: userId,
    full_name: cleanName,
    moncash_number: moncashNumber,
    whatsapp_number: whatsappNumber,
    age: Number(age),
    tickets: 5,
  }]);

  if (dbError) {
    console.error("DB ERROR:", dbError);
    return NextResponse.json({ message: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Compte créé avec succès" });
}