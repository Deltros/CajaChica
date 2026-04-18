"use client";

import { useState, useEffect } from "react";

type Account = { id: string; name: string };

type Props = {
  periodId: string;
  accounts: Account[];
  defaultAccountId?: string;
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
const MONO_INPUT: React.CSSProperties = {
  ...FIELD_INPUT,
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontVariantNumeric: "tabular-nums",
};

export default function ExpenseModal({ periodId, accounts, defaultAccountId, onClose, onSaved }: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"FIXED" | "VARIABLE" | "SAVING">("VARIABLE");
  const [accountId, setAccountId] = useState<string>(defaultAccountId ?? "");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState("2");
  const [startThisMonth, setStartThisMonth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories).catch(() => {});
  }, []);

  const amountNum = parseInt(amount || "0");
  const installmentsNum = parseInt(totalInstallments || "1");
  const perInstallment = isInstallment && installmentsNum > 0
    ? Math.round(amountNum / installmentsNum)
    : amountNum;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    let res: Response;
    if (isInstallment) {
      res = await fetch("/api/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId,
          name: description,
          installmentAmount: perInstallment,
          totalInstallments: installmentsNum,
          startThisMonth,
          accountId: accountId || undefined,
        }),
      });
    } else {
      res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId, description, amount: amountNum, type, accountId: accountId || undefined, categoryIds: selectedCategories }),
      });
    }

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al guardar");
      return;
    }
    onSaved();
    onClose();
  }

  const EXPENSE_TYPES = [
    { value: "VARIABLE", label: "Variable" },
    { value: "FIXED",    label: "Fijo" },
    { value: "SAVING",   label: "Ahorro" },
  ] as const;

  return (
    <Modal title="Nuevo gasto" onClose={onClose}>
      <form onSubmit={handleSubmit}>

        {/* Tipo */}
        {!isInstallment && (
          <div style={{ marginBottom: 14 }}>
            <label style={FIELD_LABEL}>Tipo</label>
            <div style={{
              display: "flex", border: "1px solid var(--line)", borderRadius: 14,
              padding: 3, gap: 3, background: "var(--bg)",
            }}>
              {EXPENSE_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  style={{
                    flex: 1, padding: "9px 8px", border: "none", borderRadius: 11,
                    fontFamily: "inherit", fontSize: 13, cursor: "pointer",
                    background: type === value ? "var(--card)" : "transparent",
                    color: type === value ? "var(--ink)" : "var(--ink-3)",
                    fontWeight: type === value ? 500 : 400,
                    boxShadow: type === value ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Descripción */}
        <div style={{ marginBottom: 14 }}>
          <label style={FIELD_LABEL}>Descripción</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            style={FIELD_INPUT}
          />
        </div>

        {/* Monto */}
        <div style={{ marginBottom: 14 }}>
          <label style={FIELD_LABEL}>{isInstallment ? "Monto total · CLP" : "Monto · CLP"}</label>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min={1}
            placeholder="$0"
            style={MONO_INPUT}
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

        {/* Toggle cuotas */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", fontSize: 14, color: "var(--ink-2)" }}>
            <span>Pagar en cuotas</span>
            <Toggle on={isInstallment} onToggle={() => setIsInstallment((v) => !v)} />
          </div>
        </div>

        {/* Cuotas panel */}
        {isInstallment && (
          <div style={{ marginBottom: 14, background: "var(--bg-soft)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={FIELD_LABEL}>Número de cuotas</label>
              <input
                type="number"
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(e.target.value)}
                required
                min={2}
                style={MONO_INPUT}
              />
            </div>
            {amountNum > 0 && installmentsNum > 1 && (
              <p style={{ fontSize: 12.5, color: "var(--accent)", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                <strong>{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(perInstallment)}</strong> / mes
                {amountNum % installmentsNum !== 0 && (
                  <span style={{ color: "var(--ink-3)" }}> (redondeado)</span>
                )}
              </p>
            )}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 14, color: "var(--ink-2)" }}>
              <input
                type="checkbox"
                checked={startThisMonth}
                onChange={(e) => setStartThisMonth(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <div>
                <p style={{ margin: "0 0 2px", fontWeight: 500, color: "var(--ink)" }}>Primera cuota este mes</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--ink-3)" }}>
                  {startThisMonth
                    ? "La cuota 1 se descuenta del mes actual"
                    : "La cuota 1 se descuenta del mes que viene"}
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Categorías */}
        {!isInstallment && categories.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={FIELD_LABEL}>
              Categorías{" "}
              <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--ink-4)", fontSize: 11 }}>opcional · múltiples</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {categories.map((cat) => {
                const sel = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setSelectedCategories((prev) =>
                        sel ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                      )
                    }
                    style={{
                      fontFamily: "inherit", fontSize: 12.5,
                      background: sel ? "var(--accent)" : "var(--bg-soft)",
                      color: sel ? "var(--bg)" : "var(--ink-2)",
                      border: sel ? "1px solid var(--accent)" : "1px solid var(--line)",
                      borderRadius: 99, padding: "7px 14px", cursor: "pointer",
                    }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

/* ── Shared Modal shell ── */
export function Modal({
  title, eyebrow, onClose, children,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="modal-scrim"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-sheet">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, gap: 12 }}>
          <div>
            {eyebrow && (
              <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 4 }}>
                {eyebrow}
              </div>
            )}
            <h3 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 30, letterSpacing: "-0.02em", lineHeight: 1, margin: 0, color: "var(--ink)" }}>
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              width: 32, height: 32, borderRadius: 99,
              border: "1px solid var(--line)", background: "var(--bg)",
              color: "var(--ink-3)", cursor: "pointer", fontSize: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Toggle pill ── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      style={{
        width: 36, height: 20, borderRadius: 99,
        background: on ? "var(--accent)" : "var(--line)",
        position: "relative", cursor: "pointer",
        transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: 2,
        width: 16, height: 16, borderRadius: 99,
        background: "var(--card)",
        transition: "transform 0.2s",
        transform: on ? "translateX(16px)" : "none",
        display: "block",
      }} />
    </div>
  );
}
