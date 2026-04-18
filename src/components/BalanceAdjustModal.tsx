"use client";

import { useState } from "react";
import { formatCLP } from "@/lib/format";
import { Modal } from "./ExpenseModal";

type Props = {
  account: { id: string; name: string };
  calculated: number;
  periodId: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function BalanceAdjustModal({ account, calculated, periodId, onClose, onSaved }: Props) {
  const [value, setValue] = useState(String(calculated));
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    const real = parseInt(value || "0");
    const diff = real - calculated;
    if (diff === 0) { onClose(); return; }

    setLoading(true);
    if (diff > 0) {
      await fetch("/api/incomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId, accountId: account.id, amount: diff, label: "Ajuste de saldo" }),
      });
    } else {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId, description: "Ajuste de saldo", amount: Math.abs(diff), type: "VARIABLE", accountId: account.id }),
      });
    }
    setLoading(false);
    onSaved();
    onClose();
  }

  const real = parseInt(value || "0");
  const diff = value !== "" ? real - calculated : null;

  return (
    <Modal title={account.name} eyebrow="Ajuste de saldo" onClose={onClose}>
      {/* Saldo calculado */}
      <div style={{
        background: "var(--bg-soft)", border: "1px solid var(--line)",
        borderRadius: 14, padding: "14px 16px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 16,
      }}>
        <span style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          Saldo calculado
        </span>
        <span style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 22, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
          {formatCLP(calculated)}
        </span>
      </div>

      {/* Input saldo real */}
      <div style={{ marginBottom: 6 }}>
        <label style={{ display: "block", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>
          Saldo real en cuenta · CLP
        </label>
        <input
          type="number"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{
            width: "100%", fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            fontVariantNumeric: "tabular-nums", fontSize: 15,
            background: "var(--bg)", color: "var(--ink)",
            border: "1px solid var(--line)", borderRadius: 14,
            padding: "12px 14px", outline: "none", boxSizing: "border-box",
          }}
        />
        <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: "8px 2px 0", lineHeight: 1.45 }}>
          La diferencia se registrará como un ingreso o gasto llamado{" "}
          <em style={{ fontStyle: "italic", color: "var(--ink-2)" }}>&quot;Ajuste de saldo&quot;</em>.
        </p>
      </div>

      {/* Preview de la diferencia */}
      {diff !== null && diff !== 0 && (
        <div style={{
          borderRadius: 12, padding: "10px 14px", fontSize: 13, marginTop: 12,
          background: diff > 0 ? "var(--accent-soft)" : "var(--danger-soft)",
          color: diff > 0 ? "var(--accent)" : "var(--danger)",
        }}>
          {diff > 0
            ? `Se agregará un ingreso de ${formatCLP(diff)}`
            : `Se agregará un gasto de ${formatCLP(Math.abs(diff))}`}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={onClose}
          style={{ flex: 1, padding: 13, borderRadius: 14, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink-2)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500 }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          style={{ flex: 1, padding: 13, borderRadius: 14, border: "none", background: "var(--ink)", color: "var(--bg)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500, opacity: loading ? 0.5 : 1 }}
        >
          {loading ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </Modal>
  );
}
