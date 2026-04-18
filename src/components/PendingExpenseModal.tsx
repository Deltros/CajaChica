"use client";

import { useState } from "react";
import { Modal } from "./ExpenseModal";
import { formatCLP } from "@/lib/format";
import CategoryPicker from "./CategoryPicker";

type Account = { id: string; name: string };

type Expense = {
  id: string;
  description: string;
  amount: number;
  accountId: string | null;
  categories: { category: { id: string; name: string } }[];
};

type Props = {
  expense: Expense;
  accounts: Account[];
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

export default function PendingExpenseModal({ expense, accounts, onClose, onSaved }: Props) {
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(String(expense.amount));
  const [accountId, setAccountId] = useState(expense.accountId ?? "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    expense.categories.map((c) => c.category.id)
  );
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function buildBody(extraFields?: Record<string, unknown>) {
    return {
      id: expense.id,
      description,
      amount: parseInt(amount || "0"),
      accountId: accountId || null,
      categoryIds: selectedCategories,
      ...extraFields,
    };
  }

  async function handleSave() {
    setLoading(true);
    await fetch("/api/expenses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBody()),
    });
    setLoading(false);
    onSaved();
    onClose();
  }

  async function handleConvert() {
    setLoading(true);
    await fetch("/api/expenses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBody({ type: "VARIABLE" })),
    });
    setLoading(false);
    onSaved();
    onClose();
  }

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/expenses?id=${expense.id}`, { method: "DELETE" });
    setLoading(false);
    onSaved();
    onClose();
  }

  return (
    <Modal title={expense.description} eyebrow="Gasto pendiente" onClose={onClose}>
      {/* Chip monto actual */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "var(--pending-soft)", color: "var(--pending)",
        borderRadius: 99, padding: "4px 12px", fontSize: 12,
        fontWeight: 500, marginBottom: 18,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--pending)", display: "block" }} />
        {formatCLP(expense.amount)}
      </div>

      {/* Descripción */}
      <div style={{ marginBottom: 14 }}>
        <label style={FIELD_LABEL}>Descripción</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={FIELD_INPUT}
        />
      </div>

      {/* Monto */}
      <div style={{ marginBottom: 14 }}>
        <label style={FIELD_LABEL}>Monto · CLP</label>
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min={1}
          style={{
            ...FIELD_INPUT,
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            fontVariantNumeric: "tabular-nums",
          }}
        />
      </div>

      {/* Cuenta */}
      {accounts.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label style={FIELD_LABEL}>
            Cuenta{" "}
            <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--ink-4)", fontSize: 11 }}>opcional</span>
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            style={{ ...FIELD_INPUT, appearance: "auto" }}
          >
            <option value="">Sin cuenta</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Categorías */}
      <div style={{ marginBottom: 20 }}>
        <label style={FIELD_LABEL}>
          Categorías{" "}
          <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--ink-4)", fontSize: 11 }}>opcional · múltiples</span>
        </label>
        <CategoryPicker selected={selectedCategories} onChange={setSelectedCategories} />
      </div>

      {/* Pasar a gasto normal */}
      <button
        type="button"
        onClick={handleConvert}
        disabled={loading}
        style={{
          width: "100%", padding: "13px", borderRadius: 14, border: "none",
          background: "var(--pending)", color: "#fff",
          cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500,
          marginBottom: 10, opacity: loading ? 0.5 : 1,
        }}
      >
        Pasar a gasto normal
      </button>

      <div style={{ display: "flex", gap: 10 }}>
        {confirmDelete ? (
          <>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              style={{ flex: 1, padding: 13, borderRadius: 14, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink-2)", cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              style={{ flex: 1, padding: 13, borderRadius: 14, border: "none", background: "var(--danger)", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500 }}
            >
              Sí, eliminar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              style={{ flex: 1, padding: 13, borderRadius: 14, border: "1px solid var(--danger-soft)", background: "transparent", color: "var(--danger)", cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}
            >
              Eliminar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              style={{ flex: 1, padding: 13, borderRadius: 14, border: "none", background: "var(--ink)", color: "var(--bg)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500, opacity: loading ? 0.5 : 1 }}
            >
              {loading ? "Guardando…" : "Guardar"}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
