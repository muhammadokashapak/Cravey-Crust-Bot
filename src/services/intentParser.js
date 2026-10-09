/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   Intent Parser — src/services/intentParser.js               ║
 * ║   Deterministic Intent Provider for WhatsApp Ordering Flow   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Architecture:
 *   WhatsApp Orchestrator
 *          ↓
 *   Intent Provider Interface (DeterministicIntentProvider)
 *          ↓
 *   Returns { intent, entities, confidence }
 */

// ─── Regular Expressions & Pattern Dictionaries ───────────────────────────

const GREETING_REGEX = /^(?:hi+|hello+|hey+|aoa|assalam\s*o?\s*alaikum|salam+|slam|start|shuru)\b/i;
const MENU_REGEX = /^(?:menu|show\s+menu|menu\s+bhejo|menu\s+dikhao|food|khana|items)\b/i;
const DEALS_REGEX = /^(?:deals|deal|special\s+deals|offers|deals\s+bhejo|deals\s+dikhao)(?!\s*#?\d)\b/i;
const CART_REGEX = /^(?:cart|mera\s+cart|my\s+cart|show\s+cart|view\s+cart|basket|cart\s+dikhao)\b/i;
const CLEAR_CART_REGEX = /^(?:clear\s+cart|empty\s+cart|cart\s+clear|cart\s+khali(?:\s+kar\s*do)?|delete\s+cart)\b/i;
const CHECKOUT_REGEX = /^(?:checkout|check\s+out|order\s+karna\s+hai|order\s+please|place\s+order|done\s+ordering|proceed)\b/i;
const HELP_REGEX = /^(?:help|madad|options|commands|guide)\b/i;
const HUMAN_HANDOFF_REGEX = /^(?:human|agent|talk\s+to\s+human|representative|bande\s+se\s+baat|admin\s+se\s+baat)\b/i;
const DELETE_DATA_REGEX = /^(?:delete\s+(?:my\s+)?data|remove\s+(?:my\s+)?data|clear\s+(?:my\s+)?data|mera\s+data\s+delete(?:\s+kar\s*do)?|mera\s+data\s+hata(?:\s+do)?|mera\s+record\s+delete(?:\s+kar\s*do)?|delete\s+account|forget\s+me)\b/i;

const POSITIVE_REGEX = /^(?:yes|haan|ha|ji|confirm|order\s+kar\s*do|theek\s+hai|ok|yup|done|1)\b/i;
const NEGATIVE_REGEX = /^(?:no|nahi|na|cancel|mat\s+karo|nope|abort|2)\b/i;

const SAME_NUMBER_REGEX = /^(?:same\s+number|isi\s+number|yehi\s+number|yahi\s+number|same\s+whatsapp|same)\b/i;
const PHONE_NUMBER_REGEX = /^(?:\+?92|0)?3[0-9]{9}$/;

const ORDER_NUMBER_REGEX = /(?:#?\bCC-\d{6}\b)/i;
const STATUS_QUERY_REGEX = /^(?:mera\s+order\s+kahan\s+hai|order\s+status|track\s+order|status|track)\b/i;
const CANCEL_QUERY_REGEX = /^(?:cancel\s+order|order\s+cancel|cancel)\b/i;

const COD_REGEX = /^(?:cod|cash|cash\s+on\s+delivery|1)\b/i;
const EASYPAISA_REGEX = /^(?:easypaisa|easy\s+paisa|ep|2)\b/i;

const FAQ_PATTERNS = [
    /\?/,
    /\b(?:delivery\s+kitni\s+dair|kitni\s+dair|kab\s+tak|kahan\s+hai|kya\s+hai)\b/i,
    /\b(?:timing|timings|open|close|address|location|refund|policy|halal|rider|discount|free delivery)\b/i,
    /\b(?:how|when|where|what|why)\b/i,
    /\b(?:price\s+of|rate\s+of)\b/i,
    /\bkya\b/i,
];

/**
 * Determine if text is asking about payment methods, COD, EasyPaisa, or payment details
 *
 * @param {string} text
 * @returns {boolean}
 */
export function isPaymentQuery(text) {
    const raw = (text || '').trim().toLowerCase();
    if (!raw) return false;

    // Exact standalone matches
    if (/^(?:cod|cash|cash\s+on\s+delivery|easypaisa|easy\s+paisa|ep|payment|payments)$/i.test(raw)) {
        return true;
    }

    // Direct starts with payment commands
    if (/^(?:payment\s+methods?|payment\s+options?|payment\s+details?|payment\s+mode|payment\s+modes|easypaisa\s+number|easypaisa\s+account|account\s+number|account\s+title|account\s+name|how\s+to\s+pay|pay\s+kaise)\b/i.test(raw)) {
        return true;
    }

    // Payment words accompanied by interrogatives, options or actions
    const hasPaymentWord = /\b(?:payment|payments|easypaisa|easy\s+paisa|cod|cash\s+on\s+delivery)\b/i.test(raw);
    if (hasPaymentWord) {
        if (/\b(?:method|methods|option|options|detail|details|kaise|karun|karein|karna|hogi|tarika|tareeqa|kya|kahan|available|accept|bhejo|send|number|title|account)\b/i.test(raw) || raw.includes('?')) {
            return true;
        }
    }

    return false;
}

/**
 * Deterministic Intent Provider implementation
 */
export class DeterministicIntentProvider {
    /**
     * Parse intent from normalized context
     *
     * @param {Object} context
     * @param {string} context.text
     * @param {string} [context.stage]
     * @param {string} [context.messageType]
     * @param {Object} [context.location]
     * @returns {{ intent: string, entities: Object, confidence: number }}
     */
    parseIntent(context) {
        const text = (context.text || '').trim();
        const stage = context.stage || 'START';
        const lower = text.toLowerCase();
        const hasLocation = Boolean(context.location || context.messageType === 'location');

        // ─── 1. Strict Stage Dialog Handlers ─────────────────────────────────

        // WAITING_NAME
        if (stage === 'WAITING_NAME') {
            if (NEGATIVE_REGEX.test(lower) && (lower === 'cancel' || lower === 'no')) {
                return { intent: 'DECLINE_ORDER', entities: {}, confidence: 0.95 };
            }
            if (text.length >= 2 && text.length <= 60 && !text.startsWith('/')) {
                return {
                    intent: 'PROVIDE_NAME',
                    entities: { customerName: text },
                    confidence: 0.95,
                };
            }
        }

        // WAITING_CONTACT
        if (stage === 'WAITING_CONTACT') {
            if (SAME_NUMBER_REGEX.test(lower)) {
                return {
                    intent: 'USE_SAME_WHATSAPP_NUMBER',
                    entities: {},
                    confidence: 0.99,
                };
            }

            const strippedPhone = text.replace(/[\s\-\(\)]/g, '');
            if (PHONE_NUMBER_REGEX.test(strippedPhone) || /^\d{10,12}$/.test(strippedPhone)) {
                return {
                    intent: 'PROVIDE_PHONE',
                    entities: { phone: strippedPhone },
                    confidence: 0.95,
                };
            }
        }

        // WAITING_LOCATION
        if (stage === 'WAITING_LOCATION') {
            if (hasLocation) {
                return {
                    intent: 'PROVIDE_LOCATION',
                    entities: { location: context.location },
                    confidence: 1.0,
                };
            }
            if (text.length >= 3) {
                return {
                    intent: 'PROVIDE_LOCATION',
                    entities: { locationText: text },
                    confidence: 0.9,
                };
            }
        }

        // WAITING_PAYMENT
        if (stage === 'WAITING_PAYMENT') {
            if (isPaymentQuery(lower) && (lower.includes('?') || lower.includes('kya') || lower.includes('kaise') || lower.includes('number') || lower.includes('detail') || lower.includes('title') || lower.includes('tarika') || lower.includes('tareeqa') || lower.includes('how'))) {
                return {
                    intent: 'PAYMENT_METHODS_QUERY',
                    entities: {},
                    confidence: 0.95,
                };
            }
            if (COD_REGEX.test(lower)) {
                return {
                    intent: 'SELECT_PAYMENT',
                    entities: { paymentMethod: 'COD' },
                    confidence: 0.95,
                };
            }
            if (EASYPAISA_REGEX.test(lower)) {
                return {
                    intent: 'SELECT_PAYMENT',
                    entities: { paymentMethod: 'EASYPAISA' },
                    confidence: 0.95,
                };
            }
        }

        // WAITING_ORDER_CONFIRMATION
        if (stage === 'WAITING_ORDER_CONFIRMATION') {
            if (POSITIVE_REGEX.test(lower)) {
                return { intent: 'CONFIRM_ORDER', entities: {}, confidence: 0.99 };
            }
            if (NEGATIVE_REGEX.test(lower)) {
                return { intent: 'DECLINE_ORDER', entities: {}, confidence: 0.99 };
            }
        }

        // WAITING_CANCEL_CONFIRMATION
        if (stage === 'WAITING_CANCEL_CONFIRMATION') {
            if (POSITIVE_REGEX.test(lower)) {
                return { intent: 'CONFIRM_CANCELLATION', entities: {}, confidence: 0.99 };
            }
            if (NEGATIVE_REGEX.test(lower)) {
                return { intent: 'DECLINE_CANCELLATION', entities: {}, confidence: 0.99 };
            }
        }

        // ─── 2. Global Status & Cancellation Commands ────────────────────────

        const cancelMatch = lower.match(/(?:cancel(?:\s+order)?)\s+(#?CC-\d{6})/i);
        if (cancelMatch) {
            return {
                intent: 'REQUEST_ORDER_CANCELLATION',
                entities: { orderNumber: cancelMatch[1].replace('#', '').toUpperCase() },
                confidence: 0.98,
            };
        }

        if (CANCEL_QUERY_REGEX.test(lower) && (lower.includes('order') || lower === 'cancel order')) {
            const rawOrderNo = text.match(ORDER_NUMBER_REGEX);
            return {
                intent: 'REQUEST_ORDER_CANCELLATION',
                entities: { orderNumber: rawOrderNo ? rawOrderNo[0].replace('#', '').toUpperCase() : null },
                confidence: 0.95,
            };
        }

        if (STATUS_QUERY_REGEX.test(lower) || lower.includes('order status') || lower.includes('track')) {
            const rawOrderNo = text.match(ORDER_NUMBER_REGEX);
            return {
                intent: 'ORDER_STATUS_QUERY',
                entities: { orderNumber: rawOrderNo ? rawOrderNo[0].replace('#', '').toUpperCase() : null },
                confidence: 0.95,
            };
        }

        // ─── 3. Core Navigation & Flow Commands ──────────────────────────────

        if (CHECKOUT_REGEX.test(lower)) {
            return { intent: 'CHECKOUT', entities: {}, confidence: 0.95 };
        }

        if (CLEAR_CART_REGEX.test(lower)) {
            return { intent: 'CLEAR_CART', entities: {}, confidence: 0.95 };
        }

        if (CART_REGEX.test(lower)) {
            return { intent: 'SHOW_CART', entities: {}, confidence: 0.95 };
        }

        if (DEALS_REGEX.test(lower)) {
            return { intent: 'SHOW_DEALS', entities: {}, confidence: 0.95 };
        }

        if (MENU_REGEX.test(lower)) {
            return { intent: 'SHOW_MENU', entities: {}, confidence: 0.95 };
        }

        if (HELP_REGEX.test(lower)) {
            return { intent: 'HELP', entities: {}, confidence: 0.95 };
        }

        if (HUMAN_HANDOFF_REGEX.test(lower)) {
            return { intent: 'HUMAN_HANDOFF', entities: {}, confidence: 0.95 };
        }

        if (DELETE_DATA_REGEX.test(lower)) {
            return { intent: 'DELETE_MY_DATA', entities: {}, confidence: 0.98 };
        }

        if (GREETING_REGEX.test(lower)) {
            return { intent: 'GREETING', entities: {}, confidence: 0.95 };
        }

        // ─── 4. Cart Modifications & Addition Patterns ───────────────────────

        // Remove item: "remove zinger", "zinger hata do", "delete zinger"
        const removeMatch = lower.match(/^(?:remove|delete|hata\s+do)\s+(.+)$/i) ||
                            lower.match(/^(.+?)\s+(?:hata\s+do|remove|delete)$/i);
        if (removeMatch) {
            return {
                intent: 'REMOVE_ITEM',
                entities: { itemQuery: removeMatch[1].trim() },
                confidence: 0.92,
            };
        }

        // Change quantity: "change zinger to 3", "make zinger 3"
        const changeQtyMatch = lower.match(/^(?:change|update|make)\s+(.+?)\s+(?:to\s+)?(\d+)$/i);
        if (changeQtyMatch) {
            return {
                intent: 'CHANGE_QUANTITY',
                entities: {
                    itemQuery: changeQtyMatch[1].trim(),
                    quantity: parseInt(changeQtyMatch[2], 10),
                },
                confidence: 0.92,
            };
        }

        // Add item Pattern A: "2 zinger", "3 chicken pizza", "1 deal 1"
        const prefixQtyMatch = lower.match(/^(\d+)\s+(?:x\s+)?([a-zA-Z0-9\s-]+)$/);
        if (prefixQtyMatch && prefixQtyMatch[2].trim().length > 1) {
            return {
                intent: 'ADD_ITEM',
                entities: {
                    quantity: parseInt(prefixQtyMatch[1], 10),
                    itemQuery: prefixQtyMatch[2].trim(),
                },
                confidence: 0.9,
            };
        }

        // Add item Pattern B: "zinger x2", "deal 1 x2"
        const suffixQtyMatch = lower.match(/^([a-zA-Z0-9\s-]+?)\s*(?:x|\*|\bx\b)\s*(\d+)$/);
        if (suffixQtyMatch && suffixQtyMatch[1].trim().length > 1) {
            return {
                intent: 'ADD_ITEM',
                entities: {
                    quantity: parseInt(suffixQtyMatch[2], 10),
                    itemQuery: suffixQtyMatch[1].trim(),
                },
                confidence: 0.9,
            };
        }

        // Add item Pattern C: "add 2 zinger", "add zinger"
        const addVerbMatch = lower.match(/^(?:add|order|chahiye)\s+(\d+)?\s*([a-zA-Z0-9\s-]+)$/);
        if (addVerbMatch) {
            return {
                intent: 'ADD_ITEM',
                entities: {
                    quantity: addVerbMatch[1] ? parseInt(addVerbMatch[1], 10) : 1,
                    itemQuery: addVerbMatch[2].trim(),
                },
                confidence: 0.9,
            };
        }

        // Add item Pattern D: direct numbered deal (e.g. "deal 1", "deal #2", "deal no 3")
        const directDealMatch = lower.match(/^(?:deal\s*(?:#|no\.?)?\s*\d+)$/i);
        if (directDealMatch) {
            return {
                intent: 'ADD_ITEM',
                entities: {
                    quantity: 1,
                    itemQuery: lower.trim(),
                },
                confidence: 0.92,
            };
        }

        // ─── Payment Methods Query (Restaurant Settings Priority over FAQ) ────
        if (isPaymentQuery(lower)) {
            return {
                intent: 'PAYMENT_METHODS_QUERY',
                entities: {},
                confidence: 0.95,
            };
        }

        // ─── 5. FAQ / Knowledge Questions ────────────────────────────────────

        const isFaqQuestion = FAQ_PATTERNS.some(p => p.test(lower));
        if (isFaqQuestion || lower.includes('?')) {
            return {
                intent: 'FAQ_QUERY',
                entities: { question: text },
                confidence: 0.88,
            };
        }

        // ─── 6. Category Selection & Numbers ─────────────────────────────────

        // If in BROWSING_MENU stage and user enters a numeric choice: "1", "2", "3"
        if (stage === 'BROWSING_MENU') {
            if (/^\d{1,2}$/.test(lower.trim())) {
                const num = parseInt(lower.trim(), 10);
                if (!isNaN(num) && num >= 1 && num <= 20) {
                    return {
                        intent: 'SHOW_CATEGORY',
                        entities: { categoryIndex: num },
                        confidence: 0.95,
                    };
                }
            }
        }

        if (/^(?:category\s*)?(\d{1,2})$/i.test(lower)) {
            const num = parseInt(lower.replace(/\D/g, ''), 10);
            return {
                intent: 'SHOW_CATEGORY',
                entities: { categoryIndex: num },
                confidence: 0.85,
            };
        }

        const categoryKeywords = ['burger', 'burgers', 'pizza', 'pizzas', 'side', 'sides', 'drink', 'drinks', 'beverage', 'dessert'];
        if (categoryKeywords.includes(lower)) {
            return {
                intent: 'SHOW_CATEGORY',
                entities: { categoryName: lower },
                confidence: 0.85,
            };
        }

        // ─── 7. Unknown Fallback ──────────────────────────────────────────────
        return {
            intent: 'UNKNOWN',
            entities: { rawText: text },
            confidence: 0.1,
        };
    }
}

// Global default provider instance
const defaultProvider = new DeterministicIntentProvider();

/**
 * AI-Ready Parse Intent interface
 *
 * @param {Object} context
 * @returns {{ intent: string, entities: Object, confidence: number }}
 */
export function parseIntent(context) {
    return defaultProvider.parseIntent(context);
}
