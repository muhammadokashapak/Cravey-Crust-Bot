import express from 'express';
import {
    getActiveCart,
    addItemToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    calculateCartTotals,
} from '../../src/services/cartService.js';
import { getDefaultRestaurantId } from '../../src/services/restaurantService.js';

const router = express.Router();

/**
 * GET /api/internal/cart/:sessionKey
 * Load active cart for a session
 */
router.get('/:sessionKey', async (req, res) => {
    try {
        const { sessionKey } = req.params;
        const restaurantId = await getDefaultRestaurantId();
        const cart = await getActiveCart({
            sessionKey,
            restaurantId,
            chatId: req.query.chatId,
            verifiedPhone: req.query.verifiedPhone,
        });

        return res.json({
            success: true,
            data: cart,
        });
    } catch (err) {
        return res.status(err.code ? 400 : 500).json({
            success: false,
            error: {
                code: err.code || 'INTERNAL_ERROR',
                message: err.message,
            },
        });
    }
});

/**
 * POST /api/internal/cart/:sessionKey/items
 * Add an item or deal to cart with strict backend validation
 */
router.post('/:sessionKey/items', async (req, res) => {
    try {
        const { sessionKey } = req.params;
        const restaurantId = await getDefaultRestaurantId();
        const { menuItemId, variantId, dealId, quantity, notes } = req.body || {};

        const cart = await addItemToCart({
            sessionKey,
            restaurantId,
            menuItemId,
            variantId,
            dealId,
            quantity: quantity ? parseInt(quantity, 10) : 1,
            notes,
        });

        return res.status(201).json({
            success: true,
            data: cart,
        });
    } catch (err) {
        return res.status(err.code ? 400 : 500).json({
            success: false,
            error: {
                code: err.code || 'CART_ADD_ERROR',
                message: err.message,
            },
        });
    }
});

/**
 * PATCH /api/internal/cart/:sessionKey/items/:cartItemId
 * Update quantity or notes of a cart item
 */
router.patch('/:sessionKey/items/:cartItemId', async (req, res) => {
    try {
        const { sessionKey, cartItemId } = req.params;
        const { quantity, notes } = req.body || {};

        const cart = await updateCartItem({
            sessionKey,
            cartItemId,
            quantity: quantity !== undefined ? parseInt(quantity, 10) : undefined,
            notes,
        });

        return res.json({
            success: true,
            data: cart,
        });
    } catch (err) {
        return res.status(err.code ? 400 : 500).json({
            success: false,
            error: {
                code: err.code || 'CART_UPDATE_ERROR',
                message: err.message,
            },
        });
    }
});

/**
 * DELETE /api/internal/cart/:sessionKey/items/:cartItemId
 * Remove an item from cart
 */
router.delete('/:sessionKey/items/:cartItemId', async (req, res) => {
    try {
        const { sessionKey, cartItemId } = req.params;
        const cart = await removeCartItem({ sessionKey, cartItemId });

        return res.json({
            success: true,
            data: cart,
        });
    } catch (err) {
        return res.status(err.code ? 400 : 500).json({
            success: false,
            error: {
                code: err.code || 'CART_DELETE_ERROR',
                message: err.message,
            },
        });
    }
});

/**
 * DELETE /api/internal/cart/:sessionKey
 * Clear entire cart
 */
router.delete('/:sessionKey', async (req, res) => {
    try {
        const { sessionKey } = req.params;
        const cart = await clearCart({ sessionKey });

        return res.json({
            success: true,
            data: cart,
        });
    } catch (err) {
        return res.status(err.code ? 400 : 500).json({
            success: false,
            error: {
                code: err.code || 'CART_CLEAR_ERROR',
                message: err.message,
            },
        });
    }
});

/**
 * POST /api/internal/cart/:sessionKey/calculate
 * Calculate authoritative totals for active cart via pricingService
 */
router.post('/:sessionKey/calculate', async (req, res) => {
    try {
        const { sessionKey } = req.params;
        const restaurantId = await getDefaultRestaurantId();
        const { promoCode, deliveryAreaId, deliveryAreaName, latitude, longitude } = req.body || {};

        const totals = await calculateCartTotals({
            sessionKey,
            restaurantId,
            promoCode,
            deliveryAreaId,
            deliveryAreaName,
            latitude: latitude != null ? Number(latitude) : undefined,
            longitude: longitude != null ? Number(longitude) : undefined,
        });

        return res.json({
            success: true,
            data: totals,
        });
    } catch (err) {
        return res.status(err.code ? 400 : 500).json({
            success: false,
            error: {
                code: err.code || 'CART_CALCULATION_ERROR',
                message: err.message,
            },
        });
    }
});

export default router;
