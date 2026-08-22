const fs = require('fs');
const path = './src/lib/prisma.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    'import { cookies } from "next/headers";\nimport { decode } from "next-auth/jwt";',
    'import { getServerSession } from "next-auth";\nimport { authOptions } from "@/lib/authOptions";'
);

code = code.replace(
    /async function getOrgId\(\) \{[\s\S]*?\n\}/m,
    `async function getOrgId() {
    try {
        const session = await getServerSession(authOptions);
        return (session?.user as any)?.organizationId || null;
    } catch (e) {
        console.error("Error in getOrgId:", e);
        return null;
    }
}`
);

fs.writeFileSync(path, code);
