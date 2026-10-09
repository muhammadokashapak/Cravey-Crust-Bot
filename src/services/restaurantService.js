import { getDbClient } from '../db/client.js';

let _cachedRestaurantId = null;

/**
 * Get the current restaurant ID.
 * Multi-tenant ready: defaults to 'cravey-crust' or creates a fallback if empty.
 *
 * @returns {Promise<string>}
 */
export async function getDefaultRestaurantId() {
    if (_cachedRestaurantId) {
        return _cachedRestaurantId;
    }

    const prisma = getDbClient();
    if (!prisma) {
        throw new Error('Database client not available');
    }

    let restaurant = await prisma.restaurant.findFirst({
        where: { slug: 'cravey-crust' },
        select: { id: true },
    });

    if (!restaurant) {
        restaurant = await prisma.restaurant.findFirst({
            select: { id: true },
        });
    }

    if (!restaurant) {
        restaurant = await prisma.restaurant.create({
            data: {
                name: 'Cravey Crust',
                slug: 'cravey-crust',
                phone: '+92-300-0000000',
                address: 'Lahore, Pakistan',
                currency: 'PKR',
                timezone: 'Asia/Karachi',
                opening_time: '10:00',
                closing_time: '23:00',
                min_order: 300,
                default_delivery_fee: 60,
                cod_enabled: true,
                easypaisa_enabled: true,
                easypaisa_number: '03000000000',
                account_name: 'Cravey Crust',
                is_active: true,
            },
        });
    }

    _cachedRestaurantId = restaurant.id;
    return _cachedRestaurantId;
}

/**
 * Reset cached restaurant ID (useful in tests)
 */
export function resetCachedRestaurantId() {
    _cachedRestaurantId = null;
}
