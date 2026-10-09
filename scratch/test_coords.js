import { checkDeliveryAvailability } from '../src/services/deliveryService.js';
import { calculateHaversineDistance } from '../src/services/deliveryService.js';

async function testCoords() {
    // 1. Ghauri Town Islamabad coordinates (approx 1 km from branch)
    const inRange = await checkDeliveryAvailability({ latitude: 33.6280, longitude: 73.1270 });
    console.log('In range (Ghauri Town pin):', inRange);

    // 2. Lahore pin (300 km away)
    const outOfRange = await checkDeliveryAvailability({ latitude: 31.5204, longitude: 74.3587 });
    console.log('Out of range (Lahore pin):', outOfRange);

    process.exit(0);
}

testCoords();
