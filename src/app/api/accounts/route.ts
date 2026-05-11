import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { AccountService } from "@/services/AccountService";

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["BANK", "CASH"]).default("BANK"),
  isCreditCard: z.boolean().default(false),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  isCreditCard: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const accounts = await AccountService.getAccounts(session.user.id);
  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const account = await AccountService.create(session.user.id, parsed.data);
  return NextResponse.json(account, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { id, ...data } = parsed.data;
  const account = await AccountService.update(id, session.user.id, data);
  if (!account) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json(account);
}
