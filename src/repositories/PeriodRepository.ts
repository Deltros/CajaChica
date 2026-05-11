import { prisma } from "@/lib/prisma";

// Full include shape used consistently everywhere a period is fetched with its children.
const periodInclude = {
  incomes: {
    orderBy: { date: "asc" as const },
    include: {
      account: true,
      categories: { select: { category: { select: { id: true, name: true } } } },
    },
  },
  expenses: {
    orderBy: { date: "asc" as const },
    select: {
      id: true,
      description: true,
      amount: true,
      type: true,
      date: true,
      source: true,
      accountId: true,
      recurringGroupId: true,
      recurringEndYear: true,
      recurringEndMonth: true,
      account: { select: { name: true } },
      categories: { select: { category: { select: { id: true, name: true } } } },
    },
  },
  installments: { include: { plan: true } },
} as const;

export const PeriodRepository = {
  findWithChildren(periodId: string) {
    return prisma.monthlyPeriod.findUnique({
      where: { id: periodId },
      include: periodInclude,
    });
  },

  findByYearMonth(userId: string, year: number, month: number) {
    return prisma.monthlyPeriod.findUnique({
      where: { userId_year_month: { userId, year, month } },
      include: periodInclude,
    });
  },

  async findOrCreate(userId: string, year: number, month: number) {
    let period = await prisma.monthlyPeriod.findUnique({
      where: { userId_year_month: { userId, year, month } },
      include: periodInclude,
    });

    if (!period) {
      period = await prisma.monthlyPeriod.create({
        data: { userId, year, month },
        include: periodInclude,
      });
    }

    return period;
  },

  findById(id: string, userId: string) {
    return prisma.monthlyPeriod.findFirst({ where: { id, userId } });
  },
};
