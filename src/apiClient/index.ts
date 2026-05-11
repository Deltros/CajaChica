"use client";

import type { AccountDTO, PeriodResponse, InstallmentPlanDTO } from "@/domain/types";
import { ExpenseType, type EntrySource } from "@/domain/enums";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Periods ───────────────────────────────────────────────────────────────────

export function fetchPeriod(year: number, month: number): Promise<PeriodResponse> {
  return request(`/api/periods?year=${year}&month=${month}`);
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export function fetchAccounts(): Promise<AccountDTO[]> {
  return request("/api/accounts");
}

// ── Installment plans ─────────────────────────────────────────────────────────

export function fetchInstallmentPlans(): Promise<InstallmentPlanDTO[]> {
  return request("/api/installments");
}

export function deleteInstallmentPlan(id: string): Promise<{ ok: boolean }> {
  return request(`/api/installments?id=${id}`, { method: "DELETE" });
}

type CreateInstallmentPlanInput = {
  periodId: string;
  name: string;
  installmentAmount: number;
  totalInstallments: number;
  startThisMonth: boolean;
  accountId?: string;
};

export function createInstallmentPlan(data: CreateInstallmentPlanInput) {
  return request("/api/installments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// ── Expenses ──────────────────────────────────────────────────────────────────

type CreateExpenseInput = {
  periodId: string;
  description: string;
  amount: number;
  type: ExpenseType;
  source?: EntrySource;
  date?: string;
  accountId?: string;
  categoryIds?: string[];
};

type UpdateExpenseInput = {
  id: string;
  amount?: number;
  description?: string;
  type?: ExpenseType;
  accountId?: string | null;
  categoryIds?: string[];
};

export function createExpense(data: CreateExpenseInput) {
  return request("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateExpense(data: UpdateExpenseInput) {
  return request("/api/expenses", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteExpense(id: string): Promise<{ ok: boolean }> {
  return request(`/api/expenses?id=${id}`, { method: "DELETE" });
}

// ── Incomes ───────────────────────────────────────────────────────────────────

type CreateIncomeInput = {
  periodId: string;
  accountId: string;
  amount: number;
  label?: string;
  source?: EntrySource;
  categoryIds?: string[];
};

type UpdateIncomeInput = {
  id: string;
  amount?: number;
  label?: string | null;
  accountId?: string;
  categoryIds?: string[];
};

export function createIncome(data: CreateIncomeInput) {
  return request("/api/incomes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateIncome(data: UpdateIncomeInput) {
  return request("/api/incomes", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteIncome(id: string): Promise<{ ok: boolean }> {
  return request(`/api/incomes?id=${id}`, { method: "DELETE" });
}

// ── Categories ────────────────────────────────────────────────────────────────

export function fetchCategories(): Promise<{ id: string; name: string; count?: number }[]> {
  return request("/api/categories");
}

export function createCategory(name: string): Promise<{ id: string; name: string }> {
  return request("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

// ── Balance adjustment (helper that wraps income/expense creation) ─────────────

type BalanceAdjustInput = {
  periodId: string;
  accountId: string;
  diff: number;
  label: string;
  source: EntrySource;
  categoryIds?: string[];
};

export function saveBalanceAdjustment({ periodId, accountId, diff, label, source, categoryIds }: BalanceAdjustInput) {
  if (diff > 0) {
    return createIncome({ periodId, accountId, amount: diff, label, source, categoryIds });
  }
  return createExpense({
    periodId,
    description: label,
    amount: Math.abs(diff),
    type: ExpenseType.VARIABLE,
    source,
    accountId,
    categoryIds,
  });
}
