"use client";

import { useState } from "react";
import { Modal } from "./ExpenseModal";
import CategoryPicker from "./CategoryPicker";
import NumericInput from "./NumericInput";

type Account = { id: string; name: string; type: string; isCreditCard: boolean };

export type EditIncome = {
  id: string;
  amount: number;
  label: string | null;
  accountId: string;
  categories: { category: { id: string; name: string } }[];
};

type Props = {
  periodId: string;
  accounts: Account[];
  editIncome?: EditIncome;
  onClose: () => void;
  onSaved: () => void;
};

const FIELD_LABEL: React.CSSProperties = {
  display: "block", fontSize: 11, letterSpacing: "0.14em",
  textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6,
};
const FIELD_INPUT: React.CSSProperties = {
  width: "100%", fontFamily: "inherit", fontSize: 15,
  background: "var(--bg)", color: "var(--ink)",
  border: "1px solid var(--line)", borderRadius: 14,
  padding: "12px 14px", outline: "none", boxSizing: "border-box",
};

export default function IncomeModal({ periodId, accounts, editIncome, onClose, onSaved }: Props) {
  const isEditing = !!editIncome;
  const debitAccounts = accounts.filter((a) => !a.isCreditCard);
  const [accountId, setAccountId] = useState(editIncome?.accountId ?? debitAccounts[0]?.id ?? "");
  const [amount, setAmount] = useState(editIncome ? String(editIncome.amount) : "");
  const [label, setLabel] = useState(editIncome?.label ?? "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    editIncome?.categories.map((c) => c.category.id) ?? []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId) { setError("Selecciona una cuenta"); return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/incomes", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEditing
        ? { id: editIncome!.id, amount: parseInt(amount), label: label || null, accountId, categoryIds: selectedCategories }
        : { periodId, accountId, amount: parseInt(amount), label: label || undefined, categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined }
      ),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al guardar");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal title={isEditing ? "Editar ingreso" : "Nuevo ingreso"} onClose={onClose}>
      <form onSubmit={handleSubmit}>

        {/* Cuenta */}
        <div style={{ marginBottom: 14 }}>
          <label style={FIELD_LABEL}>Cuenta</label>
          {debitAccounts.length > 0 ? (
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              style={{ ...FIELD_INPUT, appearance: "auto" }}
            >
              {debitAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.type === "BANK" ? "banco" : "efectivo"}
                </option>
              ))}
            </select>
          ) : (
            <p style={{ fontSize: 13, color: "var(--ink-4)", margin: 0 }}>
              No hay cuentas de débito disponibles.
            </p>
          )}
        </div>

        {/* Monto */}
        <div style={{ marginBottom: 14 }}>
          <label style={FIELD_LABEL}>Monto · CLP</label>
          <NumericInput
            value={amount}
            onChange={setAmount}
            placeholder="0"
            style={{
              ...FIELD_INPUT,
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              fontVariantNumeric: "tabular-nums",
            }}
          />
        </div>

        {/* Descripción */}
        <div style={{ marginBottom: 14 }}>
          <label style={FIELD_LABEL}>
            Descripción{" "}
            <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--ink-4)", fontSize: 11 }}>opcional</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ej: Sueldo, sobra mes anterior"
            style={FIELD_INPUT}
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

        {error && (
          <p style={{ fontSize: 13, color: "var(--danger)", marginBottom: 12 }}>{error}</p>
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
            type="submit"
            disabled={loading}
            style={{ flex: 1, padding: 13, borderRadius: 14, border: "none", background: "var(--ink)", color: "var(--bg)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500, opacity: loading ? 0.5 : 1 }}
          >
            {loading ? (isEditing ? "Actualizando…" : "Guardando…") : (isEditing ? "Actualizar" : "Guardar")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
