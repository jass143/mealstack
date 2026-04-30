import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { domain: "demo" },
    update: {},
    create: {
      name: "Demo Restaurant",
      domain: "demo",
      email: "admin@demo.mealstack.com",
      phone: "+1-555-0100",
      address: "123 Main St, Foodville",
      currency: "USD",
      taxRate: 8.5,
      timezone: "America/New_York",
    },
  });

  console.log("Created tenant:", tenant.name);

  // Create SuperAdmin (platform owner — no tenant)
  const superAdminPassword = await bcrypt.hash("JasMealStack@0051", 10);
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { email: "superadminmealstack@gmail.com", role: Role.SUPERADMIN },
  });
  const superAdmin = existingSuperAdmin
    ? await prisma.user.update({
        where: { id: existingSuperAdmin.id },
        data: { hashedPassword: superAdminPassword, name: "Platform Super Admin" },
      })
    : await prisma.user.create({
        data: {
          tenantId: null,
          email: "superadminmealstack@gmail.com",
          name: "Platform Super Admin",
          hashedPassword: superAdminPassword,
          role: Role.SUPERADMIN,
        },
      });

  // Demo vendor + manager
  const hashedPassword = await bcrypt.hash("password123", 10);

  const vendor = await prisma.user.upsert({
    where: { email: "vendor@demo.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "vendor@demo.com",
      name: "Demo Vendor",
      hashedPassword,
      role: Role.VENDOR,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@demo.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "manager@demo.com",
      name: "Sarah Manager",
      hashedPassword,
      role: Role.MANAGER,
    },
  });

  console.log("Created users:", [superAdmin, vendor, manager].map((u) => u.email));

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Starters" } },
      update: {},
      create: { tenantId: tenant.id, name: "Starters", sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Main Course" } },
      update: {},
      create: { tenantId: tenant.id, name: "Main Course", sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Pizzas" } },
      update: {},
      create: { tenantId: tenant.id, name: "Pizzas", sortOrder: 3 },
    }),
    prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Beverages" } },
      update: {},
      create: { tenantId: tenant.id, name: "Beverages", sortOrder: 4 },
    }),
    prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Desserts" } },
      update: {},
      create: { tenantId: tenant.id, name: "Desserts", sortOrder: 5 },
    }),
  ]);

  console.log("Created categories:", categories.map((c) => c.name));

  // Create products
  const products = [
    { name: "Caesar Salad", categoryId: categories[0].id, priceCents: 899, costCents: 300, isVeg: true, prepTimeMins: 10, sku: "STR-001" },
    { name: "Chicken Wings", categoryId: categories[0].id, priceCents: 1199, costCents: 450, isVeg: false, prepTimeMins: 15, sku: "STR-002" },
    { name: "Garlic Bread", categoryId: categories[0].id, priceCents: 599, costCents: 150, isVeg: true, prepTimeMins: 8, sku: "STR-003" },
    { name: "Grilled Salmon", categoryId: categories[1].id, priceCents: 2499, costCents: 1200, isVeg: false, prepTimeMins: 25, sku: "MN-001" },
    { name: "Ribeye Steak", categoryId: categories[1].id, priceCents: 3499, costCents: 1800, isVeg: false, prepTimeMins: 30, sku: "MN-002" },
    { name: "Pasta Primavera", categoryId: categories[1].id, priceCents: 1699, costCents: 500, isVeg: true, prepTimeMins: 20, sku: "MN-003" },
    { name: "Chicken Alfredo", categoryId: categories[1].id, priceCents: 1899, costCents: 600, isVeg: false, prepTimeMins: 20, sku: "MN-004" },
    { name: "Margherita Pizza", categoryId: categories[2].id, priceCents: 1499, costCents: 400, isVeg: true, prepTimeMins: 18, sku: "PZ-001" },
    { name: "Pepperoni Pizza", categoryId: categories[2].id, priceCents: 1699, costCents: 500, isVeg: false, prepTimeMins: 18, sku: "PZ-002" },
    { name: "BBQ Chicken Pizza", categoryId: categories[2].id, priceCents: 1899, costCents: 600, isVeg: false, prepTimeMins: 20, sku: "PZ-003" },
    { name: "Coca Cola", categoryId: categories[3].id, priceCents: 299, costCents: 80, isVeg: true, prepTimeMins: 1, sku: "BV-001" },
    { name: "Fresh Orange Juice", categoryId: categories[3].id, priceCents: 499, costCents: 150, isVeg: true, prepTimeMins: 5, sku: "BV-002" },
    { name: "Iced Tea", categoryId: categories[3].id, priceCents: 399, costCents: 80, isVeg: true, prepTimeMins: 3, sku: "BV-003" },
    { name: "Chocolate Lava Cake", categoryId: categories[4].id, priceCents: 899, costCents: 300, isVeg: true, prepTimeMins: 12, sku: "DS-001" },
    { name: "Tiramisu", categoryId: categories[4].id, priceCents: 799, costCents: 250, isVeg: true, prepTimeMins: 5, sku: "DS-002" },
    { name: "Ice Cream Sundae", categoryId: categories[4].id, priceCents: 699, costCents: 200, isVeg: true, prepTimeMins: 5, sku: "DS-003" },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: p.sku } },
      update: {},
      create: { tenantId: tenant.id, ...p },
    });
  }

  // Create meal variant products and link them
  const mealVariants = [
    { baseSku: "MN-001", mealName: "Grilled Salmon (Meal)", mealSku: "MN-001-MEAL", priceCents: 3299, costCents: 1500, isVeg: false },
    { baseSku: "MN-002", mealName: "Ribeye Steak (Meal)", mealSku: "MN-002-MEAL", priceCents: 4299, costCents: 2200, isVeg: false },
    { baseSku: "MN-003", mealName: "Pasta Primavera (Meal)", mealSku: "MN-003-MEAL", priceCents: 2199, costCents: 700, isVeg: true },
    { baseSku: "PZ-001", mealName: "Margherita Pizza (Meal)", mealSku: "PZ-001-MEAL", priceCents: 1999, costCents: 600, isVeg: true },
    { baseSku: "PZ-002", mealName: "Pepperoni Pizza (Meal)", mealSku: "PZ-002-MEAL", priceCents: 2199, costCents: 700, isVeg: false },
  ];

  for (const mv of mealVariants) {
    const baseProduct = await prisma.product.findFirst({
      where: { tenantId: tenant.id, sku: mv.baseSku },
    });
    if (!baseProduct) continue;

    const mealProduct = await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: mv.mealSku } },
      update: {},
      create: {
        tenantId: tenant.id,
        categoryId: baseProduct.categoryId,
        name: mv.mealName,
        sku: mv.mealSku,
        priceCents: mv.priceCents,
        costCents: mv.costCents,
        isVeg: mv.isVeg,
        isActive: false, // meal variants are hidden from menu, only shown via popup
        prepTimeMins: baseProduct.prepTimeMins,
      },
    });

    // Link base product to its meal variant
    await prisma.product.update({
      where: { id: baseProduct.id },
      data: { mealProductId: mealProduct.id },
    });
  }

  console.log(`Created ${mealVariants.length} meal variants`);

  // Create size variants for some products
  const sizeVariants = [
    // Pizzas — Regular, Medium, Large
    { sku: "PZ-001", sizes: [{ name: "Regular", priceCents: 1499, sort: 0 }, { name: "Medium", priceCents: 1999, sort: 1 }, { name: "Large", priceCents: 2499, sort: 2 }] },
    { sku: "PZ-002", sizes: [{ name: "Regular", priceCents: 1699, sort: 0 }, { name: "Medium", priceCents: 2199, sort: 1 }, { name: "Large", priceCents: 2799, sort: 2 }] },
    { sku: "PZ-003", sizes: [{ name: "Regular", priceCents: 1899, sort: 0 }, { name: "Medium", priceCents: 2399, sort: 1 }, { name: "Large", priceCents: 2999, sort: 2 }] },
    // Beverages — Small, Regular, Large
    { sku: "BV-001", sizes: [{ name: "Small", priceCents: 199, sort: 0 }, { name: "Regular", priceCents: 299, sort: 1 }, { name: "Large", priceCents: 399, sort: 2 }] },
    { sku: "BV-002", sizes: [{ name: "Regular", priceCents: 499, sort: 0 }, { name: "Large", priceCents: 699, sort: 1 }] },
    { sku: "BV-003", sizes: [{ name: "Regular", priceCents: 399, sort: 0 }, { name: "Large", priceCents: 549, sort: 1 }] },
  ];

  let variantCount = 0;
  for (const sv of sizeVariants) {
    const product = await prisma.product.findFirst({ where: { tenantId: tenant.id, sku: sv.sku } });
    if (!product) continue;

    // Delete old variants first
    await prisma.productVariant.deleteMany({ where: { productId: product.id } });

    for (const size of sv.sizes) {
      await prisma.productVariant.create({
        data: { productId: product.id, name: size.name, priceCents: size.priceCents, sortOrder: size.sort },
      });
      variantCount++;
    }
  }
  console.log(`Created ${variantCount} size variants`);

  console.log("Created", products.length, "products");

  // Create tables
  for (let i = 1; i <= 12; i++) {
    await prisma.restaurantTable.upsert({
      where: { tenantId_number: { tenantId: tenant.id, number: i } },
      update: {},
      create: {
        tenantId: tenant.id,
        number: i,
        capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
      },
    });
  }

  console.log("Created 12 tables");

  // Create inventory items
  const inventoryItems = [
    { name: "Chicken Breast", sku: "INV-001", quantity: 50, unit: "kg", reorderLevel: 10, costPerUnit: 800 },
    { name: "Salmon Fillet", sku: "INV-002", quantity: 20, unit: "kg", reorderLevel: 5, costPerUnit: 2000 },
    { name: "Pizza Dough", sku: "INV-003", quantity: 100, unit: "pcs", reorderLevel: 20, costPerUnit: 150 },
    { name: "Mozzarella Cheese", sku: "INV-004", quantity: 30, unit: "kg", reorderLevel: 8, costPerUnit: 1200 },
    { name: "Olive Oil", sku: "INV-005", quantity: 15, unit: "liters", reorderLevel: 3, costPerUnit: 1500 },
    { name: "Tomato Sauce", sku: "INV-006", quantity: 25, unit: "liters", reorderLevel: 5, costPerUnit: 400 },
    { name: "Lettuce", sku: "INV-007", quantity: 8, unit: "kg", reorderLevel: 10, costPerUnit: 300 },
    { name: "Coca Cola Cans", sku: "INV-008", quantity: 200, unit: "pcs", reorderLevel: 50, costPerUnit: 50 },
    { name: "Chocolate", sku: "INV-009", quantity: 10, unit: "kg", reorderLevel: 3, costPerUnit: 1800 },
    { name: "Cream", sku: "INV-010", quantity: 12, unit: "liters", reorderLevel: 4, costPerUnit: 600 },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: item.sku } },
      update: {},
      create: { tenantId: tenant.id, ...item },
    });
  }

  console.log("Created", inventoryItems.length, "inventory items");

  // Create sample customers
  const customers = [
    { name: "John Smith", email: "john@example.com", phone: "+1-555-0101", totalVisits: 15, totalSpent: 45000, loyaltyPoints: 450 },
    { name: "Jane Doe", email: "jane@example.com", phone: "+1-555-0102", totalVisits: 8, totalSpent: 22000, loyaltyPoints: 220 },
    { name: "Bob Wilson", email: "bob@example.com", phone: "+1-555-0103", totalVisits: 22, totalSpent: 68000, loyaltyPoints: 680 },
    { name: "Alice Brown", email: "alice@example.com", phone: "+1-555-0104", totalVisits: 5, totalSpent: 12000, loyaltyPoints: 120 },
    { name: "Charlie Davis", email: "charlie@example.com", phone: "+1-555-0105", totalVisits: 30, totalSpent: 95000, loyaltyPoints: 950 },
  ];

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { tenantId_phone: { tenantId: tenant.id, phone: c.phone } },
      update: {},
      create: { tenantId: tenant.id, ...c },
    });
  }

  console.log("Created", customers.length, "customers");

  // Create trial subscription
  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      plan: "professional",
      status: "TRIAL",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Created trial subscription");
  console.log("\nSeed completed! Login credentials:");
  console.log("");
  console.log("  SuperAdmin → /admin/login");
  console.log("    Email:    superadminmealstack@gmail.com");
  console.log("    Password: JasMealStack@0051");
  console.log("");
  console.log("  Vendor → /login");
  console.log("    Tenant:   demo");
  console.log("    Email:    vendor@demo.com");
  console.log("    Password: password123");
  console.log("");
  console.log("  Manager → /login");
  console.log("    Tenant:   demo");
  console.log("    Email:    manager@demo.com");
  console.log("    Password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
