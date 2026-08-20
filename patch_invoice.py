with open("src/server/routers/invoice.router.ts", "r") as f:
    content = f.read()

content = content.replace("async function generateInvoiceNumber(): Promise<string> {", "async function generateInvoiceNumber(organizationId: string): Promise<string> {")
content = content.replace("invoiceNumber: {\n        startsWith: `INV-${currentYear}-`,\n      },", "organizationId,\n      invoiceNumber: {\n        startsWith: `INV-${currentYear}-`,\n      },")
content = content.replace("await generateInvoiceNumber()", "await generateInvoiceNumber(ctx.user.organizationId as string)")
content = content.replace("const where: any = {};", "const where: any = { organizationId: ctx.user.organizationId };")
content = content.replace("patientId,\n          date,", "organizationId: ctx.user.organizationId,\n          patientId,\n          date,")

with open("src/server/routers/invoice.router.ts", "w") as f:
    f.write(content)
print("Invoice router patched.")
