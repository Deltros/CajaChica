"use client";

import { useState } from "react";
import type { AccountDTO, InstallmentPlanDTO } from "@/domain/types";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontVariantNumeric: "tabular-nums",
};

const CLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

type Props = {
  plan: InstallmentPlanDTO;
  accounts: AccountDTO[];
  onDelete: (id: string) => void;
};

export default function OrphanedPlanItem({ plan, accounts, onDelete }: Props) {
  const [confirm, setConfirm] = useState(false);
  const acc = plan.accountId ? accounts.find((a) => a.id === plan.accountId) : null;
  // paidInstallments is always 0 until the payment confirmation module is built.
  // When that module exists, replace with actual remaining count.
  const remaining = (plan.totalInstallments - plan.paidInstallments) * plan.installmentAmount;

  return (
    <li style={{
      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      gap: 14, padding: "14px 18px", borderTop: "1px solid var(--line-soft)",
      opacity: 0.75,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14.5, color: "var(--ink)" }}>{plan.name}</span>
          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "var(--bg-soft)", color: "var(--ink-3)", border: "1px solid var(--line)", letterSpacing: "0.08em" }}>
            sin cuota este mes
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "var(--ink-3)" }}>
          {acc && (
            <span style={{ padding: "2px 8px", borderRadius: 99, background: "var(--bg-soft)", color: "var(--ink-2)", border: "1px solid var(--line)" }}>
              {acc.name}
            </span>
          )}
          <span>{plan.totalInstallments - plan.paidInstallments} cuotas restantes · {CLP.format(plan.installmentAmount)}/mes</span>
        </div>
      </div>
      {confirm ? (
        <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>¿Eliminar?</span>
          <button onClick={() => setConfirm(false)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 8, background: "var(--bg-soft)", border: "1px solid var(--line)", color: "var(--ink-2)", cursor: "pointer" }}>No</button>
          <button onClick={() => onDelete(plan.id)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 8, background: "var(--danger)", border: "none", color: "white", cursor: "pointer" }}>Sí</button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ ...MONO, fontSize: 13, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
            {CLP.format(remaining)}
          </span>
          <button
            onClick={() => setConfirm(true)}
            aria-label="Eliminar plan"
            style={{ width: 22, height: 22, borderRadius: 99, border: "none", background: "transparent", color: "var(--ink-4)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
      )}
    </li>
  );
}
