"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCLP, daysLeftInMonth } from "@/lib/format";
import ExpenseModal, { Modal, type EditExpense } from "@/components/ExpenseModal";
import type { EditIncome } from "@/components/IncomeModal";
import IncomeModal from "@/components/IncomeModal";
import BalanceAdjustModal from "@/components/BalanceAdjustModal";
import HamburgerMenu from "@/components/HamburgerMenu";
import { Logo } from "@/components/Logo";
import DailyDonut from "@/components/DailyDonut";
import StackedBudgetBar from "@/components/StackedBudgetBar";
import PendingExpenseModal from "@/components/PendingExpenseModal";

type Account = { id: string; name: string; type: string; isActive: boolean; isDefault: boolean };
type Income = { id: string; accountId: string; amount: number; label: string | null; date: string; source: string; account: Account; categories: { category: { id: string; name: string } }[] };
type Expense = { id: string; description: string; amount: number; type: string; date: string; source: string; accountId: string | null; account: { name: string } | null; categories: { category: { id: string; name: string } }[] };
type PeriodInstallment = { id: string; planId: string; amount: number; isPaid: boolean; plan: { name: string; totalInstallments: number; paidInstallments: number; totalAmount: number; startYear: number; startMonth: number; accountId: string | null } };
type Period = { id: string; incomes: Income[]; expenses: Expense[]; installments: PeriodInstallment[] };
type InstallmentPlan = { id: string; name: string; totalInstallments: number; paidInstallments: number; installmentAmount: number; accountId: string | null };

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DOT_COLORS = ["var(--accent)", "var(--cool)", "#C2883D", "var(--ink-4)", "var(--danger)"];

const MONO: React.CSSProperties = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace", fontVariantNumeric: "tabular-nums" };
const SERIF: React.CSSProperties = { fontFamily: "var(--font-instrument-serif), serif" };

function neg(val: number) {
  return `−${formatCLP(Math.abs(val))}`;
}

export default function DashboardPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [period, setPeriod] = useState<Period | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allPlans, setAllPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<PeriodInstallment | null>(null);
  const [confirmDeleteInstallment, setConfirmDeleteInstallment] = useState(false);
  const [balanceEdit, setBalanceEdit] = useState<{ account: Account; calculated: number; totalRemainingDebt: number } | null>(null);
  const [showIngresos, setShowIngresos] = useState(true);
  const [showSaldo, setShowSaldo] = useState(true);
  const [showGastos, setShowGastos] = useState(true);
  const [selectedPending, setSelectedPending] = useState<Expense | null>(null);
  const [editExpense, setEditExpense] = useState<EditExpense | null>(null);
  const [editIncome, setEditIncome] = useState<EditIncome | null>(null);

  const fetchPeriod = useCallback(async () => {
    setLoading(true);
    const [periodRes, accountsRes, plansRes] = await Promise.all([
      fetch(`/api/periods?year=${year}&month=${month}`),
      fetch("/api/accounts"),
      fetch("/api/installments"),
    ]);
    const [periodData, accountsData, plansData] = await Promise.all([periodRes.json(), accountsRes.json(), plansRes.json()]);
    setPeriod(periodData);
    setAccounts(accountsData);
    setAllPlans(plansData);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchPeriod(); }, [fetchPeriod]);

  async function deleteExpense(id: string) {
    await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    fetchPeriod();
  }

  async function deleteInstallmentPlan(planId: string) {
    await fetch(`/api/installments?id=${planId}`, { method: "DELETE" });
    setSelectedInstallment(null);
    setConfirmDeleteInstallment(false);
    fetchPeriod();
  }

  async function deleteIncome(id: string) {
    await fetch(`/api/incomes?id=${id}`, { method: "DELETE" });
    fetchPeriod();
  }

  const activeAccounts = accounts.filter((a) => a.isActive);
  const totalIncome = period?.incomes.reduce((s, i) => s + i.amount, 0) ?? 0;
  const fixedExpenses = period?.expenses.filter((e) => e.type === "FIXED") ?? [];
  const savings = period?.expenses.filter((e) => e.type === "SAVING") ?? [];
  const variableExpenses = period?.expenses.filter((e) => e.type === "VARIABLE") ?? [];
  const totalFixed = fixedExpenses.reduce((s, e) => s + e.amount, 0);
  const totalSavings = savings.reduce((s, e) => s + e.amount, 0);
  const totalVariable = variableExpenses.reduce((s, e) => s + e.amount, 0);
  const pendingInstallments = period?.installments.filter((i) => !i.isPaid) ?? [];
  const totalPendingInstallments = pendingInstallments.reduce((s, i) => s + i.amount, 0);
  const orphanedPlans = allPlans.filter((p) => !pendingInstallments.some((pi) => pi.planId === p.id));
  const remaining = totalIncome - totalFixed - totalSavings - totalVariable - totalPendingInstallments;
  const daysLeft = daysLeftInMonth();
  const dailyBudget = daysLeft > 0 ? Math.floor(remaining / daysLeft) : 0;

  const pendingExpenses = period?.expenses.filter((e) => e.type === "PENDING") ?? [];
  const totalPending = pendingExpenses.reduce((s, e) => s + e.amount, 0);
  const dailyBudgetWithPending = daysLeft > 0 ? Math.floor((remaining - totalPending) / daysLeft) : 0;

  const accountBalances = activeAccounts.map((account) => {
    const inc = period?.incomes.filter((i) => i.accountId === account.id).reduce((s, i) => s + i.amount, 0) ?? 0;
    const spent = period?.expenses.filter((e) => e.accountId === account.id && e.type !== "PENDING").reduce((s, e) => s + e.amount, 0) ?? 0;
    const instSpent = period?.installments.filter((i) => !i.isPaid && i.plan.accountId === account.id).reduce((s, i) => s + i.amount, 0) ?? 0;
    const pendingSpent = pendingExpenses.filter((e) => e.accountId === account.id).reduce((s, e) => s + e.amount, 0);
    const plansDebt = allPlans
      .filter((p) => p.accountId === account.id)
      .reduce((s, p) => s + (p.totalInstallments - p.paidInstallments) * p.installmentAmount, 0);
    const adjExpenses = period?.expenses
      .filter((e) => e.accountId === account.id && e.source === "BALANCE_ADJUST_TOTAL")
      .reduce((s, e) => s + e.amount, 0) ?? 0;
    const adjIncomes = period?.incomes
      .filter((i) => i.accountId === account.id && i.source === "BALANCE_ADJUST_TOTAL")
      .reduce((s, i) => s + i.amount, 0) ?? 0;
    const totalRemainingDebt = plansDebt + adjExpenses - adjIncomes;
    return { account, balance: inc - spent - instSpent, pendingSpent, totalRemainingDebt };
  });
  const totalPositive = accountBalances.filter((b) => b.balance > 0).reduce((s, b) => s + b.balance, 0);
  const totalNegative = accountBalances.filter((b) => b.balance < 0).reduce((s, b) => s + b.balance, 0);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const chevStyle = (open: boolean): React.CSSProperties => ({
    width: 22, height: 22, borderRadius: 99,
    background: "var(--bg-soft)",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "transform 0.25s",
    transform: open ? "rotate(90deg)" : "none",
    color: "var(--ink-3)", fontSize: 16, flexShrink: 0,
    userSelect: "none",
  });

  return (
    <div className="app-frame">
      <div className="app-shell">

        {/* ── Header bar ── */}
        <header className="dash-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <HamburgerMenu />
          <Logo size={34} showTagline={false} />
        </header>

        {/* ── Month selector ── */}
        <div className="dash-month-nav" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={prevMonth}
            aria-label="Mes anterior"
            style={{ background: "none", border: "none", color: "var(--ink-3)", fontSize: 22, cursor: "pointer", width: 32, height: 32, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center" }}
          >‹</button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--ink-3)", marginBottom: 4 }}>Período</span>
            <span style={{ ...SERIF, fontSize: 26, letterSpacing: "-0.02em" }}>{MONTHS[month - 1]} {year}</span>
          </div>
          <button
            onClick={nextMonth}
            aria-label="Mes siguiente"
            style={{ background: "none", border: "none", color: "var(--ink-3)", fontSize: 22, cursor: "pointer", width: 32, height: 32, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center" }}
          >›</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-3)", fontSize: 14 }}>Cargando…</div>
        ) : (
          <>
            <div className="dash-body">
              <div className="dash-col-left">
            {/* ── Hero card ── */}
            <section style={{ padding: "18px 22px 8px" }}>
              <div style={{
                background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24,
                padding: 22, display: "grid", gridTemplateColumns: "1fr 132px", gap: 18, alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                    Gasto diario disponible
                  </div>
                  <div style={{
                    display: "flex", alignItems: "baseline", gap: 4,
                    margin: "8px 0 10px",
                    ...SERIF, fontSize: 64, lineHeight: 0.95, letterSpacing: "-0.03em",
                    color: dailyBudget < 0 ? "var(--danger)" : "var(--ink)",
                  }}>
                    {dailyBudget < 0 && (
                      <span style={{ fontSize: 28, color: "var(--ink-3)", transform: "translateY(-16px)", display: "inline-block" }}>−</span>
                    )}
                    <span>{formatCLP(Math.abs(dailyBudget))}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-2)", fontSize: 13 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--accent)", flexShrink: 0, display: "block" }} />
                    <span>
                      {daysLeft} <span style={{ color: "var(--ink-3)" }}>días restantes de mes</span>
                    </span>
                  </div>
                  {totalPending > 0 && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--pending)", fontVariantNumeric: "tabular-nums" }}>
                      ({dailyBudgetWithPending < 0 ? neg(dailyBudgetWithPending) : formatCLP(dailyBudgetWithPending)} con pendientes)
                    </div>
                  )}
                </div>
                <DailyDonut
                  income={totalIncome}
                  totalFixed={totalFixed}
                  totalSavings={totalSavings}
                  totalCuotas={totalPendingInstallments}
                  totalVariable={totalVariable}
                />
              </div>
            </section>

            {/* ── Stacked budget bar ── */}
            <StackedBudgetBar
              income={totalIncome}
              totalFixed={totalFixed}
              totalSavings={totalSavings}
              totalCuotas={totalPendingInstallments}
              totalVariable={totalVariable}
              totalPending={totalPending}
            />

            {/* ── Ingresos ── */}
            <section style={{ padding: "0 22px", marginTop: 18 }}>
              <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, overflow: "hidden" }}>
                <div
                  onClick={() => setShowIngresos((v) => !v)}
                  style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={chevStyle(showIngresos)}>›</span>
                    <span style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-2)", fontWeight: 600 }}>Ingresos</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ ...SERIF, fontSize: 22, letterSpacing: "-0.02em", color: "var(--accent)" }}>
                      {formatCLP(totalIncome)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowIncomeModal(true); }}
                      style={{ fontSize: 12, color: "var(--ink-2)", background: "var(--bg-soft)", border: "1px solid var(--line)", padding: "4px 10px", borderRadius: 99, cursor: "pointer", fontWeight: 500 }}
                    >
                      +
                    </button>
                  </div>
                </div>
                {showIngresos && (
                  <div style={{ borderTop: "1px solid var(--line-soft)" }}>
                    {!period?.incomes.length ? (
                      <p style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 13, padding: "16px 0" }}>Sin ingresos registrados</p>
                    ) : (
                      <IncomeList items={period.incomes} onDelete={deleteIncome} onEdit={setEditIncome} />
                    )}
                  </div>
                )}
              </div>
            </section>
              </div>
              <div className="dash-col-right">
            {/* ── Saldo en cuentas ── */}
            {activeAccounts.length > 0 && (
              <section style={{ padding: "0 22px", marginTop: 18 }}>
                <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, overflow: "hidden" }}>
                  <div
                    onClick={() => setShowSaldo((v) => !v)}
                    style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer", userSelect: "none" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={chevStyle(showSaldo)}>›</span>
                      <span style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-2)", fontWeight: 600 }}>Saldo en cuentas</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "var(--accent)" }}>{formatCLP(totalPositive)}</span>
                      <span>·</span>
                      <span style={{ color: "var(--danger)" }}>{totalNegative < 0 ? neg(totalNegative) : formatCLP(0)}</span>
                    </div>
                  </div>
                  {showSaldo && (
                    <div style={{ borderTop: "1px solid var(--line-soft)" }}>
                      {accountBalances.some((b) => b.pendingSpent > 0) && (
                        <div style={{
                          padding: "8px 18px", borderBottom: "1px solid var(--line-soft)",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          background: "var(--pending-soft)",
                        }}>
                          <span style={{ fontSize: 11, color: "var(--pending)", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                            Con pendientes
                          </span>
                          <span style={{ ...MONO, fontSize: 12, color: "var(--pending)", fontWeight: 500 }}>
                            {neg(totalNegative - accountBalances.reduce((s, b) => s + b.pendingSpent, 0))}
                          </span>
                        </div>
                      )}
                      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {accountBalances.map(({ account, balance, pendingSpent, totalRemainingDebt }, idx) => (
                          <li
                            key={account.id}
                            onClick={() => setBalanceEdit({ account, calculated: balance, totalRemainingDebt })}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "14px 18px",
                              borderTop: idx === 0 ? "none" : "1px solid var(--line-soft)",
                              fontSize: 14, cursor: "pointer",
                            }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ width: 10, height: 10, borderRadius: 3, background: DOT_COLORS[idx % DOT_COLORS.length], flexShrink: 0, display: "block" }} />
                              {account.name}
                            </span>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                              <span style={{ ...MONO, fontWeight: 500, fontSize: 13.5, color: balance > 0 ? "var(--accent)" : balance < 0 ? "var(--danger)" : "var(--ink-4)" }}>
                                {balance < 0 ? neg(balance) : formatCLP(balance)}
                              </span>
                              {pendingSpent > 0 && (
                                <span style={{ ...MONO, fontSize: 11, color: "var(--pending)" }}>
                                  ({balance - pendingSpent < 0 ? neg(balance - pendingSpent) : formatCLP(balance - pendingSpent)} c/ pend.)
                                </span>
                              )}
                              {totalRemainingDebt > 0 && (
                                <span style={{ ...MONO, fontSize: 11, color: "#C2883D" }}>
                                  Total cuotas: {neg(totalRemainingDebt)}
                                </span>
                              )}
                              {totalRemainingDebt > 0 && pendingSpent > 0 && (
                                <span style={{ ...MONO, fontSize: 11, color: "var(--pending)" }}>
                                  Total c/ pend.: {neg(totalRemainingDebt + pendingSpent)}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}
            {/* ── Detalle de gastos ── */}
            <section style={{ padding: "0 22px 120px", marginTop: 18 }}>
              <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, overflow: "hidden" }}>
                <div
                  onClick={() => setShowGastos((v) => !v)}
                  style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={chevStyle(showGastos)}>›</span>
                    <span style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-2)", fontWeight: 600 }}>Gastos</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ ...SERIF, fontSize: 22, letterSpacing: "-0.02em", color: "var(--danger)" }}>
                      {formatCLP(totalFixed + totalSavings + totalVariable + totalPendingInstallments + totalPending)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowExpenseModal(true); }}
                      style={{ fontSize: 12, color: "var(--ink-2)", background: "var(--bg-soft)", border: "1px solid var(--line)", padding: "4px 10px", borderRadius: 99, cursor: "pointer", fontWeight: 500 }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {showGastos && (
                  <div style={{ borderTop: "1px solid var(--line-soft)" }}>
                    {/* Cuotas */}
                    {(pendingInstallments.length > 0 || orphanedPlans.length > 0) && (
                      <>
                        <CatHeader label="Cuotas" total={totalPendingInstallments} barColor="#D9724C" />
                        {orphanedPlans.length > 0 && (
                          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                            {orphanedPlans.map((plan) => (
                              <OrphanedPlanItem
                                key={plan.id}
                                plan={plan}
                                accounts={accounts}
                                onDelete={deleteInstallmentPlan}
                              />
                            ))}
                          </ul>
                        )}
                        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                          {pendingInstallments.map((inst) => (
                            <li
                              key={inst.id}
                              onClick={() => setSelectedInstallment(inst)}
                              style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, padding: "14px 18px", borderTop: "1px solid var(--line-soft)", cursor: "pointer" }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14.5, color: "var(--ink)", marginBottom: 8 }}>{inst.plan.name}</div>
                                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                                  {Array.from({ length: Math.min(inst.plan.totalInstallments, 12) }).map((_, i) => (
                                    <span
                                      key={i}
                                      style={{
                                        height: 4, flex: 1, maxWidth: 26, borderRadius: 99,
                                        background: i < inst.plan.paidInstallments ? "#E3A58E"
                                          : i === inst.plan.paidInstallments ? "var(--danger)"
                                          : "var(--danger-soft)",
                                        display: "block",
                                      }}
                                    />
                                  ))}
                                  <span style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                                    Cuota {inst.plan.paidInstallments + 1} de {inst.plan.totalInstallments}
                                  </span>
                                </div>
                                {inst.plan.accountId && (() => {
                                  const acc = accounts.find((a) => a.id === inst.plan.accountId);
                                  return acc ? (
                                    <div style={{ marginTop: 6 }}>
                                      <span style={{ padding: "2px 8px", borderRadius: 99, background: "var(--bg-soft)", color: "var(--ink-2)", border: "1px solid var(--line)", fontSize: 11 }}>
                                        {acc.name}
                                      </span>
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                              <span style={{ ...MONO, fontSize: 14, fontWeight: 500, color: "var(--danger)", whiteSpace: "nowrap" }}>
                                {formatCLP(inst.amount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {/* Gastos fijos */}
                    {fixedExpenses.length > 0 && (
                      <>
                        <CatHeader label="Gastos fijos" total={totalFixed} barColor="var(--danger)" />
                        <ExpenseList items={fixedExpenses} onDelete={deleteExpense} onEdit={setEditExpense} />
                      </>
                    )}

                    {/* Ahorros */}
                    {savings.length > 0 && (
                      <>
                        <CatHeader label="Ahorros" total={totalSavings} barColor="var(--cool)" />
                        <ExpenseList items={savings} onDelete={deleteExpense} onEdit={setEditExpense} />
                      </>
                    )}

                    {/* Gastos variables */}
                    <CatHeader label="Gastos variables" total={totalVariable} barColor="#E3A15E" />
                    <ExpenseList
                      items={variableExpenses}
                      onDelete={deleteExpense}
                      onEdit={setEditExpense}
                      showDate
                      emptyText="Sin gastos variables aún"
                    />

                    {/* Gastos pendientes */}
                    {pendingExpenses.length > 0 && (
                      <>
                        <CatHeader label="Gastos pendientes" total={totalPending} barColor="var(--pending)" />
                        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                          {pendingExpenses.map((e, idx) => (
                            <li
                              key={e.id}
                              onClick={() => setSelectedPending(e)}
                              style={{
                                display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                                gap: 12, padding: "14px 18px",
                                borderTop: idx === 0 ? "none" : "1px solid var(--line-soft)",
                                cursor: "pointer",
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: 14.5, color: "var(--ink)" }}>{e.description}</span>
                                {(e.account || e.categories.length > 0) && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, fontSize: 11 }}>
                                    {e.account && (
                                      <span style={{ padding: "2px 8px", borderRadius: 99, background: "var(--pending-soft)", color: "var(--pending)" }}>
                                        {e.account.name}
                                      </span>
                                    )}
                                    {e.categories.map(({ category }) => (
                                      <span key={category.id} style={{ padding: "2px 8px", borderRadius: 99, background: "var(--pending-soft)", color: "var(--pending)" }}>
                                        {category.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span style={{ ...MONO, fontSize: 14, fontWeight: 500, color: "var(--pending)", whiteSpace: "nowrap" }}>
                                {formatCLP(e.amount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>
              </div>
            </div>

            {/* ── FAB ── */}
            <button
              className="app-fab"
              onClick={() => setShowExpenseModal(true)}
              aria-label="Agregar gasto"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 22, height: 22 }}>
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ── Modales ── */}
      {showExpenseModal && period && (
        <ExpenseModal
          periodId={period.id}
          accounts={activeAccounts}
          defaultAccountId={activeAccounts.find((a) => a.isDefault)?.id}
          onClose={() => setShowExpenseModal(false)}
          onSaved={fetchPeriod}
        />
      )}
      {editExpense && period && (
        <ExpenseModal
          periodId={period.id}
          accounts={activeAccounts}
          editExpense={editExpense}
          onClose={() => setEditExpense(null)}
          onSaved={fetchPeriod}
        />
      )}
      {showIncomeModal && period && (
        <IncomeModal
          periodId={period.id}
          accounts={activeAccounts}
          onClose={() => setShowIncomeModal(false)}
          onSaved={fetchPeriod}
        />
      )}
      {editIncome && period && (
        <IncomeModal
          periodId={period.id}
          accounts={activeAccounts}
          editIncome={editIncome}
          onClose={() => setEditIncome(null)}
          onSaved={fetchPeriod}
        />
      )}

      {selectedPending && (
        <PendingExpenseModal
          expense={selectedPending}
          accounts={activeAccounts}
          onClose={() => setSelectedPending(null)}
          onSaved={fetchPeriod}
        />
      )}

      {balanceEdit && period && (
        <BalanceAdjustModal
          account={balanceEdit.account}
          calculated={balanceEdit.calculated}
          totalRemainingDebt={balanceEdit.totalRemainingDebt}
          periodId={period.id}
          onClose={() => setBalanceEdit(null)}
          onSaved={fetchPeriod}
        />
      )}

      {selectedInstallment && (
        <Modal
          title={selectedInstallment.plan.name}
          onClose={() => { setSelectedInstallment(null); setConfirmDeleteInstallment(false); }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "var(--danger-soft)", borderRadius: 14, padding: 14 }}>
                <p style={{ fontSize: 11, color: "var(--danger)", fontWeight: 500, margin: "0 0 4px" }}>Cuota este mes</p>
                <p style={{ ...SERIF, fontSize: 22, color: "var(--danger)", margin: 0 }}>{formatCLP(selectedInstallment.amount)}</p>
              </div>
              <div style={{ background: "var(--bg-soft)", borderRadius: 14, padding: 14 }}>
                <p style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500, margin: "0 0 4px" }}>Total compra</p>
                <p style={{ ...SERIF, fontSize: 22, margin: 0 }}>{formatCLP(selectedInstallment.plan.totalAmount)}</p>
              </div>
            </div>
            <div style={{ background: "var(--bg-soft)", borderRadius: 14, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-3)" }}>Inicio</span>
                <span style={{ color: "var(--ink)", fontWeight: 500 }}>{MONTHS[selectedInstallment.plan.startMonth - 1]} {selectedInstallment.plan.startYear}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-3)" }}>Progreso</span>
                <span style={{ color: "var(--ink)", fontWeight: 500 }}>{selectedInstallment.plan.paidInstallments + 1} de {selectedInstallment.plan.totalInstallments} cuotas</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-3)" }}>Quedan por pagar</span>
                <span style={{ color: "var(--ink)", fontWeight: 500 }}>
                  {formatCLP(selectedInstallment.amount * (selectedInstallment.plan.totalInstallments - selectedInstallment.plan.paidInstallments - 1))}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 3 }}>
              {Array.from({ length: selectedInstallment.plan.totalInstallments }).map((_, i) => (
                <span key={i} style={{ height: 6, flex: 1, borderRadius: 99, display: "block", background: i < selectedInstallment.plan.paidInstallments ? "#E3A58E" : i === selectedInstallment.plan.paidInstallments ? "var(--danger)" : "var(--danger-soft)" }} />
              ))}
            </div>
            {confirmDeleteInstallment ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 13, textAlign: "center", color: "var(--ink-2)", margin: 0 }}>¿Eliminar este plan de cuotas?</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setConfirmDeleteInstallment(false)} style={{ flex: 1, padding: "13px", borderRadius: 14, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink-2)", cursor: "pointer", fontSize: 14 }}>No</button>
                  <button onClick={() => deleteInstallmentPlan(selectedInstallment.planId)} style={{ flex: 1, padding: "13px", borderRadius: 14, border: "none", background: "var(--danger)", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Sí, eliminar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setConfirmDeleteInstallment(true)} style={{ flex: 1, padding: "13px", borderRadius: 14, border: "1px solid var(--danger-soft)", color: "var(--danger)", background: "transparent", cursor: "pointer", fontSize: 14 }}>Eliminar plan</button>
                <button onClick={() => setSelectedInstallment(null)} style={{ flex: 1, padding: "13px", borderRadius: 14, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink-2)", cursor: "pointer", fontSize: 14 }}>Cerrar</button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function CatHeader({ label, total, barColor }: { label: string; total: number; barColor: string }) {
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

function ExpenseList({
  items, onDelete, onEdit, showDate = false, emptyText,
}: {
  items: Expense[]; onDelete: (id: string) => void; onEdit?: (e: Expense) => void; showDate?: boolean; emptyText?: string;
}) {
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
            {(e.account || e.categories.length > 0) && (
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
              <span style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace", fontVariantNumeric: "tabular-nums", fontSize: 14, fontWeight: 500, color: "var(--danger)", whiteSpace: "nowrap" }}>
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

function IncomeList({ items, onDelete, onEdit }: { items: Income[]; onDelete: (id: string) => void; onEdit?: (i: Income) => void }) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {items.map((i, idx) => {
        const hasLabel = !!i.label;
        const hasBottomRow = hasLabel || (i.categories?.length > 0);
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
              {(hasLabel || (i.categories?.length > 0)) && (
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
                <span style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace", fontVariantNumeric: "tabular-nums", fontWeight: 500, fontSize: 14, color: "var(--accent)", whiteSpace: "nowrap" }}>
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

function OrphanedPlanItem({
  plan, accounts, onDelete,
}: {
  plan: InstallmentPlan;
  accounts: Account[];
  onDelete: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const acc = plan.accountId ? accounts.find((a) => a.id === plan.accountId) : null;
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
          <span>{plan.totalInstallments - plan.paidInstallments} cuotas restantes · {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(plan.installmentAmount)}/mes</span>
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
          <span style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace", fontVariantNumeric: "tabular-nums", fontSize: 13, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
            {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(remaining)}
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
