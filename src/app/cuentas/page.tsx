"use client";

import { useEffect, useState } from "react";
import HamburgerMenu from "@/components/HamburgerMenu";

type Account = { id: string; name: string; type: string; isActive: boolean };

export default function CuentasPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HamburgerMenu />
          <h1 className="text-lg font-semibold text-gray-800">Mantenedor de tarjetas</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <p className="text-center text-gray-400 py-10">Cargando...</p>
        ) : accounts.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No hay cuentas registradas</p>
        ) : (
          <section className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-400">Las cuentas inactivas no aparecen en los selectores al agregar ingresos o gastos</p>
            </div>
            <ul className="divide-y divide-gray-50">
              {accounts.map((account) => (
                <li key={account.id} className={`flex items-center justify-between px-4 py-3 gap-3 ${!account.isActive ? "opacity-50" : ""}`}>
                  <div className="flex-1 min-w-0">
                    {editingId === account.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveName(account.id); if (e.key === "Escape") setEditingId(null); }}
                          className="flex-1 border border-blue-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={() => saveName(account.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg">OK</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{account.name}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {account.type === "BANK" ? "Banco" : "Efectivo"}
                        </span>
                        <button
                          onClick={() => { setEditingId(account.id); setEditingName(account.name); }}
                          className="text-xs text-blue-500 hover:text-blue-700"
                        >
                          Editar
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleActive(account.id, account.isActive)}
                    className={`shrink-0 relative w-10 h-5 rounded-full transition-colors ${account.isActive ? "bg-blue-600" : "bg-gray-300"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${account.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
