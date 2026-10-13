import fs from 'fs';

// Read the previous workflow to get exact coordinates and credentials
const prev = JSON.parse(fs.readFileSync('cravey-crust-whatsapp-agent-workflow.json', 'utf8'));

// Classification code for "Check Cache & Classify Intent"
const classifierJsCode = `const rawMsg = (($json.message || $input?.item?.json?.message || '').toString()).trim().toLowerCase();
const cleanMsg = rawMsg.replace(/[^\\w\\s\\u0600-\\u06FF]/g, ' ').replace(/\\s+/g, ' ').trim();

let route = 'agent';
let output = '';

// 1. Critical bypass check: Ordering actions, specific food items, cart, tracking, cancellation, handover MUST go to LLM Agent
const isOrderTracking = /\\b(mera order|order kahan|order status|track|tracking|kahan pohncha|cc-\\d+)\\b/i.test(cleanMsg);
const isActionOrSpecificItem = isOrderTracking || /\\b(order|chahiye|mangwana|karna hai|kardo|kar do|banao|pack|confirm|haan|yes|nahi|no|cancel|gali|house|street|road|sector|phase|flavour|flavor|fajita|tikka|extreme|peri|tandori|tandoori|ranch|malai|creamy|bbq|zinger|jalapeno|fillet|crispy burger|nuggets|wings|fries|sauce|calzone|slice|garlic bread|small|medium|large|party size|add|cart|remove|plus|minus|agent|human|call me|rabta karo)\\b/i.test(cleanMsg);

if (!isActionOrSpecificItem) {
  // 2. Greetings Cache (0 Tokens)
  const greetings = ['hi', 'hello', 'salam', 'assalam o alaikum', 'assalam alaikum', 'aoa', 'hey', 'slam', 'slaam', 'kese ho', 'kaise ho', 'kia hal hai', 'kya haal hai', 'سلام', 'السلام علیکم'];
  if (greetings.includes(cleanMsg)) {
    route = 'quick_reply';
    output = 'Walaikum Assalam! Cravey Crust mein khushamdeed! Main hoon Burger Raja. Aaj aap kya order karna chahenge? Hamare paas Mazedar Pizzas, Burgers aur Value Deals dastiyab hain!';
  }
  // 3. Timings Cache (0 Tokens)
  else if (cleanMsg.includes('timing') || cleanMsg.includes('timings') || cleanMsg.includes('open') || cleanMsg.includes('kab khulta') || cleanMsg.includes('band hota') || cleanMsg.includes('khula hai') || cleanMsg.includes('auqat') || cleanMsg.includes('ٹائمنگ') || cleanMsg.includes('اوپن')) {
    route = 'quick_reply';
    output = 'Cravey Crust rozana dopehar 12:00 PM se raat 2:00 AM tak open hota hai. Aap apna order kisi bhi waqt place kar sakte hain!';
  }
  // 4. Location Cache (0 Tokens)
  else if (cleanMsg.includes('location') || cleanMsg.includes('address') || cleanMsg.includes('branch') || cleanMsg.includes('kahan') || cleanMsg.includes('kidhar') || cleanMsg.includes('لوکیشن') || cleanMsg.includes('پتہ')) {
    route = 'quick_reply';
    output = 'Cravey Crust Main Lehtrar Road, Tarlai / Ghauri Town Islamabad ke qareeb waqay hai. Delivery hamare poore coverage area mein dastiyab hai!';
  }
  // 5. Halal FAQ Cache (0 Tokens)
  else if (cleanMsg.includes('halal') || cleanMsg.includes('halal food') || cleanMsg.includes('meat halal') || cleanMsg.includes('حلال')) {
    route = 'quick_reply';
    output = 'Ji bilkul! Cravey Crust ka tamam chicken aur tamam ingredients 100% certified Halal, taaza aur ba-qaidah checked hain.';
  }
  // 6. Payment Methods Cache (0 Tokens)
  else if (cleanMsg.includes('payment') || cleanMsg.includes('kese pay') || cleanMsg.includes('kaise pay') || cleanMsg.includes('easypaisa') || cleanMsg.includes('card chalta') || cleanMsg.includes('online pay') || cleanMsg.includes('cash on delivery') || cleanMsg.includes('cod') || cleanMsg.includes('پیمنٹ')) {
    route = 'quick_reply';
    output = 'Cravey Crust par Cash on Delivery (COD) aur EasyPaisa dono payment tareeqay dastiyab hain. Order confirm karte waqt aap apna pasandeeda tareeqa chun sakte hain.';
  }
  // 7. Delivery Info Cache (0 Tokens)
  else if (cleanMsg.includes('delivery charges') || cleanMsg.includes('delivery fee') || cleanMsg.includes('free delivery') || cleanMsg.includes('delivery kitne') || cleanMsg.includes('ڈلیوری چارجز')) {
    route = 'quick_reply';
    output = 'Cravey Crust par standard delivery charges faslay (distance) ke mutabiq Rs. 100 se Rs. 250 tak hotay hain. Apne area ka naam batayein taake hum exact delivery fee bata sakein!';
  }
  // 8. Promotions / Discounts Cache (0 Tokens)
  else if (cleanMsg.includes('discount') || cleanMsg.includes('promo') || cleanMsg.includes('voucher') || cleanMsg.includes('coupon') || cleanMsg.includes('off hai') || cleanMsg.includes('discount code') || cleanMsg.includes('riayat') || cleanMsg.includes('bachat') || cleanMsg.includes('ڈسکاؤنٹ') || cleanMsg.includes('رعایت')) {
    route = 'quick_reply';
    output = 'Filhal koi alag discount promo code active nahi hai, lekin hamari "Value Deals" pehle se hi bhari riayat (discount) par dastiyab hain (Starting from Rs. 599)! Aap Deals dekh kar order enjoy kar sakte hain.';
  }
  // 9. LIVE MENU CATEGORIES (0 Tokens, Auto-Sync from Dashboard!)
  else if (cleanMsg.includes('menu') || cleanMsg.includes('rate list') || cleanMsg.includes('price list') || cleanMsg.includes('food list') || cleanMsg.includes('list dikhao') || cleanMsg.includes('kya kya hai') || cleanMsg === 'kya hai' || cleanMsg === 'list' || cleanMsg.includes('مینو') || cleanMsg.includes('ریٹ لسٹ')) {
    route = 'live_categories';
  }
  // 10. LIVE DEALS (0 Tokens, Auto-Sync from Dashboard!)
  else if (cleanMsg.includes('deal') || cleanMsg.includes('deals') || cleanMsg.includes('combo') || cleanMsg.includes('package') || cleanMsg.includes('offers') || cleanMsg.includes('ڈیل') || cleanMsg.includes('ڈیلز')) {
    route = 'live_deals';
  }
}

return {
  ...$json,
  route,
  output
};`;

// Code for "Format Live Categories"
const formatCategoriesJs = `const items = $json.data || $json || [];
let output = '';

if (Array.isArray(items) && items.length > 0) {
  const list = items.map((c, i) => \`\${i + 1}. \${c.name}\`).join('\\n');
  output = \`Hamare menu mein yeh categories hain:\\n\${list}\\n\\nAap konsi category dekhna chahenge?\`;
} else {
  output = 'Hamare menu mein Classic Pizzas, Burgers, Deals aur Sides dastiyab hain. Aap konsi category dekhna chahenge?';
}

return {
  sessionId: $('Prepare Session').first().json.sessionId || 'primary',
  chatId: $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid,
  output
};`;

// Code for "Format Live Deals"
const formatDealsJs = `const items = $json.data || $json || [];
let output = '';

if (Array.isArray(items) && items.length > 0) {
  const list = items.slice(0, 6).map((d, i) => \`\${i + 1}. \${d.name} - Rs. \${d.price || d.deal_price || ''}\`).join('\\n');
  output = \`Cravey Crust ki active deals yeh hain:\\n\${list}\\n\\nAap in mein se konsi deal order karna chahenge?\`;
} else {
  output = 'Cravey Crust par value deals Rs. 599 se shuru hoti hain. Aap Deal 1, Deal 2 ya Family Deals check kar sakte hain!';
}

return {
  sessionId: $('Prepare Session').first().json.sessionId || 'primary',
  chatId: $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid,
  output
};`;

// Construct new nodes
const newNodes = [
  // 1. Webhook
  prev.nodes.find(n => n.name === 'Webhook'),
  // 2. Prepare Session
  prev.nodes.find(n => n.name === 'Prepare Session'),
  // 3. Skip Empty Message
  prev.nodes.find(n => n.name === 'Skip Empty Message'),
  // 4. Check Cache & Classify Intent
  {
    "parameters": {
      "mode": "runOnceForEachItem",
      "jsCode": classifierJsCode
    },
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [
      -3968,
      2480
    ],
    "id": "721cb9c1-0265-4993-be14-88f9fefcdadc",
    "name": "Check Cache & Classify Intent"
  },
  // 5. Route by Intent (Switch)
  {
    "parameters": {
      "rules": {
        "values": [
          {
            "conditions": {
              "options": {
                "caseSensitive": true,
                "leftValue": "",
                "typeValidation": "loose",
                "version": 2
              },
              "conditions": [
                {
                  "leftValue": "={{ $json.route }}",
                  "rightValue": "quick_reply",
                  "operator": {
                    "type": "string",
                    "operation": "equals"
                  }
                }
              ],
              "combinator": "and"
            }
          },
          {
            "conditions": {
              "options": {
                "caseSensitive": true,
                "leftValue": "",
                "typeValidation": "loose",
                "version": 2
              },
              "conditions": [
                {
                  "leftValue": "={{ $json.route }}",
                  "rightValue": "live_categories",
                  "operator": {
                    "type": "string",
                    "operation": "equals"
                  }
                }
              ],
              "combinator": "and"
            }
          },
          {
            "conditions": {
              "options": {
                "caseSensitive": true,
                "leftValue": "",
                "typeValidation": "loose",
                "version": 2
              },
              "conditions": [
                {
                  "leftValue": "={{ $json.route }}",
                  "rightValue": "live_deals",
                  "operator": {
                    "type": "string",
                    "operation": "equals"
                  }
                }
              ],
              "combinator": "and"
            }
          }
        ]
      },
      "options": {
        "fallbackOutput": "extra"
      }
    },
    "type": "n8n-nodes-base.switch",
    "typeVersion": 3.2,
    "position": [
      -3712,
      2480
    ],
    "id": "f5c5a3ac-3c25-4e36-8411-3ead5a2e5b72",
    "name": "Route by Intent"
  },
  // 6. Fetch Live Categories (HTTP Request, 0 LLM Tokens)
  {
    "parameters": {
      "method": "GET",
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
        "timeout": 20000
      }
    },
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.5,
    "position": [
      -3472,
      2304
    ],
    "id": "a1b2c3d4-e5f6-4701-8899-aabbccddeef1",
    "name": "Fetch Live Categories"
  },
  // 7. Format Live Categories
  {
    "parameters": {
      "mode": "runOnceForEachItem",
      "jsCode": formatCategoriesJs
    },
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [
      -3264,
      2304
    ],
    "id": "b2c3d4e5-f6a7-4802-9900-bbccddeeff12",
    "name": "Format Live Categories"
  },
  // 8. Fetch Live Deals (HTTP Request, 0 LLM Tokens)
  {
    "parameters": {
      "method": "GET",
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
        "timeout": 20000
      }
    },
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.5,
    "position": [
      -3472,
      2448
    ],
    "id": "c3d4e5f6-a7b8-4903-aa11-ccddeeff1223",
    "name": "Fetch Live Deals"
  },
  // 9. Format Live Deals
  {
    "parameters": {
      "mode": "runOnceForEachItem",
      "jsCode": formatDealsJs
    },
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [
      -3264,
      2448
    ],
    "id": "d4e5f6a7-b8c9-4a14-bb22-ddeeff122334",
    "name": "Format Live Deals"
  },
  // 10. AI Agent
  prev.nodes.find(n => n.name === 'AI Agent'),
  // 11. Google Gemini Chat Model
  prev.nodes.find(n => n.name === 'Google Gemini Chat Model'),
  // 12. DeepSeek Chat Model
  prev.nodes.find(n => n.name === 'DeepSeek Chat Model'),
  // 13. Simple Memory
  prev.nodes.find(n => n.name === 'Simple Memory'),
  // 14. Send WhatsApp Reply
  prev.nodes.find(n => n.name === 'Send WhatsApp Reply'),
  // All 16 tools
  ...prev.nodes.filter(n => n.type === 'n8n-nodes-base.httpRequestTool')
];

// Build connections
const newConnections = {
  ...prev.connections,
  "Skip Empty Message": {
    "main": [
      [
        {
          "node": "Check Cache & Classify Intent",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Check Cache & Classify Intent": {
    "main": [
      [
        {
          "node": "Route by Intent",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Route by Intent": {
    "main": [
      // Output 0: quick_reply -> Send WhatsApp Reply
      [
        {
          "node": "Send WhatsApp Reply",
          "type": "main",
          "index": 0
        }
      ],
      // Output 1: live_categories -> Fetch Live Categories
      [
        {
          "node": "Fetch Live Categories",
          "type": "main",
          "index": 0
        }
      ],
      // Output 2: live_deals -> Fetch Live Deals
      [
        {
          "node": "Fetch Live Deals",
          "type": "main",
          "index": 0
        }
      ],
      // Output 3 (Fallback/Extra): agent -> AI Agent
      [
        {
          "node": "AI Agent",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Fetch Live Categories": {
    "main": [
      [
        {
          "node": "Format Live Categories",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Format Live Categories": {
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
  "Fetch Live Deals": {
    "main": [
      [
        {
          "node": "Format Live Deals",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Format Live Deals": {
    "main": [
      [
        {
          "node": "Send WhatsApp Reply",
          "type": "main",
          "index": 0
        }
      ]
    ]
  }
};

// Remove old 'Is Cached?' from connections
delete newConnections['Check Cache & Quick Reply'];
delete newConnections['Is Cached?'];

const finalWorkflow = {
  "name": "Cravey Crust WhatsApp AI Ordering Agent",
  "nodes": newNodes.filter(Boolean),
  "connections": newConnections,
  "pinData": {},
  "meta": prev.meta || {
    "instanceId": "1bfb2852e5c8ac73154181d1ba55ded3d4372492f8bb7996e9b440e3904e9d5d"
  }
};

fs.writeFileSync('cravey-crust-whatsapp-agent-workflow.json', JSON.stringify(finalWorkflow, null, 2), 'utf8');
fs.writeFileSync('n8n.json', JSON.stringify(finalWorkflow, null, 2), 'utf8');
console.log('Successfully generated auto-sync workflow! Total nodes:', finalWorkflow.nodes.length);
