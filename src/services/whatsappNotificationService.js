/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   WhatsApp Notification Service                              ║
 * ║   src/services/whatsappNotificationService.js                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Responsibilities:
 *   - sendAdminNewOrderNotification(): Notifies restaurant admin of new orders via WhatsApp.
 *   - sendCustomerOrderStatusNotification(): Notifies customer when order status changes.
 *   - sendCancellationNotification(): Notifies customer and admin when order is cancelled.
 *
 * Safety & Reliability Rules:
 *   - Notification failure must NEVER rollback or undo a valid database operation.
 *   - Errors are caught safely and logged.
 *   - Reuses existing connected Baileys WhatsApp socket.
 */

import { getDbClient } from '../db/client.js';
import { getDefaultRestaurantId } from './restaurantService.js';
import { logger } from '../utils/logger.js';

let _socketResolver = null;

/**
 * Register a socket resolver function or active sessions map
 * @param {Function|Map} resolver
 */
export function registerSocketResolver(resolver) {
    _socketResolver = resolver;
}

/**
 * Helper to resolve an active Baileys socket
 */
function resolveSocket(explicitSock) {
    if (explicitSock) return explicitSock;
    if (typeof _socketResolver === 'function') {
        const resolved = _socketResolver();
        if (resolved?.sendMessage) return resolved;
        if (resolved?.sock?.sendMessage) return resolved.sock;
        if (resolved instanceof Map) {
            for (const sess of resolved.values()) {
                if (sess.state === 'connected' && sess.sock?.sendMessage) {
                    return sess.sock;
                }
            }
        }
    } else if (_socketResolver instanceof Map) {
        for (const sess of _socketResolver.values()) {
            if (sess.state === 'connected' && sess.sock?.sendMessage) {
                return sess.sock;
            }
        }
    }
    return null;
}

/**
 * Format phone string to valid WhatsApp JID
 */
function formatPhoneToJid(phone) {
    if (!phone) return null;
    let clean = String(phone).replace(/\D/g, '');
    if (clean.startsWith('03')) {
        clean = '92' + clean.slice(1);
    }
    if (clean.length < 10) return null;
    return `${clean}@s.whatsapp.net`;
}

/**
 * Send WhatsApp notification to Admin when a new order is placed
 *
 * @param {Object} params
 * @param {Object} params.order
 * @param {string} [params.restaurantId]
 * @param {Object} [params.sock]
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendAdminNewOrderNotification({ order, restaurantId, sock }) {
    try {
        if (!order) return { success: false, error: 'No order provided' };

        const prisma = getDbClient();
        const restId = restaurantId || order.restaurant_id || await getDefaultRestaurantId();

        let adminPhone = null;
        if (prisma) {
            const restaurant = await prisma.restaurant.findUnique({
                where: { id: restId },
                select: { admin_notification_phone: true, phone: true },
            });
            adminPhone = restaurant?.admin_notification_phone || restaurant?.phone;
        }

        // Fall back to process.env.OWNER_NUMBER if not set in DB
        if (!adminPhone && process.env.OWNER_NUMBER) {
            adminPhone = process.env.OWNER_NUMBER;
        }

        const adminJid = formatPhoneToJid(adminPhone);
        if (!adminJid) {
            logger.warn({ orderNumber: order.order_number }, '[NOTIFY] Admin notification skipped: No valid admin phone configured');
            return { success: false, error: 'No valid admin phone configured' };
        }

        const activeSock = resolveSocket(sock);
        if (!activeSock) {
            logger.warn({ orderNumber: order.order_number }, '[NOTIFY] Admin notification skipped: WhatsApp socket not connected');
            return { success: false, error: 'WhatsApp socket not connected' };
        }

        const customerName = order.customerName || order.customer_name || order.customer?.name || 'Customer';
        const total = order.pricing?.total != null 
            ? Number(order.pricing.total).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
            : (order.final_total != null ? Number(order.final_total).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00');
        const areaName = order.delivery?.areaName || order.delivery_area_name || order.delivery_address || 'Delivery Area';
        const payment = order.payment?.method || order.payment_method || 'COD';

        const messageText = 
`New Order Received

Order: #${order.orderNumber || order.order_number}
Customer: ${customerName}
Total: Rs.${total}
Area: ${areaName}
Payment: ${payment}

View in dashboard: http://localhost:3000`;

        await activeSock.sendMessage(adminJid, { text: messageText });
        logger.info({ orderNumber: order.order_number, adminJid }, '[NOTIFY] Admin WhatsApp notification sent');
        return { success: true };
    } catch (err) {
        // Notification failure must NEVER rollback or throw
        logger.error({ err: err.message, orderNumber: order?.order_number }, '[NOTIFY] Failed to send admin new order notification');
        return { success: false, error: err.message };
    }
}

/**
 * Send WhatsApp status update notification to the customer
 *
 * @param {Object} params
 * @param {Object} params.order
 * @param {string} params.newStatus
 * @param {string} [params.reason]
 * @param {Object} [params.sock]
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendCustomerOrderStatusNotification({ order, newStatus, reason, sock }) {
    try {
        if (!order) return { success: false, error: 'No order provided' };

        const orderNumber = order.orderNumber || order.order_number;
        const targetPhone = order.phone || order.customer?.phone || order.whatsappPhone || order.whatsapp_phone;
        const customerJid = formatPhoneToJid(targetPhone);
        if (!customerJid) {
            logger.warn({ orderNumber }, '[NOTIFY] Customer status notification skipped: No valid customer phone');
            return { success: false, error: 'No valid customer phone' };
        }

        const activeSock = resolveSocket(sock);
        if (!activeSock) {
            logger.warn({ orderNumber }, '[NOTIFY] Customer status notification skipped: WhatsApp socket not connected');
            return { success: false, error: 'WhatsApp socket not connected' };
        }

        let statusMessage = '';
        switch (newStatus) {
            case 'CONFIRMED':
                statusMessage = `Aap ka order #${orderNumber} confirm ho chuka hai. Hum jald is par kaam shuru kar rahe hain!`;
                break;
            case 'PREPARING':
                statusMessage = `Aap ka order #${orderNumber} kitchen mein prepare ho raha hai!`;
                break;
            case 'READY':
                statusMessage = `Aap ka order #${orderNumber} ready hai aur packing complete ho chuki hai!`;
                break;
            case 'OUT_FOR_DELIVERY':
                statusMessage = `Aap ka order #${orderNumber} delivery rider ke paas hai aur aap ki taraf nikal chuka hai!`;
                break;
            case 'DELIVERED':
                statusMessage = `Aap ka order #${orderNumber} successfully deliver ho gaya hai. Cravey Crust choose karne ka shukriya! Apne feedback se zaroor aagah kijiyega.`;
                break;
            case 'CANCELLED':
                statusMessage = `Aap ka order #${orderNumber} cancel kar diya gaya hai.${reason ? ` Reason: ${reason}` : ''}`;
                break;
            default:
                statusMessage = `Aap ke order #${orderNumber} ka status update ho kar ${newStatus} ho gaya hai.`;
        }

        await activeSock.sendMessage(customerJid, { text: statusMessage });
        logger.info({ orderNumber, newStatus, customerJid }, '[NOTIFY] Customer status notification sent');
        return { success: true };
    } catch (err) {
        logger.error({ err: err.message, orderNumber: order?.order_number }, '[NOTIFY] Failed to send customer status notification');
        return { success: false, error: err.message };
    }
}

/**
 * Send cancellation notification
 */
export async function sendCancellationNotification({ order, reason, sock }) {
    return sendCustomerOrderStatusNotification({ order, newStatus: 'CANCELLED', reason, sock });
}
