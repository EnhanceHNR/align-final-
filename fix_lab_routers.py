import re

def fix_router(filename):
    with open(filename, "r") as f:
        content = f.read()
    
    # ensure ctx is extracted
    content = re.sub(r'async \(\) =>', 'async ({ ctx }) =>', content)
    content = re.sub(r'async \(\{ input \}\) =>', 'async ({ ctx, input }) =>', content)
    
    # replace prisma. with ctx.db.
    content = content.replace("prisma.", "ctx.db.")
    
    # findMany -> findMany({ where: { organizationId: ctx.user.organizationId }...
    content = content.replace("findMany({\n      orderBy", "findMany({\n      where: { organizationId: ctx.user.organizationId },\n      orderBy")
    
    # create -> append organizationId
    content = content.replace("data: input,", "data: { ...input, organizationId: ctx.user.organizationId },")
    content = content.replace("data,\n      });", "data,\n      });") # Wait, update requires updateMany for security.
    
    # update -> updateMany
    content = content.replace("update({\n        where: { id },\n        data,\n      })", "updateMany({\n        where: { id, organizationId: ctx.user.organizationId },\n        data,\n      })")
    content = content.replace("update({\n        where: { id: input.id },\n        data", "updateMany({\n        where: { id: input.id, organizationId: ctx.user.organizationId },\n        data")
    
    # delete -> deleteMany
    content = content.replace("delete({\n        where: { id: input.id },\n      })", "deleteMany({\n        where: { id: input.id, organizationId: ctx.user.organizationId },\n      })")
    content = content.replace("delete({\n        where: { id },\n      })", "deleteMany({\n        where: { id, organizationId: ctx.user.organizationId },\n      })")
    
    # findUnique -> findFirst
    content = content.replace("findUnique({\n        where: { id: input.id },", "findFirst({\n        where: { id: input.id, organizationId: ctx.user.organizationId },")
    
    with open(filename, "w") as f:
        f.write(content)

fix_router("src/server/routers/lab.router.ts")
fix_router("src/server/routers/labSubmission.router.ts")
fix_router("src/server/routers/labTransaction.router.ts")

print("Lab routers secured.")
