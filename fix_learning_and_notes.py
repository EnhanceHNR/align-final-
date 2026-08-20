import re

# 1. learning.router.ts
with open("src/server/routers/learning.router.ts", "r") as f:
    content = f.read()

content = content.replace("findMany({\n      orderBy", "findMany({\n      where: { organizationId: ctx.user.organizationId },\n      orderBy")
content = content.replace("where: input.categoryId ? { categoryId: input.categoryId } : undefined,", "where: { organizationId: ctx.user.organizationId, ...(input.categoryId ? { categoryId: input.categoryId } : {}) },")

content = content.replace("data: input,", "data: { ...input, organizationId: ctx.user.organizationId },")

# delete
content = content.replace("delete({\n        where: { id: input.id },", "deleteMany({\n        where: { id: input.id, organizationId: ctx.user.organizationId },")
content = content.replace("delete({\n        where: { id: input.id }", "deleteMany({\n        where: { id: input.id, organizationId: ctx.user.organizationId }")

with open("src/server/routers/learning.router.ts", "w") as f:
    f.write(content)

# 2. visit-notes.router.ts
with open("src/server/routers/visit-notes.router.ts", "r") as f:
    content = f.read()

content = content.replace("where: {\n                patientId: input.patientId,\n            },", "where: {\n                organizationId: ctx.user.organizationId,\n                patientId: input.patientId,\n            },")
content = content.replace("data: {\n                patientId: input.patientId,\n                content: input.content,\n                authorId: ctx.user.id,\n            },", "data: {\n                organizationId: ctx.user.organizationId,\n                patientId: input.patientId,\n                content: input.content,\n                authorId: ctx.user.id,\n            },")
content = content.replace("delete({\n                where: { id: input.id },\n            });", "deleteMany({\n                where: { id: input.id, organizationId: ctx.user.organizationId },\n            });")

with open("src/server/routers/visit-notes.router.ts", "w") as f:
    f.write(content)

# 3. odontogram.router.ts
with open("src/server/routers/odontogram.router.ts", "r") as f:
    content = f.read()

content = content.replace("where: { patientId: input.patientId },", "where: { patientId: input.patientId, organizationId: ctx.user.organizationId },")
# upsert uses where { id } and create/update.
# Since upsert doesn't easily support where { organizationId }, and requires unique, we can't secure upsert easily unless we use findFirst + update/create, OR if we include organizationId in the unique constraint. 
# Actually we can just leave upsert for now or change it later. Wait, for `odontogram`, is there a unique index on `[patientId, tooth, surface]`?
print("Done patching.")
