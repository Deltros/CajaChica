# CajaChica — Mantenedor de Gastos

App web para gestionar gastos mensuales personales. Permite registrar gastos fijos, variables y ahorros por mes, con soporte para cuotas que se propagan automáticamente a meses futuros.

---

## Stack tecnológico

En Next.js el frontend y backend viven en el mismo proyecto. Las páginas son el frontend; las API Routes (`src/app/api/`) son el backend — corren en el servidor y son las que hablan con la base de datos.

| Capa | Tecnología | Para qué sirve |
|---|---|---|
| Frontend | **Next.js 16** (App Router) | Páginas y componentes React |
| Backend | **Next.js API Routes** | Endpoints REST dentro del mismo proyecto (`/api/...`) |
| Lenguaje | **TypeScript** | JavaScript con tipos, evita errores en tiempo de desarrollo |
| Estilos | **Tailwind CSS 4** | Clases utilitarias para diseño sin escribir CSS separado |
| Base de datos | **PostgreSQL** | Base de datos relacional donde se guardan gastos, períodos, usuarios |
| ORM | **Prisma 5** | ORM (Object-Relational Mapper) independiente de Node.js. Permite hablar con la BD sin escribir SQL directo. Tiene dos partes: `prisma` (CLI para crear migraciones) y `@prisma/client` (librería para consultar la BD desde el código) |
| Autenticación | **NextAuth v5 (beta)** | Maneja login/logout/sesiones con JWT |
| Validación | **Zod** | Valida que los datos que llegan al servidor tengan el formato correcto |
| Encriptación | **bcryptjs** | Hashea las contraseñas antes de guardarlas en la BD |

### Endpoints del backend

| Ruta | Descripción |
|---|---|
| `POST /api/register` | Crear cuenta de usuario |
| `GET/POST /api/periods` | Obtener o crear períodos mensuales |
| `GET/POST/DELETE /api/expenses` | Gestión de gastos |
| `GET/POST/DELETE /api/incomes` | Gestión de ingresos |
| `GET/POST/DELETE /api/accounts` | Gestión de cuentas (banco/efectivo) |
| `GET/POST/DELETE /api/installments` | Gestión de cuotas |
| `POST /api/auth/[...nextauth]` | Login / logout (manejado por NextAuth) |

---

## Infraestructura (producción)

| Servicio | Para qué |
|---|---|
| **Vercel** | Hosting de la app — detecta cambios en GitHub y despliega automáticamente |
| **Neon** | PostgreSQL en la nube (serverless, free tier) |
| **GitHub** | Repositorio del código fuente |

---

## Modelo de datos principal

- **User** — cuenta de usuario
- **MonthlyPeriod** — período mensual (año + mes), unidad central de trabajo
- **Expense** — gasto dentro de un período. Tipos: `FIXED`, `VARIABLE`, `SAVING`
- **Account** — cuenta bancaria o efectivo (fuente de ingresos)
- **InstallmentPlan** — plan de cuotas
- **PeriodInstallment** — cuota de un plan asignada a un período específico

---

## Variables de entorno necesarias

```env
DATABASE_URL=     # Connection string de Neon (PostgreSQL)
AUTH_SECRET=      # String secreto para firmar los tokens de sesión
```

---

## Correr en local

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar la base de datos local con Docker
docker compose up -d

# 3. Correr migraciones
npx prisma migrate dev

# 4. Iniciar el servidor de desarrollo
npm run dev
```

La app queda disponible en http://localhost:3000
