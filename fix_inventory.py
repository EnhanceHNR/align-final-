with open("src/server/routers/inventory.router.ts", "r") as f:
    content = f.read()

content = content.replace("ctx.db.inventoryItem.findMany({", "ctx.db.inventoryItem.findMany({\n      where: { organizationId: ctx.user.organizationId },")
content = content.replace("ctx.db.dealer.findMany({", "ctx.db.dealer.findMany({\n      where: { organizationId: ctx.user.organizationId },")

content = content.replace("ctx.db.inventoryItem.findUnique({", "ctx.db.inventoryItem.findFirst({")
content = content.replace("where: { id: input.id },", "where: { id: input.id, organizationId: ctx.user.organizationId },")

content = content.replace("data: dealerData", "data: { ...dealerData, organizationId: ctx.user.organizationId }")
content = content.replace("data: input,", "data: { ...input, organizationId: ctx.user.organizationId },")

# Purchase order create
po_target = """        data: {
          inventoryItemId: input.inventoryItemId,"""
po_replacement = """        data: {
          organizationId: ctx.user.organizationId,
          inventoryItemId: input.inventoryItemId,"""
content = content.replace(po_target, po_replacement)

# Item update. For updating an item, we should ideally verify it belongs to the org.
# Since tRPC doesn't do a findFirst check before update here, we should ideally change it to `updateMany` with `organizationId` or do a check.
# But for now, we leave it or replace `update({ where: { id: item.id } })` with `updateMany({ where: { id: item.id, organizationId: ctx.user.organizationId } })`
update_target = """            await ctx.db.inventoryItem.update({
               where: { id: item.id },"""
update_replacement = """            await ctx.db.inventoryItem.updateMany({
               where: { id: item.id, organizationId: ctx.user.organizationId },"""
content = content.replace(update_target, update_replacement)


with open("src/server/routers/inventory.router.ts", "w") as f:
    f.write(content)

print("Inventory router patched.")
