"use client";

import { useState } from "react";
import { formatCLP } from "@/lib/format";
import { Modal } from "./ExpenseModal";
import CategoryPicker from "./CategoryPicker";
import NumericInput from "./NumericInput";

const MONO: React.CSSProperties = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace", fontVariantNumeric: "tabular-nums" };
const SERIF: React.CSSProperties = { fontFamily: "var(--font-instrument-serif), serif" };
const FIELD_LABEL: React.CSSProperties = {
  display: "block", fontSize: 11, letterSpacing: "0.14em",
  textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6,
};

type Props = {
  account: { id: string; name: string };
  calculated: number;
  totalRemainingDebt: number;
  isCreditCard: boolean;
  periodId: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function BalanceAdjustModal({ account, calculated, totalRemainingDebt, isCreditCard, periodId, onClose, onSaved }: Props) {
  const isCreditAccount = isCreditCard;
  const [mode, setMode] = useState<"total" | "monthly">(isCreditAccount ? "total" : "monthly");
  const [totalValue, setTotalValue] = useState(String(-totalRemainingDebt));
  const [monthlyValue, setMonthlyValue] = useState(String(calculated));
  const [description, setDescription] = useState(
    isCreditAccount ? "Ajuste de saldo total" : "Ajuste de saldo"
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function computeDiff(): number | null {
    if (mode === "total") {
      const v = totalValue.trim();
      if (v === "" || v === "-") return null;
      const n = parseInt(v);
      if (isNaN(n)) return null;
      return n - (-totalRemainingDebt);
    } else {
      const v = monthlyValue.trim();
      if (v === "" || v === "-") return null;
      const n = parseInt(v);
      if (isNaN(n)) return null;
      return n - calculated;
    }
  }

  async function handleSave() {
    const diff = computeDiff();
    if (diff === null || diff === 0) { onClose(); return; }
    const entrySource = mode === "total" ? "BALANCE_ADJUST_TOTAL" : "BALANCE_ADJUST_MONTHLY";
    const label = description.trim() || (mode === "total" ? "Ajuste de saldo total" : "Ajuste de saldo");
    setLoading(true);
    if (diff > 0) {
      await fetch("/api/incomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId, accountId: account.id, amount: diff, label, source: entrySource, categoryIds: selectedCategories }),
      });
    } else {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId, description: label, amount: Math.abs(diff), type: "VARIABLE", source: entrySource, accountId: account.id, categoryIds: selectedCategories }),
      });
    }
    setLoading(false);
    onSaved();
    onClose();
  }

  const diff = computeDiff();

  const inputStyle = (active: boolean): React.CSSProperties => ({
    width: "100%", ...MONO, fontSize: 15,
    background: active ? "var(--bg)" : "var(--bg-soft)",
    color: active ? "var(--ink)" : "var(--ink-4)",
    border: `1px solid ${active ? "var(--line)" : "var(--line-soft)"}`,
    borderRadius: 14,
    padding: "12px 14px", outline: "none", boxSizing: "border-box",
    opacity: active ? 1 : 0.55,
    cursor: active ? "text" : "not-allowed",
    transition: "opacity 0.15s, background 0.15s",
  });

  return (
    <Modal title={account.name} eyebrow="Ajuste de saldo" onClose={onClose}>

      {isCreditAccount && (
        <p style={{ fontSize: 11, color: "var(--ink-3)", background: "var(--bg-soft)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "6px 10px", margin: "0 0 12px", lineHeight: 1.5 }}>
          Al tener pagos en cuotas, se considera como una tarjeta de crédito. Si se modifica su saldo, se recomienda modificar el total.
        </p>
      )}

      {/* Saldo calculado */}
      {isCreditAccount ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          <div style={{ background: "var(--bg-soft)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)" }}>
              Pago este mes
            </span>
            <span style={{ ...SERIF, fontSize: 18, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {formatCLP(calculated)}
            </span>
          </div>
          <div style={{ background: "var(--bg-soft)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)" }}>
              Total tarjeta
            </span>
            <span style={{ ...SERIF, fontSize: 18, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: "var(--danger)" }}>
              {formatCLP(-totalRemainingDebt)}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--bg-soft)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            Saldo calculado
          </span>
          <span style={{ ...SERIF, fontSize: 22, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
            {formatCLP(calculated)}
          </span>
        </div>
      )}

      {/* Toggle de modo (solo para cuentas de crédito) */}
      {isCreditAccount && (
        <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--bg-soft)", borderRadius: 13, marginBottom: 14, border: "1px solid var(--line)" }}>
          <button
            type="button"
            onClick={() => setMode("total")}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 10, border: "none",
              cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 500,
              background: mode === "total" ? "var(--ink)" : "transparent",
              color: mode === "total" ? "var(--bg)" : "var(--ink-3)",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            Ajuste total
          </button>
          <button
            type="button"
            onClick={() => setMode("monthly")}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 10, border: "none",
              cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 500,
              background: mode === "monthly" ? "var(--ink)" : "transparent",
              color: mode === "monthly" ? "var(--bg)" : "var(--ink-3)",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            Ajuste mes
          </button>
        </div>
      )}

      {/* Inputs de monto */}
      {isCreditAccount ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ ...FIELD_LABEL, color: mode === "total" ? "var(--ink-3)" : "var(--ink-4)" }}>
              Total tarjeta real · CLP
            </label>
            <NumericInput
              value={totalValue}
              onChange={setTotalValue}
              disabled={mode !== "total"}
              autoFocus={mode === "total"}
              style={inputStyle(mode === "total")}
            />
          </div>
          <div>
            <label style={{ ...FIELD_LABEL, color: mode === "monthly" ? "var(--ink-3)" : "var(--ink-4)" }}>
              Saldo real este mes · CLP
            </label>
            <NumericInput
              value={monthlyValue}
              onChange={setMonthlyValue}
              disabled={mode !== "monthly"}
              style={inputStyle(mode === "monthly")}
            />
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <label style={FIELD_LABEL}>Saldo real en cuenta · CLP</label>
          <NumericInput
            autoFocus
            value={monthlyValue}
            onChange={setMonthlyValue}
            style={inputStyle(true)}
          />
        </div>
      )}

      {/* Preview de la diferencia */}
      {diff !== null && diff !== 0 && (
        <div style={{
          borderRadius: 12, padding: "10px 14px", fontSize: 13, marginBottom: 14,
          background: diff > 0 ? "var(--accent-soft)" : "var(--danger-soft)",
          color: diff > 0 ? "var(--accent)" : "var(--danger)",
        }}>
          {diff > 0
            ? `Se agregará un ingreso de ${formatCLP(diff)}`
            : `Se agregará un gasto de ${formatCLP(Math.abs(diff))}`}
        </div>
      )}

      {/* Descripción */}
      <div style={{ marginBottom: 14 }}>
        <label style={FIELD_LABEL}>Descripción</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            width: "100%", fontFamily: "inherit", fontSize: 14,
            background: "var(--bg)", color: "var(--ink)",
            border: "1px solid var(--line)", borderRadius: 14,
            padding: "12px 14px", outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Categorías */}
      <div style={{ marginBottom: 14 }}>
        <label style={FIELD_LABEL}>
          Categorías{" "}
          <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--ink-4)", fontSize: 11 }}>opcional · múltiples</span>
        </label>
        <CategoryPicker selected={selectedCategories} onChange={setSelectedCategories} />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
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
