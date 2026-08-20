with open("src/server/routers/labTransaction.router.ts", "r") as f:
    content = f.read()

content = content.replace("where: input?.labId ? { labId: input.labId } : undefined,", "where: { organizationId: ctx.user.organizationId, ...(input?.labId ? { labId: input.labId } : {}) },")

with open("src/server/routers/labTransaction.router.ts", "w") as f:
    f.write(content)
print("labTransaction patched")
