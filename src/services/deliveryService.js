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
        const cleanLower = cleanName.toLowerCase().replace(/[,.-]/g, ' ').replace(/\s+/g, ' ').trim();
        const areas = await prisma.deliveryArea.findMany({
            where: {
                restaurant_id: restaurantId,
            },
        });

        // 1. Exact name or slug match
        let found = areas.find(a => 
            a.name.toLowerCase() === cleanLower ||
            a.slug.toLowerCase() === cleanLower
        );

        // 2. Precise Pakistani Area Aliases & Rule-based Matching
        if (!found) {
            // Khanna Pul (slug: khana-pull) vs Dakhana Stop (slug: dakhana-stop)
            if (cleanLower.includes('dakhana') || cleanLower.includes('dak hana')) {
                found = areas.find(a => a.slug === 'dakhana-stop');
            } else if (cleanLower.includes('khanna') || cleanLower.includes('khana pull') || cleanLower.includes('khana pul') || (cleanLower.includes('khana') && !cleanLower.includes('dak'))) {
                found = areas.find(a => a.slug === 'khana-pull');
            }

            // Ghauri Town / VIP / Garden
            if (!found && (cleanLower.includes('ghauri') || cleanLower.includes('ghori'))) {
                if (cleanLower.includes('vip') || cleanLower.includes('vvip')) {
                    found = areas.find(a => a.slug === 'ghauri-vip');
                } else if (cleanLower.includes('garden')) {
                    found = areas.find(a => a.slug === 'ghauri-garden');
                } else {
                    found = areas.find(a => a.slug === 'ghauri-town-all-phase');
                }
            }

            // Other known areas by alias
            if (!found) {
                if (cleanLower.includes('rehman')) found = areas.find(a => a.slug === 'rehman-enclave');
                else if (cleanLower.includes('gulberg')) found = areas.find(a => a.slug === 'gulberg-green');
                else if (cleanLower.includes('gulzar')) found = areas.find(a => a.slug === 'gulzar-e-quaid');
                else if (cleanLower.includes('sanam')) found = areas.find(a => a.slug === 'sanam-chok');
                else if (cleanLower.includes('tarlai')) found = areas.find(a => a.slug === 'tarlai');
                else if (cleanLower.includes('taramari')) found = areas.find(a => a.slug === 'taramari');
                else if (cleanLower.includes('burma')) found = areas.find(a => a.slug === 'burma');
                else if (cleanLower.includes('shakral') || cleanLower.includes('shakrial')) found = areas.find(a => a.slug === 'shakral');
                else if (cleanLower.includes('zia masjid')) found = areas.find(a => a.slug === 'zia-masjid');
                else if (cleanLower.includes('zia market')) found = areas.find(a => a.slug === 'zia-market');
                else if (cleanLower.includes('bilal')) found = areas.find(a => a.slug === 'bilal-town');
                else if (cleanLower.includes('madina')) found = areas.find(a => a.slug === 'madina-town');
                else if (cleanLower.includes('malik')) found = areas.find(a => a.slug === 'malik-town');
                else if (cleanLower.includes('marwa')) found = areas.find(a => a.slug === 'marwa-town');
                else if (cleanLower.includes('mehrban')) found = areas.find(a => a.slug === 'mehrban-town');
                else if (cleanLower.includes('sarfraz')) found = areas.find(a => a.slug === 'sarfraz-town');
                else if (cleanLower.includes('basit')) found = areas.find(a => a.slug === 'basit-town');
                else if (cleanLower.includes('albadar') || cleanLower.includes('al badar')) found = areas.find(a => a.slug === 'albadar-masjid');
                else if (cleanLower.includes('sudran')) found = areas.find(a => a.slug === 'sudran-road');
                else if (cleanLower.includes('school')) found = areas.find(a => a.slug === 'school-stop');
                else if (cleanLower.includes('zamna')) found = areas.find(a => a.slug === 'zamna-bad');
                else if (cleanLower.includes('p&v') || cleanLower.includes('pv')) found = areas.find(a => a.slug === 'p-v-scheme');
                else if (cleanLower.includes('chistiyan') || cleanLower.includes('chishtian')) found = areas.find(a => a.slug === 'chistiyan-market');
                else if (cleanLower.includes('sharif')) found = areas.find(a => a.slug === 'sharifabad');
                else if (cleanLower.includes('tali')) found = areas.find(a => a.slug === 'tali-mor');
                else if (cleanLower.includes('karachi house')) found = areas.find(a => a.slug === 'karachi-house');
                else if (cleanLower.includes('juma bazar')) found = areas.find(a => a.slug === 'juma-bazar');
            }
        }

        // 3. Fallback: Substring matching
        if (!found) {
            found = areas.find(a => {
                const aName = a.name.toLowerCase();
                if (cleanLower.length >= 4 && (cleanLower.includes(aName) || aName.includes(cleanLower))) {
                    if (cleanLower.includes('vip') && aName !== 'ghauri vip') return false;
                    if (!cleanLower.includes('vip') && aName === 'ghauri vip') return false;
                    if (aName === 'dakhana stop' && (cleanLower.includes('khanna') || cleanLower.includes('pull') || cleanLower.includes('pul'))) return false;
                    return true;
                }
                return false;
            });
        }

        if (!found) {
            return {
                available: false,
                code: 'DELIVERY_AREA_NOT_FOUND',
                message: `Delivery area '${areaName}' not found`,
            };
        }

        if (!found.is_active) {
            return {
                available: false,
                code: 'DELIVERY_NOT_AVAILABLE',
                message: `Delivery is currently unavailable in ${found.name}`,
            };
        }

        matchedArea = found;
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
            // Check restaurant central coordinates (Cravey Crust Phase 4B Ghauri Town, Islamabad)
            // 33.6261 N, 73.1255 E, 10.0 KM delivery radius
            const RESTAURANT_LAT = 33.6261;
            const RESTAURANT_LNG = 73.1255;
            const RESTAURANT_RADIUS_KM = 10.0;
            const distToRestaurant = calculateHaversineDistance(latitude, longitude, RESTAURANT_LAT, RESTAURANT_LNG);

            if (distToRestaurant <= RESTAURANT_RADIUS_KM) {
                const defaultArea = await prisma.deliveryArea.findFirst({
                    where: {
                        restaurant_id: restaurantId,
                        slug: 'ghauri-town-all-phase',
                    },
                }) || await prisma.deliveryArea.findFirst({
                    where: { restaurant_id: restaurantId, is_active: true },
                });

                if (defaultArea) {
                    matchedArea = defaultArea;
                }
            }
        } else {
            // If pin came with an areaName (e.g. from WhatsApp location title or place name), check if an area matches
            if (areaName) {
                const aLower = areaName.toLowerCase();
                const matchedByName = withinRange.find(item => {
                    const slug = item.area.slug;
                    if ((aLower.includes('vip') || aLower.includes('vvip')) && slug === 'ghauri-vip') return true;
                    if (aLower.includes('garden') && slug === 'ghauri-garden') return true;
                    if ((aLower.includes('khanna') || aLower.includes('khana pull') || aLower.includes('khana pul')) && slug === 'khana-pull') return true;
                    if (aLower.includes('rehman') && slug === 'rehman-enclave') return true;
                    if (aLower.includes('burma') && slug === 'burma') return true;
                    if (aLower.includes('tarlai') && slug === 'tarlai') return true;
                    if (aLower.includes('taramari') && slug === 'taramari') return true;
                    if (aLower.includes('gulberg') && slug === 'gulberg-green') return true;
                    if (aLower.includes('ghauri') || aLower.includes('ghori')) return slug === 'ghauri-town-all-phase';
                    return false;
                });
                if (matchedByName) {
                    matchedArea = matchedByName.area;
                }
            }

            if (!matchedArea) {
                // Pick the closest matched area
                withinRange.sort((x, y) => x.distance - y.distance);
                matchedArea = withinRange[0].area;
            }
        }

        if (!matchedArea) {
            return {
                available: false,
                code: 'DELIVERY_NOT_AVAILABLE',
                message: 'Delivery is not available at the specified location coordinates',
            };
        }
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
            deliveryFee,
            minimumOrder,
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
