import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function monthOffset(year: number, month: number) {
  return year * 12 + (month - 1);
}

async function propagateInstallments(userId: string, periodId: string, year: number, month: number) {
  const activePlans = await prisma.installmentPlan.findMany({
    where: { userId, paidInstallments: { lt: 0 } }, // placeholder — we'll filter below
    include: { periodItems: { where: { periodId } } },
  });

  // Re-fetch without broken filter
  const allPlans = await prisma.installmentPlan.findMany({
    where: { userId },
    include: { periodItems: { where: { periodId } } },
  });

  const periodOffset = monthOffset(year, month);

  for (const plan of allPlans) {
    const startOffset = monthOffset(plan.startYear, plan.startMonth);
    const installmentIndex = periodOffset - startOffset;

    // This period is within the plan's range and not yet fully paid
    const isInRange = installmentIndex >= 0 && installmentIndex < plan.totalInstallments;
    const alreadyLinked = plan.periodItems.length > 0;

    if (isInRange && !alreadyLinked) {
      await prisma.periodInstallment.create({
        data: { periodId, planId: plan.id, amount: plan.installmentAmount },
      });
    }
  }
}

async function propagateFixedExpenses(userId: string, periodId: string, year: number, month: number) {
  const currentOffset = year * 12 + (month - 1);

  // Find all recurring fixed expenses that started before or during this period
  const allRecurring = await prisma.expense.findMany({
    where: {
      type: "FIXED",
      recurringGroupId: { not: null },
      period: { userId },
    },
    include: { period: true, categories: { select: { categoryId: true } }, },
  });

  // Group by recurringGroupId, keep the most recent instance before or at this period
  const groupMap = new Map<string, typeof allRecurring[number]>();
  for (const expense of allRecurring) {
    const offset = expense.period.year * 12 + (expense.period.month - 1);
    if (offset > currentOffset) continue;
    const existing = groupMap.get(expense.recurringGroupId!);
    const existingOffset = existing ? existing.period.year * 12 + (existing.period.month - 1) : -1;
    if (!existing || offset > existingOffset) groupMap.set(expense.recurringGroupId!, expense);
  }

  // Check which groups already have an instance in this period
  const existingInPeriod = await prisma.expense.findMany({
    where: { periodId, recurringGroupId: { not: null } },
    select: { recurringGroupId: true },
  });
  const alreadyPropagated = new Set(existingInPeriod.map((e) => e.recurringGroupId));

  for (const [groupId, source] of groupMap.entries()) {
    if (alreadyPropagated.has(groupId)) continue;

    // Respect end-of-series marker set when the user deletes from a given month onwards
    if (source.recurringEndYear != null && source.recurringEndMonth != null) {
      const endOffset = source.recurringEndYear * 12 + (source.recurringEndMonth - 1);
      if (currentOffset > endOffset) continue;
    }

    await prisma.expense.create({
      data: {
        periodId,
        description: source.description,
        amount: source.amount,
        type: "FIXED",
        source: source.source,
        date: new Date(year, month - 1, 1),
        accountId: source.accountId,
        recurringGroupId: groupId,
        categories: source.categories.length
          ? { create: source.categories.map((c) => ({ categoryId: c.categoryId })) }
          : undefined,
      },
    });
  }
}

const periodInclude = {
  incomes: { orderBy: { date: "asc" as const }, include: { account: true, categories: { select: { category: { select: { id: true, name: true } } } } } },
  expenses: {
    orderBy: { date: "asc" as const },
    select: {
      id: true, description: true, amount: true, type: true, date: true, source: true, accountId: true, recurringGroupId: true, recurringEndYear: true, recurringEndMonth: true,
      account: { select: { name: true } },
      categories: { select: { category: { select: { id: true, name: true } } } },
    },
  },
  installments: { include: { plan: true } },
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const userId = session.user.id;

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

  // Propagate any installment plans and recurring fixed expenses to this period
  await propagateInstallments(userId, period.id, year, month);
  await propagateFixedExpenses(userId, period.id, year, month);

  // Re-fetch to include newly propagated installments
  period = await prisma.monthlyPeriod.findUnique({
    where: { id: period.id },
    include: periodInclude,
  })!;

  return NextResponse.json(period);
}
