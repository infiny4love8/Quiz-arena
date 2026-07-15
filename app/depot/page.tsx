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

type Tab = "coins" | "tickets";

export default function DepotPage() {
  const [tab, setTab] = useState<Tab>("coins");

  const [selectedCoins, setSelectedCoins] = useState<typeof COINS_OPTIONS[0] | null>(null);
  const [screenshotCoins, setScreenshotCoins] = useState<File | null>(null);
  const [previewCoins, setPreviewCoins] = useState<string | null>(null);

  const [selectedTickets, setSelectedTickets] = useState<typeof TICKETS_OPTIONS[0] | null>(null);
  const [screenshotTickets, setScreenshotTickets] = useState<File | null>(null);
  const [previewTickets, setPreviewTickets] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, type: Tab) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === "coins") { setScreenshotCoins(file); setPreviewCoins(url); }
    else { setScreenshotTickets(file); setPreviewTickets(url); }
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    const isCoins = tab === "coins";
    const screenshot = isCoins ? screenshotCoins : screenshotTickets;
    const amount = isCoins ? selectedCoins?.gds : selectedTickets?.gds;

    if (!amount) return setError(isCoins ? "Choisis un pack de coins." : "Choisis un pack de tickets.");
    if (!screenshot) return setError("Ajoute le screenshot MonCash.");

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
        isCoins
          ? `🪙 ${selectedCoins!.coins} coins en attente de validation.`
          : `🎫 ${selectedTickets!.tickets} ticket(s) en attente de validation.`
      );
      setDone(true);
    } catch (err: any) {
      setError(err.message ?? "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={s.title}>Dépôt envoyé !</h2>
          <p style={s.subtitle}>
            {doneMessage}
            <br />Ton compte sera mis à jour dans 2-3 minutes après confirmation.
          </p>
          <button
            style={s.btnGreen}
            onClick={() => {
              setDone(false);
              setSelectedCoins(null);
              setSelectedTickets(null);
              setScreenshotCoins(null);
              setScreenshotTickets(null);
              setPreviewCoins(null);
              setPreviewTickets(null);
            }}
          >
            Nouveau dépôt
          </button>
        </div>
      </div>
    );
  }

  const isCoins = tab === "coins";

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.title}>Ajouter des fonds</h1>
        <p style={s.subtitle}>Choisis ce que tu veux ajouter à ton compte</p>

        {/* TABS */}
        <div style={s.tabs}>
          <button
            onClick={() => setTab("coins")}
            style={{
              ...s.tab,
              background: isCoins ? "#0d1f18" : "transparent",
              color: isCoins ? "#10b981" : "#4a5568",
              outline: isCoins ? "1px solid #10b981" : "1px solid transparent",
            }}
          >
            🪙 Coins
          </button>
          <button
            onClick={() => setTab("tickets")}
            style={{
              ...s.tab,
              background: !isCoins ? "#1a1028" : "transparent",
              color: !isCoins ? "#a78bfa" : "#4a5568",
              outline: !isCoins ? "1px solid #7c3aed" : "1px solid transparent",
            }}
          >
            🎫 Tickets
          </button>
        </div>

        {/* === COINS === */}
        {isCoins && (
          <>
            <div style={s.infoExplain}>
              Les <span style={{ color: "#10b981", fontWeight: 600 }}>🪙 coins</span> te permettent de rejoindre les tournois Pro.{" "}
              <span style={{ color: "#10b981", fontWeight: 600 }}>1 coin = 1 GDS.</span>
            </div>

            <div style={s.section}>
              <label style={s.label}>1. Choisis ton pack de coins</label>
              <div style={s.grid}>
                {COINS_OPTIONS.map((opt) => {
                  const active = selectedCoins?.coins === opt.coins;
                  return (
                    <button
                      key={opt.coins}
                      onClick={() => setSelectedCoins(opt)}
                      style={{
                        ...s.optBtn,
                        background: active ? "#0d1f18" : "#0d0f14",
                        outline: active ? "1px solid #10b981" : "1px solid #1e2130",
                        color: active ? "#10b981" : "#8892a4",
                      }}
                    >
                      <span style={{ fontSize: 16, display: "block" }}>🪙 {opt.coins}</span>
                      <span style={{ fontSize: 11, color: active ? "#6ee7b7" : "#4a5568", marginTop: 2, display: "block" }}>
                        {opt.gds} GDS
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedCoins && (
              <div style={s.infoBox}>
                <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#f0ede6", fontSize: 14 }}>
                  2. Envoie <span style={{ color: "#f59e0b" }}>{selectedCoins.gds} GDS</span> sur MonCash
                </p>
                <p style={{ margin: 0, fontSize: 14, color: "#8892a4" }}>
                  Numéro : <strong style={{ color: "#f59e0b", letterSpacing: "0.05em" }}>+509 38998073</strong>
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#4a5568" }}>
                  Garde ton screenshot après le paiement.
                </p>
              </div>
            )}

            <div style={s.section}>
              <label style={s.label}>3. Upload le screenshot MonCash</label>
              <label style={s.uploadZone}>
                <input type="file" accept="image/*" onChange={(e) => handleFile(e, "coins")} style={{ display: "none" }} />
                {previewCoins ? (
                  <img src={previewCoins} alt="preview" style={{ width: "100%", borderRadius: 8, objectFit: "cover", maxHeight: 200 }} />
                ) : (
                  <div style={{ textAlign: "center", color: "#4a5568" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                    <div style={{ fontSize: 13 }}>Clique pour ajouter le screenshot</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>JPG, PNG acceptés</div>
                  </div>
                )}
              </label>
              {previewCoins && (
                <button onClick={() => { setScreenshotCoins(null); setPreviewCoins(null); }} style={s.btnGhost}>
                  Changer l'image
                </button>
              )}
            </div>
          </>
        )}

        {/* === TICKETS === */}
        {!isCoins && (
          <>
            <div style={{ ...s.infoExplain, outline: "1px solid #2a1f40" }}>
              Les <span style={{ color: "#a78bfa", fontWeight: 600 }}>🎫 tickets</span> te permettent de rejoindre les tournois sponsorisés et de gagner des récompenses exclusives.
            </div>

            <div style={s.section}>
              <label style={s.label}>1. Choisis ton pack de tickets</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {TICKETS_OPTIONS.map((opt) => {
                  const active = selectedTickets?.tickets === opt.tickets;
                  return (
                    <button
                      key={opt.tickets}
                      onClick={() => setSelectedTickets(opt)}
                      style={{
                        ...s.optBtn,
                        background: active ? "#1a1028" : "#0d0f14",
                        outline: active ? "1px solid #7c3aed" : "1px solid #1e2130",
                        color: active ? "#a78bfa" : "#8892a4",
                      }}
                    >
                      <span style={{ fontSize: 16, display: "block" }}>🎫 {opt.tickets}</span>
                      <span style={{ fontSize: 11, color: active ? "#c4b5fd" : "#4a5568", marginTop: 2, display: "block" }}>
                        {opt.gds} GDS
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedTickets && (
              <div style={{ ...s.infoBox, background: "#0e0a1e", outline: "1px solid #2a1f40" }}>
                <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#f0ede6", fontSize: 14 }}>
                  2. Envoie <span style={{ color: "#a78bfa" }}>{selectedTickets.gds} GDS</span> sur MonCash
                </p>
                <p style={{ margin: 0, fontSize: 14, color: "#8892a4" }}>
                  Numéro : <strong style={{ color: "#a78bfa", letterSpacing: "0.05em" }}>+509 38998073</strong>
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#4a5568" }}>
                  Garde ton screenshot après le paiement.
                </p>
              </div>
            )}

            <div style={s.section}>
              <label style={s.label}>3. Upload le screenshot MonCash</label>
              <label style={{ ...s.uploadZone, outline: "2px dashed #2a1f40" }}>
                <input type="file" accept="image/*" onChange={(e) => handleFile(e, "tickets")} style={{ display: "none" }} />
                {previewTickets ? (
                  <img src={previewTickets} alt="preview" style={{ width: "100%", borderRadius: 8, objectFit: "cover", maxHeight: 200 }} />
                ) : (
                  <div style={{ textAlign: "center", color: "#4a5568" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                    <div style={{ fontSize: 13 }}>Clique pour ajouter le screenshot</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>JPG, PNG acceptés</div>
                  </div>
                )}
              </label>
              {previewTickets && (
                <button onClick={() => { setScreenshotTickets(null); setPreviewTickets(null); }} style={s.btnGhost}>
                  Changer l'image
                </button>
              )}
            </div>
          </>
        )}

        {error && <div style={s.errorBox}>{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={loading || (isCoins ? !selectedCoins || !screenshotCoins : !selectedTickets || !screenshotTickets)}
          style={{
            ...(isCoins ? s.btnGreen : s.btnPurple),
            opacity: loading || (isCoins ? !selectedCoins || !screenshotCoins : !selectedTickets || !screenshotTickets) ? 0.45 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Envoi en cours…" : isCoins ? "Ajouter les coins 🪙" : "Ajouter les tickets 🎫"}
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "#0d0f14",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    fontFamily: "'DM Sans', sans-serif",
  },
  card: {
    background: "#111420",
    outline: "1px solid #1e2130",
    borderRadius: 16,
    padding: "32px 28px",
    width: "100%",
    maxWidth: 480,
  },
  title: { margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#f0ede6" },
  subtitle: { margin: "0 0 24px", fontSize: 14, color: "#4a5568", lineHeight: 1.6 },
  tabs: {
    display: "flex",
    gap: 8,
    background: "#0d0f14",
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    padding: "10px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    transition: "all 0.15s",
  },
  infoExplain: {
    background: "#0a0c10",
    outline: "1px solid #1e2130",
    borderRadius: 10,
    padding: "12px 14px",
    marginBottom: 20,
    fontSize: 13,
    color: "#8892a4",
    lineHeight: 1.55,
  },
  section: { marginBottom: 22 },
  label: {
    display: "block",
    fontSize: 12,
    color: "#8892a4",
    marginBottom: 10,
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 },
  optBtn: {
    borderRadius: 10,
    border: "none",
    padding: "12px 8px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
    textAlign: "center" as const,
  },
  infoBox: {
    background: "#0a1628",
    outline: "1px solid #1e3a5f",
    borderRadius: 10,
    padding: "14px 16px",
    marginBottom: 22,
  },
  uploadZone: {
    display: "block",
    background: "#0d0f14",
    outline: "2px dashed #1e2130",
    borderRadius: 10,
    padding: 20,
    cursor: "pointer",
  },
  btnGreen: {
    width: "100%",
    background: "#10b981",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    padding: "14px",
    fontSize: 15,
    fontWeight: 700,
    marginTop: 8,
  },
  btnPurple: {
    width: "100%",
    background: "#7c3aed",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    padding: "14px",
    fontSize: 15,
    fontWeight: 700,
    marginTop: 8,
  },
  btnGhost: {
    background: "transparent",
    border: "none",
    color: "#4a5568",
    fontSize: 12,
    cursor: "pointer",
    marginTop: 8,
    padding: 0,
    textDecoration: "underline",
  },
  errorBox: {
    background: "#2d0f0f",
    outline: "1px solid #ef444440",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#ef4444",
    fontSize: 13,
    marginBottom: 12,
  },
};