"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SupportPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "",
    whatsappNumber: "",
    issueType: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validate = () => {
    if (
      !form.fullName ||
      !form.whatsappNumber ||
      !form.issueType ||
      !form.message
    ) {
      return "Tous les champs sont obligatoires";
    }

    if (!form.whatsappNumber.match(/^\+?[0-9\s]{8,15}$/)) {
      return "Numéro WhatsApp invalide";
    }

    if (form.message.length < 10) {
      return "Message trop court";
    }

    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    const finalMessage = `Hello Zonarena 👋

Nom: ${form.fullName}
WhatsApp: ${form.whatsappNumber}
Type de problème: ${form.issueType}

Message:
${form.message}`;

    const encodedMessage = encodeURIComponent(finalMessage);

    // OPTIONNEL : log côté serveur
    await fetch("/api/support", {
      method: "POST",
      body: JSON.stringify(form),
    });

    setLoading(false);
    setSuccess(true);

    window.open(
      `https://wa.me/50938998073?text=${encodedMessage}`,
      "_blank"
    );
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
      <div className="w-full max-w-2xl rounded-3xl border border-yellow-400/20 bg-zinc-950 p-8 shadow-2xl">
        {/* Bouton Retour */}
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-zinc-400 hover:text-yellow-400 transition"
        >
          <span className="text-xl">←</span>
          <span>Retour</span>
        </button>

        <h1 className="text-3xl font-black">
          Support <span className="text-yellow-400">Zonarena</span>
        </h1>

        <p className="mt-2 text-zinc-400 text-sm">
          Remplis le formulaire pour contacter le support rapidement.
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-xl bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-400">
            Redirection vers WhatsApp...
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <input
            placeholder="Nom complet"
            value={form.fullName}
            onChange={(e) =>
              setForm({ ...form, fullName: e.target.value })
            }
            className="w-full rounded-2xl bg-black border border-zinc-800 px-4 py-4"
          />

          <input
            placeholder="Numéro WhatsApp"
            value={form.whatsappNumber}
            onChange={(e) =>
              setForm({ ...form, whatsappNumber: e.target.value })
            }
            className="w-full rounded-2xl bg-black border border-zinc-800 px-4 py-4"
          />

          <select
            value={form.issueType}
            onChange={(e) =>
              setForm({ ...form, issueType: e.target.value })
            }
            className="w-full rounded-2xl bg-black border border-zinc-800 px-4 py-4"
          >
            <option value="">Type de problème</option>
            <option>Paiement MonCash</option>
            <option>Retrait</option>
            <option>Tournoi</option>
            <option>Compte bloqué</option>
            <option>Coins / tickets</option>
            <option>Autre</option>
          </select>

          <textarea
            placeholder="Explique ton problème..."
            rows={5}
            value={form.message}
            onChange={(e) =>
              setForm({ ...form, message: e.target.value })
            }
            className="w-full rounded-2xl bg-black border border-zinc-800 px-4 py-4"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-yellow-400 text-black font-black py-4 transition hover:bg-yellow-300 disabled:opacity-50"
          >
            {loading ? "Envoi..." : "Contacter sur WhatsApp"}
          </button>
        </form>
      </div>
    </main>
  );
}