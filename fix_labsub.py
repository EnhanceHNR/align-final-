import re
with open("src/server/routers/labSubmission.router.ts", "r") as f:
    content = f.read()

# Replace: `where: input?.type ? { type: input.type } : undefined,`
# With: `where: { organizationId: ctx.user.organizationId, ...(input?.type ? { type: input.type } : {}) },`
content = content.replace("where: input?.type ? { type: input.type } : undefined,", "where: { organizationId: ctx.user.organizationId, ...(input?.type ? { type: input.type } : {}) },")

with open("src/server/routers/labSubmission.router.ts", "w") as f:
    f.write(content)

print("labSubmission.router.ts patched!")
