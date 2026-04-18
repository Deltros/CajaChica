"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { formatCLP, daysLeftInMonth } from "@/lib/format";
import ExpenseModal, { Modal } from "@/components/ExpenseModal";
import IncomeModal from "@/components/IncomeModal";
import HamburgerMenu from "@/components/HamburgerMenu";

type Account = { id: string; name: string; type: string; isActive: boolean; isDefault: boolean };
type Income = { id: string; accountId: string; amount: number; label: string | null; account: Account };
type Expense = { id: string; description: string; amount: number; type: string; date: string; accountId: string | null; account: { name: string } | null; categories: { category: { id: string; name: string } }[] };
type PeriodInstallment = { id: string; planId: string; amount: number; isPaid: boolean; plan: { name: string; totalInstallments: number; paidInstallments: number; totalAmount: number; startYear: number; startMonth: number; accountId: string | null } };
type Period = { id: string; incomes: Income[]; expenses: Expense[]; installments: PeriodInstallment[] };

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function DashboardPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [period, setPeriod] = useState<Period | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<PeriodInstallment | null>(null);
  const [confirmDeleteInstallment, setConfirmDeleteInstallment] = useState(false);
  const [balanceEdit, setBalanceEdit] = useState<{ account: Account; calculated: number } | null>(null);
  const [balanceEditValue, setBalanceEditValue] = useState("");
  const [balanceEditLoading, setBalanceEditLoading] = useState(false);
  const [showIngresos, setShowIngresos] = useState(false);
  const [showSaldo, setShowSaldo] = useState(false);
  const [showGastos, setShowGastos] = useState(false);

  const fetchPeriod = useCallback(async () => {
    setLoading(true);
    const [periodRes, accountsRes] = await Promise.all([
      fetch(`/api/periods?year=${year}&month=${month}`),
      fetch("/api/accounts"),
    ]);
    const [periodData, accountsData] = await Promise.all([periodRes.json(), accountsRes.json()]);
    setPeriod(periodData);
    setAccounts(accountsData);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchPeriod(); }, [fetchPeriod]);

  async function deleteExpense(id: string) {
    await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    fetchPeriod();
  }

  async function applyBalanceAdjustment() {
    if (!balanceEdit || !period) return;
    const real = parseInt(balanceEditValue || "0");
    const diff = real - balanceEdit.calculated;
    if (diff === 0) { setBalanceEdit(null); return; }

    setBalanceEditLoading(true);
    if (diff > 0) {
      await fetch("/api/incomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId: period.id, accountId: balanceEdit.account.id, amount: diff, label: "Ajuste de saldo" }),
      });
    } else {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId: period.id, description: "Ajuste de saldo", amount: Math.abs(diff), type: "VARIABLE", accountId: balanceEdit.account.id }),
      });
    }
    setBalanceEditLoading(false);
    setBalanceEdit(null);
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
  const remaining = totalIncome - totalFixed - totalSavings - totalVariable - totalPendingInstallments;
  const daysLeft = daysLeftInMonth();
  const dailyBudget = daysLeft > 0 ? Math.floor(remaining / daysLeft) : 0;

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <HamburgerMenu />
        <h1 className="text-lg font-semibold text-gray-800">Inicio</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Navegación de mes */}
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm">
          <button onClick={prevMonth} className="text-gray-500 hover:text-gray-800 text-xl px-2">‹</button>
          <span className="font-semibold text-gray-800">{MONTHS[month - 1]} {year}</span>
          <button onClick={nextMonth} className="text-gray-500 hover:text-gray-800 text-xl px-2">›</button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">Cargando...</div>
        ) : (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-xs text-green-600 font-medium">Ingresos</p>
                <p className="text-xl font-bold text-green-700">{formatCLP(totalIncome)}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs text-red-600 font-medium">Gastos fijos + ahorro</p>
                <p className="text-xl font-bold text-red-700">{formatCLP(totalFixed + totalSavings)}</p>
              </div>
              <div className={`border rounded-xl p-4 ${remaining >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
                <p className={`text-xs font-medium ${remaining >= 0 ? "text-blue-600" : "text-orange-600"}`}>Resto del mes</p>
                <p className={`text-xl font-bold ${remaining >= 0 ? "text-blue-700" : "text-orange-700"}`}>{formatCLP(remaining)}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-xs text-purple-600 font-medium">Gasto diario disponible</p>
                <p className="text-xl font-bold text-purple-700">{formatCLP(dailyBudget)}</p>
                <p className="text-xs text-purple-400">{daysLeft} días restantes</p>
              </div>
            </div>


            {/* Ingresos */}
            <section className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setShowIngresos(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">{showIngresos ? "▾" : "▸"}</span>
                  <h2 className="font-semibold text-gray-700 text-sm">Ingresos</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-green-600">{formatCLP(totalIncome)}</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); setShowIncomeModal(true); }}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >+ Agregar</span>
                </div>
              </button>
              {showIngresos && (
                period?.incomes.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4 border-t border-gray-100">Sin ingresos registrados</p>
                ) : (
                  <IncomeList items={period?.incomes ?? []} onDelete={deleteIncome} />
                )
              )}
            </section>

            {/* Saldo en cuentas */}
            {activeAccounts.length > 0 && (() => {
              const balances = activeAccounts.map((account) => {
                const income = period?.incomes.filter((i) => i.accountId === account.id).reduce((s, i) => s + i.amount, 0) ?? 0;
                const spent = period?.expenses.filter((e) => e.accountId === account.id).reduce((s, e) => s + e.amount, 0) ?? 0;
                const installmentSpent = period?.installments.filter((i) => !i.isPaid && i.plan.accountId === account.id).reduce((s, i) => s + i.amount, 0) ?? 0;
                return { account, balance: income - spent - installmentSpent };
              });
              const totalPositive = balances.filter(b => b.balance > 0).reduce((s, b) => s + b.balance, 0);
              const totalNegative = balances.filter(b => b.balance < 0).reduce((s, b) => s + b.balance, 0);
              return (
                <section className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setShowSaldo(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">{showSaldo ? "▾" : "▸"}</span>
                      <h2 className="font-semibold text-gray-700 text-sm">Saldo en cuentas</h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="text-green-600">{formatCLP(totalPositive)}</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-red-500">{formatCLP(totalNegative)}</span>
                    </div>
                  </button>
                  {showSaldo && (
                    <ul className="divide-y divide-gray-50 border-t border-gray-100">
                      {balances.map(({ account, balance }) => (
                        <li
                          key={account.id}
                          onClick={() => { setBalanceEdit({ account, calculated: balance }); setBalanceEditValue(String(balance)); }}
                          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-800">{account.name}</p>
                          <span className={`text-sm font-semibold ${balance >= 0 ? "text-blue-700" : "text-red-600"}`}>
                            {formatCLP(balance)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })()}

            {/* Detalle de gastos */}
            <section className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setShowGastos(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">{showGastos ? "▾" : "▸"}</span>
                  <h2 className="font-semibold text-gray-800 text-sm">Detalle de gastos</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-red-600">
                    {formatCLP(totalFixed + totalSavings + totalVariable + totalPendingInstallments)}
                  </span>
                  <span
                    onClick={(e) => { e.stopPropagation(); setShowExpenseModal(true); }}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors text-lg leading-none"
                  >
                    +
                  </span>
                </div>
              </button>

              {showGastos && <div className="divide-y divide-gray-50 border-t border-gray-100">
                {/* Fijos */}
                {fixedExpenses.length > 0 && (
                  <CategoryBlock
                    label="Gastos fijos"
                    total={totalFixed}
                    accent="border-red-400"
                    bg="bg-red-50"
                    textColor="text-red-700"
                    badgeBg="bg-red-100"
                  >
                    <ExpenseList items={fixedExpenses} onDelete={deleteExpense} amountColor="text-red-600" />
                  </CategoryBlock>
                )}

                {/* Ahorros */}
                {savings.length > 0 && (
                  <CategoryBlock
                    label="Ahorros"
                    total={totalSavings}
                    accent="border-blue-400"
                    bg="bg-blue-50"
                    textColor="text-blue-700"
                    badgeBg="bg-blue-100"
                  >
                    <ExpenseList items={savings} onDelete={deleteExpense} amountColor="text-blue-600" />
                  </CategoryBlock>
                )}

                {/* Cuotas */}
                {pendingInstallments.length > 0 && (
                  <CategoryBlock
                    label="Cuotas"
                    total={totalPendingInstallments}
                    accent="border-red-500"
                    bg="bg-red-50"
                    textColor="text-red-700"
                    badgeBg="bg-red-100"
                  >
                    <ul>
                      {pendingInstallments.map((i) => {
                        const tooltip = `Total compra: ${formatCLP(i.plan.totalAmount)} · Inicio: ${MONTHS[i.plan.startMonth - 1]} ${i.plan.startYear}`;
                        return (
                          <li
                            key={i.id}
                            title={tooltip}
                            onClick={() => setSelectedInstallment(i)}
                            className="flex items-center justify-between px-4 py-3 border-t border-gray-50 first:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <div className="flex-1 min-w-0 pr-3">
                              <p className="text-sm font-medium text-gray-800">{i.plan.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex gap-0.5">
                                  {Array.from({ length: Math.min(i.plan.totalInstallments, 12) }).map((_, idx) => (
                                    <div
                                      key={idx}
                                      className={`h-1.5 w-3 rounded-full ${idx < i.plan.paidInstallments ? "bg-red-300" : idx === i.plan.paidInstallments ? "bg-red-500" : "bg-red-100"}`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-400">
                                  {i.plan.paidInstallments + 1} de {i.plan.totalInstallments}
                                </span>
                              </div>
                            </div>
                            {/* w-28 + gap-2 + w-6 = misma anchura que fila variable con botón eliminar */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-28 text-right">
                                <span className="text-sm font-semibold text-red-600">{formatCLP(i.amount)}</span>
                              </div>
                              <div className="w-6 h-6" />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </CategoryBlock>
                )}

                {/* Variables */}
                <CategoryBlock
                  label="Gastos variables"
                  total={totalVariable}
                  accent="border-red-300"
                  bg="bg-red-50/60"
                  textColor="text-red-600"
                  badgeBg="bg-red-100"
                >
                  <ExpenseList
                    items={variableExpenses}
                    onDelete={deleteExpense}
                    emptyText="Sin gastos variables aún"
                    amountColor="text-red-600"
                    showDate
                  />
                </CategoryBlock>
              </div>}
            </section>

            {/* Botón agregar gasto */}
            <div className="pb-6 flex justify-center">
              <button
                onClick={() => setShowExpenseModal(true)}
                className="w-14 h-14 rounded-full bg-blue-600 text-white text-3xl flex items-center justify-center shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all"
              >
                +
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modales */}
      {showExpenseModal && period && (
        <ExpenseModal
          periodId={period.id}
          accounts={activeAccounts}
          defaultAccountId={activeAccounts.find(a => a.isDefault)?.id}
          onClose={() => setShowExpenseModal(false)}
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

      {balanceEdit && (
        <Modal title={balanceEdit.account.name} onClose={() => setBalanceEdit(null)}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 flex justify-between text-sm">
              <span className="text-gray-500">Saldo calculado</span>
              <span className="font-semibold text-gray-700">{formatCLP(balanceEdit.calculated)}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Saldo real en cuenta (CLP)</label>
              <input
                type="number"
                autoFocus
                value={balanceEditValue}
                onChange={(e) => setBalanceEditValue(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {balanceEditValue !== "" && parseInt(balanceEditValue) !== balanceEdit.calculated && (
              <div className={`rounded-xl p-3 text-sm ${parseInt(balanceEditValue) > balanceEdit.calculated ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {parseInt(balanceEditValue) > balanceEdit.calculated
                  ? `Se agregará un ingreso de ${formatCLP(parseInt(balanceEditValue) - balanceEdit.calculated)}`
                  : `Se agregará un gasto de ${formatCLP(balanceEdit.calculated - parseInt(balanceEditValue))}`}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setBalanceEdit(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={applyBalanceAdjustment}
                disabled={balanceEditLoading}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {balanceEditLoading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {selectedInstallment && (
        <Modal title={selectedInstallment.plan.name} onClose={() => { setSelectedInstallment(null); setConfirmDeleteInstallment(false); }}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs text-red-500 font-medium">Cuota este mes</p>
                <p className="text-lg font-bold text-red-700">{formatCLP(selectedInstallment.amount)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 font-medium">Total compra</p>
                <p className="text-lg font-bold text-gray-700">{formatCLP(selectedInstallment.plan.totalAmount)}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Inicio</span>
                <span className="font-medium text-gray-700">{MONTHS[selectedInstallment.plan.startMonth - 1]} {selectedInstallment.plan.startYear}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Progreso</span>
                <span className="font-medium text-gray-700">
                  {selectedInstallment.plan.paidInstallments + 1} de {selectedInstallment.plan.totalInstallments} cuotas
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Quedan por pagar</span>
                <span className="font-medium text-gray-700">
                  {formatCLP(selectedInstallment.amount * (selectedInstallment.plan.totalInstallments - selectedInstallment.plan.paidInstallments - 1))}
                </span>
              </div>
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: selectedInstallment.plan.totalInstallments }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 flex-1 rounded-full ${idx < selectedInstallment.plan.paidInstallments ? "bg-red-300" : idx === selectedInstallment.plan.paidInstallments ? "bg-red-500" : "bg-red-100"}`}
                />
              ))}
            </div>
            {confirmDeleteInstallment ? (
              <div className="space-y-2">
                <p className="text-sm text-center text-gray-600">¿Eliminar este plan de cuotas?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDeleteInstallment(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                  >
                    No
                  </button>
                  <button
                    onClick={() => deleteInstallmentPlan(selectedInstallment.planId)}
                    className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600"
                  >
                    Sí, eliminar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDeleteInstallment(true)}
                  className="flex-1 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm hover:bg-red-50"
                >
                  Eliminar plan
                </button>
                <button
                  onClick={() => setSelectedInstallment(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function CategoryBlock({
  label, total, accent, bg, textColor, badgeBg, children,
}: {
  label: string; total: number; accent: string; bg: string; textColor: string; badgeBg: string; children: ReactNode;
}) {
  return (
    <div>
      <div className={`flex items-center justify-between px-4 py-2.5 ${bg} border-l-4 ${accent}`}>
        <p className={`text-xs font-semibold tracking-wide ${textColor}`}>{label}</p>
        <span className={`text-xs font-bold ${textColor} ${badgeBg} px-2 py-0.5 rounded-full`}>
          {formatCLP(total)}
        </span>
      </div>
      {children}
    </div>
  );
}

function ExpenseList({
  items, onDelete, emptyText = "", amountColor, showDate = false,
}: {
  items: Expense[]; onDelete: (id: string) => void; emptyText?: string; amountColor: string; showDate?: boolean;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (items.length === 0 && emptyText) {
    return <p className="text-center text-gray-400 text-sm py-5">{emptyText}</p>;
  }

  return (
    <ul>
      {items.map((e) => {
        const hasMeta = showDate || e.account || e.categories.length > 0;
        return (
          <li key={e.id} className="group flex items-start justify-between px-4 py-3 border-t border-gray-50 first:border-0 hover:bg-gray-50 transition-colors">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-medium text-gray-800 truncate">{e.description}</p>
              {hasMeta && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {showDate && (
                    <span className="text-xs text-gray-400">
                      {new Date(e.date).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                    </span>
                  )}
                  {e.account && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {e.account.name}
                    </span>
                  )}
                  {e.categories.map(({ category }) => (
                    <span key={category.id} className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                      {category.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {confirmId === e.id ? (
              <div className="flex items-center gap-2 shrink-0 pt-0.5">
                <span className="text-xs text-gray-500">¿Eliminar?</span>
                <button onClick={() => setConfirmId(null)} className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">No</button>
                <button onClick={() => { setConfirmId(null); onDelete(e.id); }} className="text-xs px-2 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors">Sí</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0 pt-0.5">
                <span className={`text-sm font-semibold ${amountColor}`}>{formatCLP(e.amount)}</span>
                <button
                  onClick={() => setConfirmId(e.id)}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400 transition-all text-xs"
                >✕</button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function IncomeList({ items, onDelete }: { items: { id: string; amount: number; label: string | null; account: { name: string } }[]; onDelete: (id: string) => void }) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  return (
    <ul className="divide-y divide-gray-50 border-t border-gray-100">
      {items.map((i) => (
        <li key={i.id} className="group flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-800">{i.account.name}</p>
            {i.label && <p className="text-xs text-gray-400">{i.label}</p>}
          </div>
          {confirmId === i.id ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500">¿Eliminar?</span>
              <button onClick={() => setConfirmId(null)} className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200">No</button>
              <button onClick={() => { setConfirmId(null); onDelete(i.id); }} className="text-xs px-2 py-1 rounded-md bg-red-500 text-white hover:bg-red-600">Sí</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-green-600">{formatCLP(i.amount)}</span>
              <button onClick={() => setConfirmId(i.id)} className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400 transition-all text-xs">✕</button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
