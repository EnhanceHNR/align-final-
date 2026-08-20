import re

with open("src/server/routers/invoice.router.ts", "r") as f:
    content = f.read()

# 1. generateInvoiceNumber
content = content.replace("async function generateInvoiceNumber(): Promise<string> {", "async function generateInvoiceNumber(organizationId: string): Promise<string> {")
content = content.replace("invoiceNumber: {\n        startsWith: `INV-${currentYear}-`,\n      },", "organizationId,\n      invoiceNumber: {\n        startsWith: `INV-${currentYear}-`,\n      },")
content = content.replace("await generateInvoiceNumber()", "await generateInvoiceNumber(ctx.user.organizationId!)")

# 2. list procedure
content = content.replace("const where: any = {};", "const where: any = { organizationId: ctx.user.organizationId };")

# 3. create procedure
content = content.replace("data: {", "data: {\n        organizationId: ctx.user.organizationId,")

# wait, there might be multiple `data: {`. Let's be careful.
# Actually, the create procedure:
#       const invoice = await prisma.invoice.create({
#         data: {
#           invoiceNumber: await generateInvoiceNumber(),
#           patientId, ...
