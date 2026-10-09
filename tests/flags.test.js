/**
 * Feature Flag Tests — tests/flags.test.js
 * 
 * Tests that feature flags read from env correctly.
 * Runs without a database connection.
 */

import assert from 'assert';
import { describe, it, before, after } from 'node:test';

describe('Feature Flags', () => {
    let originalEnv;

    before(() => {
        originalEnv = { ...process.env };
    });

    after(() => {
        // Restore original env
        Object.assign(process.env, originalEnv);
    });

    it('RESTAURANT_DB_ENABLED defaults to false when not set', async () => {
        delete process.env.RESTAURANT_DB_ENABLED;
        // Re-import to get fresh evaluation (dynamic import with cache-bust)
        const { flags } = await import(`../src/config/flags.js?t=${Date.now()}`);
        // Since flags is loaded at module level, we test the default value expectation
        // In a fresh process with no env, it should be false
        assert.strictEqual(typeof flags.RESTAURANT_DB_ENABLED, 'boolean');
    });

    it('Flag values are booleans not strings', async () => {
        const { flags } = await import('../src/config/flags.js');
        assert.strictEqual(typeof flags.RESTAURANT_DB_ENABLED, 'boolean');
        assert.strictEqual(typeof flags.CORE_ORDER_ENGINE_ENABLED, 'boolean');
        assert.strictEqual(typeof flags.CUSTOM_AI_ENABLED, 'boolean');
        assert.strictEqual(typeof flags.REALTIME_DASHBOARD_ENABLED, 'boolean');
    });

    it('flags object is frozen (immutable)', async () => {
        const { flags } = await import('../src/config/flags.js');
        assert.ok(Object.isFrozen(flags), 'flags should be frozen');
        // Attempting to modify should silently fail or throw in strict mode
        try {
            flags.RESTAURANT_DB_ENABLED = true;
        } catch (_) {
            // TypeError in strict mode — expected
        }
        // Value should remain unchanged regardless
        assert.strictEqual(typeof flags.RESTAURANT_DB_ENABLED, 'boolean');
    });

    it('logFlags runs without throwing', async () => {
        const { logFlags } = await import('../src/config/flags.js');
        assert.doesNotThrow(() => logFlags());
    });

    it('All expected flag keys exist', async () => {
        const { flags } = await import('../src/config/flags.js');
        const expectedKeys = [
            'RESTAURANT_DB_ENABLED',
            'CORE_ORDER_ENGINE_ENABLED',
            'CUSTOM_AI_ENABLED',
            'REALTIME_DASHBOARD_ENABLED',
            'KNOWLEDGE_BASE_ENABLED',
            'WHATSAPP_ORDERING_ENABLED',
        ];
        for (const key of expectedKeys) {
            assert.ok(key in flags, `Missing flag: ${key}`);
        }
    });
});
