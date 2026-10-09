import { getDbClient } from '../src/db/client.js';

async function updateCoords() {
    const prisma = getDbClient();
    if (!prisma) {
        console.error('No prisma client');
        process.exit(1);
    }

    const res = await prisma.deliveryArea.updateMany({
        data: {
            latitude: 33.6261,
            longitude: 73.1255,
            radius_km: 10.0,
        },
    });

    console.log(`Updated ${res.count} delivery areas with base coordinates (33.6261, 73.1255, 10km radius).`);
    process.exit(0);
}

updateCoords().catch(err => {
    console.error(err);
    process.exit(1);
});
