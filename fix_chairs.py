import re

with open("src/server/routers/chairs.router.ts", "r") as f:
    content = f.read()

content = content.replace("findMany({\n      orderBy", "findMany({\n      where: { organizationId: ctx.user.organizationId },\n      orderBy")
content = content.replace("data: {\n        name: input.name,\n      }", "data: {\n        name: input.name,\n        organizationId: ctx.user.organizationId\n      }")

# delete uses update? No, delete
content = content.replace("delete({\n        where: { id: input.id },\n      })", "deleteMany({\n        where: { id: input.id, organizationId: ctx.user.organizationId },\n      })")

# update uses update
content = content.replace("update({\n          where: { id: input.id },\n          data: { name: input.name },\n        })", "updateMany({\n          where: { id: input.id, organizationId: ctx.user.organizationId },\n          data: { name: input.name },\n        })")

with open("src/server/routers/chairs.router.ts", "w") as f:
    f.write(content)

print("Chairs router secured.")
