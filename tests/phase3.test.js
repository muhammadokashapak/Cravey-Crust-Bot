import test from 'node:test';
import assert from 'node:assert/strict';
import { createDealSchema, updateDealSchema, createDealItemSchema } from '../src/validators/dealSchema.js';
import { createPromotionSchema, updatePromotionSchema } from '../src/validators/promotionSchema.js';
import { createDeliveryAreaSchema, updateDeliveryAreaSchema } from '../src/validators/deliveryAreaSchema.js';
import { calculatePricingSchema } from '../src/validators/pricingSchema.js';
import { checkDeliverySchema } from '../src/validators/deliveryCheckSchema.js';
import { calculateHaversineDistance } from '../src/services/deliveryService.js';
import { roundMoney } from '../src/services/pricingService.js';

test('─── Phase 3: Deal Validation ───', async (t) => {
    await t.test('valid deal input passes schema', () => {
        const parsed = createDealSchema.safeParse({
            name: 'Family Deal',
            deal_price: 1499,
            description: 'Includes 2 Zingers, Fries, 2 Drinks',
            is_active: true,
            sort_order: 1,
        });
        assert.equal(parsed.success, true);
        assert.equal(parsed.data.name, 'Family Deal');
        assert.equal(parsed.data.deal_price, 1499);
    });

    await t.test('negative deal price is rejected', () => {
        const parsed = createDealSchema.safeParse({
            name: 'Bad Deal',
            deal_price: -100,
        });
        assert.equal(parsed.success, false);
    });

    await t.test('empty deal name is rejected', () => {
        const parsed = createDealSchema.safeParse({
            name: '',
            deal_price: 999,
        });
        assert.equal(parsed.success, false);
    });

    await t.test('deal item schema requires valid quantity and item id', () => {
        const validItem = createDealItemSchema.safeParse({
            menu_item_id: 'item123',
            quantity: 2,
        });
        assert.equal(validItem.success, true);

        const invalidQty = createDealItemSchema.safeParse({
            menu_item_id: 'item123',
            quantity: 0,
        });
        assert.equal(invalidQty.success, false);
    });
});

test('─── Phase 3: Promotion Validation ───', async (t) => {
    await t.test('valid percentage promotion passes schema', () => {
        const parsed = createPromotionSchema.safeParse({
            name: 'WELCOME15',
            code: 'WELCOME15',
            discount_type: 'PERCENTAGE',
            discount_value: 15,
            minimum_order: 1000,
        });
        assert.equal(parsed.success, true);
        assert.equal(parsed.data.discount_value, 15);
    });

    await t.test('percentage over 100 is rejected', () => {
        const parsed = createPromotionSchema.safeParse({
            name: 'Over 100',
            discount_type: 'PERCENTAGE',
            discount_value: 110,
        });
        assert.equal(parsed.success, false);
    });

    await t.test('negative discount is rejected', () => {
        const parsed = createPromotionSchema.safeParse({
            name: 'Negative Promo',
            discount_type: 'FIXED',
            discount_value: -50,
        });
        assert.equal(parsed.success, false);
    });

    await t.test('valid fixed promotion passes schema', () => {
        const parsed = createPromotionSchema.safeParse({
            name: 'FLAT200',
            discount_type: 'FIXED',
            discount_value: 200,
            minimum_order: 500,
        });
        assert.equal(parsed.success, true);
    });
});

test('─── Phase 3: Delivery Area Validation & Haversine ───', async (t) => {
    await t.test('valid delivery area passes schema', () => {
        const parsed = createDeliveryAreaSchema.safeParse({
            name: 'Ghauri Town',
            delivery_fee: 150,
            minimum_order: 500,
            is_active: true,
            latitude: 33.6261,
            longitude: 73.1342,
            radius_km: 5.0,
        });
        assert.equal(parsed.success, true);
        assert.equal(parsed.data.delivery_fee, 150);
    });

    await t.test('negative delivery fee is rejected', () => {
        const parsed = createDeliveryAreaSchema.safeParse({
            name: 'Free',
            delivery_fee: -10,
        });
        assert.equal(parsed.success, false);
    });

    await t.test('Haversine distance calculation is accurate', () => {
        // Distance between Islamabad Blue Area (33.7183, 73.0605) and Rawalpindi Saddar (33.5984, 73.0538) is ~13.3 km
        const dist = calculateHaversineDistance(33.7183, 73.0605, 33.5984, 73.0538);
        assert.ok(dist > 12 && dist < 15, `Expected ~13.3km, got ${dist}`);

        // Distance between same point is 0
        const zeroDist = calculateHaversineDistance(33.7, 73.0, 33.7, 73.0);
        assert.equal(zeroDist, 0);
    });
});

test('─── Phase 3: Pricing Request Validation & Rounding ───', async (t) => {
    await t.test('pricing request requires items or deals', () => {
        const emptyReq = calculatePricingSchema.safeParse({
            items: [],
            deals: [],
        });
        assert.equal(emptyReq.success, false);

        const validReq = calculatePricingSchema.safeParse({
            items: [{ menuItemId: 'item_1', quantity: 2 }],
            promoCode: 'WELCOME15',
        });
        assert.equal(validReq.success, true);
    });

    await t.test('roundMoney prevents float drift', () => {
        assert.equal(roundMoney(194.69999999999999), 194.7);
        assert.equal(roundMoney(1253.2999999999997), 1253.3);
        assert.equal(roundMoney(0.1 + 0.2), 0.3);
    });
});

test('─── Phase 3: Security & Internal API Secret Enforcement ───', async (t) => {
    const { requireInternalSecret, requireAdminAuth } = await import('../src/middleware/auth.js');
    const { generateAdminToken } = await import('../src/services/authService.js');

    await t.test('requireInternalSecret rejects missing secret header', () => {
        let status = null;
        let jsonResponse = null;
        const req = { headers: {} };
        const res = {
            status: (s) => {
                status = s;
                return {
                    json: (data) => { jsonResponse = data; },
                };
            },
        };
        let nextCalled = false;
        requireInternalSecret(req, res, () => { nextCalled = true; });

        assert.equal(status, 401);
        assert.equal(jsonResponse.success, false);
        assert.equal(jsonResponse.error.code, 'UNAUTHORIZED');
        assert.equal(nextCalled, false);
    });

    await t.test('requireInternalSecret rejects invalid secret header', () => {
        let status = null;
        const req = { headers: { 'x-internal-api-secret': 'invalid-secret-value' } };
        const res = {
            status: (s) => {
                status = s;
                return { json: () => {} };
            },
        };
        let nextCalled = false;
        requireInternalSecret(req, res, () => { nextCalled = true; });

        assert.equal(status, 401);
        assert.equal(nextCalled, false);
    });

    await t.test('requireInternalSecret passes with valid secret header', () => {
        const secret = process.env.INTERNAL_API_SECRET || 'cravey-internal-secret-phase2';
        const req = { headers: { 'x-internal-api-secret': secret } };
        let nextCalled = false;
        requireInternalSecret(req, {}, () => { nextCalled = true; });

        assert.equal(nextCalled, true);
    });

    await t.test('requireAdminAuth rejects unauthenticated request', async () => {
        let status = null;
        let jsonResponse = null;
        const req = { headers: {} };
        const res = {
            status: (s) => {
                status = s;
                return {
                    json: (data) => { jsonResponse = data; },
                };
            },
        };
        let nextCalled = false;
        await requireAdminAuth(req, res, () => { nextCalled = true; });

        assert.equal(status, 401);
        assert.equal(jsonResponse.success, false);
        assert.equal(nextCalled, false);
    });

    await t.test('requireAdminAuth accepts valid signed admin token', async () => {
        const token = generateAdminToken({
            userId: 'admin-user-p3',
            username: 'superadmin',
            role: 'ADMIN',
            restaurantId: 'rest-p3',
        });
        const req = { headers: { authorization: `Bearer ${token}` } };
        let nextCalled = false;
        await requireAdminAuth(req, {}, () => { nextCalled = true; });

        assert.equal(nextCalled, true);
        assert.equal(req.user.username, 'superadmin');
    });
});

