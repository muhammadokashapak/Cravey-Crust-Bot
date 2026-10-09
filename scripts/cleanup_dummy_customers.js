import { prisma } from '../src/db/client.js';

async function main() {
    console.log('🧹 Starting cleanup of dummy test customers and test data...\n');

    const REAL_PHONE = '923495696659';

    // 1. Find dummy customers
    const dummyCustomers = await prisma.customer.findMany({
        where: {
            NOT: {
                phone: REAL_PHONE,
            },
        },
    });

    console.log(`Found ${dummyCustomers.length} dummy customer(s) to remove.`);

    // 2. Find and delete dummy orders (and their items/history via cascade)
    const dummyOrders = await prisma.order.findMany({
        where: {
            NOT: {
                phone: REAL_PHONE,
            },
        },
        select: { id: true, order_number: true },
    });

    if (dummyOrders.length > 0) {
        const dummyOrderIds = dummyOrders.map(o => o.id);
        
        // Delete status history & items
        await prisma.orderStatusHistory.deleteMany({
            where: { order_id: { in: dummyOrderIds } },
        });
        await prisma.orderItem.deleteMany({
            where: { order_id: { in: dummyOrderIds } },
        });

        const deletedOrders = await prisma.order.deleteMany({
            where: { id: { in: dummyOrderIds } },
        });
        console.log(`✅ Deleted ${deletedOrders.count} dummy test order(s).`);
    }

    // 3. Delete dummy carts (not belonging to real phone session or real customer)
    const realCustomer = await prisma.customer.findFirst({
        where: { phone: REAL_PHONE },
    });

    await prisma.cartItem.deleteMany({
        where: {
            cart: {
                customer_id: { not: realCustomer?.id || '' },
            },
        },
    });

    await prisma.cart.deleteMany({
        where: {
            customer_id: { not: realCustomer?.id || '' },
        },
    });

    // 4. Delete dummy test conversation sessions
    await prisma.conversationSession.deleteMany({
        where: {
            NOT: {
                OR: [
                    { verified_phone: REAL_PHONE },
                    { chat_id: { contains: REAL_PHONE } },
                ],
            },
            OR: [
                { chat_id: { startsWith: 'test_' } },
                { chat_id: { startsWith: 'cart_test_' } },
                { chat_id: { startsWith: 'order_test_' } },
                { chat_id: { startsWith: 'idem_session_' } },
                { chat_id: { startsWith: 'status_session_' } },
                { chat_id: { startsWith: 'cancel_session_' } },
                { chat_id: { startsWith: 'pin_test_' } },
            ],
        },
    });

    // 5. Delete all dummy customers
    const deleteResult = await prisma.customer.deleteMany({
        where: {
            NOT: {
                phone: REAL_PHONE,
            },
        },
    });

    console.log(`✅ Deleted ${deleteResult.count} dummy customer(s).\n`);

    // 6. Verification
    const remainingCustomers = await prisma.customer.findMany({
        select: { id: true, name: true, phone: true, whatsapp_phone: true, total_orders: true },
    });
    console.log('--- REMAINING CUSTOMERS ---');
    console.table(remainingCustomers);

    const remainingOrders = await prisma.order.findMany({
        select: { id: true, order_number: true, customer_name: true, phone: true, total: true },
    });
    console.log('--- REMAINING ORDERS ---');
    console.table(remainingOrders);

    console.log('\n🎉 Cleanup completed successfully!');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error during cleanup:', err);
    process.exit(1);
});
