"use client";

import { useState } from "react";
import { Modal } from "./ExpenseModal";
import CategoryPicker from "./CategoryPicker";

type Account = { id: string; name: string; type: string };

type Props = {
  periodId: string;
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

export default function IncomeModal({ periodId, accounts, onClose, onSaved }: Props) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState<"BANK" | "CASH">("BANK");
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createAccount() {
    if (!newAccountName.trim()) return;
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newAccountName, type: newAccountType }),
    });
    if (res.ok) {
      const acc = await res.json();
      accounts.push(acc);
      setAccountId(acc.id);
      setShowNewAccount(false);
      setNewAccountName("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId) { setError("Selecciona una cuenta"); return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/incomes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodId,
        accountId,
        amount: parseInt(amount),
        label: label || undefined,
        categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
      }),
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
    <Modal title="Nuevo ingreso" onClose={onClose}>
      <form onSubmit={handleSubmit}>

        {/* Cuenta */}
        <div style={{ marginBottom: 14 }}>
          <label style={FIELD_LABEL}>Cuenta</label>
          {accounts.length > 0 ? (
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              style={{ ...FIELD_INPUT, appearance: "auto" }}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.type === "BANK" ? "banco" : "efectivo"}
                </option>
              ))}
            </select>
          ) : (
            <p style={{ fontSize: 13, color: "var(--ink-4)", margin: 0 }}>
              No hay cuentas. Crea una abajo.
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowNewAccount((v) => !v)}
            style={{ display: "inline-block", marginTop: 8, fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0 }}
          >
            + Nueva cuenta
          </button>
        </div>

        {/* Nueva cuenta inline panel */}
        {showNewAccount && (
          <div style={{ marginBottom: 14, background: "var(--bg-soft)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={FIELD_LABEL}>Nombre de la cuenta</label>
              <input
                type="text"
                placeholder="ej: Santander Débito"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                style={FIELD_INPUT}
              />
            </div>
            <div style={{
              display: "flex", border: "1px solid var(--line)", borderRadius: 14,
              padding: 3, gap: 3, background: "var(--bg)",
            }}>
              {(["BANK", "CASH"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewAccountType(t)}
                  style={{
                    flex: 1, padding: "9px 8px", border: "none", borderRadius: 11,
                    fontFamily: "inherit", fontSize: 13, cursor: "pointer",
                    background: newAccountType === t ? "var(--card)" : "transparent",
                    color: newAccountType === t ? "var(--ink)" : "var(--ink-3)",
                    fontWeight: newAccountType === t ? 500 : 400,
                    boxShadow: newAccountType === t ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  }}
                >
                  {t === "BANK" ? "Banco" : "Efectivo"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={createAccount}
              style={{ padding: "10px 14px", borderRadius: 14, border: "none", background: "var(--ink)", color: "var(--bg)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500 }}
            >
              Crear cuenta
            </button>
          </div>
        )}

        {/* Monto */}
        <div style={{ marginBottom: 14 }}>
          <label style={FIELD_LABEL}>Monto · CLP</label>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min={1}
            placeholder="$0"
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
            {loading ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
