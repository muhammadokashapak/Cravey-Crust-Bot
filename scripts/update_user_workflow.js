import fs from 'fs';

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
        -5632,
        3488
      ],
      "id": "c692d9e8-d0fd-4b59-aabc-800f6e6d2f19",
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
            },
            {
              "id": "f8e4b7a1-2d3c-4e5f-9a0b-1c2d3e4f5a6b",
              "name": "pushName",
              "value": "={{ $json.body?.pushName || '' }}",
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
        -5664,
        3200
      ],
      "id": "4cfefb24-5576-4f9b-bc87-8bcde90bbbdb",
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
        -5584,
        2992
      ],
      "id": "feff3a6f-c58a-4d81-80c2-047ac74a2bde",
      "name": "Skip Empty Message"
    },
    {
      "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": "const rawMsg = (($json.message || $input?.item?.json?.message || '').toString()).trim().toLowerCase();\nconst cleanMsg = rawMsg.replace(/[^\\w\\s\\u0600-\\u06FF]/g, ' ').replace(/\\s+/g, ' ').trim();\n\nlet route = 'agent';\nlet output = '';\n\n// 1. Critical bypass check: Ordering actions, specific food items, cart, tracking, cancellation, handover MUST go to LLM Agent\nconst isOrderTracking = /\\b(mera order|order kahan|order status|track|tracking|kahan pohncha|cc-\\d+)\\b/i.test(cleanMsg);\nconst isActionOrSpecificItem = isOrderTracking || /\\b(order|chahiye|mangwana|karna hai|kardo|kar do|banao|pack|confirm|haan|yes|nahi|no|cancel|gali|house|street|road|sector|phase|flavour|flavor|fajita|tikka|extreme|peri|tandori|tandoori|ranch|malai|creamy|bbq|zinger|jalapeno|fillet|crispy burger|nuggets|wings|fries|sauce|calzone|slice|garlic bread|small|medium|large|party size|add|cart|remove|plus|minus|agent|human|call me|rabta karo|bande|banda|insan|manager|admin|complaint|shikayat|madad|help)\\b/i.test(cleanMsg);\n\nif (!isActionOrSpecificItem) {\n  // 2. Greetings Cache (0 Tokens)\n  const greetings = ['hi', 'hello', 'salam', 'assalam o alaikum', 'assalam alaikum', 'aoa', 'hey', 'slam', 'slaam', 'kese ho', 'kaise ho', 'kia hal hai', 'kya haal hai', 'سلام', 'السلام علیکم'];\n  if (greetings.includes(cleanMsg)) {\n    route = 'quick_reply';\n    output = 'Walaikum Assalam! Cravey Crust mein khushamdeed! Main hoon Burger Raja. Aaj aap kya order karna chahenge? Hamare paas Mazedar Pizzas, Burgers aur Value Deals dastiyab hain!';\n  }\n  // 3. Timings Cache (0 Tokens)\n  else if (cleanMsg.includes('timing') || cleanMsg.includes('timings') || cleanMsg.includes('open') || cleanMsg.includes('kab khulta') || cleanMsg.includes('band hota') || cleanMsg.includes('khula hai') || cleanMsg.includes('auqat') || cleanMsg.includes('ٹائمنگ') || cleanMsg.includes('اوپن')) {\n    route = 'quick_reply';\n    output = 'Cravey Crust rozana dopehar 12:00 PM se raat 2:00 AM tak open hota hai. Aap apna order kisi bhi waqt place kar sakte hain!';\n  }\n  // 4. Location Cache (0 Tokens)\n  else if (cleanMsg.includes('location') || cleanMsg.includes('address') || cleanMsg.includes('branch') || cleanMsg.includes('kahan') || cleanMsg.includes('kidhar') || cleanMsg.includes('لوکیشن') || cleanMsg.includes('پتہ')) {\n    route = 'quick_reply';\n    output = 'Cravey Crust Main Lehtrar Road, Tarlai / Ghauri Town Islamabad ke qareeb waqay hai. Delivery hamare poore coverage area mein dastiyab hai!';\n  }\n  // 5. Halal FAQ Cache (0 Tokens)\n  else if (cleanMsg.includes('halal') || cleanMsg.includes('halal food') || cleanMsg.includes('meat halal') || cleanMsg.includes('حلال')) {\n    route = 'quick_reply';\n    output = 'Ji bilkul! Cravey Crust ka tamam chicken aur tamam ingredients 100% certified Halal, taaza aur ba-qaidah checked hain.';\n  }\n  // 6. Payment Methods Cache (0 Tokens)\n  else if (cleanMsg.includes('payment') || cleanMsg.includes('kese pay') || cleanMsg.includes('kaise pay') || cleanMsg.includes('easypaisa') || cleanMsg.includes('card chalta') || cleanMsg.includes('online pay') || cleanMsg.includes('cash on delivery') || cleanMsg.includes('cod') || cleanMsg.includes('پیمنٹ')) {\n    route = 'quick_reply';\n    output = 'Cravey Crust par Cash on Delivery (COD) aur EasyPaisa dono payment tareeqay dastiyab hain. Order confirm karte waqt aap apna pasandeeda tareeqa chun sakte hain.';\n  }\n  // 7. Delivery Info Cache (0 Tokens)\n  else if (cleanMsg.includes('delivery charges') || cleanMsg.includes('delivery fee') || cleanMsg.includes('free delivery') || cleanMsg.includes('delivery kitne') || cleanMsg.includes('ڈلیوری چارجز')) {\n    route = 'quick_reply';\n    output = 'Cravey Crust par standard delivery charges faslay (distance) ke mutabiq Rs. 100 se Rs. 250 tak hotay hain. Apne area ka naam batayein taake hum exact delivery fee bata sakein!';\n  }\n  // 8. Promotions / Discounts Cache (0 Tokens)\n  else if (cleanMsg.includes('discount') || cleanMsg.includes('promo') || cleanMsg.includes('voucher') || cleanMsg.includes('coupon') || cleanMsg.includes('off hai') || cleanMsg.includes('discount code') || cleanMsg.includes('riayat') || cleanMsg.includes('bachat') || cleanMsg.includes('ڈسکاؤنٹ') || cleanMsg.includes('رعایت')) {\n    route = 'quick_reply';\n    output = 'Filhal koi alag discount promo code active nahi hai, lekin hamari \\\"Value Deals\\\" pehle se hi bhari riayat (discount) par dastiyab hain (Starting from Rs. 599)! Aap Deals dekh kar order enjoy kar sakte hain.';\n  }\n  // 9. LIVE MENU CATEGORIES (0 Tokens, Auto-Sync from Dashboard!)\n  else if (cleanMsg.includes('menu') || cleanMsg.includes('rate list') || cleanMsg.includes('price list') || cleanMsg.includes('food list') || cleanMsg.includes('list dikhao') || cleanMsg.includes('kya kya hai') || cleanMsg === 'kya hai' || cleanMsg === 'list' || cleanMsg.includes('مینو') || cleanMsg.includes('ریٹ لسٹ')) {\n    route = 'live_categories';\n  }\n  // 10. LIVE DEALS (0 Tokens, Auto-Sync from Dashboard!)\n  else if (cleanMsg.includes('deal') || cleanMsg.includes('deals') || cleanMsg.includes('combo') || cleanMsg.includes('package') || cleanMsg.includes('offers') || cleanMsg.includes('ڈیل') || cleanMsg.includes('ڈیلز')) {\n    route = 'live_deals';\n  }\n}\n\nreturn {\n  ...$json,\n  route,\n  output\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -5536,
        2768
      ],
      "id": "443bc6eb-dfdd-463c-a73a-1c98f52faa1b",
      "name": "Check Cache & Classify Intent"
    },
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
        -5264,
        2768
      ],
      "id": "cb837cd1-2eb3-42e7-98a8-4722b9b7d403",
      "name": "Route by Intent"
    },
    {
      "parameters": {
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
        -5008,
        2608
      ],
      "id": "24a13fb0-dc9f-44fb-96c5-1e0413cac0a7",
      "name": "Fetch Live Categories"
    },
    {
      "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": "const items = $json.data || $json || [];\nlet output = '';\n\nif (Array.isArray(items) && items.length > 0) {\n  const list = items.map((c, i) => `${i + 1}. ${c.name}`).join('\\n');\n  output = `Hamare menu mein yeh categories hain:\\n${list}\\n\\nAap konsi category dekhna chahenge?`;\n} else {\n  output = 'Hamare menu mein Classic Pizzas, Burgers, Deals aur Sides dastiyab hain. Aap konsi category dekhna chahenge?';\n}\n\nreturn {\n  sessionId: $('Prepare Session').first().json.sessionId || 'primary',\n  chatId: $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid,\n  output\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -4768,
        2608
      ],
      "id": "5a9bd91a-e0c3-4ea4-8c1c-5d86e156b5eb",
      "name": "Format Live Categories"
    },
    {
      "parameters": {
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
        -5008,
        2768
      ],
      "id": "fbbe6d94-8a01-4336-a570-e92c05f870ed",
      "name": "Fetch Live Deals"
    },
    {
      "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": "const items = $json.data || $json || [];\nlet output = '';\n\nif (Array.isArray(items) && items.length > 0) {\n  const list = items.slice(0, 6).map((d, i) => `${i + 1}. ${d.name} - Rs. ${d.price || d.deal_price || ''}`).join('\\n');\n  output = `Cravey Crust ki active deals yeh hain:\\n${list}\\n\\nAap in mein se konsi deal order karna chahenge?`;\n} else {\n  output = 'Cravey Crust par value deals Rs. 599 se shuru hoti hain. Aap Deal 1, Deal 2 ya Family Deals check kar sakte hain!';\n}\n\nreturn {\n  sessionId: $('Prepare Session').first().json.sessionId || 'primary',\n  chatId: $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid,\n  output\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -4768,
        2768
      ],
      "id": "d34ea759-4990-4816-9ec6-edf91e79bd90",
      "name": "Format Live Deals"
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "={{ $json.message || 'Customer ne apni location share ki hai.' }}",
        "needsFallback": true,
        "options": {
          "systemMessage": "Cravey Crust WhatsApp ordering bot.\n\nRULES:\n- Answer ONLY what is asked in 2-3 short lines of Roman Urdu. Never use asterisks (*).\n- Never say \"permission nahi hai\". Be direct and helpful.\n- Menu: Call Get Menu Categories. Ask what category they want.\n- Item/Price: Call Search Menu Item for specific item price.\n- Deals: Call Get Current Deals. Mention 2-3 top deals.\n- Delivery: Ask customer area name, then call Check Delivery Availability.\n\nORDERING:\n- Never calculate totals; call Calculate Cart Totals.\n- Collect name, phone, address, payment (COD/Easypaisa).\n- Show summary, create order ONLY after explicit confirmation. Call Create Confirmed Order once.\n- Cancel: 2 turns (1: request cancel; 2: confirm cancel on yes/no).\n- Human / Agent: Jab bhi customer human agent, staff, real person, complaint ya manager se baat karna chahe, call Request Human Handover immediately with reason. Customer ko batayein ke hamara representative aapse jald rabta karega aur bot silent rahega."
        }
      },
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 3.1,
      "position": [
        -5008,
        2960
      ],
      "id": "61987c52-35af-469b-a4ae-781f7ceaa934",
      "name": "AI Agent"
    },
    {
      "parameters": {
        "modelName": "models/gemini-3.5-flash-lite",
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
      "typeVersion": 1,
      "position": [
        -5248,
        3232
      ],
      "id": "8bf6fb05-7904-421b-a36f-917a05311c07",
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
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.lmChatDeepSeek",
      "typeVersion": 1,
      "position": [
        -5024,
        3248
      ],
      "id": "80750357-e61c-42e5-a3de-e430a5eb4941",
      "name": "DeepSeek Chat Model",
      "credentials": {
        "deepSeekApi": {
          "id": "wNcraJYZ11bQD501",
          "name": "DeepSeek account"
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
        -4912,
        3456
      ],
      "id": "8ce72672-a833-49c0-9b83-e92bdb9453f4",
      "name": "Simple Memory"
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
              "value": "={{ $json.chatId || $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid }}"
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
        -4496,
        2768
      ],
      "id": "4e5a0f81-684c-44dc-b998-a43cf598b7ba",
      "name": "Send WhatsApp Reply"
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
        -4512,
        3040
      ],
      "id": "3d80590d-ce8c-431c-a963-ef9a960b82d2",
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
        -4272,
        3040
      ],
      "id": "81fa11eb-8d9d-4e86-a52e-c9c3f703e3dc",
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
        -4032,
        3040
      ],
      "id": "a44cd1d9-d7c8-4431-be71-11a62f98487e",
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
        -3792,
        3040
      ],
      "id": "c2a35787-d0d8-4e7e-b28d-712c3229fd89",
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
        -3552,
        3040
      ],
      "id": "544adac1-7663-4aee-bd65-c2d4fa6c7142",
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
        -3312,
        3040
      ],
      "id": "8d9ef628-d6c6-4381-aee4-85e7d5981d8c",
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
        -3072,
        3040
      ],
      "id": "76ed15ba-289a-44bc-9b64-c692e2c33f98",
      "name": "Check Delivery Availability"
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
        -2832,
        3040
      ],
      "id": "9e4bfbee-a191-441f-a8d8-fe606c651a16",
      "name": "Get Order Status"
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
        -4656,
        3328
      ],
      "id": "3ca2d543-aaf2-4f10-8845-329cee24c2c3",
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
        -4416,
        3328
      ],
      "id": "e3f760d7-f6c6-4e1d-9798-a889cebd25f0",
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
        -4176,
        3328
      ],
      "id": "63ba1e4c-929d-4abe-9538-da9434f807af",
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
        -3936,
        3328
      ],
      "id": "af40c250-ad40-4e79-aa7b-b97e308312f5",
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
        -3696,
        3328
      ],
      "id": "d5f72ed1-8f03-4322-93b0-a01ee916956a",
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
        -3456,
        3328
      ],
      "id": "5041da53-995b-41b0-bda7-476e95996700",
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
        -3392,
        3488
      ],
      "id": "a212ada6-3ea0-4856-8a22-8dd0e8a1874c",
      "name": "Create Confirmed Order"
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
        -3152,
        3488
      ],
      "id": "db1d7c42-734c-4efa-8f32-577d46ee17ce",
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
        -4064,
        3536
      ],
      "id": "65049ce4-b0ef-495e-84a7-ebf7f7f42dcb",
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
        -3824,
        3536
      ],
      "id": "bdaf647c-fcbf-4bf7-bf20-c7ede9681523",
      "name": "Send Alternate Confirmation"
    },
    {
      "parameters": {
        "toolDescription": "Hand over chat to human staff, notify restaurant owner/scanned WhatsApp, and mute bot for 2 hours.",
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
        "jsonBody": "={{ JSON.stringify({ chatId: $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid || $('Webhook').first().json.body?.chatId, sessionKey: $('Prepare Session').first().json.sessionKey, customerName: $('Prepare Session').first().json.pushName || $('Webhook').first().json.body?.pushName || undefined, customerPhone: $('Prepare Session').first().json.whatsappPhone || $('Webhook').first().json.body?.phone || undefined, durationMinutes: 120, reason: $fromAI('reason', 'Customer reason for requesting human support', 'string') }) }}",
        "options": {
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3584,
        3536
      ],
      "id": "4c4f51e1-98ad-4200-a75c-a369f128849c",
      "name": "Request Human Handover"
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
        [
          {
            "node": "Send WhatsApp Reply",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Fetch Live Categories",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Fetch Live Deals",
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
    }
  },
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "1bfb2852e5c8ac73154181d1ba55ded3d4372492f8bb7996e9b440e3904e9d5d"
  }
};

const jsonContent = JSON.stringify(workflow, null, 2);
fs.writeFileSync('cravey-crust-whatsapp-agent-workflow.json', jsonContent, 'utf8');
fs.writeFileSync('n8n.json', jsonContent, 'utf8');
fs.writeFileSync('updated_n8n_workflow.json', jsonContent, 'utf8');

console.log('Successfully wrote updated workflow to:');
console.log('- cravey-crust-whatsapp-agent-workflow.json');
console.log('- n8n.json');
console.log('- updated_n8n_workflow.json');
