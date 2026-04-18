type Props = {
  income: number;
  totalFixed: number;
  totalSavings: number;
  totalCuotas: number;
  totalVariable: number;
};

export default function DailyDonut({ income, totalFixed, totalSavings, totalCuotas, totalVariable }: Props) {
  const r = 52;
  const c = 2 * Math.PI * r;

  const fixedAndSavings = totalFixed + totalSavings;
  const spent = fixedAndSavings + totalCuotas + totalVariable;
  const over = income > 0 && spent > income;

  const fixedLen = income > 0 ? (fixedAndSavings / income) * c : 0;
  const cuotasLen = income > 0 ? (totalCuotas / income) * c : 0;
  const variableRaw = income > 0 ? (totalVariable / income) * c : 0;
  const variableLen = Math.min(variableRaw, Math.max(0, c - fixedLen - cuotasLen));

  const pctLabel = income > 0 ? `${Math.round((spent / income) * 100)}%` : "0%";
  const subLabel = over ? "SOBREGIRO" : "GASTADO";

  return (
    <div style={{ position: "relative", width: 132, height: 132 }}>
      <svg
        viewBox="0 0 120 120"
        style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}
      >
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="14" />
        {fixedLen > 0 && (
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke="var(--danger)" strokeWidth="14"
            strokeDasharray={`${fixedLen} ${c}`}
            strokeDashoffset="0"
          />
        )}
        {cuotasLen > 0 && (
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke="#D9724C" strokeWidth="14"
            strokeDasharray={`${cuotasLen} ${c}`}
            strokeDashoffset={-fixedLen}
          />
        )}
        {variableLen > 0 && (
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke="#E3A15E" strokeWidth="14"
            strokeDasharray={`${variableLen} ${c}`}
            strokeDashoffset={-(fixedLen + cuotasLen)}
          />
        )}
        {over && (
          <circle
            cx="60" cy="60" r={r - 10} fill="none"
            stroke="var(--danger)" strokeWidth="1.5"
            strokeDasharray="2 3" opacity="0.45"
          />
        )}
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center",
      }}>
        <span style={{
          fontFamily: "var(--font-instrument-serif)",
          fontSize: 28, lineHeight: 1, letterSpacing: "-0.02em",
          color: over ? "var(--danger)" : "var(--ink)",
        }}>
          {pctLabel}
        </span>
        <span style={{
          fontSize: 10, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "var(--ink-3)", marginTop: 4,
        }}>
          {subLabel}
        </span>
      </div>
    </div>
  );
}
