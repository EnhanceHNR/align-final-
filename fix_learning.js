const fs = require('fs');
const path = './src/app/dashboard/learning/actions.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    "categoryId,",
    "categoryId,\n            organizationId: (session.user as any).organizationId,"
);

fs.writeFileSync(path, code);
