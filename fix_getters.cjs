const fs = require('fs');
const path = './src/app/dashboard/lab/actions.ts';
let code = fs.readFileSync(path, 'utf8');

// fetchEntitiesAction
code = code.replace(
    "export async function fetchEntitiesAction(collectionName: 'labs' | 'patients' | 'templates' | 'items') {\n    try {",
    "export async function fetchEntitiesAction(collectionName: 'labs' | 'patients' | 'templates' | 'items') {\n    try {\n        const orgId = await getActionOrgId();"
);
code = code.replace(/prisma\.lab\.findMany\(\{ orderBy/g, "prisma.lab.findMany({ where: { organizationId: orgId }, orderBy");
code = code.replace(/prisma\.patient\.findMany\(\{ orderBy/g, "prisma.patient.findMany({ where: { organizationId: orgId }, orderBy");
code = code.replace(/prisma\.instructionTemplate\.findMany\(\{ orderBy/g, "prisma.instructionTemplate.findMany({ where: { organizationId: orgId }, orderBy");
code = code.replace(/prisma\.labSubmission\.findMany\(\{ select/g, "prisma.labSubmission.findMany({ where: { organizationId: orgId }, select");

// fetchSubmissions
code = code.replace(
    "export async function fetchSubmissions() {\n    return await prisma.labSubmission.findMany({",
    "export async function fetchSubmissions() {\n    const orgId = await getActionOrgId();\n    return await prisma.labSubmission.findMany({\n        where: { organizationId: orgId },"
);

// fetchUsersAction
code = code.replace(
    "where: { isActive: true },",
    "where: { isActive: true, organizationId: await getActionOrgId() },"
);

// fetchLabTransactions
code = code.replace(
    "export async function fetchLabTransactions() {\n    return await prisma.labTransaction.findMany({",
    "export async function fetchLabTransactions() {\n    const orgId = await getActionOrgId();\n    return await prisma.labTransaction.findMany({\n        where: { organizationId: orgId },"
);

// updateEntityAction
code = code.replace(
    "const lab = await prisma.lab.findFirst({ where: { name: oldName } });",
    "const orgId = await getActionOrgId();\n            const lab = await prisma.lab.findFirst({ where: { name: oldName, organizationId: orgId } });"
);

// addEntityAction
code = code.replace(
    "await prisma.lab.create({\n                data: {\n                    name,",
    "const orgId = await getActionOrgId();\n            await prisma.lab.create({\n                data: {\n                    name,\n                    organizationId: orgId,"
);

// deleteEntityAction
code = code.replace(
    "const lab = await prisma.lab.findFirst({ where: { name } });",
    "const orgId = await getActionOrgId();\n            const lab = await prisma.lab.findFirst({ where: { name, organizationId: orgId } });"
);

fs.writeFileSync(path, code);
console.log("Fixed getters");
