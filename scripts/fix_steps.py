with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

updated = content.replace('step="10"', 'step="any"').replace('step="50"', 'step="any"')

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(updated)

print("Updated price step attributes in public/index.html")
