import test from 'node:test';
import assert from 'node:assert/strict';
import { getDbClient } from '../src/db/client.js';
import { getDefaultRestaurantId } from '../src/services/restaurantService.js';
import {
    getOrCreateCustomer,
    getCustomerById,
    listCustomers,
    deleteCustomer,
    deleteCustomerByPhone,
    bulkDeleteCustomers,
} from '../src/services/customerService.js';
import { parseIntent } from '../src/services/intentParser.js';
import { handleIncomingOrderMessage } from '../src/services/whatsappOrderOrchestrator.js';

test('─── Customer Data Deletion & Privacy Tests ───', async (t) => {
    const prisma = getDbClient();
    if (!prisma) {
        console.log('Skipping Customer Deletion DB tests: Database not connected');
        return;
    }

    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch (e) {
        console.log('Skipping Customer Deletion DB tests (DB unreachable):', e.message);
        return;
    }

    const restaurantId = await getDefaultRestaurantId();

    // ── 1. Intent Parsing for Self-Deletion ────────────────────────────
    await t.test('Intent Parser recognizes delete data phrases in English and Roman Urdu', () => {
        const testPhrases = [
            'delete my data',
            'delete data',
            'remove my data',
            'clear my data',
            'mera data delete kardo',
            'mera data delete karo',
            'mera data hata do',
            'mera record delete kardo',
            'delete account',
            'forget me',
        ];

        for (const phrase of testPhrases) {
            const res = parseIntent({ text: phrase });
            assert.equal(res.intent, 'DELETE_MY_DATA', `Failed for phrase: "${phrase}"`);
        }
    });

    // ── 2. CRUD & Listing Customers ──────────────────────────────────
    let testCustomer1;
    let testCustomer2;

    await t.test('Create and list customers via customerService', async () => {
        testCustomer1 = await getOrCreateCustomer({
            restaurantId,
            name: 'Ali Khan TestDelete',
            phone: '03001112233',
            whatsappPhone: '923001112233',
        });

        testCustomer2 = await getOrCreateCustomer({
            restaurantId,
            name: 'Bilal Ahmed TestDelete',
            phone: '03002223344',
            whatsappPhone: '923002223344',
        });

        assert.ok(testCustomer1.id);
        assert.ok(testCustomer2.id);

        const listRes = await listCustomers({
            restaurantId,
            search: 'TestDelete',
        });

        assert.ok(listRes.customers.length >= 2, 'Should find created test customers');
        const found = listRes.customers.find(c => c.id === testCustomer1.id);
        assert.ok(found);
        assert.equal(found.name, 'Ali Khan TestDelete');
    });

    // ── 3. Single Customer Deletion by ID ─────────────────────────────
    await t.test('deleteCustomer removes customer record and cleans sessions/carts', async () => {
        // Create a cart and session for testCustomer1
        const session = await prisma.conversationSession.create({
            data: {
                restaurant_id: restaurantId,
                session_key: 'test_session_del_1',
                chat_id: '923001112233@s.whatsapp.net',
                verified_phone: '923001112233',
                stage: 'START',
                expires_at: new Date(Date.now() + 60000),
            },
        });

        const cart = await prisma.cart.create({
            data: {
                restaurant_id: restaurantId,
                session_id: session.id,
                customer_id: testCustomer1.id,
                status: 'ACTIVE',
            },
        });

        const result = await deleteCustomer({
            restaurantId,
            customerId: testCustomer1.id,
            deleteOrders: false,
        });

        assert.equal(result.deleted, true);

        // Verify customer is deleted
        const checkCust = await prisma.customer.findUnique({
            where: { id: testCustomer1.id },
        });
        assert.equal(checkCust, null, 'Customer should be deleted from DB');

        // Verify session is cleaned up
        const checkSession = await prisma.conversationSession.findUnique({
            where: { id: session.id },
        });
        assert.equal(checkSession, null, 'Associated session should be deleted');

        // Verify cart is cleaned up
        const checkCart = await prisma.cart.findUnique({
            where: { id: cart.id },
        });
        assert.equal(checkCart, null, 'Associated cart should be deleted');
    });

    // ── 4. Customer Deletion by Phone (WhatsApp Bot Privacy Flow) ─────
    await t.test('deleteCustomerByPhone removes customer record using phone', async () => {
        const result = await deleteCustomerByPhone({
            restaurantId,
            phone: '03002223344',
            deleteOrders: false,
        });

        assert.equal(result.deleted, true);

        const checkCust = await prisma.customer.findUnique({
            where: { id: testCustomer2.id },
        });
        assert.equal(checkCust, null, 'Customer 2 should be deleted by phone');
    });

    // ── 5. Bulk Deletion ─────────────────────────────────────────────
    await t.test('bulkDeleteCustomers removes multiple customers by IDs', async () => {
        const c1 = await getOrCreateCustomer({
            restaurantId,
            name: 'Bulk Test 1',
            phone: '03110000001',
            whatsappPhone: '923110000001',
        });
        const c2 = await getOrCreateCustomer({
            restaurantId,
            name: 'Bulk Test 2',
            phone: '03110000002',
            whatsappPhone: '923110000002',
        });

        const bulkRes = await bulkDeleteCustomers({
            restaurantId,
            customerIds: [c1.id, c2.id],
            deleteOrders: false,
        });

        assert.equal(bulkRes.success, true);
        assert.equal(bulkRes.count, 2);

        const findC1 = await prisma.customer.findUnique({ where: { id: c1.id } });
        const findC2 = await prisma.customer.findUnique({ where: { id: c2.id } });
        assert.equal(findC1, null);
        assert.equal(findC2, null);
    });

    // ── 6. WhatsApp Orchestrator Self-Deletion Response ──────────────
    await t.test('handleIncomingOrderMessage executes DELETE_MY_DATA intent', async () => {
        const waPhone = '923450000000';
        const testUser = await getOrCreateCustomer({
            restaurantId,
            name: 'Self Delete User',
            phone: '03450000000',
            whatsappPhone: waPhone,
        });

        const res = await handleIncomingOrderMessage({
            normalizedMessage: {
                sessionId: 'primary',
                chatId: `${waPhone}@s.whatsapp.net`,
                messageId: `msg_${Date.now()}`,
                text: 'mera data delete kardo',
                verifiedPhone: waPhone,
                phoneVerified: true,
                isGroup: false,
            },
        });

        assert.ok(res);
        assert.equal(res.intent, 'DELETE_MY_DATA');
        assert.ok(res.text.includes('Data Deleted Successfully') || res.text.includes('ڈیٹا ڈیلیٹ'));

        // Customer record should now be deleted
        const check = await prisma.customer.findUnique({ where: { id: testUser.id } });
        assert.equal(check, null, 'Customer should be deleted after sending delete request');
    });

    // ── 7. Admin Customers Router HTTP Endpoints ──────────────────────
    await t.test('Admin Customers Router HTTP Endpoints: GET, GET/:id, DELETE', async () => {
        const express = (await import('express')).default;
        const adminCustomersRouter = (await import('../routes/admin/customers.js')).default;
        const app = express();
        app.use(express.json());
        app.use((req, res, next) => {
            req.user = { restaurantId };
            next();
        });
        app.use('/api/admin/customers', adminCustomersRouter);

        const server = app.listen(0);
        const port = server.address().port;

        try {
            // Create a customer to test API
            const testApiCust = await getOrCreateCustomer({
                restaurantId,
                name: 'API Delete Test',
                phone: '03339998877',
                whatsappPhone: '923339998877',
            });

            // GET /api/admin/customers
            const listRes = await fetch(`http://localhost:${port}/api/admin/customers?search=API%20Delete`);
            const listJson = await listRes.json();
            assert.equal(listJson.success, true);
            assert.ok(listJson.data.customers.length >= 1);

            // GET /api/admin/customers/:id
            const getRes = await fetch(`http://localhost:${port}/api/admin/customers/${testApiCust.id}`);
            const getJson = await getRes.json();
            assert.equal(getJson.success, true);
            assert.equal(getJson.data.id, testApiCust.id);

            // DELETE /api/admin/customers/:id
            const delRes = await fetch(`http://localhost:${port}/api/admin/customers/${testApiCust.id}`, { method: 'DELETE' });
            const delJson = await delRes.json();
            assert.equal(delJson.success, true);
            assert.equal(delJson.data.deleted, true);

            // Verify deleted
            const check = await prisma.customer.findUnique({ where: { id: testApiCust.id } });
            assert.equal(check, null);
        } finally {
            server.close();
        }
    });
});
