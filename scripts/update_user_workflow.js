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
        -5376,
        3232
      ],
      "id": "d7bcdcde-7d46-4dc8-93dc-cc5bb37e10ec",
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
              "value": "={{ ($json.body?.location?.latitude && $json.body?.location?.longitude) ? ('Customer ne location pin share ki: lat=' + $json.body.location.latitude + ', lng=' + $json.body.location.longitude + ($json.body?.location?.mapUrl ? ', url=' + $json.body.location.mapUrl : '')) : ($json.body?.message || $json.body?.text || $json.body?.chatInput || '') }}",
              "type": "string"
            },
            {
              "id": "3b29ef5a-8b1e-4509-a720-d8a412389fed",
              "name": "locationLat",
              "value": "={{ $json.body?.location?.latitude || (String($json.body?.message || $json.body?.text || '').match(/(?:q=|@)(-?\\d+\\.\\d+),\\s*(-?\\d+\\.\\d+)/)?.[1]) || '' }}",
              "type": "string"
            },
            {
              "id": "7a30cf1b-9c2f-461a-b831-e9b523490afe",
              "name": "locationLng",
              "value": "={{ $json.body?.location?.longitude || (String($json.body?.message || $json.body?.text || '').match(/(?:q=|@)(-?\\d+\\.\\d+),\\s*(-?\\d+\\.\\d+)/)?.[2]) || '' }}",
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
        -5184,
        3232
      ],
      "id": "753f4c2e-49f1-4a31-955a-029a9830634d",
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
        -4976,
        3232
      ],
      "id": "44183ee5-3751-4c01-8eb6-2e3159a00ead",
      "name": "Skip Empty Message"
    },
    {
      "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": "const raw = String($json.message || '').trim().toLowerCase();\nconst clean = raw.replace(/[^\\w\\s\\u0600-\\u06FF]/g, ' ').replace(/\\s+/g, ' ').trim();\nconst wordCount = clean ? clean.split(' ').length : 0;\nconst has = (re) => re.test(clean);                       // English/Roman Urdu words\nconst any = (arr) => arr.some(k => clean.includes(k));    // Urdu script\n\nlet route = 'agent';\nlet output = '';\n\n// 1. Human Handover / Reject Bot Intent Detection\nconst rejectBot = /\\b(bot se|bot k sath|robot|bot nahi|bot se nahi|bot se bat nahi|bot se baat nahi)\\b/i.test(clean);\nconst wantHuman = /\\b(agent se|human se|bande se|representative se|manager se)\\b/i.test(clean);\nconst isHandoverExact = ['agent', 'human', 'representative', 'staff', 'manager', 'help', 'madad'].includes(clean);\nconst isHandoverKeyword = has(/\\b(agent chahiye|human chahiye|representative chahiye|banda chahiye|insan chahiye|call agent|talk to human|talk to agent|agent se baat|human se baat|bande se baat|call me|rabta karo|rabta karwao|shikayat|complaint)\\b/);\n\nif (rejectBot || wantHuman || isHandoverExact || isHandoverKeyword) {\n  route = 'handover';\n  output = 'Ji bilkul, main aapki request hamare human team member ko forward kar raha hoon aur bot ko 2 ghante ke liye mute kar diya gaya hai. Hamara representative thodi hi der mein aap se rabta karega aur aapke sath deal karega. Shukriya!';\n} else {\n  // 2. Specific deal or item inquiry must go to agent (e.g. \"burger wali deal main kya kya ha\")\n  const isDealOrItemInquiry = has(/\\b(kya kya hai|kya hai|kia hai|kia kya|isme kya|is mein kya|detail|details|includes|shamil|konsi cheez|burger|pizza|pasta|pani|water|drink|coke|sprite|wings|fries|garlic bread)\\b/);\n\n  // Yeh sab seedha agent ke paas jayega (order flow, address, number, lambay messages, item inquiry)\n  const mustGoToAgent =\n    isDealOrItemInquiry ||\n    wordCount === 0 || wordCount > 7 || /\\d/.test(clean) ||\n    has(/\\b(order|chahiye|mangwana|mangwa|karna hai|kardo|kar do|banao|pack|confirm|haan|han|ji|yes|nahi|no|ok|cancel|cod|easypaisa|easy paisa|cash|gali|house|street|road|sector|phase|flavour|flavor|fajita|tikka|extreme|peri|tandoori|tandori|ranch|malai|creamy|bbq|zinger|jalapeno|fillet|nuggets|wings|fries|sauce|calzone|slice|garlic|small|medium|large|party|add|cart|remove|plus|minus|track|tracking|status|location|pin|maps)\\b/);\n\n  if (!mustGoToAgent) {\n    const greetings = ['hi','hello','salam','assalam o alaikum','assalam alaikum','aoa','hey','slam','slaam','kese ho','kaise ho','kia hal hai','kya haal hai','سلام','السلام علیکم'];\n\n    if (greetings.includes(clean)) {\n      route = 'quick_reply';\n      output = 'Walaikum Assalam! Cravey Crust mein khushamdeed! Main hoon Burger Raja. Aaj aap kya order karna chahenge? Hamare paas Mazedar Pizzas, Burgers aur Value Deals dastiyab hain!';\n    } else if (has(/\\b(timing|timings|open|khulta|khula|auqat)\\b/) || clean.includes('band hota') || any(['ٹائمنگ','اوپن'])) {\n      route = 'quick_reply';\n      output = 'Cravey Crust rozana dopehar 12:00 PM se raat 2:00 AM tak open hota hai. Aap apna order kisi bhi waqt place kar sakte hain!';\n    } else if (has(/\\b(address|branch|kahan|kidhar)\\b/) || any(['پتہ'])) {\n      route = 'quick_reply';\n      output = 'Cravey Crust Main Lehtrar Road, Tarlai / Ghauri Town Islamabad ke qareeb waqay hai. Delivery hamare poore coverage area mein dastiyab hai!';\n    } else if (has(/\\bhalal\\b/) || any(['حلال'])) {\n      route = 'quick_reply';\n      output = 'Ji bilkul! Cravey Crust ka tamam chicken aur tamam ingredients 100% certified Halal, taaza aur ba-qaidah checked hain.';\n    } else if (has(/\\b(payment|payments)\\b/) || clean.includes('kese pay') || clean.includes('kaise pay') || clean.includes('online pay') || clean.includes('card chalta') || any(['پیمنٹ'])) {\n      route = 'quick_reply';\n      output = 'Cravey Crust par Cash on Delivery (COD) aur EasyPaisa dono payment tareeqay dastiyab hain. Order confirm karte waqt aap apna pasandeeda tareeqa chun sakte hain.';\n    } else if (clean.includes('delivery charges') || clean.includes('delivery fee') || clean.includes('free delivery') || clean.includes('delivery kitne') || any(['ڈلیوری چارجز'])) {\n      route = 'quick_reply';\n      output = 'Cravey Crust par standard delivery charges faslay (distance) ke mutabiq Rs. 100 se Rs. 250 tak hotay hain. Apne area ka naam batayein taake hum exact delivery fee bata sakein!';\n    } else if (has(/\\b(discount|promo|voucher|coupon|riayat|bachat)\\b/) || any(['ڈسکاؤنٹ','رعایت'])) {\n      route = 'quick_reply';\n      output = 'Filhal koi alag discount promo code active nahi hai, lekin hamari \"Value Deals\" pehle se hi bhari riayat (discount) par dastiyab hain (Starting from Rs. 599)! Aap Deals dekh kar order enjoy kar sakte hain.';\n    } else if (has(/\\b(thanks|thank you|thankyou|shukriya|shukria|jazakallah|jazak allah)\\b/)) {\n      route = 'quick_reply';\n      output = 'Aapka bohat shukriya! Koi aur madad chahiye to bata dein, hum hazir hain.';\n    } else if (has(/\\b(menu|list)\\b/) || clean.includes('rate list') || clean.includes('price list') || clean.includes('food list') || clean === 'kya hai' || any(['مینو','ریٹ لسٹ'])) {\n      route = 'live_categories';\n    } else if (has(/\\b(deal|deals|combo|package|offers)\\b/) || any(['ڈیل','ڈیلز'])) {\n      route = 'live_deals';\n    }\n  }\n}\n\n// ---- Order confirmation detector (agent ko hint dene ke liye) ----\nconst confirmRe = /\\b(confirm|confirmed|haan|han|haa|ji|jee|yes|yeah|yep|ok|okay|theek|thik|done|kardo|kar do|kr do|krdo|kardu|kar du|kr du|krdu|place|bhej do|bhejdo|proceed)\\b/;\nconst negRe = /\\b(nahi|nahin|nai|no|cancel|mat|dont|don t)\\b/;\nconst confirmIntent = wordCount > 0 && wordCount <= 8 && !/\\d/.test(clean) && confirmRe.test(clean) && !negRe.test(clean);\n\nreturn { ...$json, route, output, confirmIntent };"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -4768,
        3232
      ],
      "id": "1047f828-4901-4325-b8c0-34dde50c16ef",
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
                    "rightValue": "handover",
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
        -4560,
        3200
      ],
      "id": "3785183c-a93a-47c5-a77f-b6665fa613ac",
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
        -4096,
        3056
      ],
      "id": "5170238d-7667-4d52-8c51-3b30b57c45aa",
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
        -3856,
        3056
      ],
      "id": "f632db63-3ca3-413b-989a-171db4a0979f",
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
        -4096,
        3216
      ],
      "id": "9d811271-fb77-468a-bb21-196dace66df1",
      "name": "Fetch Live Deals"
    },
    {
      "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": "const items = $json.data || $json || [];\nlet output = '';\n\nif (Array.isArray(items) && items.length > 0) {\n  const list = items.slice(0, 6).map((d, i) => `${i + 1}. ${d.name} - Rs. ${d.price ?? d.dealPrice ?? d.deal_price ?? ''}`).join('\\n');\n  output = `Cravey Crust ki active deals yeh hain:\\n${list}\\n\\nAap in mein se konsi deal order karna chahenge?`;\n} else {\n  output = 'Cravey Crust par value deals Rs. 599 se shuru hoti hain. Aap Deal 1, Deal 2 ya Family Deals check kar sakte hain!';\n}\n\nreturn {\n  sessionId: $('Prepare Session').first().json.sessionId || 'primary',\n  chatId: $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid,\n  output\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -3856,
        3216
      ],
      "id": "b99371c8-48b5-4a8a-81ec-70c78e779fb5",
      "name": "Format Live Deals"
    },
    {
      "parameters": {
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
        "jsonBody": "={{ JSON.stringify({\n  chatId: $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid || $('Webhook').first().json.body?.chatId,\n  sessionKey: $('Prepare Session').first().json.sessionKey,\n  durationMinutes: 120,\n  reason: $('Prepare Session').first().json.message || 'Customer requested human support representative',\n  pushName: $('Prepare Session').first().json.pushName || undefined,\n  customerPhone: $('Prepare Session').first().json.whatsappPhone || undefined\n}) }}",
        "options": {
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.5,
      "position": [
        -4096,
        3376
      ],
      "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "name": "Execute Handover Mute"
    },
    {
      "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": "return {\n  sessionId: 'primary',\n  chatId: $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid || '',\n  output: 'Ji bilkul, main aapki request hamare human team member ko forward kar raha hoon aur bot ko 2 ghante ke liye mute kar diya gaya hai. Hamara representative thodi hi der mein aap se rabta karega aur aapke sath deal karega. Shukriya!'\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -3856,
        3376
      ],
      "id": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
      "name": "Format Handover Reply"
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "={{ $json.message || 'Customer ne apni location share ki hai.' }}",
        "needsFallback": true,
        "options": {
          "systemMessage": "=Tum Cravey Crust ke WhatsApp ordering agent \"Burger Raja\" ho. Roman Urdu mein, chhote (2-4 line) aur polite jawab do. Asterisk (*) kabhi mat use karo. Ek waqt mein sirf ek sawal poochho.\n\nCUSTOMER: {{ $('Prepare Session').first().json.whatsappPhone ? 'Verified WhatsApp number: ' + $('Prepare Session').first().json.whatsappPhone + ' (agar customer kahe isi number par rabta karo to yehi use hoga, dobara mat poochho).' : 'WhatsApp number verify nahi hai, is liye order se pehle customer se contact number zaroor maango.' }}\n{{ $('Check Cache & Classify Intent').first().json.confirmIntent ? 'ABHI KA MESSAGE: customer ne shayad confirm kiya hai. Agar tumhara pichla message order summary tha, to ab FORAN Create Confirmed Order tool call karo, dobara mat poochho. Agar pichla message cancellation ka tha to Confirm Order Cancellation (true) call karo.' : '' }}\n\nDATA: Menu, prices, deals, timings, delivery, promos kabhi apni taraf se mat banao. Sirf tools se lo. Item/price ke liye Search Menu Item, categories ke liye Get Menu Categories, deals ke liye Get Current Deals, promo ke liye Get Active Promotions, store/FAQ/timing ke liye Search FAQs. Item ya deal na mile to kaho ke filhal available nahi. Promotions khali hon to kaho: \"Filhal koi active discount code dastiyab nahi hai, lekin aap hamari mazedar deals enjoy kar sakte hain!\"\n\nTOOLS (tez jawab ke liye): Sirf zaroori tool call karo. Jo data is chat mein pehle tool se mil chuka ho dobara mat mangwao. Jis tool response mein cart/total pehle se ho uske baad Get Cart dobara call mat karo. Kai items hon to har item ka Search Menu Item ek saath chalao. Tool error aaye to customer ko seedha batao, bina naye input ke wohi call dobara mat karo.\n\nCART RULES (ZAROORI):\n1. Add to Cart mein sirf exact menuItemId (+variantId) ya exact dealId bhejo, dono saath kabhi nahi. Quantity/notes ke liye Update Cart Item, hatane ke liye Remove Cart Item, reset ke liye Clear Cart. Subtotal/total Calculate Cart Totals se lo.\n2. HAR ITEM YA DEAL ADD HONE KE BAAD (Add to Cart call ke baad): Customer ko batayein ke item add ho gaya hai, aur HAMESHA yeh poochhein: \"Kya aap kuch aur add karna chahenge, ya order checkout karein?\"\n3. KABHI BHI item add hote hi direct delivery address ya payment details MAT maango. Customer ko mazeed items (burger, pizza, fries, drinks, paani) add karne ka poora moqa do.\n4. CHECKOUT DETAILS (naam, delivery address/location, payment method COD ya Easypaisa) sirf tab maango jab customer kahe ke \"aur kuch nahi\", \"bas yahi\", \"nahi\", \"no\", \"checkout kar do\", \"bill kitna bana\", ya khud apna pata/location bhej de.\n\nLOCATION AUR DELIVERY AREA CHECK (ZAROORI):\nJab bhi customer apni location share kare (WhatsApp location pin, Google Maps link, ya area ka naam):\n1. Pehle FORAN 'Check Delivery Availability' tool call karo (latitude/longitude ya areaName ke sath).\n2. Agar location delivery area mein mojood ho (available: true):\n   Customer ko saaf saaf aur khush-dili se wazeh batao:\n   \"Aapki location hamare delivery area mein aati hai ([Area Name]). Delivery fee: Rs. [deliveryFee] hai.\"\n   Aur phir is ke mutabiq agla step deal karo:\n   - Agar cart mein items pehle se hain (checkout step): Foran 'Calculate Cart Totals' call karke updated summary (Items, Subtotal, Delivery Fee, Total, Name, Address, Contact, Payment) dikhao aur poochho: \"Order confirm karne ke liye haan likhein.\"\n   - Agar cart abhi khali hai: Batayein ke delivery is area mein dastiyab hai aur poochhein: \"Aap aaj kya order karna chahenge? Hamare paas Mazedar Pizzas, Burgers aur Deals dastiyab hain!\"\n3. Agar location delivery area se bahar ho (available: false):\n   Customer ko politely batao: \"Maazrat, yeh location filhal hamare delivery area se bahar hai. Hamari delivery sirf Cravey Crust ke coverage areas (Tarlai, Ghauri Town, Taramari, Al-Noor, Khanna Pul vaghera) mein dastiyab hai.\"\n\nORDER CONFIRMATION (CRITICAL):\nSummary dikhane ke baad customer ka koi bhi positive jawab (haan, han, ji, yes, ok, confirm, confirm kar do, kar do, kr du, theek hai, done) CONFIRMATION hai.\nDOBARA MAT POOCHHO! FORAN 'Create Confirmed Order' tool call karo (customerName, deliveryAddress, deliveryAreaName, paymentMethod COD/EASYPAISA pichli chat se lo).\nBINA Create Confirmed Order TOOL CALL KIYE KABHI BHI TEXT MEIN MAT KAHO KE ORDER CONFIRM HO GAYA!\nTool response mein jab asli order_number (CC-...) aaye, sirf tabhi customer ko kaho: \"Aapka order confirm ho gaya hai! Order number: CC-... hai. Total: Rs. ... Payment: ...\" (order number CC-... lazmi likhna hai).\nTool error aye to reason dekh kar solve karo (jaise missing contact number ya name).\n\nSTATUS/CANCEL: Order number par Get Order Status. Cancel ke liye pehle Request Order Cancellation, summary dikha kar poochho. Customer ke haan/nahi par Confirm Order Cancellation (true/false).\n\nHUMAN HANDOVER (AGENT SE BAAT):\nAgar customer kahe ke \"mein ne bot se bat nahi krni agent se krni ha\", \"bot se baat nahi karni\", \"agent se baat karni hai\", \"kisi bande se baat karwao\", \"manager\", \"staff\", \"call me\", ya insaan se baat ki request kare:\nFORAN 'Request Human Handover' tool call karo (durationMinutes: 120).\nPhir yeh kaho: \"Ji bilkul, main aapki request hamare human team member ko forward kar raha hoon aur bot agle 2 ghante ke liye mute ho gaya hai. Hamara representative thodi hi der mein aap se rabta karega aur aapke sath deal karega. Shukriya!\"",
          "maxIterations": 8
        }
      },
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 3.1,
      "position": [
        -4400,
        3536
      ],
      "id": "5fc1eba0-7ec5-4ff4-99b3-33a6472a286c",
      "name": "AI Agent",
      "onError": "continueRegularOutput"
    },
    {
      "parameters": {
        "modelName": "models/gemini-3.5-flash-lite",
        "options": {
          "maxOutputTokens": 1024,
          "temperature": 0.2
        }
      },
      "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
      "typeVersion": 1,
      "position": [
        -4736,
        3840
      ],
      "id": "770d21cc-74fd-4f91-8cca-103a7355ea82",
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
        "model": "deepseek-flash",
        "options": {
          "maxTokens": 1024,
          "temperature": 0.2
        }
      },
      "type": "@n8n/n8n-nodes-langchain.lmChatDeepSeek",
      "typeVersion": 1,
      "position": [
        -4608,
        3904
      ],
      "id": "df06fc44-7d1c-4753-9f48-8d9a86f279b8",
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
        "contextWindowLength": 10
      },
      "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
      "typeVersion": 1.3,
      "position": [
        -4416,
        4032
      ],
      "id": "bbe559a7-3254-4435-a7f5-531c31ed87e8",
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
        -3584,
        3216
      ],
      "id": "0ee4cdf1-cdb1-4542-88e9-6c4deca19298",
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
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -4016,
        3616
      ],
      "id": "2fee4fe1-e930-4483-9680-323b530b03e5",
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
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3776,
        3616
      ],
      "id": "ff769f93-d8bb-40d3-8986-5e7b480febd0",
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
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3536,
        3616
      ],
      "id": "cb0358d1-1681-4072-8545-ce33bc4e20bc",
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
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3296,
        3616
      ],
      "id": "4a6b742e-7372-4e4a-928b-544894d7aca2",
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
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3056,
        3616
      ],
      "id": "5936453c-7f63-4883-8a65-68bbb675000c",
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
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2816,
        3616
      ],
      "id": "5bf6d975-342e-4b8c-bed6-ce2b88f0aa31",
      "name": "Get Active Promotions"
    },
    {
      "parameters": {
        "toolDescription": "Check area delivery coverage and fee. Provide areaName, or latitude & longitude.",
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
        "jsonBody": "={{ JSON.stringify({ areaName: $fromAI('areaName', 'Area name, empty if only location pin/coordinates', 'string', ''), latitude: Number($fromAI('latitude', 'Latitude from shared location or coordinates, else 0', 'number', 0) || $('Prepare Session').first().json.locationLat || $('Webhook').first().json.body?.location?.latitude || 0) || undefined, longitude: Number($fromAI('longitude', 'Longitude from shared location or coordinates, else 0', 'number', 0) || $('Prepare Session').first().json.locationLng || $('Webhook').first().json.body?.location?.longitude || 0) || undefined }) }}",
        "options": {
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2576,
        3616
      ],
      "id": "75966a16-dfe5-4838-b56b-fc11e201b79b",
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
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2336,
        3616
      ],
      "id": "0baf944b-47f5-4dee-b7c8-83d5f14b03d6",
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
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -4160,
        3904
      ],
      "id": "2a70d428-a0df-4de2-b334-f15ceef80937",
      "name": "Get Cart"
    },
    {
      "parameters": {
        "toolDescription": "Add item or deal to cart (send menuItemId OR dealId). After adding, ask if they want anything else.",
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
        "jsonBody": "={{ JSON.stringify({ menuItemId: $fromAI('menuItemId', 'Menu item ID, empty for deals', 'string', '') || undefined, variantId: $fromAI('variantId', 'Variant ID if any', 'string', '') || undefined, dealId: $fromAI('dealId', 'Deal ID, empty for menu items', 'string', '') || undefined, quantity: $fromAI('quantity', 'Quantity integer', 'number', 1), notes: $fromAI('notes', 'Item instructions', 'string', '') || undefined }) }}",
        "options": {
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3920,
        3904
      ],
      "id": "e8bf469d-9943-4939-8de4-fedcc4c55422",
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
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3680,
        3904
      ],
      "id": "2b8542b3-b808-46b6-99ce-7b0c0684d540",
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
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3440,
        3904
      ],
      "id": "82090906-e683-4c9c-81dc-45eb7f5c2128",
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
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3200,
        3904
      ],
      "id": "c96167c5-fc52-4e91-9e51-ce2540af6065",
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
        "jsonBody": "={{ JSON.stringify({ promoCode: $fromAI('promoCode', 'Only if customer gave a code', 'string', '') || undefined, deliveryAreaId: $fromAI('deliveryAreaId', 'Area ID from delivery check', 'string', '') || undefined, deliveryAreaName: $fromAI('deliveryAreaName', 'Delivery area name', 'string', ''), latitude: Number($fromAI('latitude', 'Latitude from shared location, else 0', 'number', 0) || $('Prepare Session').first().json.locationLat || $('Webhook').first().json.body?.location?.latitude || 0) || undefined, longitude: Number($fromAI('longitude', 'Longitude from shared location, else 0', 'number', 0) || $('Prepare Session').first().json.locationLng || $('Webhook').first().json.body?.location?.longitude || 0) || undefined }) }}",
        "options": {
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2960,
        3904
      ],
      "id": "653dcd73-f16e-47f2-a339-89ae219e78b6",
      "name": "Calculate Cart Totals"
    },
    {
      "parameters": {
        "toolDescription": "Order place karta hai. Customer ke summary par haan/confirm kehte hi FORAN call karo. Result se CC-... order number milta hai.",
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
        "jsonBody": "={{ JSON.stringify({\n  sessionKey: $('Prepare Session').first().json.sessionKey,\n  customerName: $fromAI('customerName', 'Customer ka naam (pichli chat se)', 'string'),\n  phone: ($fromAI('phone', 'Sirf agar customer ne alag contact number diya ho, warna khali chhodo', 'string', '') || $('Prepare Session').first().json.whatsappPhone || undefined),\n  contactNumberMode: 'provided',\n  confirmationNumberMode: 'default',\n  confirmationPhone: $fromAI('confirmationPhone', 'Sirf agar customer ne kisi aur number par confirmation maangi, warna khali', 'string', '') || undefined,\n  delivery: {\n    address: $fromAI('deliveryAddress', 'Customer ka confirmed delivery address', 'string'),\n    areaName: $fromAI('deliveryAreaName', 'Delivery area ka naam', 'string', ''),\n    areaId: $fromAI('deliveryAreaId', 'Area ID agar delivery check se mili, warna khali', 'string', '') || undefined,\n    latitude: (Number($fromAI('latitude', 'Shared location ki latitude, warna 0', 'number', 0)) || Number($('Prepare Session').first().json.locationLat) || $('Webhook').first().json.body?.location?.latitude) || undefined,\n    longitude: (Number($fromAI('longitude', 'Shared location ki longitude, warna 0', 'number', 0)) || Number($('Prepare Session').first().json.locationLng) || $('Webhook').first().json.body?.location?.longitude) || undefined,\n    googleMapsUrl: $('Webhook').first().json.body?.location?.mapUrl || $('Webhook').first().json.body?.location?.originalUrl || ''\n  },\n  paymentMethod: String($fromAI('paymentMethod', 'COD ya EASYPAISA', 'string', 'COD') || 'COD').toUpperCase().replace(/\\s+/g, ''),\n  promoCode: $fromAI('promoCode', 'Promo code agar diya ho, warna khali', 'string', '') || undefined,\n  notes: $fromAI('notes', 'Order notes, warna khali', 'string', '') || undefined,\n  idempotencyKey: $('Prepare Session').first().json.messageId || undefined\n}) }}",
        "options": {
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 60000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2896,
        4064
      ],
      "id": "7593fd58-f9b6-4087-854b-cb780497eaff",
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
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -2656,
        4064
      ],
      "id": "fcaccee0-d0fd-4a92-bb07-f9725c0b7e13",
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
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3568,
        4112
      ],
      "id": "8ae8a7b8-0f4a-4aa4-9aed-554d54a0c568",
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
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3328,
        4112
      ],
      "id": "9f355179-df22-4d25-90ca-a6e2436739f7",
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
        "jsonBody": "={{ JSON.stringify({ chatId: $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid || $('Webhook').first().json.body?.chatId, sessionKey: $('Prepare Session').first().json.sessionKey, durationMinutes: 120, reason: $fromAI('reason', 'Customer reason', 'string', 'Customer requested human support') }) }}",
        "options": {
          "response": {
            "response": {
              "neverError": true
            }
          },
          "timeout": 30000
        }
      },
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.5,
      "position": [
        -3088,
        4112
      ],
      "id": "5917e2ad-4a25-443f-94c8-06ff6fd1c925",
      "name": "Request Human Handover"
    },
    {
      "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": "const prep = $('Prepare Session').first().json;\nconst cls = $('Check Cache & Classify Intent').first().json;\nlet out = String($json.output || $json.text || '').trim();\nconst agentFailed = !!$json.error || !out;\n\nconst hasOrderNo = /CC-\\d{6,}-\\d{2,}/i.test(out);\n// customer ne confirm kaha, agent ne \"order ho gaya\" bola, lekin tool ka asli order number nahi -> jhoot rokna\nconst claims = /\\b(order|aapka order)\\b[^.!\\n]{0,40}\\b(confirm|place|book|receive)\\w*\\b[^.!\\n]{0,25}\\b(ho gaya|ho gya|ho chuka|ho gayi|kar diya|kar di)\\b/i.test(out) && !/cancel/i.test(out);\n\nif (agentFailed) {\n  out = 'Maazrat, abhi kuch technical masla aa gaya. Meherbani karke apna message dobara bhej dein, ya \"agent\" likhein to hamara team member rabta karega.';\n} else if (cls.confirmIntent && claims && !hasOrderNo) {\n  out = 'Maazrat, system mein masla aane ki wajah se aapka order abhi confirm nahi ho saka. Meherbani karke dobara \"confirm\" likhein, ya \"agent\" likhein to hamara team member madad karega.';\n}\n\nreturn {\n  sessionId: 'primary',\n  chatId: prep.chatId || $('Webhook').first().json.body?.senderJid || '',\n  output: out\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -4112,
        3536
      ],
      "id": "1fbb48e1-f1ce-483e-96e3-fc74c1258e82",
      "name": "Verify Order Reply"
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
            "node": "Execute Handover Mute",
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
    "Execute Handover Mute": {
      "main": [
        [
          {
            "node": "Format Handover Reply",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Format Handover Reply": {
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
            "node": "Verify Order Reply",
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
    },
    "Verify Order Reply": {
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

console.log('Successfully updated workflows!');
