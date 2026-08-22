const fs = require('fs');

const getTokenCode = `import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";

async function getActionOrgId() {
    try {
        const req = {
            cookies: Object.fromEntries(cookies().getAll().map(c => [c.name, c.value])),
            headers: { cookie: cookies().toString() }
        };
        const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET || "", cookieName: "align_token" });
        return (token as any)?.organizationId || null;
    } catch (e) {
        console.error("Token error:", e);
        return null;
    }
}`;

// Fix lab/actions.ts
const labPath = './src/app/dashboard/lab/actions.ts';
let labCode = fs.readFileSync(labPath, 'utf8');
labCode = labCode.replace(
    /import \{ getServerSession \} from "next-auth";[\s\S]*?async function getActionOrgId\(\) \{[\s\S]*?\n\}/m,
    getTokenCode
);
fs.writeFileSync(labPath, labCode);

// Fix learning/actions.ts
const learnPath = './src/app/dashboard/learning/actions.ts';
let learnCode = fs.readFileSync(learnPath, 'utf8');
learnCode = learnCode.replace(
    /import \{ getServerSession \} from "next-auth";[\s\S]*?if \(!decodedUser \|\| decodedUser\.role !== "MASTER"\) \{/m,
    `import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";

export async function uploadLearningMaterial(formData: FormData) {
    const req = {
        cookies: Object.fromEntries(cookies().getAll().map(c => [c.name, c.value])),
        headers: { cookie: cookies().toString() }
    };
    const decodedUser = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET || "", cookieName: "align_token" });

    if (!decodedUser || decodedUser.role !== "MASTER") {`
);
fs.writeFileSync(learnPath, learnCode);

// Fix prisma.ts
const prismaPath = './src/lib/prisma.ts';
let prismaCode = fs.readFileSync(prismaPath, 'utf8');
prismaCode = prismaCode.replace(
    /import \{ getServerSession \} from "next-auth";[\s\S]*?async function getOrgId\(\) \{[\s\S]*?\n\}/m,
    `import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";

async function getOrgId() {
    try {
        const req = {
            cookies: Object.fromEntries(cookies().getAll().map(c => [c.name, c.value])),
            headers: { cookie: cookies().toString() }
        };
        const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET || "", cookieName: "align_token" });
        return (token as any)?.organizationId || null;
    } catch (e) {
        return null;
    }
}`
);
fs.writeFileSync(prismaPath, prismaCode);

console.log("Fixed all!");
