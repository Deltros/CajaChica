import { prisma } from "@/lib/prisma";
import { ExpenseType, type EntrySource } from "@/domain/enums";

export type CreateExpenseData = {
  periodId: string;
  description: string;
  amount: number;
  type: ExpenseType;
  source: EntrySource;
  date: Date;
  accountId: string | null;
  recurringGroupId: string | null;
  categoryIds?: string[];
};

export type UpdateExpenseData = {
  amount?: number;
  description?: string;
  type?: ExpenseType;
  accountId?: string | null;
};

export const ExpenseRepository = {
  create(data: CreateExpenseData) {
    const { categoryIds, ...expenseData } = data;
    return prisma.expense.create({
      data: {
        ...expenseData,
        categories: categoryIds?.length
          ? { create: categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
      },
    });
  },

  findById(id: string, userId: string) {
    return prisma.expense.findFirst({
      where: { id, period: { userId } },
      include: { period: true },
    });
  },

  findByRecurringGroup(groupId: string, userId: string) {
    return prisma.expense.findMany({
      where: { recurringGroupId: groupId, period: { userId } },
      include: { period: true },
    });
  },

  // Returns the most recent recurring expense per group, up to and including the given period.
  // Used by propagation logic to determine what to copy into a new period.
  findLatestRecurringByPeriod(userId: string) {
    return prisma.expense.findMany({
      where: {
        type: ExpenseType.FIXED,
        recurringGroupId: { not: null },
        period: { userId },
      },
      include: {
        period: true,
        categories: { select: { categoryId: true } },
      },
    });
  },

  findRecurringInPeriod(periodId: string) {
    return prisma.expense.findMany({
      where: { periodId, recurringGroupId: { not: null } },
      select: { recurringGroupId: true },
    });
  },

  updateById(id: string, data: UpdateExpenseData) {
    return prisma.expense.update({ where: { id }, data });
  },

  updateMany(ids: string[], data: UpdateExpenseData) {
    return prisma.expense.updateMany({ where: { id: { in: ids } }, data });
  },

  updateRecurringEndMarker(id: string, year: number, month: number) {
    return prisma.expense.update({
      where: { id },
      data: { recurringEndYear: year, recurringEndMonth: month },
    });
  },

  deleteById(id: string) {
    return prisma.expense.delete({ where: { id } });
  },

  deleteMany(ids: string[]) {
    return prisma.expense.deleteMany({ where: { id: { in: ids } } });
  },
};
