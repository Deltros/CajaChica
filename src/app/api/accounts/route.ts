import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const accountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["BANK", "CASH"]).default("BANK"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = accountSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const account = await prisma.account.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  return NextResponse.json(account, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = z.object({
    id: z.string(),
    name: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { id, ...data } = parsed.data;
  const account = await prisma.account.findFirst({ where: { id, userId: session.user.id } });
  if (!account) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const updated = await prisma.account.update({ where: { id }, data });
  return NextResponse.json(updated);
}
