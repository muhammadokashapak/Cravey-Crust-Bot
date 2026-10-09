import { getDbClient } from '../db/client.js';
import { getDefaultRestaurantId } from './restaurantService.js';

/**
 * Calculate distance between two coordinates using the Haversine formula (in km).
 * No external API dependencies.
 *
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in kilometers
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Validate and resolve delivery availability and fee for an area or coordinates.
 *
 * @param {Object} params
 * @param {string} [params.restaurantId]
 * @param {string} [params.areaId]
 * @param {string} [params.areaName]
 * @param {number} [params.latitude]
 * @param {number} [params.longitude]
 * @param {number} [params.subtotal]
 * @returns {Promise<Object>}
 */
export async function checkDeliveryAvailability(params) {
    const prisma = getDbClient();
    if (!prisma) {
        throw new Error('Database client not available');
    }

    const restaurantId = params.restaurantId || await getDefaultRestaurantId();
    const { areaId, areaName, latitude, longitude, subtotal } = params;

    let matchedArea = null;

    if (areaId) {
        const area = await prisma.deliveryArea.findFirst({
            where: {
                id: areaId,
                restaurant_id: restaurantId,
            },
        });

        if (!area) {
            return {
                available: false,
                code: 'DELIVERY_AREA_NOT_FOUND',
                message: 'Delivery area not found',
            };
        }

        if (!area.is_active) {
            return {
                available: false,
                code: 'DELIVERY_NOT_AVAILABLE',
                message: 'Delivery is currently unavailable in this area',
            };
        }

        matchedArea = area;
    } else if (areaName) {
        const cleanName = areaName.trim();
        // Check for area matching name or slug
        const areas = await prisma.deliveryArea.findMany({
            where: {
                restaurant_id: restaurantId,
            },
        });

        const exactOrSlug = areas.find(a => 
            a.name.toLowerCase() === cleanName.toLowerCase() ||
            a.slug.toLowerCase() === cleanName.toLowerCase()
        );

        if (!exactOrSlug) {
            return {
                available: false,
                code: 'DELIVERY_AREA_NOT_FOUND',
                message: `Delivery area '${areaName}' not found`,
            };
        }

        if (!exactOrSlug.is_active) {
            return {
                available: false,
                code: 'DELIVERY_NOT_AVAILABLE',
                message: `Delivery is currently unavailable in ${exactOrSlug.name}`,
            };
        }

        matchedArea = exactOrSlug;
    } else if (latitude != null && longitude != null) {
        const areas = await prisma.deliveryArea.findMany({
            where: {
                restaurant_id: restaurantId,
                is_active: true,
                latitude: { not: null },
                longitude: { not: null },
                radius_km: { not: null },
            },
        });

        const withinRange = [];
        for (const a of areas) {
            const dist = calculateHaversineDistance(latitude, longitude, a.latitude, a.longitude);
            if (dist <= a.radius_km) {
                withinRange.push({ area: a, distance: dist });
            }
        }

        if (withinRange.length === 0) {
            return {
                available: false,
                code: 'DELIVERY_NOT_AVAILABLE',
                message: 'Delivery is not available at the specified location coordinates',
            };
        }

        // Pick the closest matched area
        withinRange.sort((x, y) => x.distance - y.distance);
        matchedArea = withinRange[0].area;
    } else {
        return {
            available: false,
            code: 'INVALID_DELIVERY_REQUEST',
            message: 'Provide areaId, areaName, or coordinates to check delivery',
        };
    }

    const deliveryFee = Number(matchedArea.delivery_fee);
    const minimumOrder = matchedArea.minimum_order != null ? Number(matchedArea.minimum_order) : 0;
    const hasSubtotal = subtotal != null && !isNaN(Number(subtotal));
    const subtotalNum = hasSubtotal ? Number(subtotal) : null;
    const minMet = subtotalNum !== null ? subtotalNum >= minimumOrder : true;

    return {
        available: true,
        area: {
            id: matchedArea.id,
            name: matchedArea.name,
            slug: matchedArea.slug,
        },
        deliveryFee,
        minimumOrder,
        minimumMet: minMet,
        ...(minMet ? {} : {
            code: 'DELIVERY_MINIMUM_NOT_MET',
            message: `Order subtotal of Rs. ${subtotalNum} is below minimum delivery order of Rs. ${minimumOrder}`,
        }),
    };
}
