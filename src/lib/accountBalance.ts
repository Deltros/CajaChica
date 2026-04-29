import { installmentNumberForPeriod } from "@/lib/installments";

type AccountRef = { id: string; isCreditCard: boolean };
type IncomeEntry = { accountId: string; amount: number; source: string; date: string | Date };
type ExpenseEntry = { accountId: string | null; amount: number; type: string; source: string; date: string | Date };
type InstallmentEntry = { isPaid: boolean; amount: number; plan: { accountId: string | null } };
type PlanEntry = { accountId: string | null; totalInstallments: number; installmentAmount: number; startYear: number; startMonth: number };

export type AccountBalance = {
  balance: number;
  pendingSpent: number;
  totalRemainingDebt: number;
};

/**
 * Computes the effective balance for an account in a given period.
 *
 * Debit accounts:
 *   balance = incomes − expenses − current installments
 *
 * Credit accounts (identified by plansDebt + adjustments > 0):
 *   balance           = −(currentInstallments + netAdjustments + postAdjUserSpent)
 *   totalRemainingDebt = plansDebt + netAdjustments + postAdjUserSpent
 *
 * postAdjUserSpent: USER expenses recorded AFTER the last BALANCE_ADJUST_TOTAL entry.
 * Earlier USER expenses are already captured inside the adjustment amount itself.
 */
export function computeAccountBalance(
  account: AccountRef,
  incomes: IncomeEntry[],
  expenses: ExpenseEntry[],
  installments: InstallmentEntry[],
  allPlans: PlanEntry[],
  year: number,
  month: number,
): AccountBalance {
  const inc = incomes
    .filter((i) => i.accountId === account.id)
    .reduce((s, i) => s + i.amount, 0);

  const spent = expenses
    .filter((e) => e.accountId === account.id && e.type !== "PENDING")
    .reduce((s, e) => s + e.amount, 0);

  const instSpent = installments
    .filter((i) => !i.isPaid && i.plan.accountId === account.id)
    .reduce((s, i) => s + i.amount, 0);

  const pendingSpent = expenses
    .filter((e) => e.accountId === account.id && e.type === "PENDING")
    .reduce((s, e) => s + e.amount, 0);

  // Uses time-based offset because paidInstallments is never incremented (no payment confirmation module exists yet).
  // When a "mark as paid" module is added, replace installmentNumberForPeriod with (totalInstallments - paidInstallments)
  // so remaining debt reflects actual payments, not calendar position.
  const plansDebt = allPlans
    .filter((p) => p.accountId === account.id)
    .reduce((s, p) => {
      const currentInstallment = installmentNumberForPeriod(p, year, month);
      const remaining = Math.max(0, p.totalInstallments - currentInstallment + 1);
      return s + remaining * p.installmentAmount;
    }, 0);

  const adjExpenses = expenses
    .filter((e) => e.accountId === account.id && e.source === "BALANCE_ADJUST_TOTAL")
    .reduce((s, e) => s + e.amount, 0);

  const adjIncomes = incomes
    .filter((i) => i.accountId === account.id && i.source === "BALANCE_ADJUST_TOTAL")
    .reduce((s, i) => s + i.amount, 0);

  const totalRemainingDebt = plansDebt + adjExpenses - adjIncomes;

  if (account.isCreditCard) {
    // Find the date of the most recent BALANCE_ADJUST_TOTAL entry for this account.
    // USER expenses entered AFTER that date are incremental debt not yet captured
    // by any adjustment, so they must be added on top.
    const adjEntryDates: Date[] = [
      ...expenses.filter((e) => e.accountId === account.id && e.source === "BALANCE_ADJUST_TOTAL"),
      ...incomes.filter((i) => i.accountId === account.id && i.source === "BALANCE_ADJUST_TOTAL"),
    ].map((e) => new Date(e.date));

    const lastAdjDate = adjEntryDates.length > 0
      ? adjEntryDates.reduce((a, b) => (b > a ? b : a))
      : null;

    const postAdjUserSpent = expenses
      .filter((e) =>
        e.accountId === account.id &&
        e.type !== "PENDING" &&
        e.source === "USER" &&
        (lastAdjDate === null || new Date(e.date) > lastAdjDate)
      )
      .reduce((s, e) => s + e.amount, 0);

    return {
      balance: -(instSpent + adjExpenses - adjIncomes + postAdjUserSpent),
      pendingSpent,
      totalRemainingDebt: totalRemainingDebt + postAdjUserSpent,
    };
  }

  return {
    balance: inc - spent - instSpent,
    pendingSpent,
    totalRemainingDebt: 0,
  };
}
