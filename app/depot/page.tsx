"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const COINS_OPTIONS = [
  { coins: 50,  gds: 50  },
  { coins: 100, gds: 100 },
  { coins: 200, gds: 200 },
  { coins: 250, gds: 250 },
  { coins: 500, gds: 500 },
];

const TICKETS_OPTIONS = [
  { tickets: 1, gds: 50  },
  { tickets: 3, gds: 150 },
  { tickets: 5, gds: 250 },
];

const MIN_CUSTOM = 50;
const MAX_CUSTOM = 5000;

type Tab = "coins" | "tickets";

export default function DepotPage() {
  const [tab, setTab] = useState<Tab>("coins");

  const [selectedCoins, setSelectedCoins] = useState<typeof COINS_OPTIONS[0] | null>(null);
  const [screenshotCoins, setScreenshotCoins] = useState<File | null>(null);
  const [previewCoins, setPreviewCoins] = useState<string | null>(null);
  const [customCoins, setCustomCoins] = useState("");

  const [selectedTickets, setSelectedTickets] = useState<typeof TICKETS_OPTIONS[0] | null>(null);
  const [screenshotTickets, setScreenshotTickets] = useState<File | null>(null);
  const [previewTickets, setPreviewTickets] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, type: Tab) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === "coins") { setScreenshotCoins(file); setPreviewCoins(url); }
    else { setScreenshotTickets(file); setPreviewTickets(url); }
    setError(null);
  };

  const pickPack = (type: Tab, opt: typeof COINS_OPTIONS[0] | typeof TICKETS_OPTIONS[0]) => {
    if (type === "coins") { setSelectedCoins(opt as typeof COINS_OPTIONS[0]); setCustomCoins(""); }
    else { setSelectedTickets(opt as typeof TICKETS_OPTIONS[0]); }
    setError(null);
  };

  const handleCustomChange = (value: string) => {
    setCustomCoins(value);
    setSelectedCoins(null);
    setError(null);
  };

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText("50938998073");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silencieux — pas grave si le clipboard n'est pas dispo
    }
  };

  const isCoins = tab === "coins";
  const packAmount = isCoins ? selectedCoins?.gds : selectedTickets?.gds;
  const customValue = isCoins ? customCoins : "";
  const displayAmount = packAmount ?? (customValue ? Number(customValue) : null);

  const handleSubmit = async () => {
    setError(null);
    const screenshot = isCoins ? screenshotCoins : screenshotTickets;

    let amount: number | undefined = packAmount;

    if (!amount && customValue) {
      const parsed = Number(customValue);
      if (!parsed || parsed < MIN_CUSTOM || parsed > MAX_CUSTOM) {
        setError(`Le montant doit être entre ${MIN_CUSTOM} et ${MAX_CUSTOM} GDS.`);
        return;
      }
      amount = parsed;
    }

    if (!amount) return setError("Choisis un pack ou entre un montant.");
    if (!screenshot) return setError("Ajoute la photo du paiement MonCash.");

    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Tu dois être connecté.");

      const ext = screenshot.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("screenshots")
        .upload(path, screenshot);
      if (uploadError) throw new Error("Erreur upload screenshot.");

      const { data: depositData, error: insertError } = await supabase
        .from("deposits")
        .insert({
          user_id: user.id,
          amount,
          screenshot_url: path,
          status: "pending",
          type: tab,
        })
        .select("id")
        .single();

      if (insertError || !depositData) {
        throw new Error("Erreur enregistrement dépôt.");
      }

      // Alerte email administrateur.
      // La demande reste enregistrée même si l'email ne peut pas être envoyé.
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          const alertResponse = await fetch("/api/admin-alert", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              alertType: "deposit",
              requestId: depositData.id,
            }),
          });

          if (!alertResponse.ok) {
            console.error("La notification email administrateur n'a pas pu être envoyée.");
          }
        }
      } catch (alertError) {
        console.error("Erreur notification administrateur :", alertError);
      }

      setDoneMessage(
        packAmount
          ? isCoins
            ? `🪙 ${selectedCoins!.coins} coins en attente de validation.`
            : `🎫 ${selectedTickets!.tickets} ticket(s) en attente de validation.`
          : `${amount} GDS en attente de validation.`
      );
      setDone(true);
    } catch (err: any) {
      setError(err.message ?? "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setDone(false);
    setSelectedCoins(null);
    setSelectedTickets(null);
    setScreenshotCoins(null);
    setScreenshotTickets(null);
    setPreviewCoins(null);
    setPreviewTickets(null);
    setCustomCoins("");
    setCustomTickets("");
  };

  const screenshot = isCoins ? screenshotCoins : screenshotTickets;
  const preview = isCoins ? previewCoins : previewTickets;
  const canSubmit = (!!packAmount || !!customValue) && !!screenshot;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Cormorant+Garamond:wght@500;600;700&display=swap');
        .font-serif-display { font-family: 'Playfair Display', serif; }
        .font-serif-body { font-family: 'Cormorant Garamond', serif; }
        .gold-text {
          background: linear-gradient(120deg, #b8860b, #ffe27a, #d4af37);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .gold-btn {
          background: linear-gradient(120deg, #b8860b, #ffd700, #b8860b);
          background-size: 200% auto; transition: background-position .4s;
        }
        .gold-btn:hover { background-position: right center; }
      `}</style>

      <div className="min-h-screen flex items-center justify-center px-4 py-10 text-white" style={{ background: "#08070a" }}>
        <div
          className="w-full max-w-[480px] rounded-sm border border-amber-400/30 p-7 sm:p-9 relative"
          style={{ background: "radial-gradient(ellipse at top, #17130a 0%, #08070a 70%)" }}
        >
          <span className="absolute -top-1 -left-1 h-2 w-2 rotate-45 bg-amber-300 shadow-[0_0_8px_#ffd700]" />
          <span className="absolute -top-1 -right-1 h-2 w-2 rotate-45 bg-amber-300 shadow-[0_0_8px_#ffd700]" />
          <span className="absolute -bottom-1 -left-1 h-2 w-2 rotate-45 bg-amber-300 shadow-[0_0_8px_#ffd700]" />
          <span className="absolute -bottom-1 -right-1 h-2 w-2 rotate-45 bg-amber-300 shadow-[0_0_8px_#ffd700]" />

          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-[76px] w-[76px] items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/8">
                <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h2 className="mb-2 text-3xl font-serif-display italic font-semibold gold-text">Dépôt envoyé !</h2>
              <p className="mb-7 text-lg leading-relaxed text-[#c9c2b2]">
                {doneMessage}
                <br />
                Ton compte sera mis à jour dans 2-3 minutes après confirmation.
              </p>
              <button
                onClick={resetAll}
                className="gold-btn w-full rounded-sm py-3.5 text-lg font-serif-body font-semibold text-[#1a1400]"
              >
                Nouveau dépôt
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-center text-3xl sm:text-4xl font-serif-display italic font-semibold gold-text mb-1">
                Ajouter des fonds
              </h1>
              <p className="text-center text-lg font-serif-body text-[#a89f8c] mb-7">
                Choisis ce que tu veux ajouter à ton compte
              </p>

              {/* TOGGLE */}
              <div className="flex border-b border-amber-400/20 mb-6">
                <button
                  onClick={() => setTab("coins")}
                  className={`flex-1 py-2.5 font-serif-body text-lg font-semibold border-b-2 -mb-px transition ${
                    isCoins ? "text-amber-300 border-amber-300" : "text-[#6b6455] border-transparent"
                  }`}
                >
                  Coins
                </button>
                <button
                  onClick={() => setTab("tickets")}
                  className={`flex-1 py-2.5 font-serif-body text-lg font-semibold border-b-2 -mb-px transition ${
                    !isCoins ? "text-amber-300 border-amber-300" : "text-[#6b6455] border-transparent"
                  }`}
                >
                  Tickets
                </button>
              </div>

              {/* PACKS */}
              <div className="mb-4">
                <label className="block font-serif-body text-base font-semibold text-amber-300/90 mb-2.5">
                  1. Ton pack
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(isCoins ? COINS_OPTIONS : TICKETS_OPTIONS).map((opt) => {
                    const active = isCoins
                      ? selectedCoins?.gds === opt.gds
                      : selectedTickets?.gds === opt.gds;
                    const n = isCoins ? (opt as typeof COINS_OPTIONS[0]).coins : (opt as typeof TICKETS_OPTIONS[0]).tickets;
                    return (
                      <button
                        key={opt.gds}
                        onClick={() => pickPack(tab, opt)}
                        className={`rounded border py-3 px-1 text-center transition ${
                          active
                            ? "border-amber-300 bg-amber-300/10 text-amber-300"
                            : "border-amber-400/25 text-[#c9c2b2]"
                        }`}
                      >
                        <span className="block text-base font-bold">{n}</span>
                        <span className="block text-[11px] opacity-70 mt-0.5">{opt.gds} GDS</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MONTANT LIBRE — coins uniquement, les tickets restent en packs fixes */}
              {isCoins && (
                <div className="mb-6">
                  <label className="block font-serif-body text-base font-semibold text-amber-300/90 mb-2">
                    Ou entre le montant que tu veux
                  </label>
                  <input
                    type="number"
                    min={MIN_CUSTOM}
                    max={MAX_CUSTOM}
                    placeholder={`Entre ${MIN_CUSTOM} et ${MAX_CUSTOM} GDS`}
                    value={customValue}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    className="w-full bg-transparent border-0 border-b border-amber-400/25 px-1 py-2.5 text-base text-[#f5f0e6] placeholder:text-[#6b6455] outline-none focus:border-amber-300 transition"
                  />
                </div>
              )}

              {/* PAIEMENT + PREUVE */}
              <div className="border border-amber-400/30 rounded-sm p-4 mb-6">
                <p className="font-serif-display italic text-xl text-amber-300 mb-3">
                  2. {displayAmount ? `Envoie ${displayAmount} GDS sur MonCash` : "Choisis un montant"}
                </p>

                <div className="flex items-center gap-2.5 bg-[#0f0d08] border border-dashed border-amber-400/35 rounded px-3 py-2.5 mb-3">
                  <span className="flex-1 text-[15px] tracking-wide text-[#f5f0e6]">+509 38998073</span>
                  <button
                    onClick={copyNumber}
                    className={`text-xs font-bold border rounded px-2.5 py-1.5 transition ${
                      copied ? "border-green-400/50 text-green-400" : "border-amber-400/40 text-amber-300"
                    }`}
                  >
                    {copied ? "Copié ✓" : "Copier"}
                  </button>
                </div>

                <p className="text-lg font-semibold text-[#f5f0e6] leading-snug mb-4">
                  Paiement validé en 2 ou 3 minutes.<br />
                  Envoie une photo du paiement MonCash pour la sécurité.
                </p>

                <label className="block border-[1.5px] border-dashed border-amber-400/35 rounded p-4 cursor-pointer text-center">
                  <input type="file" accept="image/*" onChange={(e) => handleFile(e, tab)} className="hidden" />
                  {preview ? (
                    <div className="relative">
                      <img src={preview} alt="preview" className="w-full rounded max-h-[160px] object-cover" />
                      <span className="absolute top-2 right-2 bg-[#08070acc] border border-amber-400/40 text-amber-300 text-xs px-2.5 py-1 rounded">
                        Changer
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="text-amber-300 font-serif-body text-base font-semibold">
                        Ajouter la photo du paiement
                      </div>
                      <div className="text-[#6b6455] text-xs mt-1">JPG ou PNG</div>
                    </>
                  )}
                </label>
              </div>

              {error && (
                <div className="mb-4 rounded border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !canSubmit}
                className="gold-btn w-full rounded-sm py-3.5 text-lg font-serif-body font-semibold text-[#1a1400] disabled:opacity-45 transition"
              >
                {loading ? "Envoi en cours…" : isCoins ? "Ajouter les coins" : "Ajouter les tickets"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}