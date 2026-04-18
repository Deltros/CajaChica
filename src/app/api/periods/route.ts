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

const periodInclude = {
  incomes: { include: { account: true } },
  expenses: { orderBy: { date: "asc" as const }, select: { id: true, description: true, amount: true, type: true, date: true, accountId: true } },
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

  // Propagate any installment plans that belong to this period
  await propagateInstallments(userId, period.id, year, month);

  // Re-fetch to include newly propagated installments
  period = await prisma.monthlyPeriod.findUnique({
    where: { id: period.id },
    include: periodInclude,
  })!;

  return NextResponse.json(period);
}
