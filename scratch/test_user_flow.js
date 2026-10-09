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

    console.log('\n--- SIMULATION 3: Testing WhatsApp GPS Pin ---');
    const chatId3 = `test_sim3_${Date.now()}@s.whatsapp.net`;
    await handleIncomingOrderMessage({
        normalizedMessage: {
            chatId: chatId3,
            messageId: `msg_${Date.now()}_1`,
            text: '1 cheese lover',
            phoneVerified: true,
            verifiedPhone: '923001112233',
        },
    });
    await handleIncomingOrderMessage({
        normalizedMessage: {
            chatId: chatId3,
            messageId: `msg_${Date.now()}_2`,
            text: 'Small',
            phoneVerified: true,
            verifiedPhone: '923001112233',
        },
    });
    await handleIncomingOrderMessage({
        normalizedMessage: {
            chatId: chatId3,
            messageId: `msg_${Date.now()}_3`,
            text: 'Checkout',
            phoneVerified: true,
            verifiedPhone: '923001112233',
        },
    });
    await handleIncomingOrderMessage({
        normalizedMessage: {
            chatId: chatId3,
            messageId: `msg_${Date.now()}_4`,
            text: 'Okasha',
            phoneVerified: true,
            verifiedPhone: '923001112233',
        },
    });
    await handleIncomingOrderMessage({
        normalizedMessage: {
            chatId: chatId3,
            messageId: `msg_${Date.now()}_5`,
            text: 'Same number',
            phoneVerified: true,
            verifiedPhone: '923001112233',
        },
    });
    console.log(`\n\x1b[36m[CUSTOMER]\x1b[0m: [Sent WhatsApp GPS Pin: lat: 33.6280, lng: 73.1270]`);
    const resPin = await handleIncomingOrderMessage({
        normalizedMessage: {
            chatId: chatId3,
            messageId: `msg_${Date.now()}_6`,
            text: '',
            messageType: 'current_location',
            location: { latitude: 33.6280, longitude: 73.1270, type: 'current_location' },
            phoneVerified: true,
            verifiedPhone: '923001112233',
        },
    });
    console.log(`\x1b[32m[BOT - intent: ${resPin.intent}, stage: ${resPin.stage}]\x1b[0m:`);
    console.log(resPin.text);

    process.exit(0);
}

runSimulation().catch(err => {
    console.error('Simulation failed:', err);
    process.exit(1);
});
