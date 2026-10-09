import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { calculatePricing } from '../src/services/pricingService.js';
import { checkDeliveryAvailability } from '../src/services/deliveryService.js';
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

test('─── Phase 3: Database & Pricing Integration Tests ───', async (t) => {
    let restaurant;

    try {
        await prisma.$queryRaw`SELECT 1`;
        restaurant = await prisma.restaurant.findFirst({ where: { slug: 'cravey-crust' } });
        if (!restaurant) {
            restaurant = await prisma.restaurant.findFirst();
        }
    } catch (err) {
        console.log('Skipping Phase 3 DB integration tests (DB unreachable):', err.message);
        return;
    }

    assert.ok(restaurant, 'Restaurant must exist');
    const testSuffix = Date.now().toString().slice(-6);

    // 1. Delivery Area CRUD & Availability
    let testArea;
    await t.test('Delivery Area CRUD: Create, check availability, toggle status', async () => {
        const areaName = `Ghauri Town ${testSuffix}`;
        testArea = await prisma.deliveryArea.create({
            data: {
                restaurant_id: restaurant.id,
                name: areaName,
                slug: slugify(areaName),
                delivery_fee: 150,
                minimum_order: 500,
                is_active: true,
                latitude: 33.6261,
                longitude: 73.1342,
                radius_km: 5.0,
            },
        });

        assert.equal(testArea.name, areaName);
        assert.equal(Number(testArea.delivery_fee), 150);
        assert.equal(Number(testArea.minimum_order), 500);

        // Check availability by areaId
        const checkById = await checkDeliveryAvailability({
            restaurantId: restaurant.id,
            areaId: testArea.id,
            subtotal: 600,
        });
        assert.equal(checkById.available, true);
        assert.equal(checkById.deliveryFee, 150);
        assert.equal(checkById.minimumMet, true);

        // Check availability by coordinates
        const checkByCoord = await checkDeliveryAvailability({
            restaurantId: restaurant.id,
            latitude: 33.6261,
            longitude: 73.1342,
            subtotal: 600,
        });
        assert.equal(checkByCoord.available, true);
        assert.ok(checkByCoord.area.id);

        // Check subtotal below minimum order
        const checkBelowMin = await checkDeliveryAvailability({
            restaurantId: restaurant.id,
            areaId: testArea.id,
            subtotal: 300,
        });
        assert.equal(checkBelowMin.available, true);
        assert.equal(checkBelowMin.minimumMet, false);
        assert.equal(checkBelowMin.code, 'DELIVERY_MINIMUM_NOT_MET');

        // Toggle disabled
        await prisma.deliveryArea.update({
            where: { id: testArea.id },
            data: { is_active: false },
        });

        const checkDisabled = await checkDeliveryAvailability({
            restaurantId: restaurant.id,
            areaId: testArea.id,
            subtotal: 600,
        });
        assert.equal(checkDisabled.available, false);
        assert.equal(checkDisabled.code, 'DELIVERY_NOT_AVAILABLE');

        // Re-enable
        await prisma.deliveryArea.update({
            where: { id: testArea.id },
            data: { is_active: true },
        });
        const checkReenabled = await checkDeliveryAvailability({
            restaurantId: restaurant.id,
            areaId: testArea.id,
            subtotal: 600,
        });
        assert.equal(checkReenabled.available, true);
    });

    // 2. Promotion CRUD & Pricing Verification
    let testPromo;
    let createdZingerItem = null;
    await t.test('Promotion CRUD & Discount Calculations', async () => {
        const promoCode = `WELCOME15_${testSuffix}`;
        testPromo = await prisma.promotion.create({
            data: {
                restaurant_id: restaurant.id,
                name: `Welcome 15% ${testSuffix}`,
                code: promoCode,
                discount_type: 'PERCENTAGE',
                discount_value: 15,
                minimum_order: 1000,
                maximum_discount: 500,
                is_active: true,
                targets: {
                    create: [{ target_type: 'ALL' }],
                },
            },
        });

        assert.equal(testPromo.code, promoCode);
        assert.equal(Number(testPromo.discount_value), 15);

        // Find or create a menu item with base price 649 (Zinger Burger)
        let zinger = await prisma.menuItem.findFirst({
            where: { restaurant_id: restaurant.id, slug: { contains: 'zinger' } },
        });
        if (!zinger) {
            let cat = await prisma.category.findFirst({ where: { restaurant_id: restaurant.id } });
            zinger = await prisma.menuItem.create({
                data: {
                    restaurant_id: restaurant.id,
                    category_id: cat.id,
                    name: `Zinger Burger ${testSuffix}`,
                    slug: `zinger-burger-${testSuffix}`,
                    base_price: 649,
                    is_available: true,
                    is_active: true,
                },
            });
            createdZingerItem = zinger;
        } else {
            // Ensure price is 649
            zinger = await prisma.menuItem.update({
                where: { id: zinger.id },
                data: { base_price: 649, is_available: true, is_active: true },
            });
        }

        // Section 27 Exact Scenario:
        // 2 x Zinger Burger @ 649 = 1298
        // Apply WELCOME15 -> 15% of 1298 = 194.70
        // Delivery -> 150
        // Total -> 1253.30
        const pricingRes = await calculatePricing({
            restaurantId: restaurant.id,
            items: [{ menuItemId: zinger.id, quantity: 2 }],
            promoCode: promoCode.toLowerCase(), // Test case-insensitive
            deliveryAreaId: testArea.id,
        });

        assert.equal(pricingRes.subtotal, 1298);
        assert.equal(pricingRes.discountTotal, 194.7);
        assert.equal(pricingRes.deliveryFee, 150);
        assert.equal(pricingRes.total, 1253.3);
        assert.equal(pricingRes.discounts.length, 1);
        assert.equal(pricingRes.discounts[0].amount, 194.7);

        // Disable promotion
        await prisma.promotion.update({
            where: { id: testPromo.id },
            data: { is_active: false },
        });

        // Now promoCode should fail with PROMOTION_INACTIVE
        await assert.rejects(
            async () => {
                await calculatePricing({
                    restaurantId: restaurant.id,
                    items: [{ menuItemId: zinger.id, quantity: 2 }],
                    promoCode: promoCode,
                    deliveryAreaId: testArea.id,
                });
            },
            (err) => err.code === 'PROMOTION_INACTIVE'
        );

        // Without promoCode: subtotal 1298 + delivery 150 = 1448
        const noPromoRes = await calculatePricing({
            restaurantId: restaurant.id,
            items: [{ menuItemId: zinger.id, quantity: 2 }],
            deliveryAreaId: testArea.id,
        });
        assert.equal(noPromoRes.subtotal, 1298);
        assert.equal(noPromoRes.discountTotal, 0);
        assert.equal(noPromoRes.deliveryFee, 150);
        assert.equal(noPromoRes.total, 1448);
    });

    // 3. Deals CRUD & Bundled Pricing
    await t.test('Deal CRUD & Deal Pricing Calculation', async () => {
        let zinger = await prisma.menuItem.findFirst({
            where: { restaurant_id: restaurant.id, slug: { contains: 'zinger' } },
        });

        const dealName = `Family Deal ${testSuffix}`;
        const deal = await prisma.deal.create({
            data: {
                restaurant_id: restaurant.id,
                name: dealName,
                slug: slugify(dealName),
                deal_price: 1499,
                is_active: true,
                deal_items: {
                    create: [
                        { menu_item_id: zinger.id, quantity: 2 },
                    ],
                },
            },
            include: { deal_items: true },
        });

        assert.equal(deal.name, dealName);
        assert.equal(Number(deal.deal_price), 1499);
        assert.equal(deal.deal_items.length, 1);

        // Price request for 1 Deal
        const dealPricing = await calculatePricing({
            restaurantId: restaurant.id,
            deals: [{ dealId: deal.id, quantity: 1 }],
            deliveryFee: 100,
        });

        assert.equal(dealPricing.subtotal, 1499);
        assert.equal(dealPricing.deliveryFee, 100);
        assert.equal(dealPricing.total, 1599);

        // Clean up test records
        await prisma.deal.delete({ where: { id: deal.id } });
        if (testPromo) await prisma.promotion.delete({ where: { id: testPromo.id } });
        if (testArea) await prisma.deliveryArea.delete({ where: { id: testArea.id } });
        if (createdZingerItem) await prisma.menuItem.delete({ where: { id: createdZingerItem.id } });
    });

    await prisma.$disconnect();
});
