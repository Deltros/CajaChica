"use client";

import { useState } from "react";
import { formatCLP } from "@/lib/format";
import type { IncomeDTO } from "@/domain/types";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontVariantNumeric: "tabular-nums",
};

type Props = {
  items: IncomeDTO[];
  onDelete: (id: string) => void;
  onEdit?: (income: IncomeDTO) => void;
};

export default function IncomeList({ items, onDelete, onEdit }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {items.map((i, idx) => {
        const hasLabel = !!i.label;
        return (
          <li
            key={i.id}
            style={{
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
              gap: 12, padding: "14px 18px",
              borderTop: idx === 0 ? "none" : "1px solid var(--line-soft)",
              cursor: onEdit ? "pointer" : "default",
            }}
            onClick={() => onEdit?.(i)}
          >
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--ink-3)", flexShrink: 0 }}>
                  {new Date(i.date).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                </span>
                <span style={{ fontSize: 14.5, color: "var(--ink)" }}>
                  {hasLabel ? i.label : i.account.name}
                </span>
              </div>
              {(hasLabel || i.categories?.length > 0) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: 11 }}>
                  {hasLabel && (
                    <span style={{ padding: "2px 8px", borderRadius: 99, background: "var(--bg-soft)", color: "var(--ink-2)", border: "1px solid var(--line)" }}>
                      {i.account.name}
                    </span>
                  )}
                  {i.categories?.map(({ category: c }) => (
                    <span key={c.id} style={{ padding: "2px 8px", borderRadius: 99, background: "var(--accent-soft)", color: "var(--accent)", border: "none" }}>
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {confirmId === i.id ? (
              <div onClick={(ev) => ev.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: "var(--ink-3)" }}>¿Eliminar?</span>
                <button onClick={() => setConfirmId(null)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 8, background: "var(--bg-soft)", border: "1px solid var(--line)", color: "var(--ink-2)", cursor: "pointer" }}>No</button>
                <button onClick={() => { setConfirmId(null); onDelete(i.id); }} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 8, background: "var(--danger)", border: "none", color: "white", cursor: "pointer" }}>Sí</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ ...MONO, fontWeight: 500, fontSize: 14, color: "var(--accent)", whiteSpace: "nowrap" }}>
                  + {formatCLP(i.amount)}
                </span>
                <button
                  onClick={(ev) => { ev.stopPropagation(); setConfirmId(i.id); }}
                  aria-label="Eliminar ingreso"
                  style={{ width: 22, height: 22, borderRadius: 99, border: "none", background: "transparent", color: "var(--ink-4)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
