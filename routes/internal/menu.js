import express from 'express';
import { getDbClient } from '../../src/db/client.js';
import { getDefaultRestaurantId } from '../../src/services/restaurantService.js';

const router = express.Router();

/**
 * GET /api/internal/menu
 * Returns active categories with active items and available variants.
 * Clean, bot-friendly response.
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

        // Query active categories containing active, available items
        const categories = await prisma.category.findMany({
            where: {
                restaurant_id: restaurantId,
                is_active: true,
            },
            orderBy: { sort_order: 'asc' },
            include: {
                menu_items: {
                    where: {
                        is_active: true,
                        is_available: true,
                    },
                    orderBy: { name: 'asc' },
                    include: {
                        variants: {
                            where: { is_available: true },
                            orderBy: { sort_order: 'asc' },
                        },
                    },
                },
            },
        });

        const formattedCategories = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description || '',
            items: cat.menu_items.map(item => ({
                id: item.id,
                name: item.name,
                slug: item.slug,
                description: item.description || '',
                basePrice: Number(item.base_price),
                available: item.is_available,
                spicyLevel: item.spicy_level,
                imageUrl: item.image_url || '',
                variants: item.variants.map(v => ({
                    id: v.id,
                    name: v.name,
                    price: Number(v.price),
                    available: v.is_available,
                })),
            })),
        }));

        return res.json({
            success: true,
            data: {
                restaurant_id: restaurantId,
                categories: formattedCategories,
            },
        });
    } catch (err) {
        console.error('[INTERNAL] Error retrieving menu:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve menu' },
        });
    }
});

/**
 * GET /api/internal/menu/categories
 * Returns active categories only
 */
router.get('/categories', async (req, res) => {
    try {
        const prisma = getDbClient();
        if (!prisma) {
            return res.status(503).json({
                success: false,
                error: { code: 'DB_UNAVAILABLE', message: 'Database not available' },
            });
        }

        const restaurantId = await getDefaultRestaurantId();
        const categories = await prisma.category.findMany({
            where: {
                restaurant_id: restaurantId,
                is_active: true,
            },
            orderBy: { sort_order: 'asc' },
            select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                sort_order: true,
            },
        });

        return res.json({
            success: true,
            data: categories,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: err.message },
        });
    }
});

/**
 * GET /api/internal/menu/search?q=
 * Search active & available menu items
 */
router.get('/search', async (req, res) => {
    try {
        const prisma = getDbClient();
        if (!prisma) {
            return res.status(503).json({
                success: false,
                error: { code: 'DB_UNAVAILABLE', message: 'Database not available' },
            });
        }

        const query = req.query.q || req.query.query || '';
        if (!query.trim()) {
            return res.json({ success: true, data: [] });
        }

        const restaurantId = await getDefaultRestaurantId();

        const items = await prisma.menuItem.findMany({
            where: {
                restaurant_id: restaurantId,
                is_active: true,
                is_available: true,
                category: { is_active: true },
                OR: [
                    { name: { contains: query.trim(), mode: 'insensitive' } },
                    { description: { contains: query.trim(), mode: 'insensitive' } },
                ],
            },
            include: {
                category: { select: { id: true, name: true, slug: true } },
                variants: {
                    where: { is_available: true },
                    orderBy: { sort_order: 'asc' },
                },
            },
        });

        const formatted = items.map(item => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
            description: item.description || '',
            category: item.category.name,
            basePrice: Number(item.base_price),
            available: item.is_available,
            imageUrl: item.image_url || '',
            variants: item.variants.map(v => ({
                id: v.id,
                name: v.name,
                price: Number(v.price),
                available: v.is_available,
            })),
        }));

        return res.json({ success: true, data: formatted });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: err.message },
        });
    }
});

/**
 * GET /api/internal/menu/:id
 * Retrieve single active menu item by ID or slug
 */
router.get('/:id', async (req, res) => {
    try {
        const prisma = getDbClient();
        if (!prisma) {
            return res.status(503).json({
                success: false,
                error: { code: 'DB_UNAVAILABLE', message: 'Database not available' },
            });
        }

        const restaurantId = await getDefaultRestaurantId();
        const idOrSlug = req.params.id;

        const item = await prisma.menuItem.findFirst({
            where: {
                restaurant_id: restaurantId,
                is_active: true,
                is_available: true,
                category: { is_active: true },
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug },
                ],
            },
            include: {
                category: { select: { id: true, name: true, slug: true } },
                variants: {
                    where: { is_available: true },
                    orderBy: { sort_order: 'asc' },
                },
            },
        });

        if (!item) {
            return res.status(404).json({
                success: false,
                error: { code: 'ITEM_NOT_FOUND', message: 'Menu item not found or unavailable' },
            });
        }

        return res.json({
            success: true,
            data: {
                id: item.id,
                name: item.name,
                slug: item.slug,
                description: item.description || '',
                category: item.category.name,
                basePrice: Number(item.base_price),
                available: item.is_available,
                imageUrl: item.image_url || '',
                variants: item.variants.map(v => ({
                    id: v.id,
                    name: v.name,
                    price: Number(v.price),
                    available: v.is_available,
                })),
            },
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: err.message },
        });
    }
});

export default router;
