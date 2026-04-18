"use client";

import { formatCLP } from "@/lib/format";
import { Modal } from "./ExpenseModal";

type PeriodInstallment = {
  id: string;
  planId: string;
  amount: number;
  isPaid: boolean;
  plan: { name: string; totalInstallments: number; paidInstallments: number };
};

type Props = {
  installments: PeriodInstallment[];
  onClose: () => void;
};

export default function InstallmentsPanel({ installments, onClose }: Props) {
  return (
    <Modal title="Cuotas pendientes este mes" onClose={onClose}>
      <ul className="space-y-3">
        {installments.map((item) => (
          <li key={item.id} className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-800 text-sm">{item.plan.name}</p>
              <p className="font-bold text-yellow-700 text-sm">{formatCLP(item.amount)}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Cuota {item.plan.paidInstallments + 1} de {item.plan.totalInstallments}
            </p>
            <div className="mt-2 bg-yellow-200 rounded-full h-1.5">
              <div
                className="bg-yellow-500 h-1.5 rounded-full"
                style={{ width: `${((item.plan.paidInstallments) / item.plan.totalInstallments) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <button
        onClick={onClose}
        className="mt-4 w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
      >
        Cerrar
      </button>
    </Modal>
  );
}
