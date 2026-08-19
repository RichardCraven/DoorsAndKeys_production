import re
with open('src/pages/DungeonPage.js') as f:
    lines = f.readlines()
code = "".join(lines[21500:21840])
# Match tags like <div ...> or <img ... /> or </div>
tag_pattern = r'<(\/?[a-zA-Z]+)([^>]*?)>'
matches = re.finditer(tag_pattern, code)
stack = []
for match in matches:
    tag = match.group(1)
    attrs = match.group(2)
    
    # Skip self-closing tags
    if attrs.strip().endswith('/'):
        continue
        
    if tag.startswith('/'):
        tag_name = tag[1:]
        if stack and stack[-1] == tag_name:
            stack.pop()
        else:
            print(f"Mismatch: found </{tag_name}> but stack has {stack[-1] if stack else 'none'}")
            stack.append("ERROR")
    else:
        stack.append(tag)
print(f"Remaining stack: {stack}")
