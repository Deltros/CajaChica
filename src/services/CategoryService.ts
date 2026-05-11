import { CategoryRepository } from "@/repositories/CategoryRepository";

export const CategoryService = {
  async getAll(userId: string) {
    const categories = await CategoryRepository.findAllByUser(userId);
    return categories.map((c) => ({ id: c.id, name: c.name, count: c._count.expenses }));
  },

  async create(userId: string, name: string) {
    const existing = await CategoryRepository.findByName(userId, name);
    if (existing) return { error: "Ya existe esa categoría" as const };

    const category = await CategoryRepository.create(userId, name);
    return { category };
  },

  async delete(id: string, userId: string) {
    const category = await CategoryRepository.findById(id, userId);
    if (!category) return false;

    await CategoryRepository.deleteById(id);
    return true;
  },
};
