/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   Phase 5: Intent Parser Unit Tests                          ║
 * ║   tests/phase5_intent.test.js                                ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import assert from 'assert';
import { describe, it } from 'node:test';
import { parseIntent, DeterministicIntentProvider } from '../src/services/intentParser.js';

describe('Phase 5: Deterministic Intent Parser', () => {
    const provider = new DeterministicIntentProvider();

    it('parses greeting variations', () => {
        ['hi', 'hello', 'hey', 'aoa', 'Assalam o Alaikum', 'salam', 'start'].forEach(text => {
            const res = parseIntent({ text, stage: 'START' });
            assert.strictEqual(res.intent, 'GREETING', `Failed for ${text}`);
            assert.ok(res.confidence > 0.8);
        });
    });

    it('parses menu and deals requests', () => {
        ['menu', 'show menu', 'menu bhejo', 'menu dikhao'].forEach(text => {
            const res = parseIntent({ text, stage: 'START' });
            assert.strictEqual(res.intent, 'SHOW_MENU', `Failed for ${text}`);
        });

        ['deals', 'deal', 'special deals', 'offers', 'deals dikhao'].forEach(text => {
            const res = parseIntent({ text, stage: 'START' });
            assert.strictEqual(res.intent, 'SHOW_DEALS', `Failed for ${text}`);
        });
    });

    it('parses category selections', () => {
        const res1 = parseIntent({ text: '1', stage: 'BROWSING_MENU' });
        assert.strictEqual(res1.intent, 'SHOW_CATEGORY');
        assert.strictEqual(res1.entities.categoryIndex, 1);

        const res2 = parseIntent({ text: 'burgers', stage: 'BROWSING_MENU' });
        assert.strictEqual(res2.intent, 'SHOW_CATEGORY');
        assert.strictEqual(res2.entities.categoryName, 'burgers');
    });

    it('parses item addition patterns and quantities', () => {
        // Prefix quantity: "2 zinger"
        const res1 = parseIntent({ text: '2 zinger', stage: 'START' });
        assert.strictEqual(res1.intent, 'ADD_ITEM');
        assert.strictEqual(res1.entities.quantity, 2);
        assert.strictEqual(res1.entities.itemQuery, 'zinger');

        // Suffix quantity: "zinger x2"
        const res2 = parseIntent({ text: 'zinger x2', stage: 'START' });
        assert.strictEqual(res2.intent, 'ADD_ITEM');
        assert.strictEqual(res2.entities.quantity, 2);
        assert.strictEqual(res2.entities.itemQuery, 'zinger');

        // Add verb: "add 3 chicken pizza"
        const res3 = parseIntent({ text: 'add 3 chicken pizza', stage: 'START' });
        assert.strictEqual(res3.intent, 'ADD_ITEM');
        assert.strictEqual(res3.entities.quantity, 3);
        assert.strictEqual(res3.entities.itemQuery, 'chicken pizza');

        // Add without explicit quantity defaults to 1: "add zinger"
        const res4 = parseIntent({ text: 'add zinger', stage: 'START' });
        assert.strictEqual(res4.intent, 'ADD_ITEM');
        assert.strictEqual(res4.entities.quantity, 1);
        assert.strictEqual(res4.entities.itemQuery, 'zinger');
    });

    it('parses remove item and change quantity', () => {
        const res1 = parseIntent({ text: 'remove zinger', stage: 'BUILDING_CART' });
        assert.strictEqual(res1.intent, 'REMOVE_ITEM');
        assert.strictEqual(res1.entities.itemQuery, 'zinger');

        const res2 = parseIntent({ text: 'zinger hata do', stage: 'BUILDING_CART' });
        assert.strictEqual(res2.intent, 'REMOVE_ITEM');
        assert.strictEqual(res2.entities.itemQuery, 'zinger');

        const res3 = parseIntent({ text: 'change zinger to 3', stage: 'BUILDING_CART' });
        assert.strictEqual(res3.intent, 'CHANGE_QUANTITY');
        assert.strictEqual(res3.entities.quantity, 3);
        assert.strictEqual(res3.entities.itemQuery, 'zinger');
    });

    it('parses cart inspection and clear commands', () => {
        ['cart', 'mera cart', 'show cart', 'my cart'].forEach(text => {
            const res = parseIntent({ text, stage: 'START' });
            assert.strictEqual(res.intent, 'SHOW_CART', `Failed for ${text}`);
        });

        ['clear cart', 'empty cart', 'cart khali kardo'].forEach(text => {
            const res = parseIntent({ text, stage: 'START' });
            assert.strictEqual(res.intent, 'CLEAR_CART', `Failed for ${text}`);
        });

        ['checkout', 'order karna hai', 'order please'].forEach(text => {
            const res = parseIntent({ text, stage: 'START' });
            assert.strictEqual(res.intent, 'CHECKOUT', `Failed for ${text}`);
        });
    });

    it('stage-awareness: interprets name in WAITING_NAME', () => {
        const res = parseIntent({ text: 'Ali Khalid', stage: 'WAITING_NAME' });
        assert.strictEqual(res.intent, 'PROVIDE_NAME');
        assert.strictEqual(res.entities.customerName, 'Ali Khalid');
    });

    it('stage-awareness: interprets contact in WAITING_CONTACT', () => {
        // Same number
        ['same number', 'isi number', 'yehi number', 'same whatsapp'].forEach(text => {
            const res = parseIntent({ text, stage: 'WAITING_CONTACT' });
            assert.strictEqual(res.intent, 'USE_SAME_WHATSAPP_NUMBER', `Failed for ${text}`);
        });

        // Provided phone
        const resPhone = parseIntent({ text: '03001234567', stage: 'WAITING_CONTACT' });
        assert.strictEqual(resPhone.intent, 'PROVIDE_PHONE');
        assert.strictEqual(resPhone.entities.phone, '03001234567');
    });

    it('stage-awareness: interprets location in WAITING_LOCATION', () => {
        // WhatsApp location message
        const resLoc = parseIntent({
            text: '',
            stage: 'WAITING_LOCATION',
            location: { latitude: 31.5204, longitude: 74.3587 },
        });
        assert.strictEqual(resLoc.intent, 'PROVIDE_LOCATION');
        assert.ok(resLoc.entities.location);

        // Typed location
        const resTyped = parseIntent({ text: 'Ghauri Town Phase 4', stage: 'WAITING_LOCATION' });
        assert.strictEqual(resTyped.intent, 'PROVIDE_LOCATION');
        assert.strictEqual(resTyped.entities.locationText, 'Ghauri Town Phase 4');
    });

    it('stage-awareness: interprets payment in WAITING_PAYMENT', () => {
        const resCod = parseIntent({ text: 'COD', stage: 'WAITING_PAYMENT' });
        assert.strictEqual(resCod.intent, 'SELECT_PAYMENT');
        assert.strictEqual(resCod.entities.paymentMethod, 'COD');

        const resEp = parseIntent({ text: 'EasyPaisa', stage: 'WAITING_PAYMENT' });
        assert.strictEqual(resEp.intent, 'SELECT_PAYMENT');
        assert.strictEqual(resEp.entities.paymentMethod, 'EASYPAISA');
    });

    it('parses payment queries to PAYMENT_METHODS_QUERY outside checkout', () => {
        ['payment methods kya hain', 'COD', 'cash', 'EasyPaisa', 'payment kaise karun', 'payment options', 'easypaisa number'].forEach(text => {
            const res = parseIntent({ text, stage: 'START' });
            assert.strictEqual(res.intent, 'PAYMENT_METHODS_QUERY', `Failed for ${text}`);
        });
    });

    it('stage-awareness: interprets confirmation in WAITING_ORDER_CONFIRMATION', () => {
        ['yes', 'haan', 'ha', 'confirm', 'order kar do', 'ok'].forEach(text => {
            const res = parseIntent({ text, stage: 'WAITING_ORDER_CONFIRMATION' });
            assert.strictEqual(res.intent, 'CONFIRM_ORDER', `Failed for ${text}`);
        });

        ['no', 'nahi', 'cancel', 'mat karo'].forEach(text => {
            const res = parseIntent({ text, stage: 'WAITING_ORDER_CONFIRMATION' });
            assert.strictEqual(res.intent, 'DECLINE_ORDER', `Failed for ${text}`);
        });
    });

    it('stage-awareness: interprets cancellation confirmation in WAITING_CANCEL_CONFIRMATION', () => {
        const resYes = parseIntent({ text: 'yes', stage: 'WAITING_CANCEL_CONFIRMATION' });
        assert.strictEqual(resYes.intent, 'CONFIRM_CANCELLATION');

        const resNo = parseIntent({ text: 'no', stage: 'WAITING_CANCEL_CONFIRMATION' });
        assert.strictEqual(resNo.intent, 'DECLINE_CANCELLATION');
    });

    it('parses order status query and order number', () => {
        const res1 = parseIntent({ text: 'status CC-000123', stage: 'START' });
        assert.strictEqual(res1.intent, 'ORDER_STATUS_QUERY');
        assert.strictEqual(res1.entities.orderNumber, 'CC-000123');

        const res2 = parseIntent({ text: 'mera order kahan hai', stage: 'START' });
        assert.strictEqual(res2.intent, 'ORDER_STATUS_QUERY');
    });

    it('parses order cancellation request', () => {
        const res1 = parseIntent({ text: 'cancel CC-000123', stage: 'START' });
        assert.strictEqual(res1.intent, 'REQUEST_ORDER_CANCELLATION');
        assert.strictEqual(res1.entities.orderNumber, 'CC-000123');

        const res2 = parseIntent({ text: 'cancel order', stage: 'START' });
        assert.strictEqual(res2.intent, 'REQUEST_ORDER_CANCELLATION');
    });

    it('parses FAQ queries and unknown fallback', () => {
        const resFaq = parseIntent({ text: 'delivery kitni dair lagay gi?', stage: 'START' });
        assert.strictEqual(resFaq.intent, 'FAQ_QUERY');

        const resHelp = parseIntent({ text: 'help', stage: 'START' });
        assert.strictEqual(resHelp.intent, 'HELP');

        const resUnknown = parseIntent({ text: 'asdfqwerty gibberish 999', stage: 'START' });
        assert.strictEqual(resUnknown.intent, 'UNKNOWN');
    });
});
