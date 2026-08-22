const fs = require('fs');
const path = './src/app/dashboard/lab/actions.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    'import { cookies } from "next/headers";\nimport { decode } from "next-auth/jwt";',
    'import { getServerSession } from "next-auth";\nimport { authOptions } from "@/lib/auth";'
);

code = code.replace(
    /async function getActionOrgId\(\) \{[\s\S]*?\n\}/m,
    `async function getActionOrgId() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.organizationId || null;
}`
);

fs.writeFileSync(path, code);
