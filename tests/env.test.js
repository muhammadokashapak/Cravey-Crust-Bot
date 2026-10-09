/**
 * Environment Config Tests — tests/env.test.js
 *
 * Validates that env.js reads and validates environment variables correctly.
 * Does not require database connection.
 */

import assert from 'assert';
import { describe, it } from 'node:test';

describe('Environment Configuration', () => {
    it('env module exports a config object', async () => {
        const { env } = await import('../src/config/env.js');
        assert.ok(env !== null && typeof env === 'object', 'env should be an object');
    });

    it('env has expected default values', async () => {
        const { env } = await import('../src/config/env.js');
        // These should have defaults
        assert.ok(env.PORT, 'PORT should exist');
        assert.ok(env.DASHBOARD_USER, 'DASHBOARD_USER should exist');
        assert.ok(env.DASHBOARD_PASS, 'DASHBOARD_PASS should exist');
    });

    it('RESTAURANT_DB_ENABLED defaults to false string', async () => {
        const { env } = await import('../src/config/env.js');
        // When not explicitly set to 'true', should be 'false'
        assert.strictEqual(env.RESTAURANT_DB_ENABLED, 'false');
    });

    it('All feature flag env vars are present', async () => {
        const { env } = await import('../src/config/env.js');
        const featureFlags = [
            'RESTAURANT_DB_ENABLED',
            'CORE_ORDER_ENGINE_ENABLED',
            'CUSTOM_AI_ENABLED',
            'REALTIME_DASHBOARD_ENABLED',
        ];
        for (const flag of featureFlags) {
            assert.ok(flag in env, `Missing env key: ${flag}`);
        }
    });

    it('getEnv() returns same object as env', async () => {
        const { env, getEnv } = await import('../src/config/env.js');
        const env2 = getEnv();
        // Both should reference the same cached object
        assert.strictEqual(env, env2);
    });
});
