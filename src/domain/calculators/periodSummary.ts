import { ExpenseType } from "../enums";
import type {
  AccountRef,
  ExpenseEntry,
  IncomeEntry,
  InstallmentEntry,
  PlanEntry,
  PeriodSummary,
} from "../types";
import { computeAccountBalance } from "./accountBalance";

function daysLeftInMonth(year: number, month: number, today: Date): number {
  const totalDays = new Date(year, month, 0).getDate();
  const todayYear = today.getUTCFullYear();
  const todayMonth = today.getUTCMonth() + 1;
  const todayDay = today.getUTCDate();

  if (year > todayYear || (year === todayYear && month > todayMonth)) {
    return totalDays;
  }
  if (year === todayYear && month === todayMonth) {
    return totalDays - todayDay;
  }
  return 0;
}

export function computePeriodSummary(
  accounts: AccountRef[],
  incomes: IncomeEntry[],
  expenses: ExpenseEntry[],
  installments: InstallmentEntry[],
  allPlans: PlanEntry[],
  year: number,
  month: number,
  today: Date = new Date(),
): PeriodSummary {
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalFixed = expenses.filter((e) => e.type === ExpenseType.FIXED).reduce((s, e) => s + e.amount, 0);
  const totalSavings = expenses.filter((e) => e.type === ExpenseType.SAVING).reduce((s, e) => s + e.amount, 0);
  const totalVariable = expenses.filter((e) => e.type === ExpenseType.VARIABLE).reduce((s, e) => s + e.amount, 0);
  const totalPending = expenses.filter((e) => e.type === ExpenseType.PENDING).reduce((s, e) => s + e.amount, 0);
  const totalPendingInstallments = installments
    .filter((i) => !i.isPaid)
    .reduce((s, i) => s + i.amount, 0);

  const accountBalances = accounts.map((account) =>
    computeAccountBalance(account, incomes, expenses, installments, allPlans, year, month),
  );

  const totalPositive = accountBalances.filter((b) => b.balance > 0).reduce((s, b) => s + b.balance, 0);
  const totalNegative = accountBalances.filter((b) => b.balance < 0).reduce((s, b) => s + b.balance, 0);
  const remaining = totalPositive + totalNegative;

  const daysLeft = daysLeftInMonth(year, month, today);
  const dailyBudget = daysLeft > 0 ? Math.floor(remaining / daysLeft) : 0;
  const dailyBudgetWithPending = daysLeft > 0 ? Math.floor((remaining - totalPending) / daysLeft) : 0;

  const effectiveTotalVariable = Math.max(
    0,
    totalIncome - totalFixed - totalSavings - totalPendingInstallments - remaining,
  );

  return {
    totalIncome,
    totalFixed,
    totalSavings,
    totalVariable,
    totalPending,
    totalPendingInstallments,
    remaining,
    daysLeftInMonth: daysLeft,
    dailyBudget,
    dailyBudgetWithPending,
    effectiveTotalVariable,
    accountBalances,
  };
}
