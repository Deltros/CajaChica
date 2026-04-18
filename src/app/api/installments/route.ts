import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const planSchema = z.object({
  name: z.string().min(1),
  installmentAmount: z.number().positive(),
  totalInstallments: z.number().int().positive(),
  periodId: z.string(),
  startThisMonth: z.boolean().default(true),
});

function addMonths(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const allPlans = await prisma.installmentPlan.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(allPlans.filter((p) => p.paidInstallments < p.totalInstallments));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { name, installmentAmount, totalInstallments, periodId, startThisMonth } = parsed.data;

  // Verify the period belongs to this user
  const period = await prisma.monthlyPeriod.findFirst({
    where: { id: periodId, userId: session.user.id },
  });
  if (!period) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });

  // The first installment month: this month or next month
  const firstInstallment = startThisMonth
    ? { year: period.year, month: period.month }
    : addMonths(period.year, period.month, 1);

  const plan = await prisma.installmentPlan.create({
    data: {
      userId: session.user.id,
      name,
      installmentAmount,
      totalAmount: installmentAmount * totalInstallments,
      totalInstallments,
      startYear: firstInstallment.year,
      startMonth: firstInstallment.month,
    },
  });

  // If starting this month, create the PeriodInstallment now
  if (startThisMonth) {
    await prisma.periodInstallment.create({
      data: { periodId, planId: plan.id, amount: installmentAmount },
    });
  }

  return NextResponse.json(plan, { status: 201 });
}
