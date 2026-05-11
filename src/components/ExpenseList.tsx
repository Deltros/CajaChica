"use client";

import { useState } from "react";
import { formatCLP } from "@/lib/format";
import type { ExpenseDTO } from "@/domain/types";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontVariantNumeric: "tabular-nums",
};

type Props = {
  items: ExpenseDTO[];
  onDelete: (id: string) => void;
  onEdit?: (expense: ExpenseDTO) => void;
  showDate?: boolean;
  emptyText?: string;
};

export default function ExpenseList({ items, onDelete, onEdit, showDate = false, emptyText }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (items.length === 0 && emptyText) {
    return <p style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 13, padding: "16px 0" }}>{emptyText}</p>;
  }

  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {items.map((e, idx) => (
        <li
          key={e.id}
          style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            gap: 12, padding: "14px 18px",
            borderTop: idx === 0 ? "none" : "1px solid var(--line-soft)",
            cursor: onEdit ? "pointer" : "default",
          }}
          onClick={() => onEdit?.(e)}
        >
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              {showDate && (
                <span style={{ fontSize: 11, color: "var(--ink-3)", flexShrink: 0 }}>
                  {new Date(e.date).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                </span>
              )}
              <span style={{ fontSize: 14.5, color: "var(--ink)" }}>{e.description}</span>
            </div>
            {(e.account || e.categories.length > 0 || e.recurringEndYear != null) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: 11 }}>
                {e.account && (
                  <span style={{ padding: "2px 8px", borderRadius: 99, background: "var(--bg-soft)", color: "var(--ink-2)", border: "1px solid var(--line)" }}>
                    {e.account.name}
                  </span>
                )}
                {e.categories.map(({ category }) => (
                  <span key={category.id} style={{ padding: "2px 8px", borderRadius: 99, background: "var(--accent-soft)", color: "var(--accent)", border: "none" }}>
                    {category.name}
                  </span>
                ))}
                {e.recurringEndYear != null && (
                  <span style={{ padding: "2px 8px", borderRadius: 99, background: "var(--bg-soft)", color: "var(--ink-3)", border: "1px solid var(--line-soft)", fontStyle: "italic" }}>
                    Último mes
                  </span>
                )}
              </div>
            )}
          </div>

          {confirmId === e.id ? (
            <div onClick={(ev) => ev.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>¿Eliminar?</span>
              <button onClick={() => setConfirmId(null)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 8, background: "var(--bg-soft)", border: "1px solid var(--line)", color: "var(--ink-2)", cursor: "pointer" }}>No</button>
              <button onClick={() => { setConfirmId(null); onDelete(e.id); }} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 8, background: "var(--danger)", border: "none", color: "white", cursor: "pointer" }}>Sí</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ ...MONO, fontSize: 14, fontWeight: 500, color: "var(--danger)", whiteSpace: "nowrap" }}>
                {formatCLP(e.amount)}
              </span>
              <button
                onClick={(ev) => { ev.stopPropagation(); setConfirmId(e.id); }}
                aria-label="Eliminar gasto"
                style={{ width: 22, height: 22, borderRadius: 99, border: "none", background: "transparent", color: "var(--ink-4)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
