import { handleIncomingOrderMessage } from './src/services/whatsappOrderOrchestrator.js';

async function testMessages() {
    const mockSock = {
        sendMessage: async (jid, content) => {
            console.log(`[OUTGOING TO ${jid}]:\n${content.text}\n`);
            return { key: { id: 'mock-msg' } };
        }
    };

    const mockSession = { id: 'primary' };

    const testInputs = [
        'hii',
        'koi welcome deal h?',
        'coupons ha koi?',
        'promotions?',
        'deal 3 mai kya kay ha',
        'delivery area?',
        'lahore h?',
        'timing kya hai'
    ];

    console.log('🧪 RUNNING ORCHESTRATOR LIVE INTEGRATION TEST:\n');

    for (const text of testInputs) {
        console.log(`================================================`);
        console.log(`👉 USER SENT: "${text}"`);
        const res = await handleIncomingOrderMessage({
            sock: mockSock,
            session: mockSession,
            normalizedMessage: {
                sessionId: 'primary',
                chatId: '923001234567@s.whatsapp.net',
                messageId: 'test-' + Date.now(),
                text: text,
                messageType: 'text',
                verifiedPhone: '923001234567',
                phoneVerified: true,
                pushName: 'Test Customer',
                isGroup: false
            }
        });
        console.log(`🤖 BOT RESPONSE (Intent: ${res?.intent}):`);
        console.log(res?.text);
        console.log(`================================================\n`);
    }

    process.exit(0);
}

testMessages().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
