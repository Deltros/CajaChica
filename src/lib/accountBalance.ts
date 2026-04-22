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
 * - Debit accounts: balance = incomes − expenses − current installments.
 * - Credit accounts (totalRemainingDebt > 0): balance = this month's payment only
 *   = current installments + net BALANCE_ADJUST_TOTAL entries.
 *   Future installments are excluded here but included in totalRemainingDebt,
 *   preserving the invariant: totalRemainingDebt ≥ |balance| for credit accounts.
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

  const totalRemainingDebt = plansDebt + adjExpenses - adjIncomes;

  const balance = totalRemainingDebt > 0
    ? -(instSpent + adjExpenses - adjIncomes)
    : inc - spent - instSpent;

  return { balance, pendingSpent, totalRemainingDebt };
}
