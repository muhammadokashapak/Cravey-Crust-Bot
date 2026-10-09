import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { slugify } from '../src/utils/slugify.js';

import { execSync } from 'child_process';
import fs from 'fs';

let detectedIp = '172.31.0.3';
try {
    const ip = execSync("docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' cravey-postgres 2>/dev/null", { encoding: 'utf8' }).trim();
    if (ip) detectedIp = ip;
} catch (_) {}

let dbUrl = process.env.DATABASE_URL || `postgresql://cravey:cravey_secure_pass_123@${detectedIp}:5432/cravey_crust`;
if (dbUrl.includes('@cravey-postgres:5432') && !fs.existsSync('/.dockerenv')) {
    dbUrl = dbUrl.replace('@cravey-postgres:5432', `@${detectedIp}:5432`);
}
let prisma;

try {
    prisma = new PrismaClient({
        datasources: { db: { url: dbUrl } },
    });
} catch (_) {}

test('─── Phase 2: Database Integration Tests ───', async (t) => {
    let restaurant;

    // Check DB connectivity
    try {
        await prisma.$queryRaw`SELECT 1`;
        restaurant = await prisma.restaurant.findFirst({ where: { slug: 'cravey-crust' } });
        if (!restaurant) {
            restaurant = await prisma.restaurant.create({
                data: {
                    name: 'Cravey Crust Test',
                    slug: 'cravey-crust',
                    phone: '03000000000',
                },
            });
        }
    } catch (err) {
        console.log('Skipping DB integration tests (DB unreachable):', err.message);
        return;
    }

    const testSuffix = Date.now().toString().slice(-6);

    // 1. Category CRUD
    let testCategory;
    await t.test('Category CRUD: Create, duplicate check, update, disable', async () => {
        const catName = `Test Category ${testSuffix}`;
        const catSlug = slugify(catName);

        // Create
        testCategory = await prisma.category.create({
            data: {
                restaurant_id: restaurant.id,
                name: catName,
                slug: catSlug,
                description: 'Test category description',
                sort_order: 99,
                is_active: true,
            },
        });
        assert.ok(testCategory.id);
        assert.equal(testCategory.name, catName);

        // Duplicate rejection by unique constraint
        await assert.rejects(
            async () => {
                await prisma.category.create({
                    data: {
                        restaurant_id: restaurant.id,
                        name: catName,
                        slug: catSlug,
                    },
                });
            },
            /Unique constraint failed/
        );

        // Update
        const updatedCat = await prisma.category.update({
            where: { id: testCategory.id },
            data: { description: 'Updated description', sort_order: 100 },
        });
        assert.equal(updatedCat.description, 'Updated description');
        assert.equal(updatedCat.sort_order, 100);

        // Toggle active
        const disabledCat = await prisma.category.update({
            where: { id: testCategory.id },
            data: { is_active: false },
        });
        assert.equal(disabledCat.is_active, false);

        // Re-enable
        await prisma.category.update({
            where: { id: testCategory.id },
            data: { is_active: true },
        });
    });

    // 2. Menu Item CRUD & Immediate Price Persistence
    let testItem;
    await t.test('Menu Item CRUD: Create, price update 599 -> 649, toggle availability', async () => {
        const itemName = `Zinger Test Burger ${testSuffix}`;
        const itemSlug = slugify(itemName);

        // Create with price 599
        testItem = await prisma.menuItem.create({
            data: {
                restaurant_id: restaurant.id,
                category_id: testCategory.id,
                name: itemName,
                slug: itemSlug,
                description: 'Crispy spicy chicken fillet',
                base_price: 599.00,
                is_available: true,
                is_active: true,
            },
        });
        assert.ok(testItem.id);
        assert.equal(Number(testItem.base_price), 599);

        // Immediate price update 599 -> 649
        const updatedItem = await prisma.menuItem.update({
            where: { id: testItem.id },
            data: { base_price: 649.00 },
        });
        assert.equal(Number(updatedItem.base_price), 649);

        // Verify direct database read shows 649 immediately
        const rereadItem = await prisma.menuItem.findUnique({
            where: { id: testItem.id },
        });
        assert.equal(Number(rereadItem.base_price), 649);

        // Toggle availability
        const disabledItem = await prisma.menuItem.update({
            where: { id: testItem.id },
            data: { is_available: false },
        });
        assert.equal(disabledItem.is_available, false);

        // Re-enable
        const enabledItem = await prisma.menuItem.update({
            where: { id: testItem.id },
            data: { is_available: true },
        });
        assert.equal(enabledItem.is_available, true);
    });

    // 3. Variant CRUD
    let testVariant;
    await t.test('Variant CRUD: Add variant, update price, delete', async () => {
        testVariant = await prisma.menuVariant.create({
            data: {
                menu_item_id: testItem.id,
                name: 'Double Patty',
                price: 849.00,
                sort_order: 1,
                is_available: true,
            },
        });
        assert.ok(testVariant.id);
        assert.equal(Number(testVariant.price), 849);

        // Update variant
        const updatedVar = await prisma.menuVariant.update({
            where: { id: testVariant.id },
            data: { price: 899.00 },
        });
        assert.equal(Number(updatedVar.price), 899);

        // Delete variant
        await prisma.menuVariant.delete({
            where: { id: testVariant.id },
        });
        const found = await prisma.menuVariant.findUnique({
            where: { id: testVariant.id },
        });
        assert.equal(found, null);
    });

    // 4. Internal Menu Filtering Logic
    await t.test('Internal Menu Filtering: Excludes inactive categories and unavailable items', async () => {
        // Query active categories containing active, available items
        const visibleCategories = await prisma.category.findMany({
            where: {
                restaurant_id: restaurant.id,
                is_active: true,
            },
            include: {
                menu_items: {
                    where: {
                        is_active: true,
                        is_available: true,
                    },
                },
            },
        });

        // Test item should be present with price 649
        const cat = visibleCategories.find(c => c.id === testCategory.id);
        assert.ok(cat);
        const item = cat.menu_items.find(m => m.id === testItem.id);
        assert.ok(item);
        assert.equal(Number(item.base_price), 649);

        // When item is unavailable, it should NOT appear in internal menu
        await prisma.menuItem.update({
            where: { id: testItem.id },
            data: { is_available: false },
        });

        const updatedCategories = await prisma.category.findMany({
            where: {
                restaurant_id: restaurant.id,
                is_active: true,
            },
            include: {
                menu_items: {
                    where: {
                        is_active: true,
                        is_available: true,
                    },
                },
            },
        });
        const updatedCat = updatedCategories.find(c => c.id === testCategory.id);
        const missingItem = updatedCat.menu_items.find(m => m.id === testItem.id);
        assert.equal(missingItem, undefined);
    });

    // Clean up test items
    t.after(async () => {
        try {
            if (testItem) {
                await prisma.menuVariant.deleteMany({ where: { menu_item_id: testItem.id } });
                await prisma.menuItem.delete({ where: { id: testItem.id } });
            }
            if (testCategory) {
                await prisma.category.delete({ where: { id: testCategory.id } });
            }
        } catch (_) {}
        await prisma.$disconnect();
    });
});
