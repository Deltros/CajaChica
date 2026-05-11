import { AccountRepository, type CreateAccountData, type UpdateAccountData } from "@/repositories/AccountRepository";

export const AccountService = {
  getAccounts(userId: string) {
    return AccountRepository.findAllByUser(userId);
  },

  create(userId: string, data: Omit<CreateAccountData, "userId">) {
    return AccountRepository.create({ ...data, userId });
  },

  async update(id: string, userId: string, data: UpdateAccountData) {
    const account = await AccountRepository.findById(id, userId);
    if (!account) return null;

    // Ensure only one default account exists at a time.
    if (data.isDefault === true) {
      await AccountRepository.clearDefaultForUser(userId);
    }

    return AccountRepository.updateById(id, data);
  },
};
