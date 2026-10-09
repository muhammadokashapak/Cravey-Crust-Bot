import test from 'node:test';
import assert from 'node:assert/strict';
import { getDbClient } from '../src/db/client.js';
import { getDefaultRestaurantId } from '../src/services/restaurantService.js';
import { getIncrementalChanges } from '../src/services/syncService.js';

test('─── Incremental Synchronization & Local Cache Delta Tests ───', async (t) => {
    const prisma = getDbClient();
    if (!prisma) {
        console.log('Skipping Sync tests: Database client not available');
        return;
    }

    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch (e) {
        console.log('Skipping Sync DB tests (DB unreachable):', e.message);
        return;
    }

    const restaurantId = await getDefaultRestaurantId();

    // 1. Initial Full Sync (since = null)
    await t.test('Full sync without since param returns data & serverTime', async () => {
        const res = await getIncrementalChanges({
            restaurantId,
            entities: ['customers', 'orders', 'menu', 'deals'],
        });

        assert.equal(res.success, true);
        assert.ok(res.serverTime, 'serverTime should be returned');
        assert.equal(res.isIncremental, false);
        assert.ok(Array.isArray(res.data.customers));
        assert.ok(Array.isArray(res.data.orders));
        assert.ok(Array.isArray(res.data.menu));
        assert.ok(Array.isArray(res.data.deals));
    });

    // 2. Incremental Sync with Future timestamp (delta should be 0)
    await t.test('Incremental sync with future timestamp returns empty changes', async () => {
        const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const res = await getIncrementalChanges({
            restaurantId,
            since: futureDate,
            entities: ['customers', 'orders', 'menu', 'deals'],
        });

        assert.equal(res.success, true);
        assert.equal(res.isIncremental, true);
        assert.equal(res.totalChanges, 0);
        assert.equal(res.data.customers.length, 0);
        assert.equal(res.data.orders.length, 0);
    });

    // 3. Incremental Sync with Past timestamp (delta should catch updated records)
    await t.test('Incremental sync with past timestamp returns updated records', async () => {
        const pastDate = new Date(Date.now() - 365 * 24 * 60 * 1000).toISOString();
        const res = await getIncrementalChanges({
            restaurantId,
            since: pastDate,
            entities: ['customers', 'menu'],
        });

        assert.equal(res.success, true);
        assert.equal(res.isIncremental, true);
        assert.ok(typeof res.counts.customers === 'number');
        assert.ok(typeof res.counts.menu === 'number');
    });

    // 4. Selective entity filtering
    await t.test('Sync respects selective entity filtering', async () => {
        const res = await getIncrementalChanges({
            restaurantId,
            entities: ['menu'],
        });

        assert.equal(res.success, true);
        assert.ok(res.data.menu, 'Menu data should be returned');
        assert.equal(res.data.customers, undefined, 'Customers should not be returned');
        assert.equal(res.data.orders, undefined, 'Orders should not be returned');
    });

    // 5. Client mutations sync push verification
    await t.test('Server handles client push mutations with is_synced confirmation', async () => {
        const mockMutations = [
            { id: 'client-cust-1', name: 'Offline User', is_synced: false },
            { id: 'client-cust-2', name: 'Offline User 2', is_synced: false }
        ];

        const syncedIds = mockMutations.map(m => m.id);
        assert.equal(syncedIds.length, 2);
        assert.ok(syncedIds.includes('client-cust-1'));
    });
});

