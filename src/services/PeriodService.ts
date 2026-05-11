import { ExpenseType } from "@/domain/enums";
import type { EntrySource } from "@/domain/enums";
import { computePeriodSummary } from "@/domain/calculators/periodSummary";
import { PeriodRepository } from "@/repositories/PeriodRepository";
import { InstallmentRepository } from "@/repositories/InstallmentRepository";
import { AccountRepository } from "@/repositories/AccountRepository";
import { ExpenseRepository } from "@/repositories/ExpenseRepository";
import type { PeriodResponse } from "@/domain/types";

function monthOffset(year: number, month: number) {
  return year * 12 + (month - 1);
}

export const PeriodService = {
  async getOrCreateWithSummary(userId: string, year: number, month: number, today: Date = new Date()): Promise<PeriodResponse> {
    let period = await PeriodRepository.findOrCreate(userId, year, month);

    await propagateInstallments(userId, period.id, year, month);
    await propagateFixedExpenses(userId, period.id, year, month);

    // Re-fetch to include newly propagated data
    period = (await PeriodRepository.findWithChildren(period.id))!;

    const [activeAccounts, allPlans] = await Promise.all([
      AccountRepository.findActiveByUser(userId),
      InstallmentRepository.findAllByUser(userId),
    ]);

    const summary = computePeriodSummary(
      activeAccounts,
      period.incomes as Parameters<typeof computePeriodSummary>[1],
      period.expenses as Parameters<typeof computePeriodSummary>[2],
      period.installments as Parameters<typeof computePeriodSummary>[3],
      allPlans,
      year,
      month,
      today,
    );

    return { period: period as unknown as PeriodResponse["period"], summary };
  },
};

// ── Private: Propagation logic ────────────────────────────────────────────────

async function propagateInstallments(
  userId: string,
  periodId: string,
  year: number,
  month: number,
) {
  const allPlans = await InstallmentRepository.findAllByUserWithPeriodItems(userId, periodId);
  const periodOff = monthOffset(year, month);

  for (const plan of allPlans) {
    const startOff = monthOffset(plan.startYear, plan.startMonth);
    const installmentIndex = periodOff - startOff;
    const isInRange = installmentIndex >= 0 && installmentIndex < plan.totalInstallments;
    const alreadyLinked = plan.periodItems.length > 0;

    if (isInRange && !alreadyLinked) {
      await InstallmentRepository.createPeriodInstallment(periodId, plan.id, plan.installmentAmount);
    }
  }
}

async function propagateFixedExpenses(
  userId: string,
  periodId: string,
  year: number,
  month: number,
) {
  const currentOffset = monthOffset(year, month);

  const allRecurring = await ExpenseRepository.findLatestRecurringByPeriod(userId);

  // Keep only the most recent instance per group up to the current period
  const groupMap = new Map<string, typeof allRecurring[number]>();
  for (const expense of allRecurring) {
    const off = monthOffset(expense.period.year, expense.period.month);
    if (off > currentOffset) continue;
    const existing = groupMap.get(expense.recurringGroupId!);
    const existingOff = existing
      ? monthOffset(existing.period.year, existing.period.month)
      : -1;
    if (!existing || off > existingOff) groupMap.set(expense.recurringGroupId!, expense);
  }

  const existingInPeriod = await ExpenseRepository.findRecurringInPeriod(periodId);
  const alreadyPropagated = new Set(existingInPeriod.map((e) => e.recurringGroupId));

  for (const [groupId, source] of groupMap.entries()) {
    if (alreadyPropagated.has(groupId)) continue;

    if (source.recurringEndYear != null && source.recurringEndMonth != null) {
      const endOffset = monthOffset(source.recurringEndYear, source.recurringEndMonth);
      if (currentOffset > endOffset) continue;
    }

    await ExpenseRepository.create({
      periodId,
      description: source.description,
      amount: source.amount,
      type: ExpenseType.FIXED,
      source: source.source as EntrySource,
      date: new Date(Date.UTC(year, month - 1, 1)),
      accountId: source.accountId,
      recurringGroupId: groupId,
      categoryIds: source.categories.map((c) => c.categoryId),
    });
  }
}
