import { getDbClient } from '../db/client.js';
import { clearCart } from './cartService.js';
import { sendAdminHandoverAlert } from './whatsappNotificationService.js';
import { logger } from '../utils/logger.js';

// In-memory store of active human handover mutes
// Key: normalized phone or JID (e.g. "923001234567")
// Value: { chatId, phone, sessionKey, mutedAt, mutedUntil, durationMinutes, reason }
const mutedChats = new Map();

/**
 * Normalizes phone or WhatsApp JID to plain digits for consistent matching
 */
export function normalizePhoneOrJid(identifier) {
    if (!identifier || typeof identifier !== 'string') return '';
    const clean = identifier.trim().toLowerCase();
    // Extract digits before @
    const userPart = clean.includes('@') ? clean.split('@')[0] : clean;
    // Strip device suffix (e.g. 923001234567:1 -> 923001234567)
    const basePart = userPart.split(':')[0];
    let digits = basePart.replace(/\D/g, '');
    if (digits.startsWith('03')) {
        digits = '92' + digits.slice(1);
    }
    return digits;
}

/**
 * Mute a chat for human handover (default 2 hours / 120 minutes)
 * and clear active cart/session memory so unconfirmed orders don't linger.
 */
export async function muteChatForHandover({ chatId, sessionKey, durationMinutes = 120, reason = 'Customer requested human support', customerName, customerPhone, sock }) {
    const rawChatId = (chatId || '').trim();
    const rawSessionKey = (sessionKey || '').trim();
    const phoneDigits = normalizePhoneOrJid(rawChatId) || normalizePhoneOrJid(rawSessionKey);

    const now = new Date();
    const durationMs = (Number(durationMinutes) || 120) * 60 * 1000;
    const mutedUntil = new Date(now.getTime() + durationMs);

    const record = {
        chatId: rawChatId,
        phone: phoneDigits,
        sessionKey: rawSessionKey,
        mutedAt: now,
        mutedUntil,
        durationMinutes: Number(durationMinutes) || 120,
        reason,
    };

    // Store under both raw chatId and normalized digits for robust matching
    if (rawChatId) mutedChats.set(rawChatId, record);
    if (phoneDigits) mutedChats.set(phoneDigits, record);
    if (rawChatId && !rawChatId.endsWith('@s.whatsapp.net') && phoneDigits) {
        mutedChats.set(`${phoneDigits}@s.whatsapp.net`, record);
    }

    logger.info({ rawChatId, phoneDigits, mutedUntil, durationMinutes }, '[HANDOVER] Chat muted for human support');

    let resolvedCustomerName = customerName || null;
    let resolvedCustomerPhone = customerPhone || phoneDigits || null;

    // ── 1. Clear Active Cart & Memory in Database ──
    try {
        const prisma = getDbClient();
        if (prisma) {
            // Find session by sessionKey or chat_id
            const sessionQuery = [];
            if (rawSessionKey) sessionQuery.push({ session_key: rawSessionKey });
            if (rawChatId) sessionQuery.push({ chat_id: rawChatId });
            if (phoneDigits) sessionQuery.push({ verified_phone: phoneDigits });

            if (sessionQuery.length > 0) {
                const sessions = await prisma.conversationSession.findMany({
                    where: { OR: sessionQuery },
                    select: {
                        id: true,
                        session_key: true,
                        customer: { select: { name: true, phone: true } },
                    },
                });

                if (!resolvedCustomerName && sessions.length > 0) {
                    resolvedCustomerName = sessions.find(s => s.customer?.name)?.customer?.name || null;
                }
                if (!resolvedCustomerPhone && sessions.length > 0) {
                    resolvedCustomerPhone = sessions.find(s => s.customer?.phone)?.customer?.phone || null;
                }

                for (const s of sessions) {
                    // Reset session stage and clear pending orders
                    await prisma.conversationSession.update({
                        where: { id: s.id },
                        data: {
                            stage: 'START',
                            pending_order_id: null,
                            pending_cancel_order_id: null,
                            last_activity_at: now,
                        },
                    }).catch(() => {});

                    // Mark active carts as ABANDONED
                    await prisma.cart.updateMany({
                        where: { session_id: s.id, status: 'ACTIVE' },
                        data: { status: 'ABANDONED' },
                    }).catch(() => {});
                }
            }
        }

        // Also call clearCart if sessionKey provided
        if (rawSessionKey) {
            await clearCart({ sessionKey: rawSessionKey }).catch(() => {});
        }
    } catch (err) {
        logger.warn({ err: err.message }, '[HANDOVER] Non-fatal error while clearing cart memory');
    }

    // ── 2. Send Admin Notification via WhatsApp ──
    sendAdminHandoverAlert({
        customerChatId: rawChatId,
        customerPhone: resolvedCustomerPhone,
        customerName: resolvedCustomerName,
        durationMinutes: record.durationMinutes,
        reason,
        sock,
    }).catch(() => {});

    return {
        success: true,
        muted: true,
        chatId: rawChatId,
        phone: phoneDigits,
        mutedAt: now.toISOString(),
        mutedUntil: mutedUntil.toISOString(),
        durationMinutes: record.durationMinutes,
        message: `Chat is muted for ${record.durationMinutes} minutes. Bot will not respond, and cart memory has been cleared.`,
    };
}

/**
 * Check if a chat or phone number is currently muted
 */
export function isChatMuted(identifier) {
    if (!identifier) return { isMuted: false };

    const raw = (identifier || '').trim();
    const digits = normalizePhoneOrJid(raw);

    const record = mutedChats.get(raw) || (digits ? mutedChats.get(digits) : null);
    if (!record) {
        return { isMuted: false };
    }

    const now = new Date();
    if (record.mutedUntil <= now) {
        // Expired -> clean up
        mutedChats.delete(raw);
        if (digits) mutedChats.delete(digits);
        return { isMuted: false };
    }

    const remainingMs = record.mutedUntil.getTime() - now.getTime();
    const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));

    return {
        isMuted: true,
        remainingMinutes,
        mutedUntil: record.mutedUntil,
        reason: record.reason,
    };
}

/**
 * Manually unmute a chat
 */
export function unmuteChat(identifier) {
    if (!identifier) return { success: false, error: 'Identifier required' };
    const raw = (identifier || '').trim();
    const digits = normalizePhoneOrJid(raw);

    let removed = false;
    if (mutedChats.has(raw)) {
        mutedChats.delete(raw);
        removed = true;
    }
    if (digits && mutedChats.has(digits)) {
        mutedChats.delete(digits);
        removed = true;
    }

    logger.info({ identifier, removed }, '[HANDOVER] Chat unmuted');
    return { success: true, unmuted: true, removed };
}

/**
 * Get all active handover mutes
 */
export function getActiveHandoverMutes() {
    const now = new Date();
    const result = [];
    for (const [key, record] of mutedChats.entries()) {
        if (record.mutedUntil > now) {
            const remainingMinutes = Math.max(1, Math.ceil((record.mutedUntil.getTime() - now.getTime()) / 60000));
            result.push({
                key,
                chatId: record.chatId,
                phone: record.phone,
                remainingMinutes,
                mutedUntil: record.mutedUntil,
                reason: record.reason,
            });
        } else {
            mutedChats.delete(key);
        }
    }
    return result;
}
