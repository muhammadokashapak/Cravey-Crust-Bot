/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   Phase 5: WhatsApp Ordering Orchestrator Tests              ║
 * ║   tests/phase5_orchestrator.test.js                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import assert from 'assert';
import { describe, it, before, after } from 'node:test';
import { getDbClient } from '../src/db/client.js';
import { getDefaultRestaurantId } from '../src/services/restaurantService.js';
import { handleIncomingOrderMessage } from '../src/services/whatsappOrderOrchestrator.js';
import { registerSocketResolver, sendAdminNewOrderNotification, sendCustomerOrderStatusNotification } from '../src/services/whatsappNotificationService.js';
import { updateOrderStatus } from '../src/services/orderService.js';
import { getOrCreateSession } from '../src/services/sessionService.js';

describe('Phase 5: WhatsApp Ordering Orchestrator & E2E Flow', () => {
    let prisma;
    let restaurantId;
    let testCategory;
    let testItem;
    let testVariantItem;
    let testVariants = [];
    let testDeal;
    let testDeliveryArea;
    let testFaqCategory;
    let testFaq;

    // Mock WhatsApp socket recorder
    const sentMessages = [];
    const mockSocket = {
        sendMessage: async (jid, content, options) => {
            sentMessages.push({ jid, content, options });
            return { key: { id: `mock_sent_${Date.now()}` } };
        },
    };

    before(async () => {
        prisma = getDbClient();
        assert.ok(prisma, 'Prisma client must be available');
        restaurantId = await getDefaultRestaurantId();

        // Register mock socket with notification service
        registerSocketResolver(() => mockSocket);

        // Update restaurant settings for test
        await prisma.restaurant.update({
            where: { id: restaurantId },
            data: {
                name: 'Cravey Crust Test',
                cod_enabled: true,
                easypaisa_enabled: true,
                admin_notification_phone: '923001234567',
            },
        });

        // 1. Seed Category & Items
        testCategory = await prisma.category.create({
            data: {
                restaurant_id: restaurantId,
                name: 'Fast Food P5',
                slug: `fast-food-p5-${Date.now()}`,
                is_active: true,
            },
        });

        testItem = await prisma.menuItem.create({
            data: {
                restaurant_id: restaurantId,
                category_id: testCategory.id,
                name: 'P5 Crispy Zinger',
                slug: `p5-crispy-zinger-${Date.now()}`,
                base_price: 550,
                is_active: true,
                is_available: true,
            },
        });

        testVariantItem = await prisma.menuItem.create({
            data: {
                restaurant_id: restaurantId,
                category_id: testCategory.id,
                name: 'P5 Supreme Pizza',
                slug: `p5-supreme-pizza-${Date.now()}`,
                base_price: 800,
                is_active: true,
                is_available: true,
            },
        });

        const vSmall = await prisma.menuVariant.create({
            data: {
                menu_item_id: testVariantItem.id,
                name: 'Small',
                price: 700,
                is_available: true,
                sort_order: 1,
            },
        });
        const vLarge = await prisma.menuVariant.create({
            data: {
                menu_item_id: testVariantItem.id,
                name: 'Large',
                price: 1300,
                is_available: true,
                sort_order: 2,
            },
        });
        testVariants = [vSmall, vLarge];

        // 2. Seed Deal
        testDeal = await prisma.deal.create({
            data: {
                restaurant_id: restaurantId,
                name: 'P5 Super Feast Deal',
                slug: `p5-super-feast-${Date.now()}`,
                deal_price: 1200,
                is_active: true,
            },
        });
        await prisma.dealItem.create({
            data: {
                deal_id: testDeal.id,
                menu_item_id: testItem.id,
                quantity: 2,
            },
        });

        // 3. Seed Delivery Area
        testDeliveryArea = await prisma.deliveryArea.create({
            data: {
                restaurant_id: restaurantId,
                name: 'Ghauri Town P5',
                slug: `ghauri-town-p5-${Date.now()}`,
                delivery_fee: 60,
                minimum_order: 500,
                is_active: true,
                latitude: 33.6050,
                longitude: 73.1350,
                radius_km: 8.0,
            },
        });

        // 4. Seed FAQ
        testFaqCategory = await prisma.fAQCategory.create({
            data: {
                restaurant_id: restaurantId,
                name: 'Delivery FAQs P5',
                slug: `delivery-faqs-p5-${Date.now()}`,
                is_active: true,
            },
        });

        testFaq = await prisma.fAQ.create({
            data: {
                restaurant_id: restaurantId,
                category_id: testFaqCategory.id,
                question: 'Delivery kitni dair mein hoti hai?',
                answer: 'Hamari standard delivery 35 se 45 minute mein deliver ho jati hai.',
                keywords: ['delivery time', 'kitni dair', 'rider', 'timing'],
                is_active: true,
            },
        });
    });

    after(async () => {
        // Cleanup seeded data
        if (testFaq) await prisma.fAQ.deleteMany({ where: { id: testFaq.id } });
        if (testFaqCategory) await prisma.fAQCategory.deleteMany({ where: { id: testFaqCategory.id } });
        if (testDeliveryArea) await prisma.deliveryArea.deleteMany({ where: { id: testDeliveryArea.id } });
        if (testDeal) {
            await prisma.dealItem.deleteMany({ where: { deal_id: testDeal.id } });
            await prisma.deal.deleteMany({ where: { id: testDeal.id } });
        }
        if (testVariantItem) {
            await prisma.menuVariant.deleteMany({ where: { menu_item_id: testVariantItem.id } });
            await prisma.menuItem.deleteMany({ where: { id: testVariantItem.id } });
        }
        if (testItem) await prisma.menuItem.deleteMany({ where: { id: testItem.id } });
        if (testCategory) await prisma.category.deleteMany({ where: { id: testCategory.id } });
    });

    it('Greeting: returns greeting containing restaurant name', async () => {
        const res = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: '923001112233@s.whatsapp.net',
                messageId: `msg_${Date.now()}_1`,
                text: 'Hi',
                isGroup: false,
            },
        });

        assert.ok(res);
        assert.strictEqual(res.intent, 'GREETING');
        assert.ok(res.text.includes('Cravey Crust'));
        assert.ok(res.text.includes('Menu'));
    });

    it('Group chat exclusion: ignores messages sent in WhatsApp groups', async () => {
        const res = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: '123456789-group@g.us',
                messageId: `msg_${Date.now()}_group`,
                text: 'menu',
                isGroup: true,
            },
        });

        assert.strictEqual(res, null, 'Group messages should be completely ignored');
    });

    it('Menu request: category-first browsing returns active categories', async () => {
        const res = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: '923001112233@s.whatsapp.net',
                messageId: `msg_${Date.now()}_menu`,
                text: 'menu',
                isGroup: false,
            },
        });

        assert.ok(res);
        assert.strictEqual(res.intent, 'SHOW_MENU');
        assert.ok(res.text.includes('Fast Food P5'));
    });

    it('Category selection: shows available items in category', async () => {
        const res = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: '923001112233@s.whatsapp.net',
                messageId: `msg_${Date.now()}_cat`,
                text: testCategory.name,
                isGroup: false,
            },
        });

        assert.ok(res);
        assert.strictEqual(res.intent, 'SHOW_CATEGORY');
        assert.ok(res.text.includes('P5 Crispy Zinger'));
    });

    it('Deals request: returns active deals', async () => {
        const res = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: '923001112233@s.whatsapp.net',
                messageId: `msg_${Date.now()}_deals`,
                text: 'deals',
                isGroup: false,
            },
        });

        assert.ok(res);
        assert.strictEqual(res.intent, 'SHOW_DEALS');
        assert.ok(res.text.includes('P5 Super Feast Deal'));
    });

    it('FAQ / Knowledge Base: exact question returns FAQ answer', async () => {
        const res = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: '923001112233@s.whatsapp.net',
                messageId: `msg_${Date.now()}_faq1`,
                text: 'Delivery kitni dair mein hoti hai?',
                isGroup: false,
            },
        });

        assert.ok(res);
        assert.strictEqual(res.intent, 'FAQ_QUERY');
        assert.ok(res.text.includes('35 se 45 minute'));
    });

    it('FAQ / Knowledge Base: Roman Urdu / typo returns FAQ answer', async () => {
        const res = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: '923001112233@s.whatsapp.net',
                messageId: `msg_${Date.now()}_faq2`,
                text: 'delvery kitni dair lagti hai?',
                isGroup: false,
            },
        });

        assert.ok(res);
        assert.strictEqual(res.intent, 'FAQ_QUERY');
        assert.ok(res.text.includes('35 se 45 minute'));
    });

    it('FAQ Fallback: no-match returns safe fallback without fabricating', async () => {
        const res = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: '923001112233@s.whatsapp.net',
                messageId: `msg_${Date.now()}_faq3`,
                text: 'kya spaceship available hai?',
                isGroup: false,
            },
        });

        assert.ok(res);
        assert.strictEqual(res.intent, 'FAQ_QUERY');
        assert.ok(res.text.includes('Sorry, mere paas is sawal ka confirmed answer available nahi hai.'));
    });

    it('Add item: item without variants added directly to cart', async () => {
        const res = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: '923001112233@s.whatsapp.net',
                messageId: `msg_${Date.now()}_add1`,
                text: '2 P5 Crispy Zinger',
                isGroup: false,
            },
        });

        assert.ok(res);
        assert.strictEqual(res.intent, 'ADD_ITEM');
        assert.ok(res.text.includes('Added to Cart'));
        assert.ok(res.text.includes('2x P5 Crispy Zinger'));
    });

    it('Variant flow: item requiring variant prompts for size, then adds upon choice', async () => {
        const testUserChatId = `test_var_${Date.now()}@s.whatsapp.net`;

        // 1. Request item that has variants
        const resPrompt = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: testUserChatId,
                messageId: `msg_${Date.now()}_v1`,
                text: '1 P5 Supreme Pizza',
                isGroup: false,
            },
        });

        assert.ok(resPrompt);
        assert.ok(resPrompt.text.includes('P5 Supreme Pizza'));
        assert.ok(resPrompt.text.includes('Small'));
        assert.ok(resPrompt.text.includes('Large'));

        // 2. Reply with variant selection "Large"
        const resChosen = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: testUserChatId,
                messageId: `msg_${Date.now()}_v2`,
                text: 'Large',
                isGroup: false,
            },
        });

        assert.ok(resChosen);
        assert.ok(resChosen.text.includes('Added to Cart!'));
        assert.ok(resChosen.text.includes('Large'));
    });

    it('Cart management: show cart, change quantity, remove item, clear cart', async () => {
        const testCartUser = `test_cart_${Date.now()}@s.whatsapp.net`;

        // Add 1 item
        await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: testCartUser,
                messageId: `msg_${Date.now()}_c1`,
                text: '2 P5 Crispy Zinger',
                isGroup: false,
            },
        });

        // Show cart
        const resShow = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: testCartUser,
                messageId: `msg_${Date.now()}_c2`,
                text: 'cart',
                isGroup: false,
            },
        });
        assert.ok(resShow.text.includes('Your Cart'));
        assert.ok(resShow.text.includes('2x P5 Crispy Zinger'));

        // Change quantity to 3
        const resQty = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: testCartUser,
                messageId: `msg_${Date.now()}_c3`,
                text: 'change P5 Crispy Zinger to 3',
                isGroup: false,
            },
        });
        assert.ok(resQty.text.includes('update ho kar 3'));

        // Remove item
        const resRem = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: testCartUser,
                messageId: `msg_${Date.now()}_c4`,
                text: 'remove P5 Crispy Zinger',
                isGroup: false,
            },
        });
        assert.ok(resRem.text.includes('remove kar diya gaya'));

        // Clear cart
        const resClear = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: testCartUser,
                messageId: `msg_${Date.now()}_c5`,
                text: 'clear cart',
                isGroup: false,
            },
        });
        assert.ok(resClear.text.includes('cart clear'));
    });

    it('Full Checkout & Order Flow: from checkout to explicit confirmation', async () => {
        const customerChatId = `test_cust_${Date.now()}@s.whatsapp.net`;
        const testVerifiedPhone = '923331112233';

        // 1. Add item to cart
        await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: customerChatId,
                messageId: `msg_${Date.now()}_e1`,
                text: '2 P5 Crispy Zinger',
                isGroup: false,
            },
        });

        // 2. Checkout
        const resCheckout = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: customerChatId,
                messageId: `msg_${Date.now()}_e2`,
                text: 'checkout',
                isGroup: false,
            },
        });
        assert.strictEqual(resCheckout.stage, 'WAITING_NAME');
        assert.ok(resCheckout.text.includes('Naam'));

        // 3. Provide Name
        const resName = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: customerChatId,
                messageId: `msg_${Date.now()}_e3`,
                text: 'Ali Haider',
                isGroup: false,
            },
        });
        assert.strictEqual(resName.stage, 'WAITING_CONTACT');
        assert.ok(resName.text.includes('Ali Haider'));
        assert.ok(resName.text.includes('same number'));

        // 4. Same WhatsApp Number (tested with phoneVerified = true)
        const resContact = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: customerChatId,
                messageId: `msg_${Date.now()}_e4`,
                text: 'same number',
                verifiedPhone: testVerifiedPhone,
                phoneVerified: true,
                isGroup: false,
            },
        });
        assert.strictEqual(resContact.stage, 'WAITING_LOCATION');
        assert.ok(resContact.text.includes(testVerifiedPhone));

        // 5. Provide Location: Out of range rejection test
        const resOutOfRange = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: customerChatId,
                messageId: `msg_${Date.now()}_e5a`,
                text: 'Karachi Clifton',
                isGroup: false,
            },
        });
        assert.strictEqual(resOutOfRange.stage, 'WAITING_LOCATION');
        // Exact wording requirement 29
        assert.ok(resOutOfRange.text.includes('Sorry, ye location hamari current delivery range mein nahi aati, is liye yahan delivery possible nahi hai.'));

        // 6. Provide Valid Location: Ghauri Town P5
        const resValidLoc = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: customerChatId,
                messageId: `msg_${Date.now()}_e5b`,
                text: testDeliveryArea.name,
                isGroup: false,
            },
        });
        assert.strictEqual(resValidLoc.stage, 'WAITING_PAYMENT');
        assert.ok(resValidLoc.text.includes(testDeliveryArea.name));
        assert.ok(resValidLoc.text.includes('COD'));

        // 7. Select Payment: COD
        const resPayment = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: customerChatId,
                messageId: `msg_${Date.now()}_e6`,
                text: 'COD',
                isGroup: false,
            },
        });
        assert.strictEqual(resPayment.stage, 'WAITING_ORDER_CONFIRMATION');
        assert.ok(resPayment.text.includes('Order Summary'));
        assert.ok(resPayment.text.includes('Ali Haider'));
        assert.ok(resPayment.text.includes(testDeliveryArea.name));
        assert.ok(resPayment.text.includes('Yes'));

        // 8. Explicit Confirmation Gate: Test Negative Decline First
        // (Simulate decline on another session)
        const declineChatId = `test_decline_${Date.now()}@s.whatsapp.net`;
        await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: declineChatId,
                messageId: `msg_${Date.now()}_d1`,
                text: '1 P5 Crispy Zinger',
                isGroup: false,
            },
        });
        await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: declineChatId,
                messageId: `msg_${Date.now()}_d2`,
                text: 'checkout',
                isGroup: false,
            },
        });
        await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: declineChatId,
                messageId: `msg_${Date.now()}_d3`,
                text: 'Hamza',
                isGroup: false,
            },
        });
        await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: declineChatId,
                messageId: `msg_${Date.now()}_d4`,
                text: '03009988776',
                isGroup: false,
            },
        });
        await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: declineChatId,
                messageId: `msg_${Date.now()}_d5`,
                text: testDeliveryArea.name,
                isGroup: false,
            },
        });
        await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: declineChatId,
                messageId: `msg_${Date.now()}_d6`,
                text: 'COD',
                isGroup: false,
            },
        });
        const resDecline = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: declineChatId,
                messageId: `msg_${Date.now()}_d7`,
                text: 'No',
                isGroup: false,
            },
        });
        assert.strictEqual(resDecline.stage, 'START');
        assert.ok(resDecline.text.includes('Order cancel kar diya gaya'));

        // 9. Positive Confirmation on Main Test Customer
        const resConfirm = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: customerChatId,
                messageId: `msg_${Date.now()}_e7`,
                text: 'Yes',
                isGroup: false,
            },
        });

        assert.strictEqual(resConfirm.stage, 'ORDER_CONFIRMED');
        assert.ok(resConfirm.text.includes('Order Confirmed'));
        assert.ok(resConfirm.text.includes('#CC-'));

        // Extract created order number
        const orderNumMatch = resConfirm.text.match(/#CC-\d{6}/);
        assert.ok(orderNumMatch);
        const orderNumber = orderNumMatch[0].replace('#', '');

        // 10. Check Admin Notification was dispatched
        await new Promise(r => setTimeout(r, 100));
        const adminMsg = sentMessages.find(m => m.content?.text?.includes('New Order Received'));
        assert.ok(adminMsg, 'Admin WhatsApp message must be recorded');
        assert.ok(adminMsg.content.text.includes(orderNumber));
        assert.ok(adminMsg.content.text.includes('Ali Haider'));

        // 11. Order Status Query: customer asks for order status
        const resStatus = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: customerChatId,
                messageId: `msg_${Date.now()}_e8`,
                text: `status ${orderNumber}`,
                isGroup: false,
            },
        });
        assert.ok(resStatus.text.includes(orderNumber));
        assert.ok(resStatus.text.includes('CONFIRMED') || resStatus.text.includes('Confirmed'));

        // 12. Customer Status Notifications upon admin status updates
        sentMessages.length = 0; // reset recorder
        await updateOrderStatus({
            restaurantId,
            orderNumber,
            newStatus: 'PREPARING',
        });
        const custPrepMsg = sentMessages.find(m => m.content?.text?.includes('prepare ho raha hai'));
        assert.ok(custPrepMsg, 'Customer notification for PREPARING should be sent');

        // 13. Two-Step Cancellation Flow
        // Step 1: Request cancel
        const resCancelReq = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: customerChatId,
                messageId: `msg_${Date.now()}_can1`,
                text: `cancel ${orderNumber}`,
                isGroup: false,
            },
        });
        assert.strictEqual(resCancelReq.stage, 'WAITING_CANCEL_CONFIRMATION');
        assert.ok(resCancelReq.text.includes('cancel karna chahte hain'));

        // Step 2a: Abort cancellation with "No"
        const resCancelAbort = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: customerChatId,
                messageId: `msg_${Date.now()}_can2`,
                text: 'No',
                isGroup: false,
            },
        });
        assert.strictEqual(resCancelAbort.stage, 'START');
        assert.ok(resCancelAbort.text.includes('active rakha gaya hai'));

        // Step 2b: Request cancel again and confirm with "Yes"
        await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: customerChatId,
                messageId: `msg_${Date.now()}_can3`,
                text: `cancel ${orderNumber}`,
                isGroup: false,
            },
        });
        const resCancelDone = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: customerChatId,
                messageId: `msg_${Date.now()}_can4`,
                text: 'Yes',
                isGroup: false,
            },
        });
        assert.strictEqual(resCancelDone.stage, 'CANCELLED');
        assert.ok(resCancelDone.text.includes('cancel kar diya gaya'));
    });

    it('Message deduplication: repeated message ID is safely ignored', async () => {
        const uniqueMsgId = `dup_test_${Date.now()}`;
        const res1 = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: '923009999999@s.whatsapp.net',
                messageId: uniqueMsgId,
                text: 'menu',
                isGroup: false,
            },
        });
        assert.ok(res1);

        // Immediate duplicate
        const res2 = await handleIncomingOrderMessage({
            sock: mockSocket,
            normalizedMessage: {
                chatId: '923009999999@s.whatsapp.net',
                messageId: uniqueMsgId,
                text: 'menu',
                isGroup: false,
            },
        });
        assert.strictEqual(res2, null, 'Duplicate message should be ignored');
    });

    it('Notification safety: socket failure does NOT throw or rollback order', async () => {
        const brokenSocket = {
            sendMessage: async () => {
                throw new Error('Network connection terminated');
            },
        };

        const res = await sendAdminNewOrderNotification({
            order: { order_number: 'CC-999999', final_total: 1000 },
            sock: brokenSocket,
        });

        assert.strictEqual(res.success, false);
        assert.ok(res.error);
    });

    it('Customer status notifications: handles READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED', async () => {
        sentMessages.length = 0;
        const testOrder = {
            orderNumber: 'CC-888888',
            phone: '03001234567',
        };

        await sendCustomerOrderStatusNotification({ order: testOrder, newStatus: 'READY', sock: mockSocket });
        const readyMsg = sentMessages.find(m => m.content?.text?.includes('ready hai'));
        assert.ok(readyMsg, 'READY notification must be formatted correctly');

        await sendCustomerOrderStatusNotification({ order: testOrder, newStatus: 'OUT_FOR_DELIVERY', sock: mockSocket });
        const outMsg = sentMessages.find(m => m.content?.text?.includes('delivery rider'));
        assert.ok(outMsg, 'OUT_FOR_DELIVERY notification must be formatted correctly');

        await sendCustomerOrderStatusNotification({ order: testOrder, newStatus: 'DELIVERED', sock: mockSocket });
        const delMsg = sentMessages.find(m => m.content?.text?.includes('deliver ho gaya'));
        assert.ok(delMsg, 'DELIVERED notification must be formatted correctly');

        await sendCustomerOrderStatusNotification({ order: testOrder, newStatus: 'CANCELLED', reason: 'Customer requested', sock: mockSocket });
        const canMsg = sentMessages.find(m => m.content?.text?.includes('cancel kar diya gaya'));
        assert.ok(canMsg, 'CANCELLED notification must be formatted correctly');
    });

    after(async () => {
        // Clean up test customer and order data
        const testPhones = ['923331112233', '03009988776', '923009999999', '923001234567'];
        const testOrders = await prisma.order.findMany({
            where: { phone: { in: testPhones } },
            select: { id: true },
        });
        const orderIds = testOrders.map(o => o.id);
        if (orderIds.length > 0) {
            await prisma.orderStatusHistory.deleteMany({ where: { order_id: { in: orderIds } } });
            await prisma.orderItem.deleteMany({ where: { order_id: { in: orderIds } } });
            await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
        }
        await prisma.cartItem.deleteMany({
            where: { cart: { session: { chat_id: { startsWith: 'test_' } } } },
        });
        await prisma.cart.deleteMany({
            where: { session: { chat_id: { startsWith: 'test_' } } },
        });
        await prisma.conversationSession.deleteMany({
            where: { chat_id: { startsWith: 'test_' } },
        });
        await prisma.customer.deleteMany({ where: { phone: { in: testPhones } } });

        // Clean up test menu data
        if (testFaq) await prisma.fAQ.delete({ where: { id: testFaq.id } }).catch(() => {});
        if (testFaqCategory) await prisma.fAQCategory.delete({ where: { id: testFaqCategory.id } }).catch(() => {});
        if (testDeal) {
            await prisma.dealItem.deleteMany({ where: { deal_id: testDeal.id } });
            await prisma.deal.delete({ where: { id: testDeal.id } }).catch(() => {});
        }
        if (testDeliveryArea) await prisma.deliveryArea.delete({ where: { id: testDeliveryArea.id } }).catch(() => {});
        if (testVariants.length) await prisma.menuVariant.deleteMany({ where: { menu_item_id: testVariantItem.id } });
        if (testVariantItem) await prisma.menuItem.delete({ where: { id: testVariantItem.id } }).catch(() => {});
        if (testItem) await prisma.menuItem.delete({ where: { id: testItem.id } }).catch(() => {});
        if (testCategory) await prisma.category.delete({ where: { id: testCategory.id } }).catch(() => {});
    });
});
