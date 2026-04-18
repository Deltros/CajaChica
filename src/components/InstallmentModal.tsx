"use client";

import { useState } from "react";
import { Modal } from "./ExpenseModal";

type Props = {
  year: number;
  month: number;
  onClose: () => void;
  onSaved: () => void;
};

export default function InstallmentModal({ year, month, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const amount = parseInt(installmentAmount || "0");
  const total = parseInt(totalInstallments || "1");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/installments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        installmentAmount: amount,
        totalAmount: amount * total,
        totalInstallments: total,
        startYear: year,
        startMonth: month,
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
    <Modal title="Agregar cuotas" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej: Bicicleta, Celular"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monto por cuota (CLP)</label>
          <input
            type="number"
            value={installmentAmount}
            onChange={(e) => setInstallmentAmount(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            min={1}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Número de cuotas</label>
          <input
            type="number"
            value={totalInstallments}
            onChange={(e) => setTotalInstallments(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            min={1}
          />
        </div>
        {amount > 0 && total > 0 && (
          <div className="bg-blue-50 rounded-lg p-3 text-sm">
            <p className="text-blue-700">
              Total: <strong>{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(amount * total)}</strong>
            </p>
            <p className="text-blue-500 text-xs mt-1">
              Se recordará por {total} {total === 1 ? "mes" : "meses"} desde este mes
            </p>
          </div>
        )}
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
