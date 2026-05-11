import { prisma } from "@/lib/prisma";
import type { EntrySource } from "@/domain/enums";

export type CreateIncomeData = {
  periodId: string;
  accountId: string;
  amount: number;
  label?: string;
  source: EntrySource;
  categoryIds?: string[];
};

export type UpdateIncomeData = {
  amount?: number;
  label?: string | null;
  accountId?: string;
};

export const IncomeRepository = {
  create(data: CreateIncomeData) {
    const { categoryIds, ...incomeData } = data;
    return prisma.income.create({
      data: {
        ...incomeData,
        categories: categoryIds?.length
          ? { create: categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
      },
    });
  },

  findById(id: string, userId: string) {
    return prisma.income.findFirst({
      where: { id, period: { userId } },
    });
  },

  updateById(id: string, data: UpdateIncomeData) {
    return prisma.income.update({ where: { id }, data });
  },

  deleteById(id: string) {
    return prisma.income.delete({ where: { id } });
  },
};
