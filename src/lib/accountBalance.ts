type AccountRef = { id: string };
type IncomeEntry = { accountId: string; amount: number; source: string };
type ExpenseEntry = { accountId: string | null; amount: number; type: string; source: string };
type InstallmentEntry = { isPaid: boolean; amount: number; plan: { accountId: string | null } };
type PlanEntry = { accountId: string | null; totalInstallments: number; paidInstallments: number; installmentAmount: number };

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
 *   creditVarExpenses = tracked purchases on the card (excludes BALANCE_ADJUST_TOTAL and PENDING).
 *   balance           = −(currentInstallments + adjustments + creditVarExpenses)
 *                     = what is owed to the card THIS month.
 *   totalRemainingDebt = plansDebt + adjustments + creditVarExpenses
 *                      = total outstanding across all months.
 *
 * Invariant: totalRemainingDebt − |balance| = future installments ≥ 0.
 * Consistency: net account balances sum equals budget "remaining" (Disponible).
 */
export function computeAccountBalance(
  account: AccountRef,
  incomes: IncomeEntry[],
  expenses: ExpenseEntry[],
  installments: InstallmentEntry[],
  allPlans: PlanEntry[],
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

  const plansDebt = allPlans
    .filter((p) => p.accountId === account.id)
    .reduce((s, p) => s + (p.totalInstallments - p.paidInstallments) * p.installmentAmount, 0);

  const adjExpenses = expenses
    .filter((e) => e.accountId === account.id && e.source === "BALANCE_ADJUST_TOTAL")
    .reduce((s, e) => s + e.amount, 0);

  const adjIncomes = incomes
    .filter((i) => i.accountId === account.id && i.source === "BALANCE_ADJUST_TOTAL")
    .reduce((s, i) => s + i.amount, 0);

  const partialDebt = plansDebt + adjExpenses - adjIncomes;
  const isCreditAccount = partialDebt > 0;

  if (isCreditAccount) {
    // Tracked purchases on the card (not adjustments, not pending, not installments).
    // Installments come from the installments array, not expenses, so there is no overlap.
    const creditVarExpenses = expenses
      .filter((e) => e.accountId === account.id && e.type !== "PENDING" && e.source !== "BALANCE_ADJUST_TOTAL")
      .reduce((s, e) => s + e.amount, 0);

    const totalRemainingDebt = partialDebt + creditVarExpenses;
    const balance = -(instSpent + adjExpenses - adjIncomes + creditVarExpenses);
    return { balance, pendingSpent, totalRemainingDebt };
  }

  return {
    balance: inc - spent - instSpent,
    pendingSpent,
    totalRemainingDebt: 0,
  };
}
