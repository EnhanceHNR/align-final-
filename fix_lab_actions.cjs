const fs = require('fs');
const path = './src/app/dashboard/lab/actions.ts';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('import { getServerSession }')) {
    code = code.replace(
        "import { sendSchema, receiveSchema } from '@/lib/schemas';",
        "import { sendSchema, receiveSchema } from '@/lib/schemas';\nimport { getServerSession } from 'next-auth';\nimport { authOptions } from '@/lib/authOptions';"
    );
}

// Ensure authOptions import works since we might have not created authOptions.ts properly before
code = code.replace("import { authOptions } from '@/lib/authOptions';", "const { authOptions } = require('@/lib/auth');");

// Helper to get orgId
if (!code.includes('async function getActionOrgId()')) {
    code = code.replace(
        "async function upsertEntityPrisma",
        "async function getActionOrgId() {\n  const { authOptions } = require('@/lib/auth');\n  const session = await getServerSession(authOptions);\n  return session?.user?.organizationId || null;\n}\n\nasync function upsertEntityPrisma"
    );
}

// Update upsertEntityPrisma
code = code.replace(
    "async function upsertEntityPrisma(type: 'labs' | 'patients', name: string) {",
    "async function upsertEntityPrisma(type: 'labs' | 'patients', name: string) {\n  const orgId = await getActionOrgId();\n  if (!orgId) throw new Error('Unauthorized');"
);
code = code.replace(/prisma\.lab\.findFirst\(\{ where: \{ name: safeName \} \}\)/g, "prisma.lab.findFirst({ where: { name: safeName, organizationId: orgId } })");
code = code.replace(/prisma\.lab\.create\(\{ data: \{ name: safeName \} \}\)/g, "prisma.lab.create({ data: { name: safeName, organizationId: orgId } })");
code = code.replace(/prisma\.patient\.findFirst\(\{ where: \{ fullName: safeName \} \}\)/g, "prisma.patient.findFirst({ where: { fullName: safeName, organizationId: orgId } })");
code = code.replace(/prisma\.patient\.create\(\{ data: \{ fullName: safeName \} \}\)/g, "prisma.patient.create({ data: { fullName: safeName, organizationId: orgId } })");

// Update handleSubmission
code = code.replace(
    "const submissionType = formData.get('type') as 'send' | 'receive';",
    "const orgId = await getActionOrgId();\n  if (!orgId) throw new Error('Unauthorized');\n  const submissionType = formData.get('type') as 'send' | 'receive';"
);
code = code.replace(
    "approvalStatus: rawFormData.approvalStatus || \"Pending\",",
    "approvalStatus: rawFormData.approvalStatus || \"Pending\",\n        organizationId: orgId,"
);

// Update LabTransaction in handleSubmission
code = code.replace(
    "submissionId: submission.id",
    "submissionId: submission.id,\n                organizationId: orgId"
);

// Update addLabTransactionAction
code = code.replace(
    "const parsedAmount = parseFloat(amount);",
    "const orgId = await getActionOrgId();\n    if (!orgId) throw new Error('Unauthorized');\n\n    const parsedAmount = parseFloat(amount);"
);
code = code.replace(
    "photoUrl: photoUrl || null,",
    "photoUrl: photoUrl || null,\n        organizationId: orgId,"
);

// Update updateSubmissionRemarksAction
code = code.replace(
    "where: { id },",
    "where: { id },\n            // @ts-ignore\n            organizationId: await getActionOrgId(),"
);
// Wait, update doesn't need organizationId in data for where, but Prisma handles it. Let's just pass orgId to where if possible.
code = code.replace(
    "await prisma.labSubmission.update({",
    "const orgId = await getActionOrgId();\n        await prisma.labSubmission.updateMany({"
);
code = code.replace(
    "where: { id },",
    "where: { id, organizationId: orgId },"
);

// Update deleteSubmissionAction
code = code.replace(
    "await prisma.labSubmission.delete({ where: { id } });",
    "const orgId = await getActionOrgId();\n        await prisma.labSubmission.deleteMany({ where: { id, organizationId: orgId } });"
);

// Update updatePaymentStatusAction
code = code.replace(
    "await prisma.labSubmission.update({",
    "const orgId = await getActionOrgId();\n        await prisma.labSubmission.updateMany({"
);
code = code.replace(
    "where: { id: submissionId },",
    "where: { id: submissionId, organizationId: orgId },"
);

fs.writeFileSync(path, code);
console.log("Updated actions.ts");
