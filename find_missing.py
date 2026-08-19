import re

with open("prisma/schema.prisma", "r") as f:
    content = f.read()

models = re.findall(r"model (\w+) \{([\s\S]*?)\}", content)
for name, body in models:
    if "organizationId String?" not in body and "organizationId   String?" not in body and "organizationId" not in body:
        print(name)

