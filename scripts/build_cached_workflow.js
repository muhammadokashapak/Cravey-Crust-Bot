import fs from 'fs';

// Complete jsCode for "Check Cache & Quick Reply"
const cacheJsCode = `const rawMsg = (($json.message || $input?.item?.json?.message || '').toString()).trim().toLowerCase();
const cleanMsg = rawMsg.replace(/[^\\w\\s\\u0600-\\u06FF]/g, ' ').replace(/\\s+/g, ' ').trim();

let isCached = false;
let output = '';

// 1. Critical bypass check: NEVER cache ordering actions, specific items, cart operations, order status, or handover
const isOrderTracking = /\\b(mera order|order kahan|order status|track|tracking|kahan pohncha|cc-\\d+)\\b/i.test(cleanMsg);
const isActionOrSpecificItem = isOrderTracking || /\\b(order|chahiye|mangwana|karna hai|kardo|kar do|banao|pack|confirm|haan|yes|nahi|no|cancel|gali|house|street|road|sector|phase|flavour|flavor|fajita|tikka|extreme|peri|tandori|tandoori|ranch|malai|creamy|bbq|zinger|jalapeno|fillet|crispy burger|nuggets|wings|fries|sauce|calzone|slice|garlic bread|small|medium|large|party size|add|cart|remove|plus|minus|agent|human|call me|rabta karo)\\b/i.test(cleanMsg);

if (!isActionOrSpecificItem) {
  // 2. Greetings Cache (0 LLM Tokens)
  const greetings = ['hi', 'hello', 'salam', 'assalam o alaikum', 'assalam alaikum', 'aoa', 'hey', 'slam', 'slaam', 'kese ho', 'kaise ho', 'kia hal hai', 'kya haal hai', 'سلام', 'السلام علیکم'];
  if (greetings.includes(cleanMsg)) {
    isCached = true;
    output = 'Walaikum Assalam! Cravey Crust mein khushamdeed! Main hoon Burger Raja. Aaj aap kya order karna chahenge? Hamare paas Mazedar Pizzas, Burgers aur Value Deals dastiyab hain!';
  }

  // 3. Timing / Opening Hours Cache (0 LLM Tokens)
  else if (cleanMsg.includes('timing') || cleanMsg.includes('timings') || cleanMsg.includes('open') || cleanMsg.includes('kab khulta') || cleanMsg.includes('band hota') || cleanMsg.includes('khula hai') || cleanMsg.includes('auqat') || cleanMsg.includes('ٹائمنگ') || cleanMsg.includes('اوپن')) {
    isCached = true;
    output = 'Cravey Crust rozana dopehar 12:00 PM se raat 2:00 AM tak open hota hai. Aap apna order kisi bhi waqt place kar sakte hain!';
  }

  // 4. Location / Address / Branch Info Cache (0 LLM Tokens)
  else if (cleanMsg.includes('location') || cleanMsg.includes('address') || cleanMsg.includes('branch') || cleanMsg.includes('kahan') || cleanMsg.includes('kidhar') || cleanMsg.includes('لوکیشن') || cleanMsg.includes('پتہ')) {
    isCached = true;
    output = 'Cravey Crust Main Lehtrar Road, Tarlai / Ghauri Town Islamabad ke qareeb waqay hai. Delivery hamare poore coverage area mein dastiyab hai!';
  }

  // 5. Halal Food FAQ Cache (0 LLM Tokens)
  else if (cleanMsg.includes('halal') || cleanMsg.includes('halal food') || cleanMsg.includes('meat halal') || cleanMsg.includes('حلال')) {
    isCached = true;
    output = 'Ji bilkul! Cravey Crust ka tamam chicken aur tamam ingredients 100% certified Halal, taaza aur ba-qaidah checked hain.';
  }

  // 6. Payment Methods FAQ Cache (0 LLM Tokens)
  else if (cleanMsg.includes('payment') || cleanMsg.includes('kese pay') || cleanMsg.includes('kaise pay') || cleanMsg.includes('easypaisa') || cleanMsg.includes('card chalta') || cleanMsg.includes('online pay') || cleanMsg.includes('cash on delivery') || cleanMsg.includes('cod') || cleanMsg.includes('پیمنٹ')) {
    isCached = true;
    output = 'Cravey Crust par Cash on Delivery (COD) aur EasyPaisa dono payment tareeqay dastiyab hain. Order confirm karte waqt aap apna pasandeeda tareeqa chun sakte hain.';
  }

  // 7. General Delivery Info FAQ Cache (0 LLM Tokens)
  else if (cleanMsg.includes('delivery charges') || cleanMsg.includes('delivery fee') || cleanMsg.includes('free delivery') || cleanMsg.includes('delivery kitne') || cleanMsg.includes('ڈلیوری چارجز')) {
    isCached = true;
    output = 'Cravey Crust par standard delivery charges faslay (distance) ke mutabiq Rs. 100 se Rs. 250 tak hotay hain. Apne area ka naam batayein taake hum exact delivery fee bata sakein!';
  }

  // 8. Promotions / Discounts / Voucher / Promo Code Cache (0 LLM Tokens)
  else if (cleanMsg.includes('discount') || cleanMsg.includes('promo') || cleanMsg.includes('voucher') || cleanMsg.includes('coupon') || cleanMsg.includes('off hai') || cleanMsg.includes('discount code') || cleanMsg.includes('riayat') || cleanMsg.includes('bachat') || cleanMsg.includes('ڈسکاؤنٹ') || cleanMsg.includes('رعایت')) {
    isCached = true;
    output = 'Filhal koi alag discount promo code active nahi hai, lekin hamari "Value Deals" pehle se hi bhari riayat (discount) par dastiyab hain (Starting from Rs. 599)! Aap Deals dekh kar order enjoy kar sakte hain.';
  }

  // 9. Deals & Combos Cache (0 LLM Tokens)
  else if (cleanMsg.includes('deal') || cleanMsg.includes('deals') || cleanMsg.includes('combo') || cleanMsg.includes('package') || cleanMsg.includes('offers') || cleanMsg.includes('ڈیل') || cleanMsg.includes('ڈیلز')) {
    isCached = true;
    output = 'Cravey Crust ki top deals yeh hain:\\n1. Pizza Meal for 1 (Small Pizza + 345ml Drink): Rs. 599\\n2. Burger Meal for 2 (2 Crispy Burgers + Fries + 2 Drinks): Rs. 999\\n3. Pizza Meal for 2 (Medium Pizza + 2 Drinks): Rs. 1299\\n4. Cravey 2.0 Deal 1 (1 Large Pizza + 1 Burger + 1L Drink): Rs. 1099\\n5. Cravey 2.0 Deal 2 (2 Medium Pizzas + 1L Drink): Rs. 2099\\n\\nAap in mein se konsi deal order karna chahenge?';
  }

  // 10. Menu / Category / Rate List Cache (0 LLM Tokens)
  else if (cleanMsg.includes('menu') || cleanMsg.includes('rate list') || cleanMsg.includes('price list') || cleanMsg.includes('food list') || cleanMsg.includes('list dikhao') || cleanMsg.includes('kya kya hai') || cleanMsg === 'kya hai' || cleanMsg === 'list' || cleanMsg.includes('مینو') || cleanMsg.includes('ریٹ لسٹ')) {
    isCached = true;
    output = 'Hamare menu mein yeh categories hain:\\n1. Classic & Premium Pizzas (Rs. 599 se shuru)\\n2. Crispy Burgers & Sandwiches (Rs. 350 se shuru)\\n3. Value Deals & Combos (Rs. 599 se shuru)\\n4. Sides & Fries\\n\\nAap konsi category dekhna chahenge?';
  }
}

return {
  ...$json,
  isCached,
  output
};`;

const workflow = {
  "name": "Cravey Crust WhatsApp AI Ordering Agent",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "cravey-crust-whatsapp-agent",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [
        -4720,
        2464
      ],
      "id": "53625f53-3101-4be6-83e7-db6bc1b95215",
      "name": "Webhook",
      "webhookId": "5eac53b2-0d19-443a-9b0f-d5373e9a61dd"
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "a558b7c3-1620-42cd-807d-427051420a36",
              "name": "sessionKey",
              "value": "={{ $json.body?.sessionKey || $json.body?.chatId || $json.body?.phone || '' }}",
              "type": "string"
            },
            {
              "id": "154c6509-205c-4ede-ac09-be1e96867e90",
              "name": "chatId",
              "value": "={{ $json.body?.chatId || '' }}",
              "type": "string"
            },
            {
              "id": "1129b8c1-2ed8-4334-9ea8-ac0cdb42182a",
              "name": "message",
              "value": "={{ $json.body?.message || $json.body?.text || $json.body?.chatInput || '' }}",
              "type": "string"
            },
            {
              "id": "d60ad5a8-7c32-4977-ac6b-546f6a034649",
              "name": "whatsappPhone",
              "value": "={{ $json.body?.phoneVerified === true ? ($json.body?.whatsappPhone || $json.body?.phone || '') : '' }}",
              "type": "string"
            },
            {
              "id": "2d50904f-416f-42e8-b08b-1b135ee923ca",
              "name": "phoneVerified",
              "value": "={{ $json.body?.phoneVerified === true }}",
              "type": "boolean"
            },
            {
              "id": "9184d386-5e1a-4303-9909-df0b759d0822",
              "name": "phoneSource",
              "value": "={{ $json.body?.phoneSource || '' }}",
              "type": "string"
            },
            {
              "id": "6fcbbdf9-e10f-4021-ae35-d617c88465b9",
              "name": "senderJid",
              "value": "={{ $json.body?.senderJid || '' }}",
              "type": "string"
            },
            {
              "id": "80adb968-693b-4adf-854a-181decce2552",
              "name": "senderLid",
              "value": "={{ $json.body?.senderLid || '' }}",
              "type": "string"
            },
            {
              "id": "e7df6ebf-e344-4690-8a99-514800cc968f",
              "name": "messageId",
              "value": "={{ $json.body?.messageId || '' }}",
              "type": "string"
            }
          ]
        },
        "includeOtherFields": true,
        "options": {}
      },
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.5,
      "position": [
        -4448,
        2480
      ],
      "id": "9ce6c5fa-ed59-43d2-953e-4de27824a281",
      "name": "Prepare Session"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2
          },
          "conditions": [
            {
              "id": "4a86ca20-f937-4503-b655-ea7d79d65ea3",
              "leftValue": "={{ ($json.message || '').trim().length > 0 || !!$json.body?.location }}",
              "rightValue": "",
              "operator": {
                "type": "boolean",
                "operation": "true",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "type": "n8n-nodes-base.filter",
      "typeVersion": 2.2,
      "position": [
        -4208,
        2480
      ],
      "id": "5773b4a3-3793-4182-bf0b-8c06c61caa63",
      "name": "Skip Empty Message"
    },
    {
      "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": cacheJsCode
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -3968,
        2480
      ],
      "id": "721cb9c1-0265-4993-be14-88f9fefcdadc",
      "name": "Check Cache & Quick Reply"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "loose",
            "version": 2
          },
          "conditions": [
            {
              "id": "c1",
              "leftValue": "={{ $json.isCached }}",
              "rightValue": true,
              "operator": {
                "type": "boolean",
                "operation": "true",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [
        -3712,
        2480
      ],
      "id": "f5c5a3ac-3c25-4e36-8411-3ead5a2e5b72",
      "name": "Is Cached?"
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "={{ $json.message || 'Customer ne apni location share ki hai.' }}",
        "needsFallback": true,
        "options": {
          "systemMessage": "Cravey Crust WhatsApp ordering bot.\n\nRULES:\n- Answer ONLY what is asked in 2-3 short lines of Roman Urdu. Never use asterisks (*).\n- Never say \"permission nahi hai\". Be direct and helpful.\n- Menu: Call Get Menu Categories. Ask what category they want.\n- Item/Price: Call Search Menu Item for specific item price.\n- Deals: Call Get Current Deals. Mention 2-3 top deals.\n- Delivery: Ask customer area name, then call Check Delivery Availability.\n\nORDERING:\n- Never calculate totals; call Calculate Cart Totals.\n- Collect name, phone, address, payment (COD/Easypaisa).\n- Show summary, create order ONLY after explicit confirmation. Call Create Confirmed Order once.\n- Cancel: 2 turns (1: request cancel; 2: confirm cancel on yes/no).\n- Human: Call Request Human Handover and inform staff will contact."
        }
      },
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 3.1,
      "position": [
        -3472,
        2544
      ],
      "id": "0f931560-e9de-41b0-82a1-a8fe158b90a0",
      "name": "AI Agent"
    },
    {
      "parameters": {
        "modelName": "models/gemini-3.5-flash",
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
      "typeVersion": 1,
      "position": [
        -4048,
        2928
      ],
      "id": "1f2547ee-8995-439f-9704-7a17044fd526",
      "name": "Google Gemini Chat Model",
      "credentials": {
        "googlePalmApi": {
          "id": "RtCVxwz43k0pMrwg",
          "name": "Google Gemini(PaLM) Api account 2"
        }
      }
    },
    {
      "parameters": {
        "sessionIdType": "customKey",
        "sessionKey": "={{ $json.sessionKey + '-v4' }}",
        "contextWindowLength": 2
      },
      "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
      "typeVersion": 1.3,
      "position": [
        -3456,
        2784
      ],
      "id": "62549975-2d88-4fb8-9d1a-8a654fcf9ff3",
      "name": "Simple Memory"
    },
    {
      "parameters": {
        "toolDescription": "Fetch store hours, address, info.",
        "url": "https://bot.craveycrust.com/api/internal/restaurant",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3312,
        3408
      ],
      "id": "c24c9b46-d418-483d-b5d3-62902cb70e14",
      "name": "Get Store Info"
    },
    {
      "parameters": {
        "toolDescription": "Search FAQs for timing, location, halal.",
        "url": "https://bot.craveycrust.com/api/internal/faqs/search",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "q",
              "value": "={{ $fromAI('query', 'FAQ keyword', 'string') }}"
            }
          ]
        },
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2576,
        3408
      ],
      "id": "47e052b1-eb28-40e8-972b-35d228d026ff",
      "name": "Search FAQs"
    },
    {
      "parameters": {
        "toolDescription": "Search menu by name. Returns IDs, prices, variants.",
        "url": "https://bot.craveycrust.com/api/internal/menu/search",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "q",
              "value": "={{ $fromAI('query', 'Item name', 'string') }}"
            }
          ]
        },
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3696,
        3408
      ],
      "id": "7d482961-ac63-4c5c-a79d-1b50ec18c7ab",
      "name": "Search Menu Item"
    },
    {
      "parameters": {
        "toolDescription": "Get active menu categories.",
        "url": "https://bot.craveycrust.com/api/internal/menu/categories",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3488,
        3392
      ],
      "id": "6ec6314a-6bcb-4e5d-8ac1-36f1cb59eade",
      "name": "Get Menu Categories"
    },
    {
      "parameters": {
        "toolDescription": "Get active deals with IDs and prices.",
        "url": "https://bot.craveycrust.com/api/internal/deals",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3136,
        3424
      ],
      "id": "a0d64932-5854-4c54-ba55-1305d333b4ed",
      "name": "Get Current Deals"
    },
    {
      "parameters": {
        "toolDescription": "Get active promo codes and discounts.",
        "url": "https://bot.craveycrust.com/api/internal/promotions/active",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2368,
        3392
      ],
      "id": "1cc7fea0-d8ee-4a3c-9a68-1c31d14f7504",
      "name": "Get Active Promotions"
    },
    {
      "parameters": {
        "toolDescription": "Check area delivery coverage and fee.",
        "method": "POST",
        "url": "https://bot.craveycrust.com/api/internal/delivery/check",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ areaName: $fromAI('areaName', 'Area name', 'string'), latitude: $fromAI('latitude', 'Latitude or empty', 'number'), longitude: $fromAI('longitude', 'Longitude or empty', 'number') }) }}",
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2944,
        3408
      ],
      "id": "d79d1bdd-0080-4ce8-a90b-4a056028debd",
      "name": "Check Delivery Availability"
    },
    {
      "parameters": {
        "toolDescription": "Get current customer cart.",
        "url": "={{ 'https://bot.craveycrust.com/api/internal/cart/' + encodeURIComponent($('Prepare Session').first().json.sessionKey) }}",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "chatId",
              "value": "={{ $('Prepare Session').first().json.chatId }}"
            },
            {
              "name": "verifiedPhone",
              "value": "={{ $('Prepare Session').first().json.whatsappPhone }}"
            }
          ]
        },
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3040,
        2352
      ],
      "id": "bcb369fe-b095-4697-b764-1f6ad621ec1a",
      "name": "Get Cart"
    },
    {
      "parameters": {
        "toolDescription": "Add item or deal to cart (send menuItemId OR dealId).",
        "method": "POST",
        "url": "={{ 'https://bot.craveycrust.com/api/internal/cart/' + encodeURIComponent($('Prepare Session').first().json.sessionKey) + '/items' }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ menuItemId: $fromAI('menuItemId', 'Menu item ID or empty', 'string'), variantId: $fromAI('variantId', 'Variant ID or empty', 'string'), dealId: $fromAI('dealId', 'Deal ID or empty', 'string'), quantity: $fromAI('quantity', 'Quantity integer', 'number'), notes: $fromAI('notes', 'Item instructions or empty', 'string') }) }}",
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2864,
        2336
      ],
      "id": "08e6c0ba-18c3-4427-8def-ac7737dbeabd",
      "name": "Add to Cart"
    },
    {
      "parameters": {
        "toolDescription": "Update cart item qty/notes.",
        "method": "PATCH",
        "url": "={{ 'https://bot.craveycrust.com/api/internal/cart/' + encodeURIComponent($('Prepare Session').first().json.sessionKey) + '/items/' + encodeURIComponent($fromAI('cartItemId', 'Cart item ID', 'string')) }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ quantity: $fromAI('quantity', 'New quantity or 0', 'number'), notes: $fromAI('notes', 'Updated notes or empty', 'string') }) }}",
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2656,
        2352
      ],
      "id": "832663fa-5e4b-4169-96c2-9ddb5c8d2812",
      "name": "Update Cart Item"
    },
    {
      "parameters": {
        "toolDescription": "Remove item from cart by cartItemId.",
        "method": "DELETE",
        "url": "={{ 'https://bot.craveycrust.com/api/internal/cart/' + encodeURIComponent($('Prepare Session').first().json.sessionKey) + '/items/' + encodeURIComponent($fromAI('cartItemId', 'Cart item ID', 'string')) }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2528,
        2480
      ],
      "id": "1f6c4be6-3cf5-4a99-b0b7-3b15a5253e0c",
      "name": "Remove Cart Item"
    },
    {
      "parameters": {
        "toolDescription": "Clear current unfinished cart.",
        "method": "DELETE",
        "url": "={{ 'https://bot.craveycrust.com/api/internal/cart/' + encodeURIComponent($('Prepare Session').first().json.sessionKey) }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2432,
        2624
      ],
      "id": "2f0451be-63e9-4f3b-b572-caceeadc9988",
      "name": "Clear Cart"
    },
    {
      "parameters": {
        "toolDescription": "Calculate cart totals, delivery fee, and bill.",
        "method": "POST",
        "url": "={{ 'https://bot.craveycrust.com/api/internal/cart/' + encodeURIComponent($('Prepare Session').first().json.sessionKey) + '/calculate' }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ promoCode: $fromAI('promoCode', 'Promo code or empty', 'string'), deliveryAreaId: $fromAI('deliveryAreaId', 'Area ID or empty', 'string'), deliveryAreaName: $fromAI('deliveryAreaName', 'Delivery area name', 'string'), latitude: $fromAI('latitude', 'Latitude or empty', 'number'), longitude: $fromAI('longitude', 'Longitude or empty', 'number') }) }}",
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3168,
        2096
      ],
      "id": "3d45aa2f-af16-41fb-8b08-d5e8ea04ccd6",
      "name": "Calculate Cart Totals"
    },
    {
      "parameters": {
        "toolDescription": "Create confirmed order after customer explicitly confirms summary.",
        "method": "POST",
        "url": "https://bot.craveycrust.com/api/internal/orders",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ sessionKey: $('Prepare Session').first().json.sessionKey, customerName: $fromAI('customerName', 'Customer name', 'string'), phone: $fromAI('phone', 'Phone if provided', 'string'), contactNumberMode: $fromAI('contactNumberMode', 'same_whatsapp or provided', 'string'), confirmationNumberMode: $fromAI('confirmationNumberMode', 'default, same_whatsapp, or provided', 'string'), confirmationPhone: $fromAI('confirmationPhone', 'Alternate phone or empty', 'string'), delivery: { address: $fromAI('deliveryAddress', 'Confirmed address', 'string'), areaName: $fromAI('deliveryAreaName', 'Confirmed area name', 'string'), areaId: $fromAI('deliveryAreaId', 'Area ID or empty', 'string'), latitude: $('Webhook').first().json.body?.location?.latitude ?? undefined, longitude: $('Webhook').first().json.body?.location?.longitude ?? undefined, googleMapsUrl: $('Webhook').first().json.body?.location?.mapUrl || $('Webhook').first().json.body?.location?.originalUrl || '' }, paymentMethod: $fromAI('paymentMethod', 'COD or EASYPAISA', 'string'), promoCode: $fromAI('promoCode', 'Promo code or empty', 'string'), notes: $fromAI('notes', 'Notes or empty', 'string'), idempotencyKey: $('Prepare Session').first().json.messageId || undefined }) }}",
        "options": {
          "timeout": 60000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2976,
        2016
      ],
      "id": "7f763811-83d5-4b9c-b2d1-8cf315f2cf16",
      "name": "Create Confirmed Order"
    },
    {
      "parameters": {
        "toolDescription": "Get order status using CC order number.",
        "url": "={{ 'https://bot.craveycrust.com/api/internal/orders/' + encodeURIComponent($fromAI('orderNumber', 'Order number e.g. CC-20261012-0001', 'string')) }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2800,
        2144
      ],
      "id": "63684cbe-e668-4fbb-b7fa-7fbe9fb81293",
      "name": "Get Order Status"
    },
    {
      "parameters": {
        "toolDescription": "Step 1: Fetch order items and bill, request cancellation.",
        "method": "POST",
        "url": "={{ 'https://bot.craveycrust.com/api/internal/orders/' + encodeURIComponent($fromAI('orderNumber', 'Order number', 'string')) + '/request-cancel' }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ sessionKey: $('Prepare Session').first().json.sessionKey }) }}",
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2384,
        2048
      ],
      "id": "f717140d-ca07-45db-aea3-fa205e6ddea6",
      "name": "Request Order Cancellation"
    },
    {
      "parameters": {
        "toolDescription": "Step 2: Confirm cancellation after explicit yes/no.",
        "method": "POST",
        "url": "={{ 'https://bot.craveycrust.com/api/internal/orders/' + encodeURIComponent($fromAI('orderNumber', 'Order number', 'string')) + '/confirm-cancel' }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ sessionKey: $('Prepare Session').first().json.sessionKey, confirmed: $fromAI('confirmed', 'true for yes/haan, false for no/nahi', 'boolean') }) }}",
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2592,
        2112
      ],
      "id": "c2b51498-202c-49d0-b121-b9fbd38a334d",
      "name": "Confirm Order Cancellation"
    },
    {
      "parameters": {
        "toolDescription": "Send order confirmation to alternate WhatsApp number.",
        "method": "POST",
        "url": "https://bot.craveycrust.com/api/n8n/send-message",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Bot-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ sessionId: 'primary', chatId: $fromAI('chatId', 'Alternate WhatsApp number', 'string'), message: $fromAI('message', 'Plain text order summary without asterisks', 'string') }) }}",
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2480,
        2288
      ],
      "id": "3c31128a-23b4-4b84-b4aa-0f829730fa6c",
      "name": "Send Alternate Confirmation"
    },
    {
      "parameters": {
        "toolDescription": "Hand over to human agent and mute bot for 2 hours.",
        "method": "POST",
        "url": "https://bot.craveycrust.com/api/internal/handover",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Internal-API-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ chatId: $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid || $('Webhook').first().json.body?.chatId, sessionKey: $('Prepare Session').first().json.sessionKey, durationMinutes: 120, reason: $fromAI('reason', 'Customer reason', 'string') }) }}",
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2288,
        2256
      ],
      "id": "9c00445d-c164-4517-b6c2-225dcce261dd",
      "name": "Request Human Handover"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://bot.craveycrust.com/api/n8n/send-message",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Bot-Secret",
              "value": "my-test-secret-123"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "sessionId",
              "value": "primary"
            },
            {
              "name": "chatId",
              "value": "={{ $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid }}"
            },
            {
              "name": "message",
              "value": "={{ ($json.output || $json.text || '').replace(/\\*/g, '').trim() }}"
            }
          ]
        },
        "options": {
          "timeout": 40000
        }
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.5,
      "position": [
        -3168,
        2256
      ],
      "id": "51c5fcdc-4225-40de-9c04-b25c7f1c8cc5",
      "name": "Send WhatsApp Reply"
    },
    {
      "parameters": {
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.lmChatDeepSeek",
      "typeVersion": 1,
      "position": [
        -3824,
        2912
      ],
      "id": "0521fe87-45c4-48a2-a0cb-09866c3f763e",
      "name": "DeepSeek Chat Model",
      "credentials": {
        "deepSeekApi": {
          "id": "wNcraJYZ11bQD501",
          "name": "DeepSeek account"
        }
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Prepare Session",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Prepare Session": {
      "main": [
        [
          {
            "node": "Skip Empty Message",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Skip Empty Message": {
      "main": [
        [
          {
            "node": "Check Cache & Quick Reply",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Check Cache & Quick Reply": {
      "main": [
        [
          {
            "node": "Is Cached?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Is Cached?": {
      "main": [
        [
          {
            "node": "Send WhatsApp Reply",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "AI Agent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "AI Agent": {
      "main": [
        [
          {
            "node": "Send WhatsApp Reply",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Google Gemini Chat Model": {
      "ai_languageModel": [
        [
          {
            "node": "AI Agent",
            "type": "ai_languageModel",
            "index": 0
          }
        ]
      ]
    },
    "Simple Memory": {
      "ai_memory": [
        [
          {
            "node": "AI Agent",
            "type": "ai_memory",
            "index": 0
          }
        ]
      ]
    },
    "Get Store Info": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Search FAQs": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Search Menu Item": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Get Menu Categories": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Get Current Deals": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Get Active Promotions": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Check Delivery Availability": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Get Cart": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Add to Cart": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Update Cart Item": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Remove Cart Item": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Clear Cart": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Calculate Cart Totals": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Create Confirmed Order": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Get Order Status": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Request Order Cancellation": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Confirm Order Cancellation": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Send Alternate Confirmation": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Request Human Handover": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "DeepSeek Chat Model": {
      "ai_languageModel": [
        [
          {
            "node": "AI Agent",
            "type": "ai_languageModel",
            "index": 1
          }
        ]
      ]
    }
  },
  "pinData": {},
  "meta": {
    "instanceId": "1bfb2852e5c8ac73154181d1ba55ded3d4372492f8bb7996e9b440e3904e9d5d"
  }
};

fs.writeFileSync('cravey-crust-whatsapp-agent-workflow.json', JSON.stringify(workflow, null, 2), 'utf8');
fs.writeFileSync('n8n.json', JSON.stringify(workflow, null, 2), 'utf8');
console.log('Successfully wrote updated workflow to both files!');
