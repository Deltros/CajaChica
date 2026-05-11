import type { AccountType, EntrySource, ExpenseType } from "./enums";

// ── Entidades base ────────────────────────────────────────────────────────────

export type CategoryDTO = {
  id: string;
  name: string;
};

export type CategoryRef = {
  category: CategoryDTO;
};

export type AccountDTO = {
  id: string;
  name: string;
  type: AccountType;
  isCreditCard: boolean;
  isActive: boolean;
  isDefault: boolean;
};

export type IncomeDTO = {
  id: string;
  accountId: string;
  amount: number;
  label: string | null;
  date: string;
  source: EntrySource;
  account: AccountDTO;
  categories: CategoryRef[];
};

export type ExpenseDTO = {
  id: string;
  description: string;
  amount: number;
  type: ExpenseType;
  date: string;
  source: EntrySource;
  accountId: string | null;
  recurringGroupId: string | null;
  recurringEndYear: number | null;
  recurringEndMonth: number | null;
  account: { name: string } | null;
  categories: CategoryRef[];
};

export type InstallmentPlanDTO = {
  id: string;
  name: string;
  totalInstallments: number;
  paidInstallments: number;
  installmentAmount: number;
  totalAmount: number;
  accountId: string | null;
  startYear: number;
  startMonth: number;
};

export type PeriodInstallmentDTO = {
  id: string;
  planId: string;
  amount: number;
  isPaid: boolean;
  plan: InstallmentPlanDTO;
};

export type PeriodDTO = {
  id: string;
  year: number;
  month: number;
  incomes: IncomeDTO[];
  expenses: ExpenseDTO[];
  installments: PeriodInstallmentDTO[];
};

// ── Tipos para calculadoras (parámetros internos, no DTOs de API) ─────────────

export type AccountRef = {
  id: string;
  isCreditCard: boolean;
};

export type IncomeEntry = {
  accountId: string;
  amount: number;
  source: EntrySource;
  date: string | Date;
};

export type ExpenseEntry = {
  accountId: string | null;
  amount: number;
  type: ExpenseType;
  source: EntrySource;
  date: string | Date;
};

export type InstallmentEntry = {
  isPaid: boolean;
  amount: number;
  plan: { accountId: string | null };
};

export type PlanEntry = {
  accountId: string | null;
  totalInstallments: number;
  installmentAmount: number;
  startYear: number;
  startMonth: number;
};

// ── Tipos de respuesta de la API ──────────────────────────────────────────────

export type AccountBalanceSummary = {
  accountId: string;
  balance: number;
  pendingSpent: number;
  totalRemainingDebt: number;
};

export type PeriodSummary = {
  totalIncome: number;
  totalFixed: number;
  totalSavings: number;
  totalVariable: number;
  totalPending: number;
  totalPendingInstallments: number;
  remaining: number;
  daysLeftInMonth: number;
  dailyBudget: number;
  dailyBudgetWithPending: number;
  effectiveTotalVariable: number;
  accountBalances: AccountBalanceSummary[];
};

export type PeriodResponse = {
  period: PeriodDTO;
  summary: PeriodSummary;
};
