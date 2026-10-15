/**
 * ╔══════════════════════════════════════════╗
 * ║  Sender Identity — utils/senderIdentity.js ║
 * ║  Safe resolution of WhatsApp sender JIDs ║
 * ║  including @lid ↔ phone-number mapping.  ║
 * ╚══════════════════════════════════════════╝
 *
 * Rules:
 *  - NEVER convert an @lid value into a phone number
 *  - If phone cannot be safely verified, phone = "" and phoneVerified = false
 *  - Never throw — always return a safe fallback identity object
 *  - ESM compatible, zero external dependencies
 *
 * Baileys v6.7.21 sets the following fields on msg.key (when available from WA):
 *   msg.key.senderLid       — @lid JID of the sender (private chats)
 *   msg.key.senderPn        — @s.whatsapp.net phone JID of the sender
 *   msg.key.participant     — sender JID in group messages
 *   msg.key.participantPn   — @s.whatsapp.net phone JID for group participant
 *   msg.key.participantLid  — @lid for group participant
 *
 * These come from WhatsApp stanza attrs: sender_lid, sender_pn, participant_pn, participant_lid
 * and are decoded inside Baileys' decodeMessageNode() without any mapping API needed.
 */

// ─── JID Type Guards ──────────────────────────────────────

/**
 * Returns true ONLY when jid is a verified phone-number JID.
 * The only safe phone-number JID format in Baileys is @s.whatsapp.net.
 *
 * @param {string|undefined|null} jid
 * @returns {boolean}
 */
export function isPhoneJid(jid) {
    if (typeof jid !== 'string' || !jid) return false;
    const cleanJid = jid.split(':')[0] + (jid.includes('@') ? '@' + jid.split('@')[1] : '');
    return cleanJid.endsWith('@s.whatsapp.net') || cleanJid.endsWith('@c.us');
}

/**
 * Returns true when jid is a Linked-ID (LID) JID.
 * A LID must NEVER be converted directly to a phone number.
 *
 * @param {string|undefined|null} jid
 * @returns {boolean}
 */
export function isLidJid(jid) {
    if (typeof jid !== 'string' || !jid) return false;
    return jid.endsWith('@lid');
}

// ─── Phone Extraction ─────────────────────────────────────

/**
 * Extract a clean numeric phone string from a verified phone JID or candidate string.
 * Formats Pakistani mobile numbers into the standard 11-digit local format: 03xxxxxxxxx.
 *
 * Examples:
 *   "923001234567@s.whatsapp.net"  → "03001234567"
 *   "03001234567"                  → "03001234567"
 *   "3001234567"                   → "03001234567"
 *   "86634523582505@lid"           → ""  (NEVER converted)
 *
 * @param {string|undefined|null} input
 * @returns {string}
 */
export function normalizePhoneFromJid(input) {
    if (!input || typeof input !== 'string') return '';
    const s = input.trim();
    if (s.includes('@lid') && !s.includes('@s.whatsapp.net')) return '';
    // Strip device suffix (e.g. :12) and domain
    const user = s.split('@')[0].split(':')[0];
    const digits = user.replace(/\D/g, '');
    if (!digits) return '';

    // Format Pakistani numbers to standard 11-digit local format: 03xxxxxxxxx
    if (digits.startsWith('92') && digits.length === 12) {
        return '0' + digits.slice(2);
    }
    if (digits.startsWith('03') && digits.length === 11) {
        return digits;
    }
    if (digits.length === 10 && digits.startsWith('3')) {
        return '0' + digits;
    }
    if (digits.length >= 10) {
        return digits;
    }
    return '';
}

// ─── Main Identity Resolver ───────────────────────────────

/**
 * Resolve the verified sender identity from a Baileys message.
 * Fetches the user's actual phone number across all Baileys stanza attributes,
 * alternate JIDs, and LID mappings.
 *
 * @param {object} sock     Baileys socket
 * @param {object} msg      Raw Baileys message object
 * @param {object} session  WhatsAppSession instance
 * @returns {Promise<{
 *   phone: string,
 *   whatsappPhone: string,
 *   phoneVerified: boolean,
 *   phoneSource: string,
 *   senderJid: string,
 *   senderLid: string,
 *   rawRemoteJid: string,
 *   rawParticipant: string
 * }>}
 */
export async function resolveSenderIdentity(sock, msg, session) {
    const UNRESOLVED = {
        phone: '',
        whatsappPhone: '',
        phoneVerified: false,
        phoneSource: 'unknown',
        senderJid: '',
        senderLid: '',
        rawRemoteJid: '',
        rawParticipant: '',
    };

    try {
        if (!msg || !msg.key) return { ...UNRESOLVED, phoneSource: 'no_key' };

        const key = msg.key;
        const rawRemoteJid      = typeof key.remoteJid      === 'string' ? key.remoteJid      : '';
        const rawParticipant    = typeof key.participant    === 'string' ? key.participant    : '';
        const rawRemoteJidAlt   = typeof key.remoteJidAlt   === 'string' ? key.remoteJidAlt   : '';
        const rawParticipantAlt = typeof key.participantAlt === 'string' ? key.participantAlt : '';
        const rawSenderPn       = typeof key.senderPn       === 'string' ? key.senderPn       : '';
        const rawParticipantPn  = typeof key.participantPn  === 'string' ? key.participantPn  : '';
        const rawMsgParticipant = typeof msg.participant    === 'string' ? msg.participant    : '';

        // ── Collect LID candidates ──────────────────────────
        let resolvedLid = '';
        if (isLidJid(rawRemoteJid)) resolvedLid = rawRemoteJid;
        if (!resolvedLid && isLidJid(typeof key.senderLid === 'string' ? key.senderLid : '')) {
            resolvedLid = key.senderLid;
        }
        if (!resolvedLid && isLidJid(typeof key.participantLid === 'string' ? key.participantLid : '')) {
            resolvedLid = key.participantLid;
        }

        // ── Prioritized Phone Candidates ────────────────────
        const candidates = [
            { jid: rawRemoteJidAlt,   source: 'remote_jid_alt' },
            { jid: rawSenderPn,       source: 'sender_pn' },
            { jid: rawParticipantAlt, source: 'participant_alt' },
            { jid: rawParticipantPn,  source: 'participant_pn' },
            { jid: rawParticipant,    source: 'participant' },
            { jid: rawMsgParticipant, source: 'msg_participant' },
            { jid: rawRemoteJid,      source: 'remote_jid' },
        ];

        for (const cand of candidates) {
            if (cand.jid && isPhoneJid(cand.jid)) {
                const phone = normalizePhoneFromJid(cand.jid);
                if (phone) {
                    return {
                        phone,
                        whatsappPhone: phone,
                        phoneVerified: true,
                        phoneSource: cand.source,
                        senderJid: cand.jid,
                        senderLid: resolvedLid,
                        rawRemoteJid,
                        rawParticipant,
                    };
                }
            }
        }

        // ── Signal Repository LID Mapping Lookup ────────────
        if (resolvedLid && sock?.signalRepository?.lidMapping?.getPNForLID) {
            try {
                const mappedPn = await sock.signalRepository.lidMapping.getPNForLID(resolvedLid);
                if (mappedPn && isPhoneJid(mappedPn)) {
                    const phone = normalizePhoneFromJid(mappedPn);
                    if (phone) {
                        return {
                            phone,
                            whatsappPhone: phone,
                            phoneVerified: true,
                            phoneSource: 'lid_mapping',
                            senderJid: mappedPn,
                            senderLid: resolvedLid,
                            rawRemoteJid,
                            rawParticipant,
                        };
                    }
                }
            } catch (lidErr) {
                // Non-critical mapping lookup fallback
            }
        }

        // ── Socket Contacts Cache Lookup ────────────────────
        const contacts = sock?.store?.contacts || sock?.contacts;
        if (resolvedLid && contacts && contacts[resolvedLid]) {
            const c = contacts[resolvedLid];
            const candidate = c.phoneNumber || c.pn || c.id;
            if (candidate && isPhoneJid(candidate)) {
                const phone = normalizePhoneFromJid(candidate);
                if (phone) {
                    return {
                        phone,
                        whatsappPhone: phone,
                        phoneVerified: true,
                        phoneSource: 'store_contacts',
                        senderJid: candidate,
                        senderLid: resolvedLid,
                        rawRemoteJid,
                        rawParticipant,
                    };
                }
            }
        }

        // ── Unresolved LID ──────────────────────────────────
        if (resolvedLid) {
            return {
                phone: '',
                whatsappPhone: '',
                phoneVerified: false,
                phoneSource: 'unresolved_lid',
                senderJid: '',
                senderLid: resolvedLid,
                rawRemoteJid,
                rawParticipant,
            };
        }

        return { ...UNRESOLVED, phoneSource: 'unknown' };

    } catch (err) {
        return { ...UNRESOLVED, phoneSource: 'error' };
    }
}
