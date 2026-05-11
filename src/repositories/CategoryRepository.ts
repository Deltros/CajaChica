import { prisma } from "@/lib/prisma";

export const CategoryRepository = {
  findAllByUser(userId: string) {
    return prisma.category.findMany({
      where: { userId },
      include: { _count: { select: { expenses: true } } },
      orderBy: { expenses: { _count: "desc" } },
    });
  },

  findById(id: string, userId: string) {
    return prisma.category.findFirst({ where: { id, userId } });
  },

  findByName(userId: string, name: string) {
    return prisma.category.findUnique({
      where: { userId_name: { userId, name } },
    });
  },

  create(userId: string, name: string) {
    return prisma.category.create({ data: { userId, name } });
  },

  deleteById(id: string) {
    return prisma.category.delete({ where: { id } });
  },

  // Replaces all category associations for a given expense or income atomically.
  // Avoids the duplicated deleteMany + createMany pattern that existed in both
  // the expenses and incomes PATCH handlers.
  replaceForExpense(expenseId: string, categoryIds: string[]) {
    return prisma.$transaction(async (tx) => {
      await tx.expenseCategory.deleteMany({ where: { expenseId } });
      if (categoryIds.length > 0) {
        await tx.expenseCategory.createMany({
          data: categoryIds.map((categoryId) => ({ expenseId, categoryId })),
        });
      }
    });
  },

  replaceForIncome(incomeId: string, categoryIds: string[]) {
    return prisma.$transaction(async (tx) => {
      await tx.incomeCategory.deleteMany({ where: { incomeId } });
      if (categoryIds.length > 0) {
        await tx.incomeCategory.createMany({
          data: categoryIds.map((categoryId) => ({ incomeId, categoryId })),
        });
      }
    });
  },
};
