import { prisma } from "@/lib/prisma";

export type CreateInstallmentPlanData = {
  userId: string;
  accountId: string | null;
  name: string;
  installmentAmount: number;
  totalAmount: number;
  totalInstallments: number;
  startYear: number;
  startMonth: number;
};

export const InstallmentRepository = {
  findAllByUser(userId: string) {
    return prisma.installmentPlan.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  findAllByUserWithPeriodItems(userId: string, periodId: string) {
    return prisma.installmentPlan.findMany({
      where: { userId },
      include: { periodItems: { where: { periodId } } },
    });
  },

  findById(id: string, userId: string) {
    return prisma.installmentPlan.findFirst({ where: { id, userId } });
  },

  // Creates the plan and optionally its first PeriodInstallment in a single transaction.
  async createWithFirstInstallment(
    planData: CreateInstallmentPlanData,
    firstInstallment: { periodId: string; amount: number } | null,
  ) {
    return prisma.$transaction(async (tx) => {
      const plan = await tx.installmentPlan.create({ data: planData });

      if (firstInstallment) {
        await tx.periodInstallment.create({
          data: {
            periodId: firstInstallment.periodId,
            planId: plan.id,
            amount: firstInstallment.amount,
          },
        });
      }

      return plan;
    });
  },

  createPeriodInstallment(periodId: string, planId: string, amount: number) {
    return prisma.periodInstallment.create({
      data: { periodId, planId, amount },
    });
  },

  deletePlan(id: string) {
    return prisma.installmentPlan.delete({ where: { id } });
  },
};
