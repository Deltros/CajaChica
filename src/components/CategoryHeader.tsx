import { formatCLP } from "@/lib/format";

type Props = {
  label: string;
  total: number;
  barColor: string;
};

export default function CategoryHeader({ label, total, barColor }: Props) {
  return (
    <div style={{
      padding: "10px 18px", display: "flex", alignItems: "center",
      justifyContent: "space-between", fontSize: 11, letterSpacing: "0.14em",
      textTransform: "uppercase", color: "var(--ink-3)",
      background: "var(--bg-soft)", borderTop: "1px solid var(--line-soft)",
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, color: "var(--ink-2)" }}>
        <span style={{ width: 3, height: 12, borderRadius: 99, background: barColor, display: "block", flexShrink: 0 }} />
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace", fontWeight: 500, color: "var(--ink-2)" }}>
        {formatCLP(total)}
      </span>
    </div>
  );
}
