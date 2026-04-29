import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantId: z.string().min(1),
});

export const registerTenantSchema = z.object({
  tenantName: z.string().min(2).max(100),
  domain: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

// ─── Products ────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  sku: z.string().optional(),
  priceCents: z.number().int().positive(),
  costCents: z.number().int().min(0).optional(),
  image: z.string().optional(),
  isVeg: z.boolean().optional(),
  prepTimeMins: z.number().int().min(0).optional(),
});

export const updateProductSchema = createProductSchema.partial();

// ─── Categories ──────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

// ─── Orders / POS ────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  tableId: z.string().optional(),
  customerId: z.string().optional(),
  orderType: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]).optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      qty: z.number().int().positive(),
      notes: z.string().optional(),
      priceCents: z.number().int().positive().optional(),
      variantName: z.string().optional(),
    })
  ).min(1),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"]),
});

export const processPaymentSchema = z.object({
  orderId: z.string(),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "ONLINE"]),
  discountCents: z.number().int().min(0).optional(),
});

// ─── Inventory ───────────────────────────────────────────────────────────────

export const createInventoryItemSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().optional(),
  quantity: z.number().min(0).optional(),
  unit: z.string().optional(),
  reorderLevel: z.number().min(0).optional(),
  costPerUnit: z.number().int().min(0).optional(),
  supplierId: z.string().optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();

export const inventoryTransactionSchema = z.object({
  inventoryItemId: z.string(),
  type: z.enum(["PURCHASE", "USAGE", "WASTE", "ADJUSTMENT", "RETURN"]),
  quantity: z.number(),
  notes: z.string().optional(),
});

// ─── Customers ───────────────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ─── Staff ───────────────────────────────────────────────────────────────────

// Vendors can only create Manager accounts. SuperAdmin and Vendor are not
// staff-creatable: SuperAdmin is seeded; Vendor is created via /register.
export const createStaffSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["MANAGER"]),
  phone: z.string().optional(),
});

export const updateStaffSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  role: z.enum(["MANAGER"]).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ─── Tables ──────────────────────────────────────────────────────────────────

export const createTableSchema = z.object({
  number: z.number().int().positive(),
  capacity: z.number().int().positive().optional(),
});

// ─── Suppliers ───────────────────────────────────────────────────────────────

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});
