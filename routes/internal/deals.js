import express from 'express';
import { getDbClient } from '../../src/db/client.js';
import { getDefaultRestaurantId } from '../../src/services/restaurantService.js';

const router = express.Router();

/**
 * GET /api/internal/deals
 * Returns active, unexpired deals formatted for bot consumption.
 */
router.get('/', async (req, res) => {
    try {
        const prisma = getDbClient();
        if (!prisma) {
            return res.status(503).json({
                success: false,
                error: { code: 'DB_UNAVAILABLE', message: 'Database not available' },
            });
        }

        const restaurantId = await getDefaultRestaurantId();
        const now = new Date();

        const deals = await prisma.deal.findMany({
            where: {
                restaurant_id: restaurantId,
                is_active: true,
                AND: [
                    { OR: [{ start_at: null }, { start_at: { lte: now } }] },
                    { OR: [{ end_at: null }, { end_at: { gte: now } }] },
                ],
            },
            orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
            include: {
                deal_items: {
                    include: {
                        menu_item: { select: { id: true, name: true, is_active: true, is_available: true } },
                        menu_variant: { select: { id: true, name: true, is_available: true } },
                    },
                },
            },
        });

        // Filter out deals if any contained item is unavailable
        const availableDeals = deals.filter(d => {
            return d.deal_items.every(di => {
                if (!di.menu_item || !di.menu_item.is_active || !di.menu_item.is_available) {
                    return false;
                }
                if (di.menu_variant && !di.menu_variant.is_available) {
                    return false;
                }
                return true;
            });
        });

        const formatted = availableDeals.map(d => ({
            id: d.id,
            name: d.name,
            slug: d.slug,
            description: d.description || '',
            dealPrice: Number(d.deal_price),
            imageUrl: d.image_url || '',
            items: d.deal_items.map(di => ({
                name: di.menu_item?.name || '',
                variant: di.menu_variant?.name || null,
                quantity: di.quantity,
            })),
        }));

        return res.json({
            success: true,
            data: formatted,
        });
    } catch (err) {
        console.error('[INTERNAL] Error listing deals:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve deals' },
        });
    }
});

export default router;
