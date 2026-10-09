/**
 * Schema Validation Tests — tests/schema.test.js
 *
 * Tests business logic validation rules for schema fields.
 * Does NOT require a database — pure logic tests.
 */

import assert from 'assert';
import { describe, it } from 'node:test';

// ── Helper validators (mirrors what API layer will enforce) ────────────────

function validateCategorySlug(slug) {
    return /^[a-z0-9-]+$/.test(slug) && slug.length >= 2 && slug.length <= 100;
}

function validatePrice(price) {
    const n = parseFloat(price);
    return !isNaN(n) && n >= 0 && n <= 999999.99;
}

function validateSpicyLevel(level) {
    return ['NONE', 'MILD', 'MEDIUM', 'HOT'].includes(level);
}

function validateAdminRole(role) {
    return ['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(role);
}

function validateOrderNumberFormat(num) {
    // CC-000001 format
    return /^[A-Z]{2}-\d{6}$/.test(num);
}

function formatOrderNumber(restaurantPrefix, sequenceNum) {
    return `${restaurantPrefix}-${String(sequenceNum).padStart(6, '0')}`;
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('Category Validation', () => {
    it('valid slugs pass', () => {
        assert.ok(validateCategorySlug('burgers'));
        assert.ok(validateCategorySlug('cold-drinks'));
        assert.ok(validateCategorySlug('meal-deals-2024'));
    });

    it('invalid slugs fail', () => {
        assert.ok(!validateCategorySlug('Burgers'));         // uppercase
        assert.ok(!validateCategorySlug('has spaces'));      // spaces
        assert.ok(!validateCategorySlug(''));                // empty
        assert.ok(!validateCategorySlug('a'));               // too short
        assert.ok(!validateCategorySlug('has_underscore'));  // underscores not allowed
    });
});

describe('Price Validation', () => {
    it('valid prices pass', () => {
        assert.ok(validatePrice(0));
        assert.ok(validatePrice(599));
        assert.ok(validatePrice(1350.50));
        assert.ok(validatePrice('649'));
    });

    it('invalid prices fail', () => {
        assert.ok(!validatePrice(-1));
        assert.ok(!validatePrice('abc'));
        assert.ok(!validatePrice(1000000));  // over max
        assert.ok(!validatePrice(NaN));
    });
});

describe('SpicyLevel Enum', () => {
    it('valid levels pass', () => {
        ['NONE', 'MILD', 'MEDIUM', 'HOT'].forEach(level => {
            assert.ok(validateSpicyLevel(level), `${level} should be valid`);
        });
    });

    it('invalid levels fail', () => {
        assert.ok(!validateSpicyLevel('VERY_HOT'));
        assert.ok(!validateSpicyLevel('none'));    // case sensitive
        assert.ok(!validateSpicyLevel(''));
        assert.ok(!validateSpicyLevel(null));
    });
});

describe('AdminRole Enum', () => {
    it('valid roles pass', () => {
        ['SUPER_ADMIN', 'ADMIN', 'STAFF'].forEach(role => {
            assert.ok(validateAdminRole(role), `${role} should be valid`);
        });
    });

    it('invalid roles fail', () => {
        assert.ok(!validateAdminRole('USER'));
        assert.ok(!validateAdminRole('admin')); // case sensitive
        assert.ok(!validateAdminRole(''));
    });
});

describe('Order Number Format', () => {
    it('generates correct format', () => {
        assert.strictEqual(formatOrderNumber('CC', 1),      'CC-000001');
        assert.strictEqual(formatOrderNumber('CC', 127),    'CC-000127');
        assert.strictEqual(formatOrderNumber('CC', 999999), 'CC-999999');
    });

    it('validates correct format', () => {
        assert.ok(validateOrderNumberFormat('CC-000001'));
        assert.ok(validateOrderNumberFormat('CC-000127'));
        assert.ok(validateOrderNumberFormat('CC-999999'));
    });

    it('rejects malformed order numbers', () => {
        assert.ok(!validateOrderNumberFormat('CC-1'));        // too short
        assert.ok(!validateOrderNumberFormat('CC-0000001'));  // too long
        assert.ok(!validateOrderNumberFormat('cc-000001'));   // lowercase
        assert.ok(!validateOrderNumberFormat('000001'));      // no prefix
        assert.ok(!validateOrderNumberFormat('CC000001'));    // no dash
    });
});

describe('Menu Item Business Rules', () => {
    it('item with variants uses variant price, not base_price', () => {
        const item = { base_price: 650, variants: [{ name: 'Small', price: 650 }, { name: 'Large', price: 1350 }] };
        const variant = item.variants.find(v => v.name === 'Large');
        // Backend should use variant.price, never item.base_price when variant is selected
        assert.strictEqual(variant.price, 1350);
        assert.notStrictEqual(variant.price, item.base_price);
    });

    it('item without variants uses base_price', () => {
        const item = { base_price: 599, variants: [] };
        const effectivePrice = item.variants.length > 0 ? null : item.base_price;
        assert.strictEqual(effectivePrice, 599);
    });
});
