"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Account = { id: string; name: string; type: string; isActive: boolean; isDefault: boolean };

const SERIF: React.CSSProperties = { fontFamily: "var(--font-instrument-serif), serif" };

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label?: string }) {
  return (
    <div
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label={label}
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

export default function CuentasPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"BANK" | "CASH">("BANK");
  const [creating, setCreating] = useState(false);

  async function fetchAccounts() {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    setAccounts(data);
    setLoading(false);
  }

  useEffect(() => { fetchAccounts(); }, []);

  async function saveName(id: string) {
    if (!editingName.trim()) return;
    await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editingName.trim() }),
    });
    setEditingId(null);
    fetchAccounts();
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    fetchAccounts();
  }

  async function setDefault(id: string) {
    await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isDefault: true }),
    });
    fetchAccounts();
  }

  async function createAccount() {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), type: newType }),
    });
    setNewName("");
    setNewType("BANK");
    setShowNewForm(false);
    setCreating(false);
    fetchAccounts();
  }

  return (
    <div className="app-frame">
      <div className="app-shell">

        {/* ── Header ── */}
        <header className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <button
            onClick={() => router.back()}
            aria-label="Volver"
            style={{ width: 40, height: 40, borderRadius: 999, background: "var(--card)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ink)", flexShrink: 0 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 18, height: 18 }}>
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <div style={{ ...SERIF, fontSize: 22, letterSpacing: "-0.02em", color: "var(--ink)" }}>Cuentas</div>
          <div style={{ width: 40 }} />
        </header>

        {/* ── Body ── */}
        <div className="page-body" style={{}}>
          <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5, margin: "6px 2px 18px" }}>
            Las cuentas inactivas no aparecen en los selectores al agregar ingresos o gastos.
          </p>

          {loading ? (
            <p style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 13, padding: "20px 0" }}>Cargando…</p>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    style={{
                      background: account.isDefault
                        ? "linear-gradient(0deg, var(--accent-soft) 0%, var(--card) 60%)"
                        : "var(--card)",
                      border: `1px solid ${account.isDefault ? "var(--accent-soft)" : "var(--line)"}`,
                      borderRadius: 20,
                      padding: "16px 18px",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      gap: 12,
                      opacity: account.isActive ? 1 : 0.5,
                    }}
                  >
                    {/* Left */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingId === account.id ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <input
                            autoFocus
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveName(account.id); if (e.key === "Escape") setEditingId(null); }}
                            style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 10, padding: "6px 10px", fontSize: 14, background: "var(--bg)", color: "var(--ink)", outline: "none", fontFamily: "inherit" }}
                          />
                          <button onClick={() => saveName(account.id)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 10, background: "var(--ink)", color: "var(--bg)", border: "none", cursor: "pointer", fontWeight: 500 }}>OK</button>
                          <button onClick={() => setEditingId(null)} style={{ fontSize: 18, color: "var(--ink-4)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}>×</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>{account.name}</span>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "var(--bg-soft)", border: "1px solid var(--line)", color: "var(--ink-3)" }}>
                            {account.type === "BANK" ? "Banco" : "Efectivo"}
                          </span>
                          <button
                            onClick={() => { setEditingId(account.id); setEditingName(account.name); }}
                            style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0 }}
                          >
                            Editar
                          </button>
                        </div>
                      )}
                      <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: 0 }}>
                        {account.isDefault ? "Cuenta por defecto en gastos" : "Sin rol asignado"}
                      </p>
                    </div>

                    {/* Right */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <Toggle
                        on={account.isActive}
                        onToggle={() => toggleActive(account.id, account.isActive)}
                        label={`${account.name} activa`}
                      />
                      {account.isDefault ? (
                        <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: "var(--accent)", color: "var(--bg)", fontWeight: 500, whiteSpace: "nowrap" }}>
                          Predeterminada
                        </span>
                      ) : (
                        <button
                          onClick={() => setDefault(account.id)}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: "var(--bg-soft)", border: "1px solid var(--line)", color: "var(--ink-2)", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}
                        >
                          Predeterminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Nueva cuenta */}
              {showNewForm ? (
                <div style={{ marginTop: 16, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nombre (ej: Banco Santander Débito)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") createAccount(); if (e.key === "Escape") setShowNewForm(false); }}
                    style={{ width: "100%", fontFamily: "inherit", fontSize: 15, background: "var(--bg)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 14px", outline: "none", boxSizing: "border-box" }}
                  />
                  <div style={{ display: "flex", border: "1px solid var(--line)", borderRadius: 14, padding: 3, gap: 3, background: "var(--bg)" }}>
                    {(["BANK", "CASH"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewType(t)}
                        style={{
                          flex: 1, padding: "9px 8px", border: "none", borderRadius: 11,
                          fontFamily: "inherit", fontSize: 13, cursor: "pointer",
                          background: newType === t ? "var(--card)" : "transparent",
                          color: newType === t ? "var(--ink)" : "var(--ink-3)",
                          fontWeight: newType === t ? 500 : 400,
                          boxShadow: newType === t ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                        }}
                      >
                        {t === "BANK" ? "Banco" : "Efectivo"}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => setShowNewForm(false)}
                      style={{ flex: 1, padding: 13, borderRadius: 14, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink-2)", cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={createAccount}
                      disabled={creating || !newName.trim()}
                      style={{ flex: 1, padding: 13, borderRadius: 14, border: "none", background: "var(--ink)", color: "var(--bg)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500, opacity: (creating || !newName.trim()) ? 0.5 : 1 }}
                    >
                      {creating ? "Guardando…" : "Guardar"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewForm(true)}
                  style={{ width: "100%", marginTop: 16, display: "flex", alignItems: "center", gap: 10, background: "transparent", border: "1.5px dashed var(--line)", borderRadius: 20, padding: "14px 18px", cursor: "pointer", color: "var(--ink-3)", fontFamily: "inherit", fontSize: 14 }}
                >
                  <span style={{ width: 24, height: 24, borderRadius: 99, background: "var(--bg-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>+</span>
                  Nueva cuenta
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
