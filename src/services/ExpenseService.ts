import { prisma } from "@/lib/prisma";
import { ExpenseType, EntrySource } from "@/domain/enums";
import { ExpenseRepository, type CreateExpenseData, type UpdateExpenseData } from "@/repositories/ExpenseRepository";
import { CategoryRepository } from "@/repositories/CategoryRepository";
import { PeriodRepository } from "@/repositories/PeriodRepository";

function monthOffset(year: number, month: number) {
  return year * 12 + (month - 1);
}

export const ExpenseService = {
  async create(userId: string, data: CreateExpenseData) {
    const period = await PeriodRepository.findById(data.periodId, userId);
    if (!period) return null;

    return ExpenseRepository.create(data);
  },

  async delete(id: string, userId: string) {
    const expense = await ExpenseRepository.findById(id, userId);
    if (!expense) return false;

    if (expense.recurringGroupId) {
      await deleteRecurringSeries(expense as ExpenseWithPeriod, userId);
    } else {
      await ExpenseRepository.deleteById(id);
    }

    return true;
  },

  async update(
    id: string,
    userId: string,
    data: UpdateExpenseData & { categoryIds?: string[] },
  ) {
    const expense = await ExpenseRepository.findById(id, userId);
    if (!expense) return null;

    const { categoryIds, ...expenseData } = data;
    const updated = await ExpenseRepository.updateById(id, expenseData);

    if (categoryIds !== undefined) {
      await CategoryRepository.replaceForExpense(id, categoryIds);
    }

    if (expense.recurringGroupId) {
      await propagateEditToFutureInstances(expense as ExpenseWithPeriod, userId, expenseData);
    }

    return updated;
  },
};

// ── Private helpers ───────────────────────────────────────────────────────────

type ExpenseWithPeriod = {
  id: string;
  recurringGroupId: string;
  period: { year: number; month: number };
};

async function deleteRecurringSeries(expense: ExpenseWithPeriod, userId: string) {
  const { year, month } = expense.period;
  const currentOffset = monthOffset(year, month);

  const allInstances = await ExpenseRepository.findByRecurringGroup(expense.recurringGroupId, userId);

  const idsToDelete = allInstances
    .filter((e) => monthOffset(e.period.year, e.period.month) >= currentOffset)
    .map((e) => e.id);

  const lastSurvivor = allInstances
    .filter((e) => monthOffset(e.period.year, e.period.month) < currentOffset)
    .sort((a, b) => monthOffset(b.period.year, b.period.month) - monthOffset(a.period.year, a.period.month))[0];

  await prisma.$transaction(async (tx) => {
    await tx.expense.deleteMany({ where: { id: { in: idsToDelete } } });
    if (lastSurvivor) {
      await tx.expense.update({
        where: { id: lastSurvivor.id },
        data: {
          recurringEndYear: lastSurvivor.period.year,
          recurringEndMonth: lastSurvivor.period.month,
        },
      });
    }
  });
}

async function propagateEditToFutureInstances(
  expense: ExpenseWithPeriod,
  userId: string,
  data: UpdateExpenseData,
) {
  const currentOffset = monthOffset(expense.period.year, expense.period.month);
  const allInstances = await ExpenseRepository.findByRecurringGroup(expense.recurringGroupId, userId);

  const futureIds = allInstances
    .filter((e) => monthOffset(e.period.year, e.period.month) > currentOffset && e.id !== expense.id)
    .map((e) => e.id);

  if (futureIds.length > 0) {
    // type is not propagated — only amount, description and account change across the series
    const { type: _type, ...propagatableData } = data;
    await ExpenseRepository.updateMany(futureIds, propagatableData);
  }
}
