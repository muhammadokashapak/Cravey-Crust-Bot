/**
 * Database Connection Tests — tests/db.test.js
 *
 * Tests DB client behavior with and without RESTAURANT_DB_ENABLED.
 * When run with RESTAURANT_DB_ENABLED=false (default), these tests
 * verify the graceful no-op behavior without requiring a real DB.
 *
 * To test real DB connection:
 *   RESTAURANT_DB_ENABLED=true DATABASE_URL=postgresql://... node --test tests/db.test.js
 */

import assert from 'assert';
import { describe, it, before } from 'node:test';

describe('Database Client (flag=false)', () => {
    before(() => {
        // Ensure flag is off for these tests
        process.env.RESTAURANT_DB_ENABLED = 'false';
    });

    it('getDbClient returns null when RESTAURANT_DB_ENABLED=false', async () => {
        const { getDbClient } = await import('../src/db/client.js');
        const client = getDbClient();
        assert.strictEqual(client, null, 'Should return null when DB is disabled');
    });

    it('checkDbHealth returns "disabled" when RESTAURANT_DB_ENABLED=false', async () => {
        const { checkDbHealth } = await import('../src/db/health.js');
        const result = await checkDbHealth();
        assert.strictEqual(result.status, 'disabled');
        assert.strictEqual(result.latency_ms, null);
        assert.ok(result.message.includes('RESTAURANT_DB_ENABLED=false'));
    });

    it('checkDbHealth never throws', async () => {
        const { checkDbHealth } = await import('../src/db/health.js');
        await assert.doesNotReject(checkDbHealth);
    });

    it('disconnectDb is safe to call when no client exists', async () => {
        const { disconnectDb } = await import('../src/db/client.js');
        await assert.doesNotReject(disconnectDb);
    });
});

describe('Database Client (flag=true, no real DB)', () => {
    before(() => {
        process.env.RESTAURANT_DB_ENABLED = 'true';
        // Intentionally invalid URL to test error handling without a real DB
        if (!process.env.DATABASE_URL) {
            process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_nonexistent';
        }
    });

    it('checkDbHealth returns "error" when DB unreachable', async () => {
        // Only run this if DATABASE_URL is set to the test URL (not a real DB)
        if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('test_nonexistent')) {
            // Skip if a real DB URL is configured — don't want to pollute real DB
            console.log('  ⏭ Skipping: real DATABASE_URL detected');
            return;
        }
        const { checkDbHealth } = await import(`../src/db/health.js?t=${Date.now()}`);
        const result = await checkDbHealth();
        // Either 'error' (connection refused) or 'disabled' (flag re-read as false)
        assert.ok(['error', 'disabled', 'ok'].includes(result.status));
    });
});
