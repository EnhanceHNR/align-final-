const fs = require('fs');
let code = fs.readFileSync('src/lib/authOptions.ts', 'utf8');

code = code.replace(
    'if (!user.isActive) throw new Error("ACCOUNT_INACTIVE");',
    'if (user.isActive === false) throw new Error("ACCOUNT_INACTIVE");'
);

fs.writeFileSync('src/lib/authOptions.ts', code);
