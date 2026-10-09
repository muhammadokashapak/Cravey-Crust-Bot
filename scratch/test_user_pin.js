import { checkDeliveryAvailability } from '../src/services/deliveryService.js';
import { handleIncomingOrderMessage } from '../src/services/whatsappOrderOrchestrator.js';

async function testUserPin() {
    console.log('Testing exact pin user sent:');
    const loc = {
        type: 'current_location',
        latitude: 33.62621688,
        longitude: 73.11942004,
        name: 'Ghauri town vip phase Islamabad',
        address: 'House no, 55 Street Number 3, Islamabad',
    };

    const delRes = await checkDeliveryAvailability({
        latitude: loc.latitude,
        longitude: loc.longitude,
        subtotal: 1500,
    });
    console.log('Delivery check result:', delRes);

    const chatId = `pin_test_${Date.now()}@s.whatsapp.net`;
    // setup session in WAITING_LOCATION
    await handleIncomingOrderMessage({
        normalizedMessage: {
            chatId,
            messageId: '1',
            text: '1 Cheese Lover',
            phoneVerified: true,
            verifiedPhone: '923495696659',
        },
    });
    await handleIncomingOrderMessage({
        normalizedMessage: {
            chatId,
            messageId: '2',
            text: 'Party Size',
            phoneVerified: true,
            verifiedPhone: '923495696659',
        },
    });
    await handleIncomingOrderMessage({
        normalizedMessage: {
            chatId,
            messageId: '3',
            text: 'Checkout',
            phoneVerified: true,
            verifiedPhone: '923495696659',
        },
    });
    await handleIncomingOrderMessage({
        normalizedMessage: {
            chatId,
            messageId: '4',
            text: 'Okasha',
            phoneVerified: true,
            verifiedPhone: '923495696659',
        },
    });
    await handleIncomingOrderMessage({
        normalizedMessage: {
            chatId,
            messageId: '5',
            text: 'Same number',
            phoneVerified: true,
            verifiedPhone: '923495696659',
        },
    });

    console.log('\nSending WhatsApp location pin now...');
    const reply = await handleIncomingOrderMessage({
        normalizedMessage: {
            chatId,
            messageId: '6',
            text: '',
            messageType: 'current_location',
            location: loc,
            phoneVerified: true,
            verifiedPhone: '923495696659',
        },
    });

    console.log('\nBot response:');
    console.log(reply.text);
    console.log('Stage:', reply.stage);
    process.exit(0);
}

testUserPin().catch(err => {
    console.error(err);
    process.exit(1);
});
