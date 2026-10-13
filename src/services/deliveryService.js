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
 * Geographically accurate landmark coordinates for Cravey Crust's 32 delivery coverage areas.
 * Restaurant Central: Cravey Crust, Main Lehtrar Road, Phase 4B Ghauri Town, Islamabad (33.6261, 73.1255).
 */
export const DELIVERY_AREA_COORDINATES = {
    'ghauri-town-all-phase': { name: 'Ghauri Town all phase', lat: 33.6261, lng: 73.1255, radiusKm: 2.5 },
    'ghauri-vip':            { name: 'Ghauri VIP',            lat: 33.6250, lng: 73.1270, radiusKm: 1.2 },
    'ghauri-garden':         { name: 'Ghauri Garden',         lat: 33.6340, lng: 73.1380, radiusKm: 1.5 },
    'tarlai':                { name: 'Tarlai',                lat: 33.6490, lng: 73.1420, radiusKm: 2.0 },
    'taramari':              { name: 'Taramari',              lat: 33.6430, lng: 73.1550, radiusKm: 2.0 },
    'burma':                 { name: 'Burma',                 lat: 33.6550, lng: 73.1360, radiusKm: 1.8 },
    'khana-pull':            { name: 'Khana Pull',            lat: 33.6335, lng: 73.1125, radiusKm: 2.0 },
    'shakral':               { name: 'Shakral',               lat: 33.6390, lng: 73.1050, radiusKm: 2.0 },
    'zia-masjid':            { name: 'Zia Masjid',            lat: 33.6430, lng: 73.1020, radiusKm: 1.5 },
    'zia-market':            { name: 'Zia market',            lat: 33.6415, lng: 73.1035, radiusKm: 1.2 },
    'bilal-town':            { name: 'Bilal town',            lat: 33.6350, lng: 73.1170, radiusKm: 1.5 },
    'sanam-chok':            { name: 'Sanam Chok',            lat: 33.6295, lng: 73.1185, radiusKm: 1.2 },
    'madina-town':           { name: 'Madina Town',           lat: 33.6220, lng: 73.1200, radiusKm: 1.2 },
    'sarfraz-town':          { name: 'Sarfraz town',          lat: 33.6240, lng: 73.1140, radiusKm: 1.2 },
    'sharifabad':            { name: 'Sharifabad',            lat: 33.6300, lng: 73.1090, radiusKm: 1.2 },
    'malik-town':            { name: 'Malik Town',            lat: 33.6235, lng: 73.1310, radiusKm: 1.2 },
    'marwa-town':            { name: 'Marwa Town',            lat: 33.6190, lng: 73.1350, radiusKm: 1.5 },
    'basit-town':            { name: 'Basit town',            lat: 33.6310, lng: 73.1370, radiusKm: 1.2 },
    'albadar-masjid':        { name: 'Albadar Masjid',        lat: 33.6320, lng: 73.1305, radiusKm: 1.0 },
    'karachi-house':         { name: 'Karachi house',         lat: 33.6275, lng: 73.1280, radiusKm: 1.0 },
    'juma-bazar':            { name: 'Juma Bazar',            lat: 33.6290, lng: 73.1220, radiusKm: 1.0 },
    'school-stop':           { name: 'School Stop',           lat: 33.6455, lng: 73.1475, radiusKm: 1.2 },
    'dakhana-stop':          { name: 'Dakhana Stop',          lat: 33.6480, lng: 73.1440, radiusKm: 1.0 },
    'tali-mor':              { name: 'Tali mor',              lat: 33.6465, lng: 73.1510, radiusKm: 1.2 },
    'rehman-enclave':        { name: 'Rehman Enclave',        lat: 33.6515, lng: 73.1530, radiusKm: 1.5 },
    'zamna-bad':             { name: 'Zamna bad',             lat: 33.6390, lng: 73.1590, radiusKm: 1.5 },
    'p-v-scheme':            { name: 'P&V Scheme',            lat: 33.6410, lng: 73.1630, radiusKm: 1.8 },
    'sudran-road':           { name: 'Sudran Road',           lat: 33.6570, lng: 73.1490, radiusKm: 1.5 },
    'mehrban-town':          { name: 'Mehrban Town',          lat: 33.6440, lng: 73.1360, radiusKm: 1.2 },
    'chistiyan-market':      { name: 'Chistiyan market',      lat: 33.6520, lng: 73.1390, radiusKm: 1.2 },
    'gulberg-green':         { name: 'Gulberg green',         lat: 33.6020, lng: 73.1390, radiusKm: 3.5 },
    'gulzar-e-quaid':        { name: 'Gulzar e Quaid',        lat: 33.6080, lng: 73.1120, radiusKm: 2.5 },
};

export const RESTAURANT_CENTER = {
    lat: 33.6261,
    lng: 73.1255,
    maxRadiusKm: 12.0,
};

/**
 * Helper to match text against known areas.
 */
function findAreaByText(areas, text) {
    if (!text || typeof text !== 'string') return null;
    const cleanLower = text.toLowerCase().replace(/[,.-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanLower || cleanLower === 'islamabad' || cleanLower === 'rawalpindi' || cleanLower === 'pakistan') {
        return null;
    }

    // 1. Exact name or slug match
    let found = areas.find(a => 
        a.name.toLowerCase() === cleanLower ||
        a.slug.toLowerCase() === cleanLower
    );
    if (found) return found;

    // 2. Precise Pakistani Area Aliases & Rule-based Matching
    if (cleanLower.includes('dakhana') || cleanLower.includes('dak hana')) {
        found = areas.find(a => a.slug === 'dakhana-stop');
    } else if (cleanLower.includes('khanna') || cleanLower.includes('khana pull') || cleanLower.includes('khana pul') || (cleanLower.includes('khana') && !cleanLower.includes('dak'))) {
        found = areas.find(a => a.slug === 'khana-pull');
    }

    if (!found && (cleanLower.includes('ghauri') || cleanLower.includes('ghori'))) {
        if (cleanLower.includes('vip') || cleanLower.includes('vvip')) {
            found = areas.find(a => a.slug === 'ghauri-vip');
        } else if (cleanLower.includes('garden')) {
            found = areas.find(a => a.slug === 'ghauri-garden');
        } else {
            found = areas.find(a => a.slug === 'ghauri-town-all-phase');
        }
    }

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

    return found || null;
}

/**
 * Validate and resolve delivery availability and fee for an area or coordinates.
 *
 * @param {Object} params
 * @param {string} [params.restaurantId]
 * @param {string} [params.areaId]
 * @param {string} [params.areaName]
 * @param {string} [params.address]
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
    const { areaId, areaName, address, subtotal } = params;

    let lat = (params.latitude != null && !isNaN(Number(params.latitude))) ? Number(params.latitude) : null;
    let lng = (params.longitude != null && !isNaN(Number(params.longitude))) ? Number(params.longitude) : null;

    // Auto-extract coords from areaName/address if Google Maps URL or query was passed
    if ((lat == null || lng == null) && (areaName || address)) {
        const textToSearch = `${areaName || ''} ${address || ''}`;
        const urlMatch = textToSearch.match(/(?:q=|@)(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (urlMatch) {
            lat = Number(urlMatch[1]);
            lng = Number(urlMatch[2]);
        }
    }

    let matchedArea = null;

    // 1. Direct Area ID
    if (areaId) {
        const area = await prisma.deliveryArea.findFirst({
            where: {
                id: areaId,
                restaurant_id: restaurantId,
            },
        });
        if (!area) {
            return { available: false, code: 'DELIVERY_AREA_NOT_FOUND', message: 'Delivery area not found' };
        }
        if (!area.is_active) {
            return { available: false, code: 'DELIVERY_NOT_AVAILABLE', message: 'Delivery is currently unavailable in this area' };
        }
        matchedArea = area;
    }

    // 2. Fetch all configured areas for this restaurant
    const allAreas = await prisma.deliveryArea.findMany({
        where: { restaurant_id: restaurantId },
        orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });

    // 3. Match by name or address if provided
    if (!matchedArea && (areaName || address)) {
        const textFound = findAreaByText(allAreas, `${areaName || ''} ${address || ''}`);
        if (textFound && textFound.is_active) {
            matchedArea = textFound;
        }
    }

    // 4. Match by GPS coordinates if area was not resolved by name
    if (!matchedArea && lat != null && lng != null) {
        const distToRestaurant = calculateHaversineDistance(lat, lng, RESTAURANT_CENTER.lat, RESTAURANT_CENTER.lng);

        if (distToRestaurant > RESTAURANT_CENTER.maxRadiusKm) {
            return {
                available: false,
                code: 'DELIVERY_NOT_AVAILABLE',
                message: `Delivery is not available at this location (distance is ${distToRestaurant.toFixed(1)} km, max delivery radius is ${RESTAURANT_CENTER.maxRadiusKm} km).`,
            };
        }

        const activeAreas = allAreas.filter(a => a.is_active);

        // Rank areas by distance from the shared coordinates to each area's known center
        const rankedAreas = activeAreas.map(a => {
            const coords = DELIVERY_AREA_COORDINATES[a.slug];
            const areaLat = coords?.lat ?? (a.latitude !== 33.6261 ? a.latitude : RESTAURANT_CENTER.lat);
            const areaLng = coords?.lng ?? (a.longitude !== 73.1255 ? a.longitude : RESTAURANT_CENTER.lng);
            const dist = calculateHaversineDistance(lat, lng, areaLat, areaLng);
            return { area: a, distance: dist, radiusKm: coords?.radiusKm || 2.5 };
        });

        rankedAreas.sort((a, b) => a.distance - b.distance);

        if (rankedAreas.length > 0) {
            const closest = rankedAreas[0];
            if (closest.distance <= closest.radiusKm) {
                matchedArea = closest.area;
            } else {
                return {
                    available: false,
                    code: 'DELIVERY_NOT_AVAILABLE',
                    message: `Delivery is not available at this location (closest Cravey Crust coverage area '${closest.area.name}' is ${closest.distance.toFixed(1)} km away).`,
                };
            }
        }
    }

    // 5. If still not matched, return clean rejection
    if (!matchedArea) {
        if (areaName || address) {
            return {
                available: false,
                code: 'DELIVERY_AREA_NOT_FOUND',
                message: `Delivery area '${areaName || address}' not found. Cravey Crust serves Ghauri Town, Tarlai, Khanna, Gulberg, Burma, Taramari and nearby areas.`,
            };
        }
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
