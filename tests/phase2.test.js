import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { getDbClient } from '../src/db/client.js';
import { flags } from '../src/config/flags.js';
import { authenticateAdmin, generateAdminToken, verifyToken } from '../src/services/authService.js';
import { createCategorySchema, updateCategorySchema } from '../src/validators/categorySchema.js';
import { createMenuItemSchema, updateMenuItemSchema } from '../src/validators/menuSchema.js';
import { createVariantSchema, updateVariantSchema } from '../src/validators/variantSchema.js';
import { updateSettingsSchema } from '../src/validators/settingsSchema.js';
import { slugify } from '../src/utils/slugify.js';

test('─── Phase 2: Slug Generation ───', async (t) => {
    await t.test('slugify converts titles to URL-safe slugs', () => {
        assert.equal(slugify('Zinger Burger'), 'zinger-burger');
        assert.equal(slugify('Chicken & Beef Pizza!'), 'chicken-beef-pizza');
        assert.equal(slugify('  Spicy Wings 10pcs  '), 'spicy-wings-10pcs');
        assert.equal(slugify(''), '');
    });
});

test('─── Phase 2: Authentication & Token Management ───', async (t) => {
    await t.test('unauthenticated / invalid token is rejected', () => {
        const res1 = verifyToken(null);
        assert.equal(res1.valid, false);

        const res2 = verifyToken('invalid-gibberish-token');
        assert.equal(res2.valid, false);

        const res3 = verifyToken('');
        assert.equal(res3.valid, false);
    });

    await t.test('generateAdminToken generates valid signed token', () => {
        const payload = {
            userId: 'test-admin-1',
            username: 'admin',
            role: 'SUPER_ADMIN',
            restaurantId: 'rest-123',
        };
        const token = generateAdminToken(payload);
        assert.ok(token.includes('.'));

        const verifyResult = verifyToken(token);
        assert.equal(verifyResult.valid, true);
        assert.equal(verifyResult.user.username, 'admin');
        assert.equal(verifyResult.user.restaurantId, 'rest-123');
    });

    await t.test('legacy HMAC token is accepted as fallback', () => {
        // Create a legacy token format: timestamp.hash
        const timestamp = Date.now();
        const secret = process.env.AUTH_SECRET || 'cravey-crust-default-secret-change-in-prod';
        const hash = crypto.createHmac('sha256', secret).update(`admin:${timestamp}`).digest('hex');
        const legacyToken = `${timestamp}.${hash}`;

        const result = verifyToken(legacyToken);
        assert.equal(result.valid, true);
        assert.equal(result.user.username, 'admin');
        assert.equal(result.user.isLegacy, true);
    });

    await t.test('authenticateAdmin falls back to DASHBOARD_USER/PASS if needed', async () => {
        const auth = await authenticateAdmin('admin', 'xortlogix');
        assert.ok(auth !== null);
        assert.equal(auth.user.username, 'admin');
        assert.ok(auth.token.length > 20);

        const failed = await authenticateAdmin('admin', 'wrong-pass-123');
        assert.equal(failed, null);
    });
});

test('─── Phase 2: Category Validation ───', async (t) => {
    await t.test('valid category input passes Zod schema', () => {
        const input = {
            name: 'Special Deals',
            description: 'Exclusive bundle packages',
            sort_order: 10,
            is_active: true,
        };
        const parsed = createCategorySchema.safeParse(input);
        assert.equal(parsed.success, true);
        assert.equal(parsed.data.name, 'Special Deals');
        assert.equal(parsed.data.sort_order, 10);
    });

    await t.test('empty category name is rejected', () => {
        const input = { name: '   ', sort_order: 1 };
        const parsed = createCategorySchema.safeParse(input);
        assert.equal(parsed.success, false);
    });
});

test('─── Phase 2: Menu Item Validation ───', async (t) => {
    await t.test('valid menu item passes schema', () => {
        const input = {
            name: 'Zinger Burger',
            category_id: 'cat-123',
            description: 'Crunchy chicken',
            base_price: 599,
            spicy_level: 'MEDIUM',
            is_available: true,
            is_active: true,
        };
        const parsed = createMenuItemSchema.safeParse(input);
        assert.equal(parsed.success, true);
        assert.equal(parsed.data.base_price, 599);
        assert.equal(parsed.data.spicy_level, 'MEDIUM');
    });

    await t.test('negative price is rejected', () => {
        const input = {
            name: 'Free Item',
            category_id: 'cat-123',
            base_price: -50,
        };
        const parsed = createMenuItemSchema.safeParse(input);
        assert.equal(parsed.success, false);
    });

    await t.test('missing category_id is rejected', () => {
        const input = {
            name: 'Mystery Item',
            base_price: 200,
        };
        const parsed = createMenuItemSchema.safeParse(input);
        assert.equal(parsed.success, false);
    });
});

test('─── Phase 2: Variant Validation ───', async (t) => {
    await t.test('valid variant passes schema', () => {
        const input = {
            name: 'Large',
            price: 1350,
            sort_order: 3,
            is_available: true,
        };
        const parsed = createVariantSchema.safeParse(input);
        assert.equal(parsed.success, true);
        assert.equal(parsed.data.price, 1350);
    });

    await t.test('negative variant price is rejected', () => {
        const input = {
            name: 'Invalid Variant',
            price: -10,
        };
        const parsed = createVariantSchema.safeParse(input);
        assert.equal(parsed.success, false);
    });

    await t.test('empty variant name is rejected', () => {
        const input = {
            name: '',
            price: 50,
        };
        const parsed = createVariantSchema.safeParse(input);
        assert.equal(parsed.success, false);
    });
});

test('─── Phase 2: Settings Validation ───', async (t) => {
    await t.test('valid settings update passes schema', () => {
        const input = {
            name: 'Cravey Crust Gulberg',
            phone: '03001234567',
            min_order: 350,
            default_delivery_fee: 70,
            cod_enabled: true,
            easypaisa_enabled: true,
            opening_time: '11:00',
            closing_time: '01:00',
        };
        const parsed = updateSettingsSchema.safeParse(input);
        assert.equal(parsed.success, true);
        assert.equal(parsed.data.min_order, 350);
        assert.equal(parsed.data.default_delivery_fee, 70);
    });
});
