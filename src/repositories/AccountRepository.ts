import { prisma } from "@/lib/prisma";
import type { AccountType } from "@/domain/enums";

export type CreateAccountData = {
  userId: string;
  name: string;
  type: AccountType;
  isCreditCard: boolean;
};

export type UpdateAccountData = {
  name?: string;
  isActive?: boolean;
  isDefault?: boolean;
  isCreditCard?: boolean;
};

export const AccountRepository = {
  findAllByUser(userId: string) {
    return prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  },

  findActiveByUser(userId: string) {
    return prisma.account.findMany({
      where: { userId, isActive: true },
    });
  },

  findById(id: string, userId: string) {
    return prisma.account.findFirst({ where: { id, userId } });
  },

  create(data: CreateAccountData) {
    return prisma.account.create({ data });
  },

  updateById(id: string, data: UpdateAccountData) {
    return prisma.account.update({ where: { id }, data });
  },

  clearDefaultForUser(userId: string) {
    return prisma.account.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  },
};
