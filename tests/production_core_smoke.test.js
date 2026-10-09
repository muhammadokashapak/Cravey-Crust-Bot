/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   Production Core Smoke Test                                 ║
 * ║   tests/production_core_smoke.test.js                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Direct local/backend smoke test without n8n:
 *  1. Hi
 *  2. Menu
 *  3. Premium Pizza (Category)
 *  4. Chicken Extreme (Menu item)
 *  5. Large (Variant selection)
 *  6. Cart
 *  7. Deals
 *  8. Promo query
 *  9. FAQ query (Restaurant timings)
 * 10. Checkout
 * 11. Location
 * 12. Payment (COD)
 * 13. Order confirmation
 * 14. Order status
 *
 * Verifies all values come from current database/settings.
 */

import assert from 'assert';
import { describe, it, before, after } from 'node:test';
import { getDbClient } from '../src/db/client.js';
import { getDefaultRestaurantId } from '../src/services/restaurantService.js';
import { handleIncomingOrderMessage } from '../src/services/whatsappOrderOrchestrator.js';
import { registerSocketResolver } from '../src/services/whatsappNotificationService.js';
import { isN8nActive } from '../utils/n8nBridge.js';

describe('Production Core WhatsApp Smoke Test (No n8n)', () => {
    let prisma;
    let restaurantId;
    const testJid = `92333${Date.now().toString().slice(-7)}@s.whatsapp.net`;
    const sentReplies = [];

    const mockSock = {
        sendMessage: async (jid, content) => {
            sentReplies.push({ jid, text: content?.text || '' });
            return { key: { id: `smoke_msg_${Date.now()}` } };
        },
    };

    function getLastReply() {
        return sentReplies[sentReplies.length - 1]?.text || '';
    }

    async function sendMsg(text) {
        return await handleIncomingOrderMessage({
            sock: mockSock,
            session: { id: 'primary' },
            normalizedMessage: {
                chatId: testJid,
                messageId: `smoke_${Date.now()}_${Math.random()}`,
                text,
                verifiedPhone: testJid.replace('@s.whatsapp.net', ''),
                phoneVerified: true,
                isGroup: false,
                pushName: 'Smoke Test Customer',
            },
        });
    }

    before(async () => {
        prisma = getDbClient();
        assert.ok(prisma, 'Prisma client must be active');
        restaurantId = await getDefaultRestaurantId();
        await prisma.restaurant.update({
            where: { id: restaurantId },
            data: {
                name: 'Cravey Crust',
                opening_time: '16:00',
                closing_time: '02:00',
                cod_enabled: true,
                easypaisa_enabled: true,
            },
        });
        registerSocketResolver(() => mockSock);
    });

    after(async () => {
        // Cleanup test customer cart and orders created during smoke test
        if (prisma) {
            const customer = await prisma.customer.findFirst({
                where: { whatsapp_phone: testJid.replace('@s.whatsapp.net', '') },
                include: { orders: true, carts: true },
            });
            if (customer) {
                for (const order of customer.orders) {
                    await prisma.orderItem.deleteMany({ where: { order_id: order.id } });
                    await prisma.orderStatusHistory.deleteMany({ where: { order_id: order.id } });
                    await prisma.order.delete({ where: { id: order.id } });
                }
                for (const cart of customer.carts) {
                    await prisma.cartItem.deleteMany({ where: { cart_id: cart.id } });
                    await prisma.cart.delete({ where: { id: cart.id } });
                }
                await prisma.customer.delete({ where: { id: customer.id } });
            }
        }
    });

    it('Step 0: Verify n8n is completely disabled', () => {
        assert.strictEqual(isN8nActive(), false, 'n8n must report inactive');
    });

    it('Step 1: Greeting "Hi" receives welcome and menu options', async () => {
        const res = await sendMsg('Hi');
        assert.ok(res, 'Must return a response object');
        const reply = res?.text || getLastReply();
        assert.ok(reply.includes('Cravey Crust'), 'Greeting must welcome customer to Cravey Crust');
        assert.ok(reply.toLowerCase().includes('menu'), 'Greeting must prompt for Menu');
    });

    it('Step 2: "Menu" retrieves live categories from database', async () => {
        const res = await sendMsg('Menu');
        assert.ok(res, 'Must return a response object');
        const reply = res?.text || getLastReply();
        assert.ok(reply.includes('Menu'), 'Should display menu header');
        assert.ok(reply.includes('Premium Pizza') || reply.includes('Pizza'), 'Must list category from database');
    });

    it('Step 3: "Premium Pizza" retrieves category items with live prices', async () => {
        const res = await sendMsg('Premium Pizza');
        assert.ok(res, 'Must return a response object');
        const reply = res?.text || getLastReply();
        assert.ok(reply.includes('Chicken Extreme'), 'Category must list Chicken Extreme');
    });

    it('Step 4: "Chicken Extreme" identifies item and prompts for variant selection', async () => {
        const res = await sendMsg('Chicken Extreme');
        assert.ok(res, 'Must return a response object');
        const reply = res?.text || getLastReply();
        assert.ok(reply.includes('Chicken Extreme'), 'Must show item title');
        assert.ok(reply.includes('Large'), 'Must present Large variant');
    });

    it('Step 5: "Large" selects variant (Rs. 1799) and adds to cart', async () => {
        const res = await sendMsg('Large');
        assert.ok(res, 'Must return a response object');
        const reply = res?.text || getLastReply();
        assert.ok(reply.includes('Cart') || reply.includes('Chicken Extreme'), 'Item added to cart');
        assert.ok(reply.includes('1,799') || reply.includes('1799'), 'Price must match database variant price (1799)');
    });

    it('Step 6: "Cart" shows cart contents and correct subtotal', async () => {
        const res = await sendMsg('Cart');
        assert.ok(res, 'Must return a response object');
        const reply = res?.text || getLastReply();
        assert.ok(reply.includes('Cart'), 'Must show cart header');
        assert.ok(reply.includes('Chicken Extreme'), 'Must list Chicken Extreme in cart');
        assert.ok(reply.includes('1799') || reply.includes('1,799'), 'Subtotal must reflect Large Chicken Extreme');
    });

    it('Step 7: "Deals" queries live deals from database', async () => {
        const res = await sendMsg('Deals');
        assert.ok(res, 'Must return a response object');
        const reply = res?.text || getLastReply();
        assert.ok(reply.includes('Deal') || reply.includes('deals'), 'Must return deals');
    });

    it('Step 8: Promo query responds with live promo info from database', async () => {
        const res = await sendMsg('kya koi discount ya promo hai');
        assert.ok(res, 'Must return a response object');
        const reply = res?.text || getLastReply();
        assert.ok(reply.length > 0, 'Must respond to promo inquiry');
    });

    it('Step 9: FAQ query "restaurant timing kya hai" resolves from Settings Priority 1', async () => {
        const res = await sendMsg('restaurant timing kya hai');
        assert.ok(res, 'Must return a response object');
        const reply = res?.text || getLastReply();
        assert.ok(reply.includes('4:00 PM') && reply.includes('2:00 AM'), 'Must return 4:00 PM to 2:00 AM timing from Settings');
    });

    let checkoutOrderNumber = null;

    it('Step 10: "Checkout" initiates checkout stage and prompts for name', async () => {
        const res = await sendMsg('Checkout');
        assert.ok(res, 'Must return a response object');
        const reply = res?.text || getLastReply();
        assert.strictEqual(res.stage, 'WAITING_NAME');
        assert.ok(reply.includes('Naam') || reply.includes('Name'), 'Must prompt for name');
    });

    it('Step 11: Customer provides Name and Contact Number', async () => {
        const resName = await sendMsg('Muhammad Ali');
        assert.ok(resName, 'Must accept name');
        assert.strictEqual(resName.stage, 'WAITING_CONTACT');

        const resContact = await sendMsg('same number');
        assert.ok(resContact, 'Must accept same number');
        assert.strictEqual(resContact.stage, 'WAITING_LOCATION');
    });

    it('Step 12: Location input receives and validates delivery area', async () => {
        const res = await sendMsg('Phase 4B Ghauri Town Islamabad');
        assert.ok(res, 'Must return response for location');
        const reply = res?.text || getLastReply();
        assert.strictEqual(res.stage, 'WAITING_PAYMENT');
        assert.ok(reply.includes('Payment') || reply.includes('COD'), 'Must prompt for payment method');
    });

    it('Step 13: Payment input "COD" presents order summary and asks confirmation', async () => {
        const res = await sendMsg('COD');
        assert.ok(res, 'Must return order summary');
        const reply = res?.text || getLastReply();
        assert.strictEqual(res.stage, 'WAITING_ORDER_CONFIRMATION');
        assert.ok(reply.includes('Chicken Extreme'), 'Order summary must include item');
        assert.ok(reply.includes('confirm'), 'Must ask for explicit confirmation');
    });

    it('Step 14: Order confirmation "confirm" creates order in database', async () => {
        const res = await sendMsg('confirm');
        assert.ok(res, 'Must return order confirmation');
        const reply = res?.text || getLastReply();
        assert.ok(reply.includes('Confirmed') || reply.includes('Order'), 'Must confirm order');
        const match = reply.match(/(CC-\d+)/);
        assert.ok(match, 'Must generate order number matching CC-XXXXXX');
        checkoutOrderNumber = match[1];

        // Check order in DB
        const dbOrder = await prisma.order.findUnique({
            where: { order_number: checkoutOrderNumber },
            include: { order_items: true },
        });
        assert.ok(dbOrder, 'Order must exist in PostgreSQL');
        assert.strictEqual(dbOrder.order_status, 'CONFIRMED');
        assert.strictEqual(dbOrder.order_items.length, 1);
        assert.strictEqual(Number(dbOrder.total), 1799);
    });

    it('Step 15: Order status query returns live order status from database', async () => {
        assert.ok(checkoutOrderNumber, 'Must have order number from previous step');
        const res = await sendMsg(`status ${checkoutOrderNumber}`);
        assert.ok(res, 'Must return status');
        const reply = res?.text || getLastReply();
        assert.ok(reply.includes(checkoutOrderNumber), 'Status reply must reference order number');
        assert.ok(reply.includes('CONFIRMED') || reply.includes('Receive'), 'Status reply must show CONFIRMED');
    });
});
