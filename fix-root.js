const fs = require('fs');
let code = fs.readFileSync('src/server/root.ts', 'utf8');

if (!code.includes('superadminRouter')) {
    code = code.replace(
        /import \{ proceduresRouter \} from "\.\/routers\/procedures\.router";/,
        'import { proceduresRouter } from "./routers/procedures.router";\nimport { superadminRouter } from "./routers/superadmin.router";'
    );
    code = code.replace(
        /procedures: proceduresRouter,/,
        'procedures: proceduresRouter,\n  superadmin: superadminRouter,'
    );
    fs.writeFileSync('src/server/root.ts', code);
}
