# Reporte de Auditoría de Arquitectura — Mantenedor de Gastos

**Fecha:** 2026-05-03  
**Revisado por:** Claude Sonnet 4.6 (rol QA / Arquitecto)  
**Stack:** Next.js 16 (App Router) · Prisma · PostgreSQL (Neon) · NextAuth v5 · Zod · React 19 · TypeScript

---

## Resumen Ejecutivo

El sistema tiene una **base sólida** a nivel de dominio: el schema de Prisma es bien tipado, usa enums correctamente, la autenticación está bien implementada, y la lógica de cálculo de saldo (`accountBalance.ts`) está bien aislada. Sin embargo, existen problemas estructurales que dificultarán la extensión del sistema y, en especial, la futura implementación de una aplicación móvil.

Los problemas principales son:
1. **Lógica de dominio ejecutándose en el frontend** — para una app móvil, esto requeriría duplicación completa.
2. **Ausencia de capa de servicio** — los API routes llaman a Prisma directamente, mezclando orquestación de negocio con acceso a datos.
3. **Tipos duplicados** en ~6 archivos con formas ligeramente distintas.
4. **Un bug de query muerta** en `periods/route.ts` que ejecuta una consulta innecesaria a la base de datos en cada carga.
5. **Falta de transacciones** en operaciones multi-paso (riesgo de inconsistencia).
6. **Validación ausente** en el handler PATCH de expenses.

---

## 1. Análisis por Principio SOLID

### 1.1 Single Responsibility Principle (SRP)

#### ✅ Cumple correctamente

| Archivo | Por qué cumple |
|---|---|
| `src/lib/prisma.ts` | Una sola responsabilidad: singleton del cliente Prisma. |
| `src/lib/auth.ts` | Configura únicamente NextAuth. |
| `src/lib/installments.ts` | Una función de cálculo de índice de cuota. |
| `src/lib/accountBalance.ts` | Calcula el balance de una cuenta. Bien aislado. |
| `src/components/NumericInput.tsx` | Input numérico reutilizable, sin lógica de negocio. |
| `src/components/CategoryPicker.tsx` | Selección y creación de categorías, bien encapsulado. |

#### ❌ Viola SRP

**`src/app/api/periods/route.ts` — El archivo más problemático**

Este archivo tiene al menos cuatro responsabilidades distintas:
1. Creación del período si no existe.
2. Fetch del período con todos sus datos.
3. Propagación de planes de cuotas al período (`propagateInstallments`).
4. Propagación de gastos fijos recurrentes (`propagateFixedExpenses`).

Además, hay un **bug de código muerto** dentro de `propagateInstallments` (explicado en sección 3).

**`src/app/api/expenses/route.ts`**

- El `DELETE` handler no solo elimina un gasto: también calcula qué instancias futuras eliminar, cuál fue el último sobreviviente de la serie, y lo actualiza. Es lógica de negocio compleja incrustada en el handler.
- El `PATCH` handler no solo actualiza: también propaga cambios a todas las instancias futuras del mismo grupo recurrente.

**`src/app/dashboard/page.tsx` (~925 líneas)**

Este componente tiene al menos 7 responsabilidades:
1. Fetching de datos (3 llamadas API en paralelo).
2. Gestión de estado UI (15+ useState).
3. Cálculo de totales y saldos de cuenta (lógica de dominio).
4. Renderizado del header y navegación de meses.
5. Renderizado de ingresos, gastos, cuotas y cuentas.
6. Manejo de todas las acciones CRUD con llamadas API.
7. Definición e implementación de sub-componentes (`ExpenseList`, `IncomeList`, `CatHeader`, `OrphanedPlanItem`).

**`src/lib/format.ts`**

Contiene `daysLeftInMonth`, que es lógica de dominio (cuántos días quedan en el mes actual), no una función de formateo. La combinación de presentación (`formatCLP`) y lógica temporal en el mismo módulo viola SRP.

---

### 1.2 Open/Closed Principle (OCP)

#### ✅ Cumple correctamente

- Los enums `ExpenseType`, `EntrySource`, `AccountType` permiten agregar nuevos valores sin cambiar la lógica existente en la mayoría de los casos.
- El schema de Prisma está bien modelado para extensión.

#### ❌ Viola OCP

**`src/lib/accountBalance.ts`, líneas 74-108**

La función `computeAccountBalance` tiene un `if/else` condicional en `account.isCreditCard`. Si en el futuro se agrega un tercer tipo de cuenta (ej.: cuenta de inversión, billetera digital con lógica diferente), habría que **modificar** esta función en lugar de extenderla:

```typescript
// Estado actual — viola OCP:
if (account.isCreditCard) {
  // lógica credit card
  return { ... };
}
return { 
  // lógica cuenta débito
};
```

**Strings literales de enum en el frontend** (`dashboard/page.tsx`, líneas 102-112)

```typescript
const fixedExpenses = period?.expenses.filter((e) => e.type === "FIXED") ?? [];
const savings = period?.expenses.filter((e) => e.type === "SAVING") ?? [];
const variableExpenses = period?.expenses.filter((e) => e.type === "VARIABLE") ?? [];
const pendingExpenses = period?.expenses.filter((e) => e.type === "PENDING") ?? [];
```

Si se renombra un valor del enum, hay que buscar y cambiar cada string literal por el sistema. No hay una referencia única.

**`src/app/api/expenses/route.ts`, PATCH handler, línea 164**

El campo `type` en el PATCH se aplica sin pasar por Zod:
```typescript
const { id, amount, description, type, accountId, categoryIds } = body;
// ...
...(type !== undefined && { type }),
```
No hay validación que asegure que `type` sea un valor válido del enum.

---

### 1.3 Liskov Substitution Principle (LSP)

No hay herencia de clases en el proyecto (patrón funcional/composición), por lo que LSP no aplica como problema directo. **Sin observaciones.**

---

### 1.4 Interface Segregation Principle (ISP)

#### ❌ Tipos locales duplicados en múltiples archivos

El mismo concepto de "Account", "Expense", etc. está definido como tipo local en al menos 6 lugares distintos con formas ligeramente distintas:

| Archivo | Tipo local definido |
|---|---|
| `dashboard/page.tsx` líneas 17-22 | `Account`, `Income`, `Expense`, `PeriodInstallment`, `Period`, `InstallmentPlan` |
| `ExpenseModal.tsx` línea 7 | `Account = { id, name, isCreditCard }` |
| `IncomeModal.tsx` línea 8 | `Account = { id, name, type, isCreditCard }` |
| `PendingExpenseModal.tsx` líneas 8-17 | `Account = { id, name }`, `Expense = { id, description, amount, ... }` |
| `BalanceAdjustModal.tsx` línea 17 | `Props.account = { id, name }` |
| `accountBalance.ts` líneas 2-7 | `AccountRef`, `IncomeEntry`, `ExpenseEntry`, `InstallmentEntry`, `PlanEntry` |

Esto no es solo duplicación — es una **violación de ISP** porque cada componente define su propia versión del contrato de datos. Si cambia la forma de un objeto en el API, hay que actualizar cada uno de estos tipos manualmente.

---

### 1.5 Dependency Inversion Principle (DIP)

#### ❌ Alta dependencia de implementaciones concretas

**API routes dependen directamente de Prisma:**
```typescript
// En cada route handler:
import { prisma } from "@/lib/prisma";
const expense = await prisma.expense.create({ ... });
```
No hay abstracción de repositorio. Si se cambia el ORM o la base de datos, hay que reescribir todos los routes.

**Componentes frontend dependen de fetch hardcodeado:**
```typescript
// BalanceAdjustModal.tsx:
await fetch("/api/incomes", { method: "POST", ... });
await fetch("/api/expenses", { method: "POST", ... });

// dashboard/page.tsx:
fetch(`/api/periods?year=${year}&month=${month}`)
fetch("/api/accounts")
fetch("/api/installments")
```

Este es el **problema más crítico para el futuro móvil**. Cada componente sabe exactamente qué endpoint llamar, con qué URL, y con qué estructura de body. Para una app React Native, todos estos `fetch` deberían reemplazarse. No hay una capa de servicio API reutilizable.

---

## 2. Lógica de Dominio en el Frontend (Riesgo Crítico para App Móvil)

Este es el punto más importante del reporte. Si se construye una app móvil con el estado actual, esta lógica tendría que **duplicarse completamente** en el cliente móvil:

### 2.1 Cálculo de balances de cuenta (cliente)

**Archivo:** `dashboard/page.tsx`, líneas 115-128

```typescript
const accountBalances = activeAccounts.map((account) => {
  const { balance, pendingSpent, totalRemainingDebt } = computeAccountBalance(
    account,
    period?.incomes ?? [],
    period?.expenses ?? [],
    period?.installments ?? [],
    allPlans,
    year,
    month,
  );
  return { account, balance, pendingSpent, totalRemainingDebt };
});
```

Esta llamada a `computeAccountBalance` es lógica de dominio corriendo en el browser. La función está bien aislada en `accountBalance.ts`, pero **la invocación está en el cliente**. Para una app móvil, el endpoint `/api/periods` debería devolver los balances ya calculados, no los datos crudos para que el cliente los calcule.

### 2.2 Número de cuota calculado en el frontend

**Archivo:** `dashboard/page.tsx`, líneas 436, 451, 659, 664, 670

```typescript
const currentInstallment = installmentNumberForPeriod(inst.plan, year, month);
```

`installmentNumberForPeriod` es lógica de dominio. Se llama 5 veces en el componente para renderizar el progreso visual de cada cuota. Para una app móvil esto debería venir calculado desde la API.

### 2.3 Todas las agregaciones del período

**Archivo:** `dashboard/page.tsx`, líneas 101-133

```typescript
const totalIncome = period?.incomes.reduce(...) ?? 0;
const fixedExpenses = period?.expenses.filter(e => e.type === "FIXED") ?? [];
const savings = period?.expenses.filter(e => e.type === "SAVING") ?? [];
const totalFixed = fixedExpenses.reduce(..., 0);
const totalSavings = savings.reduce(..., 0);
const totalVariable = variableExpenses.reduce(..., 0);
const pendingInstallments = period?.installments.filter(i => !i.isPaid) ?? [];
const totalPendingInstallments = pendingInstallments.reduce(..., 0);
const orphanedPlans = allPlans.filter(p => !pendingInstallments.some(...));
const totalPending = pendingExpenses.reduce(..., 0);
const totalPositive = accountBalances.filter(b => b.balance > 0).reduce(..., 0);
const totalNegative = accountBalances.filter(b => b.balance < 0).reduce(..., 0);
const remaining = totalPositive + totalNegative;
const daysLeft = daysLeftInMonth(year, month);
const dailyBudget = daysLeft > 0 ? Math.floor(remaining / daysLeft) : 0;
const effectiveTotalVariable = Math.max(0, totalIncome - totalFixed - ...);
```

Son ~20 variables de derivación de datos de dominio. Para una app móvil, la respuesta de `/api/periods` debería incluir un objeto `summary` con estos valores pre-calculados.

---

## 3. Bugs y Problemas Específicos

### Bug 3.1 — Query muerta en `periods/route.ts`

**Archivo:** `src/app/api/periods/route.ts`, líneas 10-19  
**Severidad:** Media (no rompe nada pero ejecuta una query innecesaria en cada GET de período)

```typescript
async function propagateInstallments(...) {
  const activePlans = await prisma.installmentPlan.findMany({
    where: { userId, paidInstallments: { lt: 0 } }, // ← NUNCA retorna nada (paidInstallments es siempre >= 0)
    include: { periodItems: { where: { periodId } } },
  });

  // Re-fetch without broken filter
  const allPlans = await prisma.installmentPlan.findMany({  // ← Esta es la que se usa
    where: { userId },
    include: { periodItems: { where: { periodId } } },
  });
  // activePlans nunca se usa
```

La primera query ejecuta un filtro `paidInstallments < 0` que nunca va a retornar filas ya que el campo tiene `@default(0)` y nunca se decrementa. La variable `activePlans` no se usa en ningún lado. Es una query extra a la base de datos en cada carga de período.

### Bug 3.2 — Sin transacciones en operaciones multi-paso

**Archivo:** `src/app/api/installments/route.ts`, líneas 53-70  
**Severidad:** Alta (riesgo de inconsistencia de datos)

```typescript
const plan = await prisma.installmentPlan.create({ data: { ... } });

if (startThisMonth) {
  await prisma.periodInstallment.create({   // ← Si esto falla, queda un plan sin cuota
    data: { periodId, planId: plan.id, amount: installmentAmount },
  });
}
```

Si la segunda operación falla (timeout de BD, error de constraint), queda un `InstallmentPlan` huérfano sin su `PeriodInstallment` inicial. Debería ser una transacción.

Lo mismo ocurre en el `DELETE` de `expenses/route.ts`, donde se ejecutan `deleteMany` + `update` sin transacción.

### Bug 3.3 — PATCH de expenses sin validación Zod

**Archivo:** `src/app/api/expenses/route.ts`, líneas 104-115  
**Severidad:** Media (vulnerabilidad de entrada)

```typescript
export async function PATCH(req: Request) {
  const session = await auth();
  // ...
  const body = await req.json();
  const { id, amount, description, type, accountId, categoryIds } = body;
  // ← No hay validación Zod aquí. `type` podría ser cualquier string.
```

El POST sí tiene Zod (`expenseSchema`), pero el PATCH no. Un cliente podría enviar `type: "INVALID_TYPE"` y se aplicaría directamente a la base de datos.

### Bug 3.4 — Side effect en GET (viola REST)

**Archivo:** `src/app/api/periods/route.ts`, líneas 118-140

Un `GET /api/periods` crea el período si no existe y ejecuta propagación de gastos fijos e installments. Esto viola el principio REST de que GET debe ser idempotente y sin side effects. Si el cliente hace un retry por un timeout de red, podría crear datos duplicados o ejecutar propagaciones múltiples.

### Bug 3.5 — `OrphanedPlanItem` usa `paidInstallments` que siempre es 0

**Archivo:** `dashboard/page.tsx`, línea 878

```typescript
const remaining = (plan.totalInstallments - plan.paidInstallments) * plan.installmentAmount;
```

Como está documentado en la memoria del proyecto, `paidInstallments` siempre es `0`. Este cálculo siempre retorna `totalInstallments * installmentAmount` (el total completo de la deuda), en lugar del monto realmente pendiente. En `accountBalance.ts` hay un comentario explicativo de por qué se usa el offset temporal en lugar de `paidInstallments`, pero en `OrphanedPlanItem` no hay ninguna explicación — la inconsistencia puede confundir a quien lo lea.

### Bug 3.6 — `InstallmentsPanel.tsx` usa Tailwind; todo lo demás usa inline styles

**Archivo:** `src/components/InstallmentsPanel.tsx`

```tsx
<ul className="space-y-3">
  <li className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
```

Todos los demás componentes usan objetos de estilo inline (`style={{}}`). Este componente usa clases de Tailwind. Es inconsistencia de estilo que sugiere que el componente fue escrito en una etapa diferente y no actualizado. El componente tampoco parece usarse actualmente (no aparece en el dashboard).

### Bug 3.7 — `incomes/route.ts` POST sin try/catch

**Archivo:** `src/app/api/incomes/route.ts`, líneas 28-37

```typescript
const income = await prisma.income.create({ data: { ... } });
return NextResponse.json(income, { status: 201 });
```

No hay `try/catch`. Si Prisma lanza un error (ej.: violación de FK si el `accountId` no existe), el error se propaga sin respuesta controlada. `expenses/route.ts` sí tiene try/catch en su POST.

---

## 4. Duplicación de Estilos

**Archivos:** `ExpenseModal.tsx`, `IncomeModal.tsx`, `PendingExpenseModal.tsx`, `BalanceAdjustModal.tsx`

Los mismos objetos de estilo `FIELD_LABEL` y `FIELD_INPUT` están definidos en cada modal:

```typescript
// En ExpenseModal.tsx:
const FIELD_LABEL: React.CSSProperties = {
  display: "block", fontSize: 11, letterSpacing: "0.14em",
  textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6,
};

// En IncomeModal.tsx: (idéntico)
const FIELD_LABEL: React.CSSProperties = {
  display: "block", fontSize: 11, letterSpacing: "0.14em",
  textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6,
};
```

Cuatro copias del mismo objeto. Si se cambia el diseño del label, hay que actualizar cuatro archivos.

---

## 5. Roadmap de Mejoras (Detallado para Implementación)

Las mejoras están ordenadas de mayor a menor impacto. Las primeras son necesarias para soportar la app móvil; las últimas son mejoras de calidad.

---

### MEJORA 1 — Eliminar query muerta en `propagateInstallments`

**Archivo:** `src/app/api/periods/route.ts`  
**Impacto:** Rendimiento (elimina 1 query a BD por cada carga de período)  
**Complejidad:** Baja

**Estado actual (líneas 10-20):**
```typescript
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
```

**Estado deseado:**
```typescript
async function propagateInstallments(userId: string, periodId: string, year: number, month: number) {
  const allPlans = await prisma.installmentPlan.findMany({
    where: { userId },
    include: { periodItems: { where: { periodId } } },
  });
  // Eliminar completamente las líneas 10-14 (activePlans) y el comentario "Re-fetch without broken filter"
```

---

### MEJORA 2 — Agregar transacciones a operaciones multi-paso

**Archivos:** `src/app/api/installments/route.ts`, `src/app/api/expenses/route.ts`  
**Impacto:** Integridad de datos  
**Complejidad:** Baja

**`installments/route.ts` POST — estado deseado:**
```typescript
const result = await prisma.$transaction(async (tx) => {
  const plan = await tx.installmentPlan.create({
    data: {
      userId: session.user.id,
      accountId: accountId ?? null,
      name,
      installmentAmount,
      totalAmount: installmentAmount * totalInstallments,
      totalInstallments,
      startYear: firstInstallment.year,
      startMonth: firstInstallment.month,
    },
  });

  if (startThisMonth) {
    await tx.periodInstallment.create({
      data: { periodId, planId: plan.id, amount: installmentAmount },
    });
  }

  return plan;
});

return NextResponse.json(result, { status: 201 });
```

**`expenses/route.ts` DELETE — el bloque de `deleteMany` + `update` del survivor debe estar dentro de `prisma.$transaction(async (tx) => { ... })`.**

---

### MEJORA 3 — Agregar validación Zod al PATCH de expenses

**Archivo:** `src/app/api/expenses/route.ts`  
**Impacto:** Seguridad / robustez  
**Complejidad:** Baja

**Estado deseado — definir un schema para el PATCH antes del handler:**
```typescript
const patchExpenseSchema = z.object({
  id: z.string(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  type: z.enum(["FIXED", "VARIABLE", "SAVING", "PENDING"]).optional(),
  accountId: z.string().nullable().optional(),
  categoryIds: z.array(z.string()).optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = patchExpenseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { id, amount, description, type, accountId, categoryIds } = parsed.data;
  // resto del handler igual
```

---

### MEJORA 4 — Agregar try/catch al POST de incomes

**Archivo:** `src/app/api/incomes/route.ts`  
**Impacto:** Robustez  
**Complejidad:** Baja

**Estado deseado:**
```typescript
export async function POST(req: Request) {
  // ... (auth y validación igual) ...
  try {
    const income = await prisma.income.create({ data: { ... } });
    return NextResponse.json(income, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al guardar el ingreso" }, { status: 500 });
  }
}
```

---

### MEJORA 5 — Crear un archivo de tipos compartidos

**Archivo a crear:** `src/types/domain.ts`  
**Impacto:** Mantenibilidad, ISP  
**Complejidad:** Media

Centralizar los tipos que hoy están duplicados en múltiples archivos. Esto permite que si cambia la forma de la API, se actualice en un solo lugar.

**Contenido propuesto de `src/types/domain.ts`:**
```typescript
// Tipos de respuesta de API — refleja exactamente lo que devuelven los endpoints

export type AccountDTO = {
  id: string;
  name: string;
  type: "BANK" | "CASH";
  isCreditCard: boolean;
  isActive: boolean;
  isDefault: boolean;
};

export type CategoryDTO = {
  id: string;
  name: string;
};

export type CategoryRef = {
  category: CategoryDTO;
};

export type IncomeDTO = {
  id: string;
  accountId: string;
  amount: number;
  label: string | null;
  date: string;
  source: "USER" | "BALANCE_ADJUST_TOTAL" | "BALANCE_ADJUST_MONTHLY";
  account: AccountDTO;
  categories: CategoryRef[];
};

export type ExpenseDTO = {
  id: string;
  description: string;
  amount: number;
  type: "FIXED" | "VARIABLE" | "SAVING" | "PENDING";
  date: string;
  source: "USER" | "BALANCE_ADJUST_TOTAL" | "BALANCE_ADJUST_MONTHLY";
  accountId: string | null;
  recurringGroupId: string | null;
  recurringEndYear: number | null;
  recurringEndMonth: number | null;
  account: { name: string } | null;
  categories: CategoryRef[];
};

export type InstallmentPlanDTO = {
  id: string;
  name: string;
  totalInstallments: number;
  paidInstallments: number;
  installmentAmount: number;
  totalAmount: number;
  accountId: string | null;
  startYear: number;
  startMonth: number;
};

export type PeriodInstallmentDTO = {
  id: string;
  planId: string;
  amount: number;
  isPaid: boolean;
  plan: InstallmentPlanDTO;
};

export type PeriodDTO = {
  id: string;
  incomes: IncomeDTO[];
  expenses: ExpenseDTO[];
  installments: PeriodInstallmentDTO[];
};
```

Luego, en todos los archivos que tienen tipos locales duplicados, reemplazarlos con imports de `@/types/domain`:
- `dashboard/page.tsx`: eliminar líneas 17-22, importar desde `@/types/domain`
- `ExpenseModal.tsx`: reemplazar `type Account`
- `IncomeModal.tsx`: reemplazar `type Account`
- `PendingExpenseModal.tsx`: reemplazar `type Account` y `type Expense`
- `accountBalance.ts`: puede mantener sus tipos internos narrow (`AccountRef`, `IncomeEntry`, etc.) ya que son tipos de parámetros internos, no DTOs de API

---

### MEJORA 6 — Crear capa de servicio API en el frontend

**Archivo a crear:** `src/services/api.ts`  
**Impacto:** Crítico para app móvil, DIP  
**Complejidad:** Media

Esta es la mejora más importante para facilitar la implementación de una app móvil. Hoy cada componente llama a `fetch` directamente. Si se crea un cliente de API centralizado, una app móvil podría usar las mismas funciones (o una capa análoga) sin duplicar la lógica de llamadas.

**Contenido propuesto de `src/services/api.ts`:**
```typescript
import type { AccountDTO, PeriodDTO, InstallmentPlanDTO } from "@/types/domain";

// ── Periods ──────────────────────────────────────────────────────────────────

export async function fetchPeriod(year: number, month: number): Promise<PeriodDTO> {
  const res = await fetch(`/api/periods?year=${year}&month=${month}`);
  if (!res.ok) throw new Error("Error cargando período");
  return res.json();
}

// ── Accounts ─────────────────────────────────────────────────────────────────

export async function fetchAccounts(): Promise<AccountDTO[]> {
  const res = await fetch("/api/accounts");
  if (!res.ok) throw new Error("Error cargando cuentas");
  return res.json();
}

// ── Installments ─────────────────────────────────────────────────────────────

export async function fetchInstallmentPlans(): Promise<InstallmentPlanDTO[]> {
  const res = await fetch("/api/installments");
  if (!res.ok) throw new Error("Error cargando cuotas");
  return res.json();
}

// ── Expenses ──────────────────────────────────────────────────────────────────

type CreateExpenseInput = {
  periodId: string;
  description: string;
  amount: number;
  type: "FIXED" | "VARIABLE" | "SAVING" | "PENDING";
  source?: "USER" | "BALANCE_ADJUST_TOTAL" | "BALANCE_ADJUST_MONTHLY";
  date?: string;
  accountId?: string;
  categoryIds?: string[];
};

export async function createExpense(data: CreateExpenseInput) {
  const res = await fetch("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al guardar gasto");
  }
  return res.json();
}

export async function updateExpense(data: {
  id: string;
  amount?: number;
  description?: string;
  type?: "FIXED" | "VARIABLE" | "SAVING" | "PENDING";
  accountId?: string | null;
  categoryIds?: string[];
}) {
  const res = await fetch("/api/expenses", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al actualizar gasto");
  }
  return res.json();
}

export async function deleteExpense(id: string) {
  const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar gasto");
}

// ── Incomes ───────────────────────────────────────────────────────────────────

type CreateIncomeInput = {
  periodId: string;
  accountId: string;
  amount: number;
  label?: string;
  source?: "USER" | "BALANCE_ADJUST_TOTAL" | "BALANCE_ADJUST_MONTHLY";
  categoryIds?: string[];
};

export async function createIncome(data: CreateIncomeInput) {
  const res = await fetch("/api/incomes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al guardar ingreso");
  }
  return res.json();
}

export async function updateIncome(data: {
  id: string;
  amount?: number;
  label?: string | null;
  accountId?: string;
  categoryIds?: string[];
}) {
  const res = await fetch("/api/incomes", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al actualizar ingreso");
  }
  return res.json();
}

export async function deleteIncome(id: string) {
  const res = await fetch(`/api/incomes?id=${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar ingreso");
}
```

**Luego**, en cada componente/página que llama a `fetch`, reemplazar con las funciones del servicio:

En `dashboard/page.tsx`:
```typescript
// Antes:
const [periodRes, accountsRes, plansRes] = await Promise.all([
  fetch(`/api/periods?year=${year}&month=${month}`),
  fetch("/api/accounts"),
  fetch("/api/installments"),
]);

// Después:
const [periodData, accountsData, plansData] = await Promise.all([
  fetchPeriod(year, month),
  fetchAccounts(),
  fetchInstallmentPlans(),
]);
```

---

### MEJORA 7 — Mover lógica de dominio al backend (preparación para app móvil)

**Archivo a modificar:** `src/app/api/periods/route.ts`  
**Archivos relacionados:** `src/lib/accountBalance.ts`, `src/lib/installments.ts`  
**Impacto:** Crítico para app móvil  
**Complejidad:** Media-Alta

El endpoint `GET /api/periods` actualmente devuelve los datos crudos y el frontend calcula todo. Para soportar una app móvil, el endpoint debe devolver un objeto `summary` con los valores pre-calculados.

**Paso 1:** Agregar un tipo de respuesta enriquecida en el backend.

Crear `src/types/api-responses.ts`:
```typescript
import type { PeriodDTO, AccountDTO, InstallmentPlanDTO } from "./domain";

export type AccountBalance = {
  accountId: string;
  balance: number;
  pendingSpent: number;
  totalRemainingDebt: number;
};

export type PeriodSummary = {
  totalIncome: number;
  totalFixed: number;
  totalSavings: number;
  totalVariable: number;
  totalPending: number;
  totalPendingInstallments: number;
  remaining: number;
  daysLeftInMonth: number;
  dailyBudget: number;
  dailyBudgetWithPending: number;
  accountBalances: AccountBalance[];
};

export type PeriodResponse = {
  period: PeriodDTO;
  summary: PeriodSummary;
};
```

**Paso 2:** Modificar el handler GET de `periods/route.ts` para calcular y retornar el summary.

Al final del GET handler, antes de `return NextResponse.json(period)`, agregar:

```typescript
// Importar al inicio del archivo:
import { computeAccountBalance } from "@/lib/accountBalance";
import { daysLeftInMonth } from "@/lib/format";

// ... (dentro del handler GET, después de re-fetch final del período) ...

// Cargar cuentas activas para calcular balances
const accounts = await prisma.account.findMany({
  where: { userId, isActive: true },
});

// Cargar todos los planes para cálculo de deuda restante
const allPlans = await prisma.installmentPlan.findMany({
  where: { userId },
});

const accountBalances = accounts.map((account) => {
  const { balance, pendingSpent, totalRemainingDebt } = computeAccountBalance(
    account,
    period!.incomes,
    period!.expenses,
    period!.installments,
    allPlans,
    year,
    month,
  );
  return { accountId: account.id, balance, pendingSpent, totalRemainingDebt };
});

const totalIncome = period!.incomes.reduce((s, i) => s + i.amount, 0);
const totalFixed = period!.expenses
  .filter((e) => e.type === "FIXED").reduce((s, e) => s + e.amount, 0);
const totalSavings = period!.expenses
  .filter((e) => e.type === "SAVING").reduce((s, e) => s + e.amount, 0);
const totalVariable = period!.expenses
  .filter((e) => e.type === "VARIABLE").reduce((s, e) => s + e.amount, 0);
const totalPending = period!.expenses
  .filter((e) => e.type === "PENDING").reduce((s, e) => s + e.amount, 0);
const totalPendingInstallments = period!.installments
  .filter((i) => !i.isPaid).reduce((s, i) => s + i.amount, 0);

const totalPositive = accountBalances
  .filter((b) => b.balance > 0).reduce((s, b) => s + b.balance, 0);
const totalNegative = accountBalances
  .filter((b) => b.balance < 0).reduce((s, b) => s + b.balance, 0);
const remaining = totalPositive + totalNegative;
const daysLeft = daysLeftInMonth(year, month);
const dailyBudget = daysLeft > 0 ? Math.floor(remaining / daysLeft) : 0;
const dailyBudgetWithPending = daysLeft > 0
  ? Math.floor((remaining - totalPending) / daysLeft) : 0;

const summary: PeriodSummary = {
  totalIncome, totalFixed, totalSavings, totalVariable,
  totalPending, totalPendingInstallments,
  remaining, daysLeftInMonth: daysLeft,
  dailyBudget, dailyBudgetWithPending,
  accountBalances,
};

return NextResponse.json({ period, summary });
```

**Paso 3:** Actualizar el frontend para usar `summary` en lugar de recalcular.

En `dashboard/page.tsx`, el tipo `Period` pasa a ser:
```typescript
type PeriodResponse = { period: Period; summary: PeriodSummary };
type PeriodSummary = {
  totalIncome: number; totalFixed: number; totalSavings: number;
  totalVariable: number; totalPending: number; totalPendingInstallments: number;
  remaining: number; daysLeftInMonth: number; dailyBudget: number;
  dailyBudgetWithPending: number;
  accountBalances: { accountId: string; balance: number; pendingSpent: number; totalRemainingDebt: number }[];
};
```

Y en lugar de calcular todos los totales en el componente, se usa `summary`:
```typescript
const { period, summary } = periodData;
const { totalIncome, totalFixed, totalSavings, totalVariable, totalPending,
        totalPendingInstallments, remaining, dailyBudget, dailyBudgetWithPending,
        accountBalances: rawAccountBalances } = summary;
```

---

### MEJORA 8 — Crear capa de servicios en el backend

**Carpeta a crear:** `src/services/` (server-side, no confundir con la del frontend)  
**Impacto:** SRP, DIP, preparación para mobile  
**Complejidad:** Alta

Extraer la lógica de negocio de los route handlers a servicios dedicados. Esto permite que los route handlers sean solo una capa delgada de HTTP (parsing, auth check, respuesta), y que la lógica sea testeable y reutilizable.

**Estructura propuesta:**
```
src/
  services/
    period.service.ts      ← propagateInstallments, propagateFixedExpenses, createOrGetPeriod
    expense.service.ts     ← createExpense, deleteExpense (con lógica recurrente), updateExpense (con propagación)
    installment.service.ts ← createInstallmentPlan, deleteInstallmentPlan
    income.service.ts      ← createIncome, updateIncome, deleteIncome
```

**Ejemplo — `src/services/expense.service.ts`:**
```typescript
import { prisma } from "@/lib/prisma";

function monthOffset(year: number, month: number) {
  return year * 12 + (month - 1);
}

export async function deleteExpenseById(id: string, userId: string) {
  const expense = await prisma.expense.findFirst({
    where: { id, period: { userId } },
    include: { period: true },
  });
  if (!expense) return null;

  if (expense.recurringGroupId) {
    await deleteRecurringSeries(expense, userId);
  } else {
    await prisma.expense.delete({ where: { id } });
  }
  return true;
}

async function deleteRecurringSeries(
  expense: { id: string; recurringGroupId: string; period: { year: number; month: number } },
  userId: string,
) {
  const { year, month } = expense.period;
  const currentOffset = monthOffset(year, month);

  const allInstances = await prisma.expense.findMany({
    where: { recurringGroupId: expense.recurringGroupId, period: { userId } },
    include: { period: true },
  });

  const idsToDelete = allInstances
    .filter((e) => monthOffset(e.period.year, e.period.month) >= currentOffset)
    .map((e) => e.id);

  const survivors = allInstances
    .filter((e) => monthOffset(e.period.year, e.period.month) < currentOffset)
    .sort((a, b) => monthOffset(b.period.year, b.period.month) - monthOffset(a.period.year, a.period.month));

  await prisma.$transaction(async (tx) => {
    await tx.expense.deleteMany({ where: { id: { in: idsToDelete } } });
    if (survivors.length > 0) {
      const lastSurvivor = survivors[0];
      await tx.expense.update({
        where: { id: lastSurvivor.id },
        data: {
          recurringEndYear: lastSurvivor.period.year,
          recurringEndMonth: lastSurvivor.period.month,
        },
      });
    }
  });
}
```

El route handler queda reducido a:
```typescript
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const result = await deleteExpenseById(id, session.user.id);
  if (!result) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
```

---

### MEJORA 9 — Extraer constantes de enum al frontend

**Impacto:** OCP, mantenibilidad  
**Complejidad:** Baja

Crear `src/constants/enums.ts` para evitar strings literales de enum en el frontend:

```typescript
export const ExpenseType = {
  FIXED: "FIXED",
  VARIABLE: "VARIABLE",
  SAVING: "SAVING",
  PENDING: "PENDING",
} as const;

export type ExpenseTypeValue = typeof ExpenseType[keyof typeof ExpenseType];

export const EntrySource = {
  USER: "USER",
  BALANCE_ADJUST_TOTAL: "BALANCE_ADJUST_TOTAL",
  BALANCE_ADJUST_MONTHLY: "BALANCE_ADJUST_MONTHLY",
} as const;
```

Luego en `dashboard/page.tsx`:
```typescript
import { ExpenseType } from "@/constants/enums";

// En lugar de:
const fixedExpenses = period?.expenses.filter((e) => e.type === "FIXED") ?? [];

// Usar:
const fixedExpenses = period?.expenses.filter((e) => e.type === ExpenseType.FIXED) ?? [];
```

---

### MEJORA 10 — Extraer estilos compartidos de modales

**Impacto:** DRY, mantenibilidad  
**Complejidad:** Baja

Crear `src/styles/form-styles.ts`:
```typescript
import type React from "react";

export const FIELD_LABEL: React.CSSProperties = {
  display: "block", fontSize: 11, letterSpacing: "0.14em",
  textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6,
};

export const FIELD_INPUT: React.CSSProperties = {
  width: "100%", fontFamily: "inherit", fontSize: 15,
  background: "var(--bg)", color: "var(--ink)",
  border: "1px solid var(--line)", borderRadius: 14,
  padding: "12px 14px", outline: "none", boxSizing: "border-box",
};

export const MONO_INPUT: React.CSSProperties = {
  ...FIELD_INPUT,
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontVariantNumeric: "tabular-nums",
};
```

Y en cada modal, eliminar las definiciones locales e importar desde este archivo.

---

### MEJORA 11 — Separar sub-componentes del dashboard a sus propios archivos

**Impacto:** SRP, legibilidad  
**Complejidad:** Baja

Los siguientes componentes están definidos dentro de `dashboard/page.tsx` y deberían moverse a `src/components/`:

| Componente | Nuevo archivo |
|---|---|
| `CatHeader` | `src/components/CategoryHeader.tsx` |
| `ExpenseList` | `src/components/ExpenseList.tsx` |
| `IncomeList` | `src/components/IncomeList.tsx` |
| `OrphanedPlanItem` | `src/components/OrphanedPlanItem.tsx` |

---

### MEJORA 12 — Mover `daysLeftInMonth` fuera de `format.ts`

**Impacto:** SRP  
**Complejidad:** Baja

`daysLeftInMonth` es lógica de dominio (cuántos días quedan en el mes de un período dado). Moverla a un archivo apropiado.

**Opción A:** Moverla a `src/lib/periods.ts` (nuevo archivo de utilidades de períodos).  
**Opción B:** Una vez implementada la Mejora 7, esta función no se necesita en el frontend porque el backend devuelve `daysLeftInMonth` en el summary.

---

### MEJORA 13 — Refactorizar el GET de períodos para separar read de write

**Impacto:** Correctness REST, testabilidad  
**Complejidad:** Media

El GET de períodos tiene side effects (crea el período, propaga datos). La forma más limpia es separar esto en dos operaciones en el backend, aunque la API pública siga siendo un solo GET:

```typescript
export async function GET(req: Request) {
  // 1. Auth check
  // 2. Parse params
  // 3. Llamar a una función de servicio que:
  //    a. Obtiene o crea el período (upsert)
  //    b. Propaga installments si es nuevo o necesario
  //    c. Propaga fixed expenses si es nuevo o necesario
  //    d. Devuelve el período con summary calculado
  // 4. Retornar NextResponse.json(result)
}
```

El key insight es que la "magia" de crear el período en el GET es un trade-off aceptable (lazy initialization), pero los side effects deben ser idempotentes. La propagación ya lo es — si algo ya existe no se duplica. El riesgo real es el retry problem, pero con las verificaciones actuales (`alreadyLinked`, `alreadyPropagated`) debería ser seguro.

---

## 6. Lo que está bien (no cambiar)

- **`src/lib/accountBalance.ts`**: La función `computeAccountBalance` está bien aislada con sus propios tipos de parámetros narrow. La lógica de crédito vs débito está claramente comentada. El comentario sobre `paidInstallments` y por qué se usa el offset temporal es valioso — mantenerlo.

- **`src/lib/installments.ts`**: Función pura, sin efectos, bien nombrada. Perfecta para compartir entre web y móvil.

- **`src/lib/prisma.ts`**: Singleton correcto, maneja hot-reload de Next.js en desarrollo correctamente.

- **`src/lib/auth.ts`**: Implementación limpia de NextAuth con JWT, validación Zod en `authorize`, hash con bcrypt. Sin issues.

- **`src/middleware.ts`**: Guard de rutas correcto. El matcher está bien configurado para excluir assets estáticos.

- **`prisma/schema.prisma`**: El schema es sólido. Los enums `ExpenseType`, `EntrySource`, `AccountType` son buenos. Las relaciones están bien modeladas. El `@@unique([userId, year, month])` en MonthlyPeriod es correcto. La decisión de usar `Int` en lugar de `Decimal` para montos es coherente con CLP (sin decimales).

- **Validación Zod en los routes POST**: `expenseSchema`, `incomeSchema`, `accountSchema`, `planSchema` son correctos y cubren bien los campos.

- **`src/components/CategoryPicker.tsx`**: Componente bien encapsulado. Gestiona su propio estado de búsqueda, creación inline, y toggle de selección. No tiene lógica de negocio filtrada.

---

## 7. Tabla Resumen de Prioridades

| # | Mejora | Principio | Impacto | Complejidad | Prioridad |
|---|---|---|---|---|---|
| 1 | Eliminar query muerta en periods/route | SRP | Rendimiento | Baja | Alta |
| 2 | Transacciones en operaciones multi-paso | Integridad | Datos | Baja | Alta |
| 3 | Validación Zod en PATCH expenses | Seguridad | Robustez | Baja | Alta |
| 4 | try/catch en POST incomes | Robustez | Media | Baja | Alta |
| 5 | Tipos compartidos en `src/types/domain.ts` | ISP | Mantenibilidad | Media | Alta |
| 6 | Capa de servicio API (frontend) | DIP | App móvil | Media | Alta |
| 7 | Mover lógica de dominio al backend | DIP/SRP | App móvil | Media-Alta | Alta |
| 8 | Capa de servicios (backend) | SRP/DIP | Testabilidad | Alta | Media |
| 9 | Constantes de enum en frontend | OCP | Mantenibilidad | Baja | Media |
| 10 | Extraer estilos compartidos de modales | DRY | Mantenibilidad | Baja | Baja |
| 11 | Separar sub-componentes del dashboard | SRP | Legibilidad | Baja | Baja |
| 12 | Mover `daysLeftInMonth` fuera de format.ts | SRP | Legibilidad | Baja | Baja |
| 13 | Refactorizar GET de períodos (read/write) | REST | Correctness | Media | Baja |

---

*Fin del reporte. Las mejoras 1-7 son las más importantes antes de agregar nuevas funcionalidades. Las mejoras 1-4 son correcciones de bugs que deberían hacerse cuanto antes.*
