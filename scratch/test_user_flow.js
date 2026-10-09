import { handleIncomingOrderMessage } from '../src/services/whatsappOrderOrchestrator.js';

async function runSimulation() {
    const chatId = `test_sim_${Date.now()}@s.whatsapp.net`;
    const conversation = [
        'Hi',
        'Menu dikhao',
        'Classic Pizzas mein kia kia ha',
        '1 cheese Lover krdo',
        'Party Size',
        'Cart',
        'Checkout',
        'Muhammad Okasha',
        'Same number',
        'Kon konsi location mrin delivery possible ha',
        'Delivery locations batao',
        'Ghauri town',
    ];

    console.log('--- STARTING CONVERSATION SIMULATION ---');

    for (const text of conversation) {
        console.log(`\n\x1b[36m[CUSTOMER]\x1b[0m: ${text}`);
        const res = await handleIncomingOrderMessage({
            normalizedMessage: {
                chatId,
                messageId: `msg_${Date.now()}_${Math.random()}`,
                text,
                phoneVerified: true,
                verifiedPhone: '923495696659',
            },
        });
        console.log(`\x1b[32m[BOT - intent: ${res.intent}, stage: ${res.stage}]\x1b[0m:`);
        console.log(res.text);
    }

    console.log('\n--- SIMULATION 2: Testing Khanna pul ---');
    const chatId2 = `test_sim2_${Date.now()}@s.whatsapp.net`;
    const conv2 = [
        '1 cheese lover',
        'Large',
        'Checkout',
        'Asim',
        'Same number',
        'Khanna pul',
    ];
    for (const text of conv2) {
        console.log(`\n\x1b[36m[CUSTOMER]\x1b[0m: ${text}`);
        const res = await handleIncomingOrderMessage({
            normalizedMessage: {
                chatId: chatId2,
                messageId: `msg_${Date.now()}_${Math.random()}`,
                text,
                phoneVerified: true,
                verifiedPhone: '923001234567',
            },
        });
        console.log(`\x1b[32m[BOT - intent: ${res.intent}, stage: ${res.stage}]\x1b[0m:`);
        console.log(res.text);
    }

    process.exit(0);
}

runSimulation().catch(err => {
    console.error('Simulation failed:', err);
    process.exit(1);
});
