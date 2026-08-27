const fs = require('fs');
let code = fs.readFileSync('src/server/routers/hr.router.ts', 'utf8');

code = code.replace(/ddata\(\)/g, 'd.data()');
code = code.replace(/pdata\(\)/g, 'p.data()');
code = code.replace(/docdata\(\)/g, 'doc.data()');

fs.writeFileSync('src/server/routers/hr.router.ts', code);
