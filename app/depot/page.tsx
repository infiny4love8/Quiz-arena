"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase"; // adapte le chemin si besoin

const MONTANTS = [100, 250, 500, 1000, 2500, 5000];

export default function DepotPage() {
  const [montant, setMontant] = useState<number | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!montant) return setError("Choisis un montant.");
    if (!screenshot) return setError("Ajoute le screenshot MonCash.");

    setLoading(true);

    try {
      // 1. Récupérer l'user connecté
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Tu dois être connecté.");

      // 2. Upload screenshot dans Supabase Storage
      const ext = screenshot.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("screenshots")
        .upload(path, screenshot);

      if (uploadError) throw new Error("Erreur upload screenshot.");

      // 3. Créer le dépôt en pending
      const { error: insertError } = await supabase
        .from("deposits")
        .insert({
          user_id: user.id,
          amount: montant,
          screenshot_url: path,
          status: "pending",
        });

      if (insertError) throw new Error("Erreur enregistrement dépôt.");

      setDone(true);
    } catch (err: any) {
      setError(err.message ?? "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  // ---- SUCCÈS ----
  if (done) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={styles.title}>Dépôt envoyé !</h2>
          <p style={styles.subtitle}>
            Ton dépôt de <strong style={{ color: "#f59e0b" }}>{montant?.toLocaleString()} GDS</strong> est en attente de validation.
            <br />Les coins seront ajoutés dès confirmation.
          </p>
          <button
            style={styles.btnPrimary}
            onClick={() => {
              setDone(false);
              setMontant(null);
              setScreenshot(null);
              setPreview(null);
            }}
          >
            Nouveau dépôt
          </button>
        </div>
      </div>
    );
  }

  // ---- FORMULAIRE ----
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Déposer des fonds</h1>
        <p style={styles.subtitle}>Via MonCash — Validation manuelle sous 24h</p>

        {/* ÉTAPE 1 — Montant */}
        <div style={styles.section}>
          <label style={styles.label}>1. Choisis un montant (GDS)</label>
          <div style={styles.grid}>
            {MONTANTS.map((m) => (
              <button
                key={m}
                onClick={() => setMontant(m)}
                style={{
                  ...styles.montantBtn,
                  ...(montant === m ? styles.montantBtnActive : {}),
                }}
              >
                {m.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* ÉTAPE 2 — Instructions */}
        {montant && (
          <div style={styles.infoBox}>
            <p style={{ margin: "0 0 8px 0", fontWeight: 600, color: "#f0ede6" }}>
              2. Envoie {montant.toLocaleString()} GDS sur MonCash
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#8892a4" }}>
              Numéro : <strong style={{ color: "#f59e0b", letterSpacing: "0.05em" }}>+509 XX XX XX XX</strong>
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#4a5568" }}>
              Garde ton screenshot après le paiement.
            </p>
          </div>
        )}

        {/* ÉTAPE 3 — Screenshot */}
        <div style={styles.section}>
          <label style={styles.label}>3. Upload le screenshot MonCash</label>

          <label style={styles.uploadZone}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              style={{ display: "none" }}
            />
            {preview ? (
              <img
                src={preview}
                alt="preview"
                style={{
                  width: "100%",
                  borderRadius: 8,
                  objectFit: "cover",
                  maxHeight: 220,
                }}
              />
            ) : (
              <div style={{ textAlign: "center", color: "#4a5568" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                <div style={{ fontSize: 14 }}>Clique pour ajouter le screenshot</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>JPG, PNG acceptés</div>
              </div>
            )}
          </label>

          {preview && (
            <button
              onClick={() => { setScreenshot(null); setPreview(null); }}
              style={styles.btnGhost}
            >
              Changer l'image
            </button>
          )}
        </div>

        {/* ERREUR */}
        {error && (
          <div style={styles.errorBox}>{error}</div>
        )}

        {/* BOUTON ENVOYER */}
        <button
          onClick={handleSubmit}
          disabled={loading || !montant || !screenshot}
          style={{
            ...styles.btnPrimary,
            opacity: (!montant || !screenshot || loading) ? 0.5 : 1,
            cursor: (!montant || !screenshot || loading) ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Envoi en cours…" : "Envoyer le dépôt"}
        </button>
      </div>
    </div>
  );
}

// ---- STYLES ----
const styles: Record<string, React.CSSProperties> = {
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
    border: "1px solid #1e2130",
    borderRadius: 16,
    padding: "32px 28px",
    width: "100%",
    maxWidth: 480,
  },
  title: {
    margin: "0 0 6px",
    fontSize: 22,
    fontWeight: 700,
    color: "#f0ede6",
  },
  subtitle: {
    margin: "0 0 28px",
    fontSize: 14,
    color: "#4a5568",
    lineHeight: 1.6,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    display: "block",
    fontSize: 13,
    color: "#8892a4",
    marginBottom: 10,
    fontWeight: 500,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },
  montantBtn: {
    background: "#0d0f14",
    border: "1px solid #2a2d3a",
    borderRadius: 8,
    color: "#8892a4",
    padding: "12px 8px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  montantBtnActive: {
    background: "#1a2a1a",
    border: "1px solid #10b981",
    color: "#10b981",
  },
  infoBox: {
    background: "#0a1628",
    border: "1px solid #1e3a5f",
    borderRadius: 10,
    padding: "14px 16px",
    marginBottom: 24,
  },
  uploadZone: {
    display: "block",
    background: "#0d0f14",
    border: "2px dashed #2a2d3a",
    borderRadius: 10,
    padding: 20,
    cursor: "pointer",
    transition: "border-color 0.15s",
  },
  btnPrimary: {
    width: "100%",
    background: "#10b981",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    padding: "14px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
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
    border: "1px solid #ef444440",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#ef4444",
    fontSize: 13,
    marginBottom: 12,
  },
};