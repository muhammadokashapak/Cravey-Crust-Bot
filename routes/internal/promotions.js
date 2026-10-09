import express from 'express';
import { getDbClient } from '../../src/db/client.js';
import { getDefaultRestaurantId } from '../../src/services/restaurantService.js';

const router = express.Router();

/**
 * GET /api/internal/promotions/active
 * Returns active, unexpired promotions for bot ordering
 */
router.get('/active', async (req, res) => {
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

        const promos = await prisma.promotion.findMany({
            where: {
                restaurant_id: restaurantId,
                is_active: true,
                AND: [
                    { OR: [{ start_at: null }, { start_at: { lte: now } }] },
                    { OR: [{ end_at: null }, { end_at: { gte: now } }] },
                ],
            },
            include: {
                targets: true,
            },
        });

        const formatted = promos.map(p => ({
            id: p.id,
            name: p.name,
            code: p.code,
            description: p.description || '',
            discountType: p.discount_type,
            discountValue: Number(p.discount_value),
            minimumOrder: p.minimum_order != null ? Number(p.minimum_order) : 0,
            maximumDiscount: p.maximum_discount != null ? Number(p.maximum_discount) : null,
            targets: p.targets.map(t => ({
                targetType: t.target_type,
                targetId: t.target_id,
            })),
        }));

        return res.json({
            success: true,
            data: formatted,
        });
    } catch (err) {
        console.error('[INTERNAL] Error listing active promotions:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve promotions' },
        });
    }
});

export default router;
