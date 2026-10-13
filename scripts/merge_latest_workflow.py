import json

# Read existing cravey-crust-whatsapp-agent-workflow.json
with open('cravey-crust-whatsapp-agent-workflow.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find if Skip Empty Message is already in nodes
has_filter = any(n.get('name') == 'Skip Empty Message' for n in data['nodes'])

if not has_filter:
    filter_node = {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": True,
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
                "singleValue": True
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
        -96,
        1408
      ],
      "id": "7fd76194-9d52-4a05-a59b-4054ccad5925",
      "name": "Skip Empty Message"
    }
    data['nodes'].append(filter_node)

# Ensure credentials match user's Gemini credentials
for n in data['nodes']:
    if n.get('name') in ['Google Gemini Chat Model', 'Gemini Fallback 02']:
        n['credentials'] = {
            "googlePalmApi": {
                "id": "RtCVxwz43k0pMrwg",
                "name": "Google Gemini(PaLM) Api account 2"
            }
        }

# Ensure connection: Prepare Session -> Skip Empty Message -> AI Agent
data['connections']['Prepare Session'] = {
    "main": [
        [
            {
                "node": "Skip Empty Message",
                "type": "main",
                "index": 0
            }
        ]
    ]
}
data['connections']['Skip Empty Message'] = {
    "main": [
        [
            {
                "node": "AI Agent",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

# Ensure Send WhatsApp Reply uses the robust body & star strip
for n in data['nodes']:
    if n.get('name') == 'Send WhatsApp Reply':
        n['parameters'] = {
            "method": "POST",
            "url": "https://bot.craveycrust.com/api/n8n/send-message",
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {
                        "name": "X-Bot-Secret",
                        "value": "my-test-secret-123"
                    }
                ]
            },
            "sendBody": True,
            "specifyBody": "json",
            "jsonBody": "={{ JSON.stringify({\n  sessionId: 'primary',\n  chatId: $('Prepare Session').first().json.chatId || $('Webhook').first().json.body?.senderJid || $('Webhook').first().json.body?.chatId,\n  message: (($('AI Agent').first().json?.output || $json.output || '') + '').replace(/\\*/g, '').trim()\n}) }}",
            "options": {
                "timeout": 30000
            }
        }

# Ensure Request Human Handover position matches user canvas grid [1520, 1088]
for n in data['nodes']:
    if n.get('name') == 'Request Human Handover':
        n['position'] = [1520, 1088]

# Save updated files
with open('cravey-crust-whatsapp-agent-workflow.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

with open('n8n.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

with open('../cravey-crust-whatsapp-agent-workflow.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print(f"Workflow successfully updated! Total nodes: {len(data['nodes'])}, connections: {len(data['connections'])}")
