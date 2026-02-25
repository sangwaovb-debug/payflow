const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// Stockage en mémoire (démo). Plus tard: base de données.
const txStore = new Map();

function nowMs() {
  return Date.now();
}
function makeId() {
  return crypto.randomUUID();
}

// 1) Créer une transaction
app.post("/api/tx", (req, res) => {
  const { merchantId, amount } = req.body || {};

  if (!merchantId || typeof merchantId !== "string") {
    return res.status(400).json({ error: "merchantId requis" });
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "amount invalide" });
  }

  const txId = makeId();

  const tx = {
    txId,
    merchantId,
    amount,
    status: "pending",
    createdAt: nowMs(),
    expiresAt: nowMs() + 10 * 60 * 1000 // 10 minutes
  };

  txStore.set(txId, tx);
  return res.json(tx);
});

// 2) Lire le statut d’une transaction
app.get("/api/tx/:txId", (req, res) => {
  const txId = req.params.txId;
  const tx = txStore.get(txId);

  if (!tx) {
    return res.status(404).json({ error: "transaction inconnue" });
  }

  // Expiration automatique
  if (tx.status === "pending" && nowMs() > tx.expiresAt) {
    tx.status = "expired";
    txStore.set(txId, tx);
  }

  return res.json(tx);
});

// 3) Simulation: marquer payé (plus tard remplacé par webhook bancaire)
app.post("/api/tx/:txId/simulate_settle", (req, res) => {
  const txId = req.params.txId;
  const tx = txStore.get(txId);

  if (!tx) {
    return res.status(404).json({ error: "transaction inconnue" });
  }

  if (tx.status !== "pending") {
    return res.status(400).json({ error: `statut déjà ${tx.status}` });
  }

  tx.status = "settled";
  tx.settledAt = nowMs();
  txStore.set(txId, tx);

  return res.json(tx);
});

// Pages statiques
app.use("/merchant", express.static(path.join(__dirname, "../merchant")));
app.use("/pay", express.static(path.join(__dirname, "../pay")));

app.get("/", (_req, res) => res.redirect("/merchant/"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("✅ Server running on port", port));
