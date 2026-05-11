import { InstallmentRepository } from "@/repositories/InstallmentRepository";
import { PeriodRepository } from "@/repositories/PeriodRepository";

function addMonths(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

type CreatePlanInput = {
  periodId: string;
  name: string;
  installmentAmount: number;
  totalInstallments: number;
  startThisMonth: boolean;
  accountId?: string;
};

export const InstallmentService = {
  getActivePlans(userId: string) {
    return InstallmentRepository.findAllByUser(userId).then((plans) =>
      plans.filter((p) => p.paidInstallments < p.totalInstallments),
    );
  },

  async create(userId: string, input: CreatePlanInput) {
    const period = await PeriodRepository.findById(input.periodId, userId);
    if (!period) return null;

    const firstInstallmentDate = input.startThisMonth
      ? { year: period.year, month: period.month }
      : addMonths(period.year, period.month, 1);

    return InstallmentRepository.createWithFirstInstallment(
      {
        userId,
        accountId: input.accountId ?? null,
        name: input.name,
        installmentAmount: input.installmentAmount,
        totalAmount: input.installmentAmount * input.totalInstallments,
        totalInstallments: input.totalInstallments,
        startYear: firstInstallmentDate.year,
        startMonth: firstInstallmentDate.month,
      },
      input.startThisMonth
        ? { periodId: input.periodId, amount: input.installmentAmount }
        : null,
    );
  },

  async delete(id: string, userId: string) {
    const plan = await InstallmentRepository.findById(id, userId);
    if (!plan) return false;

    await InstallmentRepository.deletePlan(id);
    return true;
  },
};
