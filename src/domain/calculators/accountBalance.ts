import { EntrySource, ExpenseType } from "../enums";
import type {
  AccountRef,
  AccountBalanceSummary,
  ExpenseEntry,
  IncomeEntry,
  InstallmentEntry,
  PlanEntry,
} from "../types";
import { installmentNumberForPeriod } from "./installments";

export function computeAccountBalance(
  account: AccountRef,
  incomes: IncomeEntry[],
  expenses: ExpenseEntry[],
  installments: InstallmentEntry[],
  allPlans: PlanEntry[],
  year: number,
  month: number,
): AccountBalanceSummary {
  const inc = incomes
    .filter((i) => i.accountId === account.id)
    .reduce((s, i) => s + i.amount, 0);

  const spent = expenses
    .filter((e) => e.accountId === account.id && e.type !== ExpenseType.PENDING)
    .reduce((s, e) => s + e.amount, 0);

  const instSpent = installments
    .filter((i) => !i.isPaid && i.plan.accountId === account.id)
    .reduce((s, i) => s + i.amount, 0);

  const pendingSpent = expenses
    .filter((e) => e.accountId === account.id && e.type === ExpenseType.PENDING)
    .reduce((s, e) => s + e.amount, 0);

  // Uses time-based offset because paidInstallments is never incremented (no payment confirmation
  // module exists yet). When a "mark as paid" module is added, replace installmentNumberForPeriod
  // with (totalInstallments - paidInstallments) so remaining debt reflects actual payments.
  const plansDebt = allPlans
    .filter((p) => p.accountId === account.id)
    .reduce((s, p) => {
      const currentInstallment = installmentNumberForPeriod(p, year, month);
      const remaining = Math.max(0, p.totalInstallments - currentInstallment + 1);
      return s + remaining * p.installmentAmount;
    }, 0);

  const adjExpenses = expenses
    .filter((e) => e.accountId === account.id && e.source === EntrySource.BALANCE_ADJUST_TOTAL)
    .reduce((s, e) => s + e.amount, 0);

  const adjIncomes = incomes
    .filter((i) => i.accountId === account.id && i.source === EntrySource.BALANCE_ADJUST_TOTAL)
    .reduce((s, i) => s + i.amount, 0);

  const totalRemainingDebt = plansDebt + adjExpenses - adjIncomes;

  if (account.isCreditCard) {
    return {
      accountId: account.id,
      balance: -(instSpent + adjExpenses - adjIncomes),
      pendingSpent,
      totalRemainingDebt,
      postAdjUserSpent: 0,
    };
  }

  return {
    accountId: account.id,
    balance: inc - spent - instSpent,
    pendingSpent,
    totalRemainingDebt: 0,
    postAdjUserSpent: 0,
  };
}
