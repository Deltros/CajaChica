"use client";

import { useState } from "react";

type Account = { id: string; name: string };

type Props = {
  periodId: string;
  accounts: Account[];
  onClose: () => void;
  onSaved: () => void;
};

export default function ExpenseModal({ periodId, accounts, onClose, onSaved }: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"FIXED" | "VARIABLE" | "SAVING">("VARIABLE");
  const [accountId, setAccountId] = useState<string>("");
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState("2");
  const [startThisMonth, setStartThisMonth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        }),
      });
    } else {
      res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId, description, amount: amountNum, type, accountId: accountId || undefined }),
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

  return (
    <Modal title="Agregar gasto" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Tipo de gasto (solo si no es en cuotas) */}
        {!isInstallment && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {(["VARIABLE", "FIXED", "SAVING"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                    type === t
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {t === "VARIABLE" ? "Variable" : t === "FIXED" ? "Fijo" : "Ahorro"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Monto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isInstallment ? "Monto total (CLP)" : "Monto (CLP)"}
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            min={1}
          />
        </div>

        {/* Cuenta (opcional) */}
        {!isInstallment && accounts.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta <span className="text-gray-400 font-normal">(opcional)</span></label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Sin cuenta</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Toggle cuotas */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setIsInstallment((v) => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${isInstallment ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isInstallment ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
          <span className="text-sm text-gray-700">Pagar en cuotas</span>
        </label>

        {/* Campos de cuotas */}
        {isInstallment && (
          <div className="space-y-3 border border-blue-100 bg-blue-50 rounded-xl p-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Número de cuotas</label>
              <input
                type="number"
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
                min={2}
              />
            </div>

            {amountNum > 0 && installmentsNum > 1 && (
              <p className="text-xs text-blue-700">
                <strong>{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(perInstallment)}</strong> / mes
                {amountNum % installmentsNum !== 0 && (
                  <span className="text-blue-500"> (redondeado)</span>
                )}
              </p>
            )}

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={startThisMonth}
                onChange={(e) => setStartThisMonth(e.target.checked)}
                className="mt-0.5 accent-blue-600"
              />
              <div>
                <p className="text-sm text-gray-700 font-medium">Primera cuota este mes</p>
                <p className="text-xs text-gray-500">
                  {startThisMonth
                    ? "La cuota 1 se descuenta del mes actual"
                    : "La cuota 1 se descuenta del mes que viene (compra después del cierre)"}
                </p>
              </div>
            </label>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-4 py-4 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
