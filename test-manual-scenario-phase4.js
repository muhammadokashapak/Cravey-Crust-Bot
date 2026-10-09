import { getDbClient } from './src/db/client.js';
import { getDefaultRestaurantId } from './src/services/restaurantService.js';
import { getOrCreateCustomer } from './src/services/customerService.js';
import { getOrCreateSession } from './src/services/sessionService.js';
import { addItemToCart, calculateCartTotals } from './src/services/cartService.js';
import {
    createOrder,
    getOrderByNumber,
    updateOrderStatus,
    requestOrderCancellation,
    confirmOrderCancellation,
} from './src/services/orderService.js';

async function runScenario() {
    console.log('══════════════════════════════════════════════════════════════');
    console.log('   PHASE 4 MANUAL TEST SCENARIO (SECTION 35)');
    console.log('══════════════════════════════════════════════════════════════\n');

    const prisma = getDbClient();
    const restaurantId = await getDefaultRestaurantId();

    // 1. Create / reuse customer
    console.log('Step 1: Create/reuse customer (Ali Test, 923001234567)...');
    const customer = await getOrCreateCustomer({
        restaurantId,
        name: 'Ali Test',
        phone: '923001234567',
        whatsappPhone: '923001234567',
    });
    console.log(`   ✅ Customer ID: ${customer.id}, Name: ${customer.name}, WhatsApp: ${customer.whatsapp_phone}`);

    // 2. Create session
    console.log('\nStep 2: Create conversation session...');
    const sessionKey = `manual_scenario_session_${Date.now()}`;
    const session = await getOrCreateSession({
        restaurantId,
        chatId: '923001234567@s.whatsapp.net',
        sessionKey,
        verifiedPhone: '923001234567',
        stage: 'BUILDING_CART',
    });
    console.log(`   ✅ Session Key: ${session.session_key}, Stage: ${session.stage}`);

    // 3. Add 2 x Zinger Burger
    console.log('\nStep 3: Add 2 x Zinger Burger (@ Rs.649)...');
    const zinger = await prisma.menuItem.findFirst({
        where: {
            restaurant_id: restaurantId,
            name: { contains: 'Zinger', mode: 'insensitive' },
        },
    });
    if (!zinger) throw new Error('Zinger Burger not found in database');

    const cart = await addItemToCart({
        sessionKey,
        restaurantId,
        menuItemId: zinger.id,
        quantity: 2,
    });
    console.log(`   ✅ Cart ID: ${cart.id}, Items: ${cart.items.length}, Qty: ${cart.items[0].quantity}`);

    // 4. Set delivery: Ghauri Town
    console.log('\nStep 4: Set delivery area: Ghauri Town...');
    const ghauri = await prisma.deliveryArea.findFirst({
        where: {
            restaurant_id: restaurantId,
            name: { contains: 'Ghauri', mode: 'insensitive' },
        },
    });
    if (!ghauri) throw new Error('Ghauri Town delivery area not found');
    console.log(`   ✅ Delivery Area: ${ghauri.name}, Fee: Rs.${ghauri.delivery_fee}`);

    // 5. Temporarily enable WELCOME15 for this test
    console.log('\nStep 5: Ensure WELCOME15 promotion is active...');
    const promo = await prisma.promotion.findFirst({
        where: { restaurant_id: restaurantId, code: 'WELCOME15' },
    });
    if (promo) {
        await prisma.promotion.update({
            where: { id: promo.id },
            data: { is_active: true },
        });
        console.log(`   ✅ Promotion ${promo.code} is active`);
    }

    // 6. Calculate cart
    console.log('\nStep 6: Calculate cart with pricingService...');
    const totals = await calculateCartTotals({
        sessionKey,
        restaurantId,
        promoCode: 'WELCOME15',
        deliveryAreaId: ghauri.id,
    });

    console.log(`   - Subtotal:     Rs. ${totals.subtotal}   (Expected: 1298)`);
    console.log(`   - Discount:     Rs. ${totals.discountTotal}    (Expected: 194.70)`);
    console.log(`   - Delivery Fee: Rs. ${totals.deliveryFee}     (Expected: 150)`);
    console.log(`   - Total:        Rs. ${totals.total}   (Expected: 1253.30)`);

    if (totals.subtotal !== 1298) throw new Error(`Subtotal mismatch: got ${totals.subtotal}`);
    if (totals.discountTotal !== 194.7) throw new Error(`Discount mismatch: got ${totals.discountTotal}`);
    if (totals.deliveryFee !== 150) throw new Error(`Delivery fee mismatch: got ${totals.deliveryFee}`);
    if (totals.total !== 1253.3) throw new Error(`Total mismatch: got ${totals.total}`);
    console.log('   ✅ All cart calculations match exactly!');

    // 7. Create order
    console.log('\nStep 7: Create order (POST /api/internal/orders)...');
    const idempotencyKey = `manual_idem_${Date.now()}`;
    const createResult = await createOrder({
        restaurantId,
        sessionKey,
        customerName: 'Ali Test',
        contactNumberMode: 'same_whatsapp',
        delivery: {
            address: 'Street 4, Sector 2, Ghauri Town',
            areaId: ghauri.id,
            areaName: ghauri.name,
        },
        paymentMethod: 'COD',
        promoCode: 'WELCOME15',
        idempotencyKey,
    });

    const order = createResult.order;
    console.log(`   ✅ Order Created: ${order.orderNumber}`);
    console.log(`   - Order Status: ${order.orderStatus}`);
    console.log(`   - Total:        Rs. ${order.pricing.total}`);

    // 8. Verify DB row, item snapshot, status history, cart completion
    console.log('\nStep 8: Verify order row, snapshots & history in database...');
    const dbOrder = await getOrderByNumber({ restaurantId, orderNumber: order.orderNumber });
    if (!dbOrder) throw new Error('Order row not found in DB');
    if (dbOrder.items[0].unitPrice !== 649) throw new Error(`Snapshot unit price mismatch: ${dbOrder.items[0].unitPrice}`);
    if (dbOrder.pricing.total !== 1253.3) throw new Error(`Total mismatch: ${dbOrder.pricing.total}`);
    if (dbOrder.statusHistory.length < 1) throw new Error('Status history missing');

    const dbCart = await prisma.cart.findUnique({ where: { id: cart.id } });
    if (dbCart.status !== 'COMPLETED') throw new Error(`Cart status not COMPLETED: ${dbCart.status}`);
    console.log(`   ✅ 2x Zinger snapshot verified at Rs.649`);
    console.log(`   ✅ Grand total verified at Rs.1253.30`);
    console.log(`   ✅ Status history verified (Initial: ${dbOrder.statusHistory[0].newStatus})`);
    console.log(`   ✅ Cart marked COMPLETED`);

    // 9. Send same create-order request using same idempotency key
    console.log('\nStep 9: Retrying create order with same idempotency key...');
    const retryResult = await createOrder({
        restaurantId,
        sessionKey,
        customerName: 'Ali Test',
        contactNumberMode: 'same_whatsapp',
        delivery: {
            address: 'Street 4, Sector 2, Ghauri Town',
            areaId: ghauri.id,
            areaName: ghauri.name,
        },
        paymentMethod: 'COD',
        promoCode: 'WELCOME15',
        idempotencyKey,
    });

    console.log(`   - isDuplicate: ${retryResult.isDuplicate}`);
    console.log(`   - Returned Order Number: ${retryResult.order.orderNumber}`);
    if (!retryResult.isDuplicate) throw new Error('Expected isDuplicate to be true');
    if (retryResult.order.orderNumber !== order.orderNumber) throw new Error('Order number mismatch on idempotency retry');
    console.log('   ✅ Same order returned, NO second order created');

    // 10. Admin changes status: CONFIRMED -> PREPARING -> READY
    console.log('\nStep 10: Admin moves status: CONFIRMED -> PREPARING -> READY...');
    const s1 = await updateOrderStatus({
        restaurantId,
        orderNumber: order.orderNumber,
        newStatus: 'PREPARING',
        changedByType: 'ADMIN',
        reason: 'Kitchen started order',
    });
    console.log(`   ✅ Status moved to: ${s1.orderStatus}`);

    const s2 = await updateOrderStatus({
        restaurantId,
        orderNumber: order.orderNumber,
        newStatus: 'READY',
        changedByType: 'ADMIN',
        reason: 'Order packed and ready',
    });
    console.log(`   ✅ Status moved to: ${s2.orderStatus}`);

    const updatedDb = await getOrderByNumber({ restaurantId, orderNumber: order.orderNumber });
    console.log(`   ✅ Status history entries: ${updatedDb.statusHistory.length} (CONFIRMED -> PREPARING -> READY)`);

    // 11. Test invalid transition: READY -> CONFIRMED
    console.log('\nStep 11: Testing invalid status transition (READY -> CONFIRMED)...');
    try {
        await updateOrderStatus({
            restaurantId,
            orderNumber: order.orderNumber,
            newStatus: 'CONFIRMED',
        });
        throw new Error('Should have rejected READY -> CONFIRMED');
    } catch (err) {
        if (err.code !== 'INVALID_STATUS_TRANSITION') throw err;
        console.log(`   ✅ Successfully rejected invalid transition with code: ${err.code}`);
    }

    // 12. Test cancellation separately on another order
    console.log('\nStep 12: Testing two-step cancellation on another order...');
    const cancelSessionKey = `cancel_manual_${Date.now()}`;
    await addItemToCart({
        sessionKey: cancelSessionKey,
        restaurantId,
        menuItemId: zinger.id,
        quantity: 1,
    });

    const cancelOrderRes = await createOrder({
        restaurantId,
        sessionKey: cancelSessionKey,
        customerName: 'Cancel Test User',
        phone: '923001234567',
        paymentMethod: 'COD',
    });
    const cancelOrderNum = cancelOrderRes.order.orderNumber;
    console.log(`   - Created order to cancel: ${cancelOrderNum}`);

    // Request cancel
    console.log('   - Requesting cancellation (Step 1)...');
    const reqCancel = await requestOrderCancellation({
        restaurantId,
        orderNumber: cancelOrderNum,
        sessionKey: cancelSessionKey,
    });
    console.log(`   - Status response: ${reqCancel.status}`);

    const checkMid1 = await getOrderByNumber({ restaurantId, orderNumber: cancelOrderNum });
    if (checkMid1.orderStatus !== 'CONFIRMED') throw new Error('Order status changed prematurely!');
    console.log(`   ✅ Order remains UNCHANGED (${checkMid1.orderStatus})`);

    // Confirm = false
    console.log('   - Customer replies NO (confirmed: false)...');
    const abortCancel = await confirmOrderCancellation({
        restaurantId,
        orderNumber: cancelOrderNum,
        sessionKey: cancelSessionKey,
        confirmed: false,
    });
    console.log(`   - Status response: ${abortCancel.status}`);

    const checkMid2 = await getOrderByNumber({ restaurantId, orderNumber: cancelOrderNum });
    if (checkMid2.orderStatus !== 'CONFIRMED') throw new Error('Order status changed on abort!');
    console.log(`   ✅ Order remains UNCHANGED (${checkMid2.orderStatus})`);

    // Request again + confirm = true
    console.log('   - Requesting cancellation again...');
    await requestOrderCancellation({
        restaurantId,
        orderNumber: cancelOrderNum,
        sessionKey: cancelSessionKey,
    });

    console.log('   - Customer confirms YES (confirmed: true)...');
    const finalCancel = await confirmOrderCancellation({
        restaurantId,
        orderNumber: cancelOrderNum,
        sessionKey: cancelSessionKey,
        confirmed: true,
    });
    console.log(`   - Status response: ${finalCancel.status}`);

    const checkFinal = await getOrderByNumber({ restaurantId, orderNumber: cancelOrderNum });
    if (checkFinal.orderStatus !== 'CANCELLED') throw new Error('Order not marked CANCELLED!');
    console.log(`   ✅ Order status is now authoritatively: ${checkFinal.orderStatus}`);

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('   🎉 ALL MANUAL SCENARIO STEPS PASSED 100% SUCCESSFULLY');
    console.log('══════════════════════════════════════════════════════════════\n');
}

runScenario().then(() => process.exit(0)).catch(err => {
    console.error('❌ SCENARIO FAILED:', err);
    process.exit(1);
});
