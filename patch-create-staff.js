const fs = require('fs');
let code = fs.readFileSync('src/server/routers/employee.router.ts', 'utf8');

code = code.replace(
    'organizationId: orgId,\n      });',
    'organizationId: orgId,\n        isActive: true,\n        emailVerified: true,\n      });'
);

fs.writeFileSync('src/server/routers/employee.router.ts', code);
