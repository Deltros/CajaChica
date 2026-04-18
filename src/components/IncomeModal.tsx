"use client";

import { useState } from "react";
import { Modal } from "./ExpenseModal";

type Account = { id: string; name: string; type: string };

type Props = {
  periodId: string;
  accounts: Account[];
  onClose: () => void;
  onSaved: () => void;
};

export default function IncomeModal({ periodId, accounts, onClose, onSaved }: Props) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState<"BANK" | "CASH">("BANK");
  const [showNewAccount, setShowNewAccount] = useState(false);
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
    <Modal title="Agregar ingreso" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta</label>
          {accounts.length > 0 ? (
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.type === "BANK" ? "Banco" : "Efectivo"})</option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-400">No hay cuentas. Crea una abajo.</p>
          )}
          <button
            type="button"
            onClick={() => setShowNewAccount(!showNewAccount)}
            className="mt-1 text-xs text-blue-600 hover:underline"
          >
            + Nueva cuenta
          </button>
        </div>

        {showNewAccount && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <input
              type="text"
              placeholder="Nombre de la cuenta"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setNewAccountType("BANK")}
                className={`flex-1 py-1.5 text-xs rounded-lg border ${newAccountType === "BANK" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}>
                Banco
              </button>
              <button type="button" onClick={() => setNewAccountType("CASH")}
                className={`flex-1 py-1.5 text-xs rounded-lg border ${newAccountType === "CASH" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}>
                Efectivo
              </button>
            </div>
            <button type="button" onClick={createAccount}
              className="w-full py-1.5 bg-gray-700 text-white text-xs rounded-lg">
              Crear cuenta
            </button>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monto (CLP)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            min={1}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ej: Sueldo, Sobra mes anterior"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
