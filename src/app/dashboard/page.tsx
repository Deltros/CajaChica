"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCLP } from "@/lib/format";
import { installmentNumberForPeriod } from "@/domain/calculators/installments";
import * as apiClient from "@/apiClient";
import type { AccountDTO, ExpenseDTO, IncomeDTO, PeriodDTO, PeriodInstallmentDTO, InstallmentPlanDTO, PeriodSummary } from "@/domain/types";
import ExpenseModal, { Modal, type EditExpense } from "@/components/ExpenseModal";
import type { EditIncome } from "@/components/IncomeModal";
import IncomeModal from "@/components/IncomeModal";
import BalanceAdjustModal from "@/components/BalanceAdjustModal";
import HamburgerMenu from "@/components/HamburgerMenu";
import { Logo } from "@/components/Logo";
import DailyDonut from "@/components/DailyDonut";
import StackedBudgetBar from "@/components/StackedBudgetBar";
import PendingExpenseModal from "@/components/PendingExpenseModal";
import ExpenseList from "@/components/ExpenseList";
import IncomeList from "@/components/IncomeList";
import CategoryHeader from "@/components/CategoryHeader";
import OrphanedPlanItem from "@/components/OrphanedPlanItem";
import { ExpenseType } from "@/domain/enums";

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
  const [period, setPeriod] = useState<PeriodDTO | null>(null);
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [accounts, setAccounts] = useState<AccountDTO[]>([]);
  const [allPlans, setAllPlans] = useState<InstallmentPlanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<PeriodInstallmentDTO | null>(null);
  const [confirmDeleteInstallment, setConfirmDeleteInstallment] = useState(false);
  const [balanceEdit, setBalanceEdit] = useState<{ account: AccountDTO; calculated: number; totalRemainingDebt: number; isCreditCard: boolean } | null>(null);
  const [showIngresos, setShowIngresos] = useState(true);
  const [showSaldo, setShowSaldo] = useState(true);
  const [showGastos, setShowGastos] = useState(true);
  const [showZeroAccounts, setShowZeroAccounts] = useState(false);
  const [selectedPending, setSelectedPending] = useState<ExpenseDTO | null>(null);
  const [confirmDeleteFixed, setConfirmDeleteFixed] = useState<ExpenseDTO | null>(null);
  const [editExpense, setEditExpense] = useState<EditExpense | null>(null);
  const [editIncome, setEditIncome] = useState<EditIncome | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [periodResponse, accountsData, plansData] = await Promise.all([
        apiClient.fetchPeriod(year, month),
        apiClient.fetchAccounts(),
        apiClient.fetchInstallmentPlans(),
      ]);
      setPeriod(periodResponse.period);
      setSummary(periodResponse.summary);
      setAccounts(accountsData);
      setAllPlans(plansData);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDeleteExpense(id: string) {
    const expense = period?.expenses.find((e) => e.id === id);
    if (expense?.type === ExpenseType.FIXED && expense.recurringGroupId) {
      setConfirmDeleteFixed(expense);
      return;
    }
    await apiClient.deleteExpense(id);
    fetchData();
  }

  async function confirmDeleteFixedExpense() {
    if (!confirmDeleteFixed) return;
    await apiClient.deleteExpense(confirmDeleteFixed.id);
    setConfirmDeleteFixed(null);
    fetchData();
  }

  async function handleDeleteInstallmentPlan(planId: string) {
    await apiClient.deleteInstallmentPlan(planId);
    setSelectedInstallment(null);
    setConfirmDeleteInstallment(false);
    fetchData();
  }

  async function handleDeleteIncome(id: string) {
    await apiClient.deleteIncome(id);
    fetchData();
  }

  const activeAccounts = accounts.filter((a) => a.isActive);

  // All totals and balances come from the pre-calculated summary — no domain logic here.
  const fixedExpenses = period?.expenses.filter((e) => e.type === ExpenseType.FIXED) ?? [];
  const savings = period?.expenses.filter((e) => e.type === ExpenseType.SAVING) ?? [];
  const variableExpenses = period?.expenses.filter((e) => e.type === ExpenseType.VARIABLE) ?? [];
  const pendingExpenses = period?.expenses.filter((e) => e.type === ExpenseType.PENDING) ?? [];
  const pendingInstallments = period?.installments.filter((i) => !i.isPaid) ?? [];
  const orphanedPlans = allPlans.filter((p) => !pendingInstallments.some((pi) => pi.planId === p.id));

  const {
    totalIncome = 0,
    totalFixed = 0,
    totalSavings = 0,
    totalVariable = 0,
    totalPending = 0,
    totalPendingInstallments = 0,
    remaining = 0,
    daysLeftInMonth: daysLeft = 0,
    dailyBudget = 0,
    dailyBudgetWithPending = 0,
    effectiveTotalVariable = 0,
    accountBalances = [],
  } = summary ?? {};

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
          <div style={{ width: 40, flexShrink: 0 }} />
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
                  totalVariable={effectiveTotalVariable}
                />
              </div>
            </section>

            {/* ── Stacked budget bar ── */}
            <StackedBudgetBar
              income={totalIncome}
              totalFixed={totalFixed}
              totalSavings={totalSavings}
              totalCuotas={totalPendingInstallments}
              totalVariable={effectiveTotalVariable}
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
                      <IncomeList items={period.incomes} onDelete={handleDeleteIncome} onEdit={setEditIncome} />
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
                            {neg(accountBalances.reduce((s, b) => s + Math.min(0, b.balance - b.pendingSpent), 0))}
                          </span>
                        </div>
                      )}
                      {(() => {
                        const nonZero = accountBalances.filter((b) => b.balance !== 0);
                        const zero = accountBalances.filter((b) => b.balance === 0);
                        const visible = showZeroAccounts ? accountBalances : nonZero;
                        return (
                          <>
                            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                              {visible.map(({ accountId, balance, pendingSpent, totalRemainingDebt }, idx) => {
                                const account = activeAccounts.find((a) => a.id === accountId);
                                if (!account) return null;
                                return (
                                  <li
                                    key={accountId}
                                    onClick={() => setBalanceEdit({ account, calculated: balance, totalRemainingDebt, isCreditCard: account.isCreditCard })}
                                    style={{
                                      display: "flex", alignItems: "center", justifyContent: "space-between",
                                      padding: "14px 18px",
                                      borderTop: idx === 0 ? "none" : "1px solid var(--line-soft)",
                                      fontSize: 14, cursor: "pointer",
                                    }}
                                  >
                                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <span style={{ width: 10, height: 10, borderRadius: 3, background: DOT_COLORS[accountBalances.findIndex((b) => b.accountId === accountId) % DOT_COLORS.length], flexShrink: 0, display: "block" }} />
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
                                );
                              })}
                            </ul>
                            {zero.length > 0 && (
                              <button
                                onClick={() => setShowZeroAccounts((v) => !v)}
                                style={{
                                  width: "100%", padding: "10px 18px",
                                  borderTop: "1px solid var(--line-soft)", borderBottom: "none",
                                  borderLeft: "none", borderRight: "none",
                                  background: "transparent", cursor: "pointer",
                                  fontSize: 12, color: "var(--ink-4)", fontFamily: "inherit",
                                  textAlign: "center",
                                }}
                              >
                                {showZeroAccounts ? "Ocultar cuentas en $0" : `Ver ${zero.length} cuenta${zero.length > 1 ? "s" : ""} en $0`}
                              </button>
                            )}
                          </>
                        );
                      })()}
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
                        <CategoryHeader label="Cuotas" total={totalPendingInstallments} barColor="#D9724C" />
                        {orphanedPlans.length > 0 && (
                          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                            {orphanedPlans.map((plan) => (
                              <OrphanedPlanItem
                                key={plan.id}
                                plan={plan}
                                accounts={accounts}
                                onDelete={handleDeleteInstallmentPlan}
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
                                  {(() => {
                                    const currentInstallment = installmentNumberForPeriod(inst.plan, year, month);
                                    return Array.from({ length: Math.min(inst.plan.totalInstallments, 12) }).map((_, i) => (
                                      <span
                                        key={i}
                                        style={{
                                          height: 4, flex: 1, maxWidth: 26, borderRadius: 99,
                                          background: i < currentInstallment - 1 ? "#E3A58E"
                                            : i === currentInstallment - 1 ? "var(--danger)"
                                            : "var(--danger-soft)",
                                          display: "block",
                                        }}
                                      />
                                    ));
                                  })()}
                                  <span style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                                    Cuota {installmentNumberForPeriod(inst.plan, year, month)} de {inst.plan.totalInstallments}
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
                        <CategoryHeader label="Gastos fijos" total={totalFixed} barColor="var(--danger)" />
                        <ExpenseList items={fixedExpenses} onDelete={handleDeleteExpense} onEdit={setEditExpense} />
                      </>
                    )}

                    {/* Ahorros */}
                    {savings.length > 0 && (
                      <>
                        <CategoryHeader label="Ahorros" total={totalSavings} barColor="var(--cool)" />
                        <ExpenseList items={savings} onDelete={handleDeleteExpense} onEdit={setEditExpense} />
                      </>
                    )}

                    {/* Gastos variables */}
                    <CategoryHeader label="Gastos variables" total={totalVariable} barColor="#E3A15E" />
                    <ExpenseList
                      items={variableExpenses}
                      onDelete={handleDeleteExpense}
                      onEdit={setEditExpense}
                      showDate
                      emptyText="Sin gastos variables aún"
                    />

                    {/* Gastos pendientes */}
                    {pendingExpenses.length > 0 && (
                      <>
                        <CategoryHeader label="Gastos pendientes" total={totalPending} barColor="var(--pending)" />
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
          onSaved={fetchData}
        />
      )}
      {editExpense && period && (
        <ExpenseModal
          periodId={period.id}
          accounts={activeAccounts}
          editExpense={editExpense}
          onClose={() => setEditExpense(null)}
          onSaved={fetchData}
        />
      )}
      {showIncomeModal && period && (
        <IncomeModal
          periodId={period.id}
          accounts={activeAccounts}
          onClose={() => setShowIncomeModal(false)}
          onSaved={fetchData}
        />
      )}
      {editIncome && period && (
        <IncomeModal
          periodId={period.id}
          accounts={activeAccounts}
          editIncome={editIncome}
          onClose={() => setEditIncome(null)}
          onSaved={fetchData}
        />
      )}

      {confirmDeleteFixed && (
        <Modal title="Eliminar gasto fijo" onClose={() => setConfirmDeleteFixed(null)}>
          <p style={{ fontSize: 14, color: "var(--ink-2)", margin: "0 0 20px" }}>
            Al eliminar este gasto fijo se eliminará en los meses a futuro también. ¿Desea continuar?
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setConfirmDeleteFixed(null)} style={{ flex: 1, padding: "13px", borderRadius: 14, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink-2)", cursor: "pointer", fontSize: 14 }}>
              Cancelar
            </button>
            <button onClick={confirmDeleteFixedExpense} style={{ flex: 1, padding: "13px", borderRadius: 14, border: "none", background: "var(--danger)", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
              Sí, eliminar
            </button>
          </div>
        </Modal>
      )}

      {selectedPending && (
        <PendingExpenseModal
          expense={selectedPending}
          accounts={activeAccounts}
          onClose={() => setSelectedPending(null)}
          onSaved={fetchData}
        />
      )}

      {balanceEdit && period && (
        <BalanceAdjustModal
          account={balanceEdit.account}
          calculated={balanceEdit.calculated}
          totalRemainingDebt={balanceEdit.totalRemainingDebt}
          isCreditCard={balanceEdit.isCreditCard}
          periodId={period.id}
          onClose={() => setBalanceEdit(null)}
          onSaved={fetchData}
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
                <span style={{ color: "var(--ink)", fontWeight: 500 }}>{installmentNumberForPeriod(selectedInstallment.plan, year, month)} de {selectedInstallment.plan.totalInstallments} cuotas</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-3)" }}>Quedan por pagar</span>
                <span style={{ color: "var(--ink)", fontWeight: 500 }}>
                  {formatCLP(selectedInstallment.amount * (selectedInstallment.plan.totalInstallments - installmentNumberForPeriod(selectedInstallment.plan, year, month)))}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 3 }}>
              {(() => {
                const currentInstallment = installmentNumberForPeriod(selectedInstallment.plan, year, month);
                return Array.from({ length: selectedInstallment.plan.totalInstallments }).map((_, i) => (
                  <span key={i} style={{ height: 6, flex: 1, borderRadius: 99, display: "block", background: i < currentInstallment - 1 ? "#E3A58E" : i === currentInstallment - 1 ? "var(--danger)" : "var(--danger-soft)" }} />
                ));
              })()}
            </div>
            {confirmDeleteInstallment ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 13, textAlign: "center", color: "var(--ink-2)", margin: 0 }}>¿Eliminar este plan de cuotas?</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setConfirmDeleteInstallment(false)} style={{ flex: 1, padding: "13px", borderRadius: 14, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink-2)", cursor: "pointer", fontSize: 14 }}>No</button>
                  <button onClick={() => handleDeleteInstallmentPlan(selectedInstallment.planId)} style={{ flex: 1, padding: "13px", borderRadius: 14, border: "none", background: "var(--danger)", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Sí, eliminar</button>
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
