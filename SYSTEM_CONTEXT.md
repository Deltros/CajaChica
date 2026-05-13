# System Context — Mantenedor de Gastos

Documento de referencia para debugging. Describe la arquitectura, flujos principales y decisiones de diseño clave. Leer antes de tocar cualquier lógica de cálculo de saldo.

---

## Stack

- **Next.js** (App Router, versión con breaking changes — leer `node_modules/next/dist/docs/` antes de tocar rutas/layouts)
- **Prisma + PostgreSQL**
- **Vitest** para tests unitarios de los calculadores de dominio

---

## Estructura de carpetas relevante

```
src/
  app/
    api/                  # Route handlers (Next.js)
      periods/route.ts    # GET → PeriodService.getOrCreateWithSummary
      expenses/route.ts   # POST / PATCH / DELETE
      incomes/route.ts
      installments/route.ts
      accounts/route.ts
    dashboard/page.tsx    # Página principal (client component)
  domain/
    enums.ts              # ExpenseType, EntrySource, AccountType
    types.ts              # DTOs y tipos de entrada para calculadores
    calculators/
      accountBalance.ts   # ⚠️ Lógica crítica de saldo por cuenta
      periodSummary.ts    # Agrega accountBalance por todas las cuentas
      installments.ts     # installmentNumberForPeriod()
      __tests__/          # Tests unitarios — NO modificar sin autorización
  services/
    PeriodService.ts      # Orquesta propagación + cálculo del resumen
    ExpenseService.ts     # CRUD + propagación de gastos fijos recurrentes
  repositories/           # Acceso a Prisma (sin lógica de negocio)
  components/
    BalanceAdjustModal.tsx # Modal de ajuste de saldo de cuenta
    ExpenseModal.tsx
    IncomeModal.tsx
  apiClient/index.ts      # fetch helpers del cliente → API routes
```

---

## Enums clave

### `ExpenseType`
| Valor | Significado |
|-------|-------------|
| `FIXED` | Gasto fijo recurrente (se propaga automáticamente cada mes) |
| `VARIABLE` | Gasto variable del mes |
| `SAVING` | Ahorro |
| `PENDING` | Gasto pendiente de confirmar (no cuenta en el balance diario) |

### `EntrySource`
| Valor | Quién lo crea | Dónde aparece |
|-------|---------------|---------------|
| `USER` | El usuario manualmente | En todas las listas |
| `BALANCE_ADJUST_TOTAL` | `saveBalanceAdjustment()` modo total (tarjeta crédito) | GASTOS VARIABLES |
| `BALANCE_ADJUST_MONTHLY` | `saveBalanceAdjustment()` modo mes | GASTOS VARIABLES |

---

## Modelo de datos (Prisma)

```
User → MonthlyPeriod[] → Expense[]
                       → Income[]
                       → PeriodInstallment[]
     → InstallmentPlan[] → PeriodInstallment[]
     → Account[]
     → Category[]
```

- **`MonthlyPeriod`**: período mensual por usuario. Se crea automáticamente al acceder.
- **`Expense`**: gasto ligado a un período. Campos clave: `type`, `source`, `accountId`, `recurringGroupId`.
- **`Income`**: ingreso ligado a un período. Campos clave: `source`, `accountId`.
- **`InstallmentPlan`**: plan de cuotas del usuario (ej: bicicleta $120k en 3 cuotas). **No está ligado a un período** — existe a nivel usuario.
- **`PeriodInstallment`**: vínculo entre un plan y un período concreto. Se propaga automáticamente en `PeriodService`.
- **`paidInstallments`** en `InstallmentPlan`: siempre es 0 — no hay módulo de confirmación de pago aún. El cálculo de cuotas restantes usa offset de fechas.

---

## Flujo principal al cargar el dashboard

```
dashboard/page.tsx
  → fetchPeriod(year, month)           [GET /api/periods]
  → fetchAccounts()                    [GET /api/accounts]
  → fetchInstallmentPlans()            [GET /api/installments]

GET /api/periods
  → PeriodService.getOrCreateWithSummary()
      1. findOrCreate(period)
      2. propagateInstallments()       ← crea PeriodInstallment si no existe
      3. propagateFixedExpenses()      ← copia gastos FIXED del mes anterior
      4. findWithChildren(period)      ← re-fetch con todo incluido
      5. computePeriodSummary()        ← calcula totales y saldos
      → { period, summary }
```

---

## Propagación de gastos fijos (`propagateFixedExpenses`)

- Busca el gasto FIXED más reciente de cada `recurringGroupId` para el usuario.
- Si no existe en el período actual, lo copia con `date = new Date(Date.UTC(year, month-1, 1))` (día 1 del mes).
- Respetar `recurringEndYear`/`recurringEndMonth` si están seteados.
- Al **eliminar** un gasto FIXED: elimina desde el mes actual en adelante y marca `recurringEndYear/Month` en el último sobreviviente.
- Al **editar** un gasto FIXED: propaga el cambio a todas las instancias futuras (no al pasado). `type` no se propaga, solo `amount`, `description` y `accountId`.

---

## Calculador de saldo por cuenta (`computeAccountBalance`)

### Cuentas normales (débito, efectivo)

```
balance = ingresos - gastos_no_pending - cuotas_del_período
```

### Tarjetas de crédito (`isCreditCard = true`)

Una cuenta es tarjeta de crédito cuando tiene `PeriodInstallment` asociados.

```
adjExpenses    = sum(expenses donde source = BALANCE_ADJUST_TOTAL)
adjIncomes     = sum(incomes  donde source = BALANCE_ADJUST_TOTAL)
plansDebt      = sum de cuotas RESTANTES de todos los planes de esta cuenta
                 (usando installmentNumberForPeriod para saber cuántas quedan)
postAdjUserSpent = sum(expenses donde source = USER y type ≠ PENDING)
                   ← SIN filtro por fecha (ver nota de bug abajo)

balance            = -(instSpent + adjExpenses - adjIncomes + postAdjUserSpent)
totalRemainingDebt = plansDebt + adjExpenses - adjIncomes + postAdjUserSpent
```

Donde `instSpent` = cuotas del período actual (de `PeriodInstallment`, no de `allPlans`).

**Por qué `postAdjUserSpent` no filtra por fecha:** la versión anterior filtraba solo los gastos del usuario posteriores a `lastAdjDate` (fecha de la última entrada BALANCE_ADJUST_TOTAL). Esto causaba un bug crítico: al crear una nueva entrada de ajuste, `lastAdjDate` avanzaba al momento actual y `postAdjUserSpent` caía a 0, haciendo que el balance colapsara. La solución fue incluir SIEMPRE todos los gastos del usuario, sin importar cuándo se crearon las entradas de ajuste.

### `AccountBalanceSummary` (lo que retorna el calculador)

```ts
{
  accountId: string
  balance: number           // saldo de la cuenta (negativo = deuda)
  pendingSpent: number      // suma de gastos PENDING (para mostrar "con pendientes")
  totalRemainingDebt: number // deuda total de la tarjeta (cuotas futuras + ajustes + gastos)
  postAdjUserSpent: number  // siempre 0 (campo legacy, no usar externamente)
}
```

---

## Ajuste de saldo (`BalanceAdjustModal` + `saveBalanceAdjustment`)

El usuario abre el modal al hacer clic en una cuenta en "Saldo en cuentas".

### Modos

| Modo | Aplica a | Campo de referencia | Crea |
|------|----------|---------------------|------|
| `total` | Tarjeta crédito (default) | `totalRemainingDebt` | Gasto/ingreso BALANCE_ADJUST_TOTAL |
| `monthly` | Débito (default) / crédito | `balance` | Gasto/ingreso BALANCE_ADJUST_MONTHLY |

### Cálculo del diff

```
// Modo total:
diff = valorIngresado - (-totalRemainingDebt)

// Modo monthly:
diff = valorIngresado - balance
```

- `diff < 0` → crea un **Expense** de `|diff|` con el source correspondiente
- `diff > 0` → crea un **Income** de `diff` con el source correspondiente

### Por qué el diff es simple y correcto ahora

Antes del fix, `postAdjUserSpent` dependía de la fecha de la última entrada de ajuste. Al crear una nueva, `postAdjUserSpent` se reseteaba y el diff de $3.688 no era suficiente para compensar. Con el fix (sin filtro por fecha), `postAdjUserSpent` no cambia al crear la entrada, por lo que `diff = nuevoTotal - totalActual` es exactamente lo que hay que guardar.

---

## Cuotas (`InstallmentPlan` / `PeriodInstallment`)

- `installmentNumberForPeriod(plan, year, month)`: retorna el número de cuota (1-based) para ese mes.
  - `= (year*12 + month-1) - (startYear*12 + startMonth-1) + 1`
- Cuotas restantes en un plan: `max(0, totalInstallments - currentInstallment + 1)`
- `plansDebt` para una cuenta = suma de `(cuotasRestantes * installmentAmount)` de todos sus planes.
- `instSpent` = cuota del período actual (viene de `PeriodInstallment`, que se propaga en `PeriodService`).

---

## `computePeriodSummary`

Agrega los resultados de `computeAccountBalance` para todas las cuentas activas y calcula:

- `totalIncome`, `totalFixed`, `totalSavings`, `totalVariable`, `totalPending`, `totalPendingInstallments`
- `remaining` = totalPositive + totalNegative (suma de todos los balances)
- `dailyBudget` = `remaining / daysLeftInMonth`
- `effectiveTotalVariable` = `max(0, totalIncome - totalFixed - totalSavings - totalPendingInstallments - remaining)`
- `accountBalances[]`

---

## Tests existentes

```
src/domain/calculators/__tests__/
  accountBalance.test.ts   # 12 tests — cubre las 3 cuentas del fixture
  periodSummary.test.ts    # 17 tests — cubre totales y saldos del resumen
  fixtures/may2026.ts      # Datos de prueba: 3 cuentas, ~30 entradas
```

El fixture modela Mayo 2026 con:
- Banco Santander Débito: balance $613.796
- Banco Consorcio: balance $256.000
- Banco Santander Crédito (`isCreditCard=true`): balance -$504.162
  - Plan Bicicleta Jose: 2 cuotas de $40.000, inició abril 2026 (cuota 2/2 en mayo)
  - El balance -$504.162 viene de: instSpent($40k) + adjExpenses($0) + postAdjUserSpent($464.162)

---

## Gotchas importantes

1. **`period.expenses` solo contiene gastos del período actual.** Los gastos de ajuste de meses anteriores NO están disponibles al calcular el balance del mes actual. El ajuste debe hacerse dentro del período que se está viendo.

2. **Gastos FIXED usan `date = 1 del mes`**, no `now()`. Importante para ordenamiento y comparaciones de fecha.

3. **`allPlans` en `computeAccountBalance` viene de `InstallmentRepository.findAllByUser`** — todos los planes del usuario, no filtrados por período. Necesario para calcular `plansDebt` (deuda total futura).

4. **`paidInstallments` siempre es 0** — no hay módulo de pago. `plansDebt` se calcula con offset de fechas.

5. **`totalRemainingDebt` para cuentas no-crédito es siempre 0.**

6. **`isCreditCard`** se determina por el campo del modelo `Account`, no por si tiene cuotas. Pero en la práctica, solo las cuentas con `InstallmentPlan` asociados son tratadas como tarjeta de crédito en la UI (el modal muestra el aviso solo si `isCreditCard=true`).

7. **El `today` en `fetchPeriod`** se pasa como query param desde el cliente para evitar inconsistencias entre cliente y servidor en `daysLeftInMonth`.
