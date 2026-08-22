const fs = require('fs');
const path = './src/app/dashboard/learning/actions.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    'import { cookies } from "next/headers";\nimport { decode } from "next-auth/jwt";',
    'import { getServerSession } from "next-auth";\nimport { authOptions } from "@/lib/auth";'
);

code = code.replace(
    /    const cookieStore = cookies\(\);[\s\S]*?if \(!decodedUser \|\| decodedUser\.role !== "MASTER"\) \{/m,
    `    const session = await getServerSession(authOptions);
    const decodedUser = session?.user as any;
    if (!decodedUser || decodedUser.role !== "MASTER") {`
);

fs.writeFileSync(path, code);
