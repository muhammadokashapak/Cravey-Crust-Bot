import json

def update_to_fields(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        wf = json.load(f)
    
    for node in wf.get('nodes', []):
        if node.get('name') == 'Send WhatsApp Reply':
            node['parameters']['sendBody'] = True
            node['parameters']['specifyBody'] = 'fields'
            if 'jsonBody' in node['parameters']:
                del node['parameters']['jsonBody']
            node['parameters']['bodyParameters'] = {
                'parameters': [
                    {
                        'name': 'sessionId',
                        'value': "={{ $('Webhook').first().json.body?.sessionId || 'primary' }}"
                    },
                    {
                        'name': 'chatId',
                        'value': "={{ $('Prepare Session').first().json?.chatId || $('Webhook').first().json.body?.chatId }}"
                    },
                    {
                        'name': 'message',
                        'value': "={{ $('AI Agent').first().json?.output || $json.output || '' }}"
                    }
                ]
            }
            print(f"Updated Send WhatsApp Reply in {filepath}")
            
        if node.get('name') == 'Send Alternate Confirmation':
            node['parameters']['sendBody'] = True
            node['parameters']['specifyBody'] = 'fields'
            if 'jsonBody' in node['parameters']:
                del node['parameters']['jsonBody']
            node['parameters']['bodyParameters'] = {
                'parameters': [
                    {
                        'name': 'sessionId',
                        'value': "={{ $('Webhook').first().json.body?.sessionId || 'primary' }}"
                    },
                    {
                        'name': 'chatId',
                        'value': "={{ $fromAI('alternateChatId', 'Alternate customer WhatsApp phone/JID with country code e.g. 923001234567@s.whatsapp.net', 'string') }}"
                    },
                    {
                        'name': 'message',
                        'value': "={{ $fromAI('confirmationMessage', 'Concise order confirmation message with order number and total', 'string') }}"
                    }
                ]
            }
            print(f"Updated Send Alternate Confirmation in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(wf, f, indent=2)

update_to_fields('n8n.json')
update_to_fields('cravey-crust-whatsapp-agent-workflow.json')
print("Finished!")
