import { formatCLP } from "@/lib/format";

type Props = {
  income: number;
  totalFixed: number;
  totalSavings: number;
  totalCuotas: number;
  totalVariable: number;
  totalPending?: number;
};

export default function StackedBudgetBar({ income, totalFixed, totalSavings, totalCuotas, totalVariable, totalPending = 0 }: Props) {
  const fixedAndSavings = totalFixed + totalSavings;
  const spent = fixedAndSavings + totalCuotas + totalVariable;
  const remaining = income - spent;
  const remainingWithPending = remaining - totalPending;
  const base = Math.max(income, spent, 1);

  const pct = (val: number) =>
    `${Math.min(100, (Math.max(0, val) / base) * 100)}%`;

  return (
    <div style={{ padding: "8px 22px 0" }}>
      <div style={{
        background: "var(--card)", border: "1px solid var(--line)",
        borderRadius: 24, padding: "18px 18px 16px",
      }}>
        <div style={{
          display: "flex", alignItems: "baseline",
          justifyContent: "space-between", marginBottom: 14,
        }}>
          <span style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            Ingresos del mes
          </span>
          <span style={{ fontFamily: "var(--font-instrument-serif)", fontSize: 22, letterSpacing: "-0.02em" }}>
            {formatCLP(income)}
          </span>
        </div>

        <div style={{
          display: "flex", width: "100%", height: 14, borderRadius: 99,
          overflow: "hidden", background: "var(--line-soft)", border: "1px solid var(--line)",
        }}>
          {fixedAndSavings > 0 && <span style={{ display: "block", height: "100%", width: pct(fixedAndSavings), background: "var(--danger)" }} />}
          {totalCuotas > 0 && <span style={{ display: "block", height: "100%", width: pct(totalCuotas), background: "#D9724C" }} />}
          {totalVariable > 0 && <span style={{ display: "block", height: "100%", width: pct(totalVariable), background: "#E3A15E" }} />}
          {remaining > 0 && <span style={{ display: "block", height: "100%", width: pct(remaining), background: "var(--accent)" }} />}
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "8px 14px", marginTop: 14, fontSize: 12,
        }}>
          <LegendRow color="var(--danger)" label="Fijos + ahorro" value={formatCLP(fixedAndSavings)} />
          <LegendRow color="#D9724C" label="Cuotas" value={formatCLP(totalCuotas)} />
          <LegendRow color="#E3A15E" label="Variables" value={formatCLP(totalVariable)} />
          <LegendRow
            color="var(--accent)"
            label="Disponible"
            value={remaining < 0 ? `−${formatCLP(Math.abs(remaining))}` : formatCLP(remaining)}
            valueColor={remaining < 0 ? "var(--danger)" : "var(--ink)"}
          />
          {totalPending > 0 && (
            <LegendRow
              color="var(--pending)"
              label="Disp. c/ pend."
              value={remainingWithPending < 0 ? `−${formatCLP(Math.abs(remainingWithPending))}` : formatCLP(remainingWithPending)}
              valueColor={remainingWithPending < 0 ? "var(--danger)" : "var(--pending)"}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value, valueColor = "var(--ink)" }: {
  color: string; label: string; value: string; valueColor?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-2)" }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0, display: "block" }} />
        {label}
      </span>
      <span style={{ color: valueColor, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}
