# Multi-Tenant Architecture — MealStack

## Overview

MealStack uses a **shared-database, tenant-discriminator** pattern. All tenants
share one MySQL database, and every row that belongs to a tenant carries a
`tenantId` foreign key. This is the most cost-effective approach for SaaS and
scales well into the thousands of tenants.

```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER REQUEST                     │
│   cafe.mealstack.com/dashboard/pos                      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              NEXT.JS MIDDLEWARE (Edge)                   │
│                                                         │
│  1. Subdomain detection  →  "cafe"                      │
│  2. JWT session check    →  token.tenantId = "clx..."   │
│  3. Sets x-tenant-id header on response                 │
│  4. Unauthenticated? → Redirect to /login               │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│               API ROUTE / SERVER COMPONENT              │
│                                                         │
│  withAuth(async (ctx) => {                              │
│    // ctx.tenantId comes from JWT — NOT from headers    │
│    const data = await prisma.product.findMany({         │
│      where: { tenantId: ctx.tenantId }  ← ENFORCED     │
│    });                                                  │
│  })                                                     │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    MYSQL DATABASE                        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ products                                         │    │
│  │ ─────────────────────────────────────────────── │    │
│  │ id │ tenant_id  │ name          │ price_cents   │    │
│  │ 1  │ clx_cafe   │ Latte         │ 499           │    │
│  │ 2  │ clx_cafe   │ Croissant     │ 350           │    │
│  │ 3  │ clx_burger │ Cheeseburger  │ 1299          │    │
│  │    │            │               │               │    │
│  │    All queries filter by tenant_id               │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Layer 1 — Database Schema (Prisma)

Every tenant-owned model has a `tenantId` field with a foreign key to `Tenant`,
a cascade delete rule, and a covering index:

```prisma
model Product {
  id       String @id @default(cuid())
  tenantId String                          // ← discriminator column
  name     String
  // ...

  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])                       // ← fast tenant-scoped queries
  @@unique([tenantId, sku])                 // ← uniqueness within tenant
  @@map("products")
}
```

**Key rules:**
- `tenantId` is on **every** table except `Tenant` itself.
- Unique constraints are **compound** with tenantId (e.g. `@@unique([tenantId, email])`) so two tenants can have the same email.
- `onDelete: Cascade` ensures deleting a tenant wipes all its data.
- `@@index([tenantId])` ensures MySQL uses an index for tenant-scoped queries.

---

## Layer 2 — Middleware (Tenant Detection)

**File: `middleware.ts`**

The middleware runs at the Edge on every request and resolves the tenant:

```
Priority 1: JWT session   →  token.tenantId (authenticated users)
Priority 2: Subdomain     →  cafe.mealstack.com → "cafe"
Priority 3: x-tenant-id   →  explicit header (API integrations)
```

```typescript
// Subdomain extraction
function resolveSubdomain(host: string): string | null {
  const hostname = host.split(":")[0];
  if (hostname === "localhost") return null;

  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const sub = parts[0];
    if (!["www", "api", "app"].includes(sub)) return sub;
  }
  return null;
}
```

**Why JWT is Priority 1:** The JWT is cryptographically signed and cannot be
tampered with. Subdomains and headers can be spoofed. For authenticated routes,
we always trust the JWT over any other source.

---

## Layer 3 — Authentication (NextAuth)

**File: `lib/auth-options.ts`**

At login, the user provides a domain (e.g. "cafe"). The `authorize` function:

1. Resolves domain → Tenant record
2. Finds user within that tenant
3. Verifies password
4. Returns `{ id, email, name, role, tenantId }` which gets embedded in the JWT

```typescript
async authorize(credentials) {
  // Resolve domain or ID to actual tenant
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { domain: credentials.tenantId },
        { id: credentials.tenantId },
      ],
    },
  });
  if (!tenant) throw new Error("Invalid credentials");

  // Find user scoped to this tenant
  const user = await prisma.user.findFirst({
    where: {
      email: credentials.email,
      tenantId: tenant.id,     // ← tenant-scoped lookup
      isActive: true,
    },
  });
  // ... verify password, return user with tenantId
}
```

The `jwt` callback stores tenantId in the token. The `session` callback exposes
it to the client. The tenantId is now **burned into the session** for its
lifetime (8 hours).

---

## Layer 4 — API Route Protection

**File: `lib/api-helpers.ts`**

Every API route uses the `withAuth` wrapper which:

1. Extracts tenantId from the server-side session (not headers)
2. Checks role authorization
3. Passes the `ApiContext` to the handler

```typescript
export async function withAuth(
  handler: (ctx: ApiContext) => Promise<NextResponse>,
  allowedRoles?: Role[]
): Promise<NextResponse> {
  const ctx = await getApiContext();       // reads JWT session server-side
  if (!ctx) return error("Unauthorized", 401);
  if (allowedRoles && !allowedRoles.includes(ctx.role)) {
    return error("Forbidden", 403);
  }
  return handler(ctx);                     // ctx.tenantId is guaranteed
}
```

**In every handler**, queries are scoped:

```typescript
// ✅ CORRECT — always filter by tenantId
const products = await prisma.product.findMany({
  where: { tenantId: ctx.tenantId, isActive: true }
});

// ✅ CORRECT — verify ownership before update
const product = await prisma.product.findFirst({
  where: { id: params.id, tenantId: ctx.tenantId }
});
if (!product) return error("Not found", 404);

// ❌ WRONG — never query without tenantId
const products = await prisma.product.findMany({
  where: { isActive: true }  // LEAKS DATA ACROSS TENANTS
});
```

---

## Layer 5 — Tenant-Scoped Helpers

**File: `lib/prisma.ts`**

For additional safety, use the `tenantScope` helper:

```typescript
import { tenantScope } from "@/lib/prisma";

export async function GET() {
  return withAuth(async (ctx) => {
    const t = tenantScope(ctx.tenantId);

    // Auto-injects tenantId into where clause
    const products = await prisma.product.findMany({
      where: t.where({ isActive: true }),
    });

    // Auto-injects tenantId into create data
    const newProduct = await prisma.product.create({
      data: t.data({ name: "Latte", priceCents: 499 }),
    });

    // Verify record belongs to tenant before mutating
    const owns = await t.verifyOwnership("product", someId);
    if (!owns) return error("Not found", 404);
  });
}
```

---

## Security Checklist

| Rule | Implementation |
|------|---------------|
| TenantId source of truth | JWT session, not headers/params |
| Every query has tenantId | `withAuth` provides `ctx.tenantId` |
| Unique constraints are compound | `@@unique([tenantId, email])` |
| Cross-tenant access impossible | User can only have one tenantId |
| Cascade deletes | `onDelete: Cascade` on all FK relations |
| No raw SQL | All queries via Prisma ORM |
| Index on tenantId | `@@index([tenantId])` on every model |
| Subdomain cannot override JWT | JWT takes priority in middleware |
| Role-based access | `withAuth(handler, [Role.ADMIN])` |
| ID-based lookups verify tenant | `where: { id, tenantId }` pattern |

---

## Local Development

For local development without subdomains, tenant resolution works via:

1. **Login form** — user enters the domain (e.g. "demo") which maps to a tenant
2. **JWT session** — after login, all API calls use the tenantId from the session
3. **x-tenant-id header** — for API testing with tools like Postman

No subdomain configuration needed for `localhost`.
