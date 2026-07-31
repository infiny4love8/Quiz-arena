"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const TICKETS_OPTIONS = [
  { tickets: 1, gds: 50 },
  { tickets: 3, gds: 150 },
  { tickets: 5, gds: 250 },
] as const;

const MIN_CUSTOM = 50;
const MAX_CUSTOM = 5000;
const MAX_FILE_SIZE = 6 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MONCASH_NUMBER = "50938998073";
const MONCASH_DISPLAY = "+509 3899-8073";

type DepositTab = "coins" | "tickets";
type PaymentMethod = "moncash" | "paypal" | null;
type TicketOption = (typeof TICKETS_OPTIONS)[number];

function sanitizeNumericInput(value: string) {
  return value.replace(/[^0-9]/g, "").slice(0, 5);
}

export default function DepotPage() {
  const router = useRouter();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [tab, setTab] = useState<DepositTab>("coins");

  const [customCoins, setCustomCoins] = useState("");
  const [selectedTickets, setSelectedTickets] = useState<TicketOption | null>(null);

  const [screenshotCoins, setScreenshotCoins] = useState<File | null>(null);
  const [screenshotTickets, setScreenshotTickets] = useState<File | null>(null);
  const [previewCoins, setPreviewCoins] = useState<string | null>(null);
  const [previewTickets, setPreviewTickets] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isCoins = tab === "coins";

  const amount = useMemo(() => {
    if (isCoins) {
      const parsed = Number(customCoins);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }
    return selectedTickets?.gds ?? null;
  }, [customCoins, isCoins, selectedTickets]);

  const screenshot = isCoins ? screenshotCoins : screenshotTickets;
  const preview = isCoins ? previewCoins : previewTickets;

  const isAmountValid = isCoins
    ? amount !== null && amount >= MIN_CUSTOM && amount <= MAX_CUSTOM
    : selectedTickets !== null;

  const canSubmit =
    paymentMethod === "moncash" &&
    isAmountValid &&
    !!screenshot &&
    !loading;

  useEffect(() => {
    return () => {
      if (previewCoins) URL.revokeObjectURL(previewCoins);
      if (previewTickets) URL.revokeObjectURL(previewTickets);
    };
  }, [previewCoins, previewTickets]);

  const selectMethod = (method: PaymentMethod) => {
    if (method === "paypal") return;
    setPaymentMethod(method);
    setError(null);
  };

  const validateFile = (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return "Format non accepté. Utilise une image JPG, PNG ou WEBP.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "L’image dépasse 6 Mo. Choisis une capture plus légère.";
    }
    return null;
  };

  const handleFile = (
    event: ChangeEvent<HTMLInputElement>,
    type: DepositTab
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileError = validateFile(file);
    if (fileError) {
      setError(fileError);
      event.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    if (type === "coins") {
      if (previewCoins) URL.revokeObjectURL(previewCoins);
      setScreenshotCoins(file);
      setPreviewCoins(objectUrl);
    } else {
      if (previewTickets) URL.revokeObjectURL(previewTickets);
      setScreenshotTickets(file);
      setPreviewTickets(objectUrl);
    }

    setError(null);
  };

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(MONCASH_NUMBER);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError(
        "Impossible de copier automatiquement. Maintiens le numéro pour le copier."
      );
    }
  };

  const validateBeforeSubmit = () => {
    if (paymentMethod !== "moncash") {
      return "Choisis MonCash pour continuer.";
    }

    if (isCoins) {
      if (!amount || amount < MIN_CUSTOM || amount > MAX_CUSTOM) {
        return `Entre un montant compris entre ${MIN_CUSTOM} et ${MAX_CUSTOM} GDS.`;
      }
    } else if (!selectedTickets) {
      return "Choisis 1, 3 ou 5 tickets.";
    }

    if (!screenshot) {
      return "Ajoute la capture du paiement MonCash.";
    }

    const fileError = validateFile(screenshot);
    if (fileError) return fileError;

    return null;
  };

  const handleSubmit = async () => {
    if (loading) return;

    setError(null);

    const validationError = validateBeforeSubmit();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!amount || !screenshot) return;

    setLoading(true);
    let uploadedPath: string | null = null;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Tu dois être connecté pour effectuer un dépôt.");
      }

      const extensionByType: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };

      const extension = extensionByType[screenshot.type];
      if (!extension) {
        throw new Error("Format d’image non accepté.");
      }

      const safeId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      uploadedPath = `${user.id}/${safeId}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("screenshots")
        .upload(uploadedPath, screenshot, {
          cacheControl: "3600",
          upsert: false,
          contentType: screenshot.type,
        });

      if (uploadError) {
        throw new Error("La capture n’a pas pu être envoyée. Réessaie.");
      }

      const { data: depositData, error: insertError } = await supabase
        .from("deposits")
        .insert({
          user_id: user.id,
          amount,
          screenshot_url: uploadedPath,
          status: "pending",
          type: tab,
        })
        .select("id")
        .single();

      if (insertError || !depositData) {
        await supabase.storage.from("screenshots").remove([uploadedPath]);
        uploadedPath = null;
        throw new Error("La demande de dépôt n’a pas pu être enregistrée.");
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          const response = await fetch("/api/admin-alert", {
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

          if (!response.ok) {
            console.error("Notification administrateur non envoyée.");
          }
        }
      } catch (notificationError) {
        console.error(
          "Erreur de notification administrateur :",
          notificationError
        );
      }

      setDoneMessage(
        isCoins
          ? `${amount} GDS sont en attente de validation.`
          : `${selectedTickets?.tickets ?? 0} ticket(s) sont en attente de validation.`
      );
      setDone(true);
    } catch (submitError) {
      if (uploadedPath) {
        await supabase.storage.from("screenshots").remove([uploadedPath]);
      }

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Une erreur est survenue. Réessaie dans un instant."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    if (previewCoins) URL.revokeObjectURL(previewCoins);
    if (previewTickets) URL.revokeObjectURL(previewTickets);

    setPaymentMethod(null);
    setTab("coins");
    setCustomCoins("");
    setSelectedTickets(null);
    setScreenshotCoins(null);
    setScreenshotTickets(null);
    setPreviewCoins(null);
    setPreviewTickets(null);
    setDone(false);
    setDoneMessage("");
    setError(null);
    setCopied(false);
  };

  return (
    <main className="min-h-screen bg-[#08090b] text-white">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>

      <div className="mx-auto min-h-screen w-full max-w-[560px] px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
        <header className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Retour"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition active:scale-95"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-300/70">
              Zonarena
            </p>
            <h1 className="text-2xl font-black text-amber-300">Déposer</h1>
          </div>

          <div className="h-11 w-11" aria-hidden="true" />
        </header>

        {done ? (
          <section className="rounded-[28px] border border-amber-300/20 bg-gradient-to-b from-[#19150a] to-[#0d0d0f] px-5 py-10 text-center shadow-[0_24px_70px_rgba(0,0,0,.45)]">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/10">
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f7cc3c"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>

            <h2 className="mb-3 text-3xl font-black text-amber-300">
              Demande envoyée
            </h2>

            <p className="mx-auto mb-2 max-w-[360px] text-base leading-7 text-white/80">
              {doneMessage}
            </p>

            <p className="mx-auto mb-8 max-w-[360px] text-sm leading-6 text-white/50">
              La vérification est manuelle. Ton solde sera mis à jour après
              confirmation du paiement.
            </p>

            <button
              type="button"
              onClick={resetAll}
              className="w-full rounded-2xl bg-amber-300 py-4 text-base font-extrabold text-[#211900] transition active:scale-[.99]"
            >
              Faire un autre dépôt
            </button>
          </section>
        ) : paymentMethod === null ? (
          <>
            <section className="mb-5 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_24px_70px_rgba(0,0,0,.32)] sm:p-6">
              <p className="text-sm font-semibold text-amber-300">
                Ajouter des fonds
              </p>
              <h2 className="mt-1 text-2xl font-extrabold leading-tight">
                Choisis ton moyen de paiement
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Sélectionne une option pour continuer. MonCash est disponible
                dès maintenant.
              </p>
            </section>

            <section className="space-y-3">
              <button
                type="button"
                onClick={() => selectMethod("moncash")}
                className="group flex w-full items-center gap-4 rounded-[24px] border border-amber-300/25 bg-gradient-to-r from-[#1b1609] to-[#111113] p-4 text-left shadow-[0_16px_45px_rgba(0,0,0,.35)] transition active:scale-[.99]"
              >
                <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-2xl bg-white p-2">
                  <div className="text-center font-black leading-none">
                    <div className="text-lg text-[#b90d25]">MON</div>
                    <div className="text-lg text-[#9b9b9b]">Cash</div>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold">MonCash</h3>
                    <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                      Disponible
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/55">
                    Paiement manuel avec preuve
                  </p>
                </div>

                <svg
                  className="shrink-0 text-amber-300"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>

              <button
                type="button"
                disabled
                aria-disabled="true"
                className="flex w-full cursor-not-allowed items-center gap-4 rounded-[24px] border border-white/8 bg-white/[0.025] p-4 text-left opacity-55"
              >
                <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-2xl bg-white p-2">
                  <span className="text-xl font-black italic text-[#003087]">
                    Pay<span className="text-[#009cde]">Pal</span>
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold">PayPal</h3>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/55">
                      Bientôt
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/45">
                    Temporairement indisponible
                  </p>
                </div>

                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white/35"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </button>
            </section>
          </>
        ) : (
          <section className="overflow-hidden rounded-[24px] bg-[#e5e7eb] text-black shadow-[0_24px_70px_rgba(0,0,0,.4)]">
            <div className="flex items-center justify-between border-b border-[#d1d5db] bg-white px-4 py-4">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod(null);
                  setError(null);
                }}
                className="text-sm font-bold text-[#4b5563]"
              >
                ← Changer
              </button>

              <span className="text-sm font-black text-[#111827]">
                MonCash
              </span>
            </div>

            <div className="px-4 py-6 sm:px-6">
              <div className="mb-5 flex justify-center">
                <div className="flex h-[132px] w-full max-w-[270px] items-center justify-center rounded-[22px] bg-white shadow-sm">
                  <div className="text-center font-black leading-none">
                    <div className="text-[42px] tracking-tight text-[#b90d25]">
                      MON
                    </div>
                    <div className="mt-1 text-[42px] tracking-tight text-[#a3a3a3]">
                      Cash
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-5 flex rounded-xl bg-[#d8dbe0] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab("coins");
                    setError(null);
                  }}
                  className={`flex-1 rounded-lg px-3 py-3 text-sm font-extrabold transition ${
                    isCoins
                      ? "bg-white text-black shadow-sm"
                      : "text-[#6b7280]"
                  }`}
                >
                  Gourdes
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTab("tickets");
                    setError(null);
                  }}
                  className={`flex-1 rounded-lg px-3 py-3 text-sm font-extrabold transition ${
                    !isCoins
                      ? "bg-white text-black shadow-sm"
                      : "text-[#6b7280]"
                  }`}
                >
                  Tickets
                </button>
              </div>

              <div className="rounded-[20px] bg-white p-5 shadow-sm">
                {isCoins ? (
                  <>
                    <h2 className="text-center text-xl font-extrabold">
                      Entrez le montant à déposer
                    </h2>

                    <div className="mt-6">
                      <div className="flex items-center rounded-lg border border-[#cfd3d8] bg-white px-4">
                        <input
                          id="deposit-amount"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={customCoins}
                          onChange={(event) => {
                            setCustomCoins(
                              sanitizeNumericInput(event.target.value)
                            );
                            setError(null);
                          }}
                          placeholder="Montant"
                          className="min-w-0 flex-1 bg-transparent py-4 text-lg font-semibold text-[#111827] outline-none placeholder:text-[#9ca3af]"
                        />
                        <span className="ml-3 font-extrabold text-[#111827]">
                          HTG
                        </span>
                      </div>

                      <div className="mt-2 flex items-start justify-between text-sm text-[#6b7280]">
                        <span>
                          Minimum :<br />
                          <strong className="text-[#4b5563]">
                            {MIN_CUSTOM} HTG
                          </strong>
                        </span>
                        <span className="text-right">
                          Maximum :<br />
                          <strong className="text-[#4b5563]">
                            {MAX_CUSTOM} HTG
                          </strong>
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-center text-xl font-extrabold">
                      Choisissez votre pack de tickets
                    </h2>

                    <div className="mt-6 grid grid-cols-3 gap-2.5">
                      {TICKETS_OPTIONS.map((option) => {
                        const active =
                          selectedTickets?.tickets === option.tickets;

                        return (
                          <button
                            type="button"
                            key={option.tickets}
                            onClick={() => {
                              setSelectedTickets(option);
                              setError(null);
                            }}
                            className={`rounded-xl border px-2 py-4 text-center transition active:scale-[.98] ${
                              active
                                ? "border-[#b90d25] bg-[#fff1f3] text-[#b90d25]"
                                : "border-[#d6d9de] bg-[#f7f7f8] text-[#111827]"
                            }`}
                          >
                            <span className="block text-2xl font-black">
                              {option.tickets}
                            </span>
                            <span className="mt-1 block text-xs font-bold">
                              ticket{option.tickets > 1 ? "s" : ""}
                            </span>
                            <span className="mt-2 block text-xs text-[#6b7280]">
                              {option.gds} HTG
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                <div className="mt-6 rounded-xl bg-[#f3f4f6] p-4">
                  <p className="text-sm font-bold text-[#6b7280]">
                    Montant à envoyer
                  </p>
                  <p className="mt-1 text-xl font-black text-[#111827]">
                    {amount ? `${amount} HTG` : "—"}
                  </p>

                  <div className="mt-4 rounded-lg border border-[#d4d7dc] bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                      Numéro MonCash
                    </p>

                    <div className="mt-1 flex items-center gap-3">
                      <p className="min-w-0 flex-1 truncate text-base font-black text-[#111827]">
                        {MONCASH_DISPLAY}
                      </p>

                      <button
                        type="button"
                        onClick={copyNumber}
                        className={`shrink-0 rounded-md border px-3 py-2 text-xs font-extrabold ${
                          copied
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-[#e2aeb6] bg-[#fff1f3] text-[#b90d25]"
                        }`}
                      >
                        {copied ? "Copié ✓" : "Copier"}
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-[#6b7280]">
                    Envoyez exactement le montant affiché puis ajoutez la photo
                    du paiement. Ne partagez jamais votre code secret MonCash.
                  </p>
                </div>

                <div className="mt-6">
                  <p className="mb-2 text-sm font-extrabold text-[#111827]">
                    Preuve du paiement
                  </p>

                  <label className="block cursor-pointer rounded-xl border border-dashed border-[#cfd3d8] bg-[#fafafa] p-3 transition hover:border-[#b90d25]">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => handleFile(event, tab)}
                      className="hidden"
                    />

                    {preview ? (
                      <div className="relative overflow-hidden rounded-lg">
                        <img
                          src={preview}
                          alt="Aperçu de la preuve de paiement"
                          className="max-h-[250px] w-full bg-[#f3f4f6] object-contain"
                        />
                        <span className="absolute right-2 top-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#b90d25] shadow">
                          Changer
                        </span>
                      </div>
                    ) : (
                      <div className="flex min-h-[128px] flex-col items-center justify-center text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1f3] text-[#b90d25]">
                          <svg
                            width="23"
                            height="23"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" x2="12" y1="3" y2="15" />
                          </svg>
                        </div>

                        <p className="text-sm font-extrabold text-[#111827]">
                          Ajouter la photo du paiement
                        </p>
                        <p className="mt-1 text-xs text-[#6b7280]">
                          JPG, PNG ou WEBP · 6 Mo maximum
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                {error && (
                  <div
                    className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="mt-6 w-full rounded-lg bg-[#78d278] py-4 text-base font-extrabold text-white transition active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading
                    ? "Envoi en cours…"
                    : isCoins
                    ? "Valider le dépôt"
                    : "Valider l’achat"}
                </button>

                <p className="mt-4 text-center text-sm leading-6 text-[#6b7280]">
                  La demande sera vérifiée manuellement après réception de la
                  preuve.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}