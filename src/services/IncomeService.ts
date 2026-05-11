import { IncomeRepository, type CreateIncomeData, type UpdateIncomeData } from "@/repositories/IncomeRepository";
import { CategoryRepository } from "@/repositories/CategoryRepository";
import { PeriodRepository } from "@/repositories/PeriodRepository";

export const IncomeService = {
  async create(userId: string, data: CreateIncomeData) {
    const period = await PeriodRepository.findById(data.periodId, userId);
    if (!period) return null;

    return IncomeRepository.create(data);
  },

  async update(
    id: string,
    userId: string,
    data: UpdateIncomeData & { categoryIds?: string[] },
  ) {
    const income = await IncomeRepository.findById(id, userId);
    if (!income) return null;

    const { categoryIds, ...incomeData } = data;
    const updated = await IncomeRepository.updateById(id, incomeData);

    if (categoryIds !== undefined) {
      await CategoryRepository.replaceForIncome(id, categoryIds);
    }

    return updated;
  },

  async delete(id: string, userId: string) {
    const income = await IncomeRepository.findById(id, userId);
    if (!income) return false;

    await IncomeRepository.deleteById(id);
    return true;
  },
};
