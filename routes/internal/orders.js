import express from 'express';
import {
    createOrder,
    getOrderByNumber,
    getOrdersByCustomerPhone,
    requestOrderCancellation,
    confirmOrderCancellation,
} from '../../src/services/orderService.js';
import { getDefaultRestaurantId } from '../../src/services/restaurantService.js';

const router = express.Router();

/**
 * POST /api/internal/orders
 * Create an order from session cart with idempotency and transaction safety
 */
router.post('/', async (req, res) => {
    try {
        const restaurantId = await getDefaultRestaurantId();
        const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey;

        const result = await createOrder({
            restaurantId,
            idempotencyKey,
            ...req.body,
        });

        const statusCode = result.isDuplicate ? 200 : 201;
        return res.status(statusCode).json({
            success: true,
            status: result.status,
            isDuplicate: result.isDuplicate,
            data: result.order,
        });
    } catch (err) {
        console.warn('[INTERNAL ORDER CREATE] Error:', err.code, err.message);
        return res.status(err.code ? 400 : 500).json({
            success: false,
            error: {
                code: err.code || 'ORDER_CREATION_FAILED',
                message: err.message,
            },
        });
    }
});

/**
 * GET /api/internal/orders/customer/:phone
 * Lookup recent orders for a customer (e.g. "mera order kahan hai?")
 */
router.get('/customer/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        const restaurantId = await getDefaultRestaurantId();
        const orders = await getOrdersByCustomerPhone({ restaurantId, phone });

        return res.json({
            success: true,
            data: orders,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: {
                code: err.code || 'CUSTOMER_ORDERS_ERROR',
                message: err.message,
            },
        });
    }
});

/**
 * GET /api/internal/orders/:orderNumber
 * Authoritative order details lookup
 */
router.get('/:orderNumber', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const restaurantId = await getDefaultRestaurantId();
        const order = await getOrderByNumber({ restaurantId, orderNumber });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'ORDER_NOT_FOUND',
                    message: `Order ${orderNumber} not found`,
                },
            });
        }

        return res.json({
            success: true,
            data: order,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: {
                code: err.code || 'ORDER_LOOKUP_ERROR',
                message: err.message,
            },
        });
    }
});

/**
 * POST /api/internal/orders/:orderNumber/request-cancel
 * Two-Step Cancellation: Step 1
 */
router.post('/:orderNumber/request-cancel', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const { sessionKey } = req.body || {};
        const restaurantId = await getDefaultRestaurantId();

        const result = await requestOrderCancellation({
            restaurantId,
            orderNumber,
            sessionKey,
        });

        return res.json({
            success: true,
            ...result,
        });
    } catch (err) {
        return res.status(err.code ? 400 : 500).json({
            success: false,
            error: {
                code: err.code || 'CANCEL_REQUEST_FAILED',
                message: err.message,
            },
        });
    }
});

/**
 * POST /api/internal/orders/:orderNumber/confirm-cancel
 * Two-Step Cancellation: Step 2
 */
router.post('/:orderNumber/confirm-cancel', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const { sessionKey, confirmed } = req.body || {};
        const restaurantId = await getDefaultRestaurantId();

        const result = await confirmOrderCancellation({
            restaurantId,
            orderNumber,
            sessionKey,
            confirmed: confirmed === true || confirmed === 'true',
        });

        return res.json({
            success: true,
            ...result,
        });
    } catch (err) {
        return res.status(err.code ? 400 : 500).json({
            success: false,
            error: {
                code: err.code || 'CANCEL_CONFIRM_FAILED',
                message: err.message,
            },
        });
    }
});

export default router;
