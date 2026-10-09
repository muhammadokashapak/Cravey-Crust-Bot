import test from 'node:test';
import assert from 'node:assert/strict';
import { getDbClient } from '../src/db/client.js';
import { getDefaultRestaurantId } from '../src/services/restaurantService.js';
import { getOrCreateCustomer, getCustomerByPhone } from '../src/services/customerService.js';
import { getOrCreateSession, updateSessionStage } from '../src/services/sessionService.js';
import {
    getActiveCart,
    addItemToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    calculateCartTotals,
} from '../src/services/cartService.js';
import {
    createOrder,
    getOrderByNumber,
    getOrdersByCustomerPhone,
    updateOrderStatus,
    requestOrderCancellation,
    confirmOrderCancellation,
    getAdminOrders,
    getAdminOrderMetrics,
} from '../src/services/orderService.js';
import { generateOrderNumber } from '../src/services/orderNumberService.js';

test('─── Phase 4: Database & Core Order Engine Integration Tests ───', async (t) => {
    const prisma = getDbClient();
    if (!prisma) {
        console.log('Skipping Phase 4 DB tests: Database not connected');
        return;
    }

    const restaurantId = await getDefaultRestaurantId();

    // Setup Category & Menu Items for testing
    const testCategory = await prisma.category.upsert({
        where: { restaurant_id_slug: { restaurant_id: restaurantId, slug: 'test-phase4-cat' } },
        update: { is_active: true },
        create: {
            restaurant_id: restaurantId,
            name: 'Phase 4 Test Cat',
            slug: 'test-phase4-cat',
            is_active: true,
        },
    });

    const testItem = await prisma.menuItem.upsert({
        where: { restaurant_id_slug: { restaurant_id: restaurantId, slug: 'phase4-test-burger' } },
        update: { base_price: 649, is_available: true, is_active: true },
        create: {
            restaurant_id: restaurantId,
            category_id: testCategory.id,
            name: 'Phase 4 Test Burger',
            slug: 'phase4-test-burger',
            base_price: 649,
            is_available: true,
            is_active: true,
        },
    });

    const testVariant = await prisma.menuVariant.create({
        data: {
            menu_item_id: testItem.id,
            name: 'Double Patty',
            price: 799,
            is_available: true,
        },
    });

    const testDeliveryArea = await prisma.deliveryArea.upsert({
        where: { restaurant_id_slug: { restaurant_id: restaurantId, slug: 'test-phase4-area' } },
        update: { delivery_fee: 150, is_active: true },
        create: {
            restaurant_id: restaurantId,
            name: 'Phase 4 Test Area',
            slug: 'test-phase4-area',
            delivery_fee: 150,
            is_active: true,
        },
    });

    // 1. Customer CRUD & Reuse
    await t.test('Customer CRUD: Create and reuse existing WhatsApp customer', async () => {
        const testWaPhone = '923001234567';
        const customer1 = await getOrCreateCustomer({
            restaurantId,
            name: 'Ali Test',
            phone: testWaPhone,
            whatsappPhone: testWaPhone,
        });

        assert.ok(customer1.id);
        assert.equal(customer1.whatsapp_phone, testWaPhone);
        assert.equal(customer1.name, 'Ali Test');

        // Reuse with same WhatsApp phone
        const customer2 = await getOrCreateCustomer({
            restaurantId,
            name: 'Ali Test Updated',
            whatsappPhone: testWaPhone,
        });

        assert.equal(customer2.id, customer1.id);
        assert.equal(customer2.name, 'Ali Test Updated');

        const fetched = await getCustomerByPhone({ restaurantId, phone: testWaPhone });
        assert.ok(fetched);
        assert.equal(fetched.id, customer1.id);
    });

    // 2. Session Lifecycle
    await t.test('Session Lifecycle: Create, stage transition, and touch', async () => {
        const sessionKey = `test_session_${Date.now()}`;
        const session = await getOrCreateSession({
            restaurantId,
            chatId: '923001234567@s.whatsapp.net',
            sessionKey,
            verifiedPhone: '923001234567',
            stage: 'START',
        });

        assert.ok(session.id);
        assert.equal(session.stage, 'START');
        assert.equal(session.verified_phone, '923001234567');

        const updated = await updateSessionStage({
            sessionKey,
            stage: 'BUILDING_CART',
        });
        assert.equal(updated.stage, 'BUILDING_CART');
    });

    // 3. Cart CRUD & Validation
    await t.test('Cart CRUD: Add item, variant, change quantity, and calculate totals', async () => {
        const sessionKey = `cart_test_${Date.now()}`;

        // Create & add base item
        const cart1 = await addItemToCart({
            sessionKey,
            restaurantId,
            menuItemId: testItem.id,
            quantity: 2,
        });

        assert.equal(cart1.items.length, 1);
        assert.equal(cart1.items[0].quantity, 2);

        // Add item with variant
        const cart2 = await addItemToCart({
            sessionKey,
            restaurantId,
            menuItemId: testItem.id,
            variantId: testVariant.id,
            quantity: 1,
        });

        assert.equal(cart2.items.length, 2);

        // Calculate totals
        const totals = await calculateCartTotals({
            sessionKey,
            restaurantId,
            deliveryAreaId: testDeliveryArea.id,
        });

        // 2 x 649 (1298) + 1 x 799 (799) = 2097 subtotal + 150 delivery = 2247
        assert.equal(totals.subtotal, 2097);
        assert.equal(totals.deliveryFee, 150);
        assert.equal(totals.total, 2247);

        // Update quantity
        const cartItemId = cart2.items[0].id;
        const cartUpdated = await updateCartItem({
            sessionKey,
            cartItemId,
            quantity: 3,
        });
        assert.equal(cartUpdated.items.find(i => i.id === cartItemId).quantity, 3);

        // Remove item
        const cartRemoved = await removeCartItem({
            sessionKey,
            cartItemId,
        });
        assert.equal(cartRemoved.items.length, 1);

        // Clear cart
        const cartCleared = await clearCart({ sessionKey });
        assert.equal(cartCleared.items.length, 0);
    });

    await t.test('Cart Validation: Reject unavailable item', async () => {
        const sessionKey = `cart_unavail_${Date.now()}`;
        const unavailableItem = await prisma.menuItem.create({
            data: {
                restaurant_id: restaurantId,
                category_id: testCategory.id,
                name: 'Unavailable Pizza',
                slug: `unavail-pizza-${Date.now()}`,
                base_price: 999,
                is_available: false,
            },
        });

        await assert.rejects(
            async () => {
                await addItemToCart({
                    sessionKey,
                    restaurantId,
                    menuItemId: unavailableItem.id,
                    quantity: 1,
                });
            },
            (err) => err.code === 'MENU_ITEM_UNAVAILABLE'
        );

        await prisma.menuItem.delete({ where: { id: unavailableItem.id } });
    });

    // 4. Concurrency-Safe Order Number Generation
    await t.test('Order Number: Concurrent generation produces 100% unique sequence numbers', async () => {
        const promises = [];
        for (let i = 0; i < 15; i++) {
            promises.push(generateOrderNumber({ prefix: 'CC' }));
        }

        const numbers = await Promise.all(promises);
        const uniqueSet = new Set(numbers);

        assert.equal(uniqueSet.size, 15, 'All concurrent order numbers must be unique');
        for (const num of numbers) {
            assert.match(num, /^CC-\d{6}$/, 'Order number must match CC-000000 format');
        }
    });

    // 5. Order Creation & Snapshots
    await t.test('Order Creation: Atomic transaction, snapshot preservation, and status history', async () => {
        const sessionKey = `order_test_${Date.now()}`;

        // Prepare cart with 2x Zinger @ 649
        await addItemToCart({
            sessionKey,
            restaurantId,
            menuItemId: testItem.id,
            quantity: 2,
        });

        const idempotencyKey = `idem_${Date.now()}`;
        const result = await createOrder({
            restaurantId,
            sessionKey,
            customerName: 'Ali Test Order',
            phone: '923001234567',
            contactNumberMode: 'provided',
            delivery: {
                address: 'House 1, Street 2, Ghauri Town',
                areaId: testDeliveryArea.id,
                areaName: 'Ghauri Town',
            },
            paymentMethod: 'COD',
            idempotencyKey,
        });

        assert.equal(result.status, 'ORDER_CREATED');
        assert.equal(result.isDuplicate, false);
        const order = result.order;

        assert.ok(order.orderNumber.startsWith('CC-'));
        assert.equal(order.customerName, 'Ali Test Order');
        assert.equal(order.pricing.subtotal, 1298);
        assert.equal(order.pricing.deliveryFee, 150);
        assert.equal(order.pricing.total, 1448);
        assert.equal(order.items.length, 1);
        assert.equal(order.items[0].unitPrice, 649);
        assert.equal(order.items[0].quantity, 2);
        assert.equal(order.items[0].lineTotal, 1298);
        assert.equal(order.statusHistory.length, 1);
        assert.equal(order.statusHistory[0].newStatus, 'CONFIRMED');

        // Test Historical Price Snapshot: Change base price in catalog
        await prisma.menuItem.update({
            where: { id: testItem.id },
            data: { base_price: 699 },
        });

        // Fetch old order -> Snapshot MUST still display 649
        const fetchedOrder = await getOrderByNumber({
            restaurantId,
            orderNumber: order.orderNumber,
        });
        assert.equal(fetchedOrder.items[0].unitPrice, 649, 'Historical unit price snapshot must remain 649');

        // Revert item price
        await prisma.menuItem.update({
            where: { id: testItem.id },
            data: { base_price: 649 },
        });
    });

    // 6. Idempotency Protection
    await t.test('Idempotency: Repeated request returns existing order without creating a duplicate', async () => {
        const sessionKey = `idem_session_${Date.now()}`;
        await addItemToCart({
            sessionKey,
            restaurantId,
            menuItemId: testItem.id,
            quantity: 1,
        });

        const sharedKey = `shared_key_${Date.now()}`;

        // First call
        const first = await createOrder({
            restaurantId,
            sessionKey,
            customerName: 'Idem Customer',
            phone: '923009998888',
            paymentMethod: 'COD',
            idempotencyKey: sharedKey,
        });
        assert.equal(first.status, 'ORDER_CREATED');
        assert.equal(first.isDuplicate, false);

        // Second call with identical idempotencyKey
        const second = await createOrder({
            restaurantId,
            sessionKey,
            customerName: 'Idem Customer',
            phone: '923009998888',
            paymentMethod: 'COD',
            idempotencyKey: sharedKey,
        });

        assert.equal(second.status, 'ORDER_EXISTS');
        assert.equal(second.isDuplicate, true);
        assert.equal(second.order.orderNumber, first.order.orderNumber);

        // Verify database has exactly 1 order row for this idempotency key
        const count = await prisma.order.count({
            where: { idempotency_key: sharedKey },
        });
        assert.equal(count, 1, 'Exactly one order must exist for duplicate request');
    });

    // 7. Status Transitions
    await t.test('Status Machine: Valid transitions succeed, invalid transitions are rejected', async () => {
        const sessionKey = `status_session_${Date.now()}`;
        await addItemToCart({
            sessionKey,
            restaurantId,
            menuItemId: testItem.id,
            quantity: 1,
        });

        const created = await createOrder({
            restaurantId,
            sessionKey,
            customerName: 'Status Test User',
            phone: '923001112233',
            paymentMethod: 'COD',
        });
        const orderNum = created.order.orderNumber;

        // CONFIRMED -> PREPARING (valid)
        const s1 = await updateOrderStatus({
            restaurantId,
            orderNumber: orderNum,
            newStatus: 'PREPARING',
        });
        assert.equal(s1.orderStatus, 'PREPARING');

        // PREPARING -> READY (valid)
        const s2 = await updateOrderStatus({
            restaurantId,
            orderNumber: orderNum,
            newStatus: 'READY',
        });
        assert.equal(s2.orderStatus, 'READY');

        // READY -> CONFIRMED (invalid backward jump)
        await assert.rejects(
            async () => {
                await updateOrderStatus({
                    restaurantId,
                    orderNumber: orderNum,
                    newStatus: 'CONFIRMED',
                });
            },
            (err) => err.code === 'INVALID_STATUS_TRANSITION'
        );

        // READY -> OUT_FOR_DELIVERY (valid)
        const s3 = await updateOrderStatus({
            restaurantId,
            orderNumber: orderNum,
            newStatus: 'OUT_FOR_DELIVERY',
        });
        assert.equal(s3.orderStatus, 'OUT_FOR_DELIVERY');

        // OUT_FOR_DELIVERY -> DELIVERED (valid)
        const s4 = await updateOrderStatus({
            restaurantId,
            orderNumber: orderNum,
            newStatus: 'DELIVERED',
        });
        assert.equal(s4.orderStatus, 'DELIVERED');
        assert.equal(s4.payment.status, 'PAID', 'COD payment must automatically become PAID upon delivery');

        // DELIVERED -> PREPARING (terminal state, invalid)
        await assert.rejects(
            async () => {
                await updateOrderStatus({
                    restaurantId,
                    orderNumber: orderNum,
                    newStatus: 'PREPARING',
                });
            },
            (err) => err.code === 'INVALID_STATUS_TRANSITION'
        );
    });

    // 8. Two-Step Cancellation
    await t.test('Two-Step Cancellation: Step 1 does not cancel, false aborts, true cancels', async () => {
        const sessionKey = `cancel_session_${Date.now()}`;
        await addItemToCart({
            sessionKey,
            restaurantId,
            menuItemId: testItem.id,
            quantity: 1,
        });

        const created = await createOrder({
            restaurantId,
            sessionKey,
            customerName: 'Cancel Test User',
            phone: '923004445566',
            paymentMethod: 'COD',
        });
        const orderNum = created.order.orderNumber;

        // Step 1: Request Cancel
        const step1 = await requestOrderCancellation({
            restaurantId,
            orderNumber: orderNum,
            sessionKey,
        });
        assert.equal(step1.status, 'CANCELLATION_CONFIRMATION_REQUIRED');

        // Order MUST still be CONFIRMED
        const check1 = await getOrderByNumber({ restaurantId, orderNumber: orderNum });
        assert.equal(check1.orderStatus, 'CONFIRMED');

        // Confirm = false (Aborted)
        const step2Abort = await confirmOrderCancellation({
            restaurantId,
            orderNumber: orderNum,
            sessionKey,
            confirmed: false,
        });
        assert.equal(step2Abort.status, 'CANCELLATION_ABORTED');

        const check2 = await getOrderByNumber({ restaurantId, orderNumber: orderNum });
        assert.equal(check2.orderStatus, 'CONFIRMED');

        // Request again
        await requestOrderCancellation({
            restaurantId,
            orderNumber: orderNum,
            sessionKey,
        });

        // Confirm = true (Cancelled)
        const step2Confirm = await confirmOrderCancellation({
            restaurantId,
            orderNumber: orderNum,
            sessionKey,
            confirmed: true,
        });
        assert.equal(step2Confirm.status, 'ORDER_CANCELLED');
        assert.equal(step2Confirm.orderStatus, 'CANCELLED');

        const check3 = await getOrderByNumber({ restaurantId, orderNumber: orderNum });
        assert.equal(check3.orderStatus, 'CANCELLED');

        // Cancelled order cannot be cancelled again
        await assert.rejects(
            async () => {
                await requestOrderCancellation({
                    restaurantId,
                    orderNumber: orderNum,
                    sessionKey,
                });
            },
            (err) => err.code === 'ORDER_NOT_CANCELLABLE'
        );
    });

    // Clean up temporary test data
    const testPhones = ['923009998888', '923001112233', '923004445566'];
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
    await prisma.customer.deleteMany({ where: { phone: { in: testPhones } } });

    await prisma.menuVariant.delete({ where: { id: testVariant.id } });
    await prisma.menuItem.delete({ where: { id: testItem.id } });
    await prisma.deliveryArea.delete({ where: { id: testDeliveryArea.id } });
    await prisma.category.delete({ where: { id: testCategory.id } });
});
