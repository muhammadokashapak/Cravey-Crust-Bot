import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone } from '../src/services/customerService.js';
import { SESSION_STAGES } from '../src/services/sessionService.js';
import { VALID_STATUS_TRANSITIONS, CANCELLABLE_STATUSES } from '../src/services/orderService.js';
import { broadcastOrderEvent } from '../src/services/realtimeService.js';

test('─── Phase 4: Customer Phone Normalization ───', async (t) => {
    await t.test('normalizes standard international phone numbers', () => {
        assert.equal(normalizePhone('+92 300 1234567'), '923001234567');
        assert.equal(normalizePhone('0300-1234567'), '03001234567');
        assert.equal(normalizePhone('+92-332-1234567'), '923321234567');
    });

    await t.test('handles empty or undefined phone safely', () => {
        assert.equal(normalizePhone(null), '');
        assert.equal(normalizePhone(undefined), '');
        assert.equal(normalizePhone(''), '');
    });
});

test('─── Phase 4: Session Stages Verification ───', async (t) => {
    await t.test('includes all required conversation session stages', () => {
        const required = [
            'START',
            'BROWSING_MENU',
            'BUILDING_CART',
            'WAITING_NAME',
            'WAITING_CONTACT',
            'WAITING_LOCATION',
            'WAITING_PAYMENT',
            'WAITING_ORDER_CONFIRMATION',
            'ORDER_CONFIRMED',
            'WAITING_CANCEL_ORDER_ID',
            'WAITING_CANCEL_CONFIRMATION',
            'CANCELLED',
        ];

        for (const stage of required) {
            assert.ok(SESSION_STAGES.includes(stage), `Stage ${stage} must be present in SESSION_STAGES`);
        }
    });
});

test('─── Phase 4: Order Status State Machine Rules ───', async (t) => {
    await t.test('PENDING can only transition to CONFIRMED or CANCELLED', () => {
        const transitions = VALID_STATUS_TRANSITIONS.PENDING;
        assert.deepEqual(transitions, ['CONFIRMED', 'CANCELLED']);
    });

    await t.test('CONFIRMED can transition to PREPARING or CANCELLED', () => {
        const transitions = VALID_STATUS_TRANSITIONS.CONFIRMED;
        assert.deepEqual(transitions, ['PREPARING', 'CANCELLED']);
    });

    await t.test('PREPARING can transition to READY or CANCELLED', () => {
        const transitions = VALID_STATUS_TRANSITIONS.PREPARING;
        assert.deepEqual(transitions, ['READY', 'CANCELLED']);
    });

    await t.test('READY can transition to OUT_FOR_DELIVERY or CANCELLED', () => {
        const transitions = VALID_STATUS_TRANSITIONS.READY;
        assert.deepEqual(transitions, ['OUT_FOR_DELIVERY', 'CANCELLED']);
    });

    await t.test('OUT_FOR_DELIVERY can only transition to DELIVERED', () => {
        const transitions = VALID_STATUS_TRANSITIONS.OUT_FOR_DELIVERY;
        assert.deepEqual(transitions, ['DELIVERED']);
    });

    await t.test('DELIVERED and CANCELLED are terminal states (no transitions allowed)', () => {
        assert.deepEqual(VALID_STATUS_TRANSITIONS.DELIVERED, []);
        assert.deepEqual(VALID_STATUS_TRANSITIONS.CANCELLED, []);
    });

    await t.test('Cancellable statuses are PENDING, CONFIRMED, PREPARING', () => {
        assert.deepEqual(CANCELLABLE_STATUSES, ['PENDING', 'CONFIRMED', 'PREPARING']);
        assert.equal(CANCELLABLE_STATUSES.includes('READY'), false);
        assert.equal(CANCELLABLE_STATUSES.includes('OUT_FOR_DELIVERY'), false);
        assert.equal(CANCELLABLE_STATUSES.includes('DELIVERED'), false);
    });
});

test('─── Phase 4: Real-time Broadcaster Safety ───', async (t) => {
    await t.test('broadcastOrderEvent handles missing clients without throwing', () => {
        assert.doesNotThrow(() => {
            broadcastOrderEvent('order.created', { orderNumber: 'CC-999999', total: 1000 });
            broadcastOrderEvent('order.status_changed', { orderNumber: 'CC-999999', newStatus: 'PREPARING' });
            broadcastOrderEvent('order.cancelled', { orderNumber: 'CC-999999' });
        });
    });
});
