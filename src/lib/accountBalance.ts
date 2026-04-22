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

  return {
    balance: inc - spent - instSpent,
    pendingSpent,
    totalRemainingDebt: Math.max(0, totalRemainingDebt),
  };
}
