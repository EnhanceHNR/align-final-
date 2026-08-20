import re

with open("src/server/routers/odontogram.router.ts", "r") as f:
    content = f.read()

# Add ctx extraction if missing
content = re.sub(r'async \(\{\s*input\s*\}\) =>', 'async ({ ctx, input }) =>', content)

# Replace `where: { id: input.patientId }` with `where: { id: input.patientId, organizationId: ctx.user.organizationId }`
# Wait, `patientId_toothNumber_surface` uses `patientId`. The `patient` check should use findFirst instead of findUnique to allow filtering by organizationId.
content = content.replace("await prisma.patient.findUnique({", "await prisma.patient.findFirst({")
content = content.replace("where: { id: input.patientId },", "where: { id: input.patientId, organizationId: ctx.user.organizationId },")

# Also, update upsert create to include organizationId
content = content.replace("create: {\n                    patientId: input.patientId,", "create: {\n                    organizationId: ctx.user.organizationId,\n                    patientId: input.patientId,")

with open("src/server/routers/odontogram.router.ts", "w") as f:
    f.write(content)

print("Odontogram router secured.")
