import test from 'node:test';
import assert from 'node:assert/strict';
import { getDbClient } from '../src/db/client.js';
import { getDefaultRestaurantId } from '../src/services/restaurantService.js';
import { getIncrementalChanges, processClientMutations, LIVE_ONLY_MODULES } from '../src/services/syncService.js';

test('─── CC Bot with Sync: Enterprise Multi-Module Synchronization Tests ───', async (t) => {
    const prisma = getDbClient();
    if (!prisma) {
        console.log('Skipping tests: DB client not available');
        return;
    }

    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch (e) {
        console.log('Skipping DB tests (DB unreachable):', e.message);
        return;
    }

    const restaurantId = await getDefaultRestaurantId();

    // ── 1. Master/Lookups Sync (Products, Categories, Deals, Settings, FAQs) ──
    await t.test('1. Sync Master/Lookups Data (Products, Categories, Deals, Settings, FAQs)', async () => {
        const res = await getIncrementalChanges({
            restaurantId,
            entities: ['menu', 'categories', 'deals', 'settings', 'faqs']
        });

        assert.equal(res.success, true);
        assert.ok(Array.isArray(res.data.menu), 'Menu products should be returned');
        assert.ok(Array.isArray(res.data.categories), 'Categories should be returned');
        assert.ok(Array.isArray(res.data.deals), 'Deals should be returned');
        assert.ok(Array.isArray(res.data.faqs), 'FAQs should be returned');
        assert.ok(res.data.settings, 'Restaurant settings should be returned');
        assert.equal(res.data.settings.is_synced, true);
    });

    // ── 2. User Dashboard & Profile Stats Snapshot ───────────────────────────
    await t.test('2. Sync User Dashboard Stats Snapshot', async () => {
        const res = await getIncrementalChanges({
            restaurantId,
            entities: ['dashboard']
        });

        assert.equal(res.success, true);
        assert.ok(res.data.dashboard, 'Dashboard stats should be returned');
        assert.ok(typeof res.data.dashboard.totalOrders === 'number');
        assert.ok(typeof res.data.dashboard.totalSales === 'number');
        assert.equal(res.data.dashboard.is_synced, true);
    });

    // ── 3. Operational Orders Delta Sync (Past orders & invoice details) ─────
    await t.test('3. Operational Orders Delta Sync with last_sync_time', async () => {
        const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const res = await getIncrementalChanges({
            restaurantId,
            since: futureDate,
            entities: ['orders']
        });

        assert.equal(res.success, true);
        assert.equal(res.isIncremental, true);
        assert.equal(res.data.orders.length, 0, 'No orders modified in the future');
    });

    // ── 4. Offline Drafts & Pending Submissions Push ─────────────────────────
    await t.test('4. Process Client Offline Drafts & Mutations (is_synced: false -> true)', async () => {
        const clientMutations = [
            { id: 'draft-order-1', type: 'DRAFT_ORDER', is_synced: false },
            { id: 'draft-note-2', type: 'CUSTOMER_NOTE', is_synced: false }
        ];

        const res = await processClientMutations({
            restaurantId,
            mutations: clientMutations
        });

        assert.equal(res.success, true);
        assert.equal(res.processedCount, 2);
        assert.deepEqual(res.syncedIds, ['draft-order-1', 'draft-note-2']);
    });

    // ── 5. Strict Guardrail: Live-Only Modules (Payments & Security) ──────────
    await t.test('5. Security Guardrail: Prohibited sync for payments and security actions', () => {
        assert.ok(LIVE_ONLY_MODULES.includes('auth'), 'Auth must be live-only');
        assert.ok(LIVE_ONLY_MODULES.includes('passwords'), 'Passwords must be live-only');
        assert.ok(LIVE_ONLY_MODULES.includes('payments'), 'Payments must be live-only');
        assert.ok(LIVE_ONLY_MODULES.includes('otp'), 'OTP must be live-only');
    });
});
