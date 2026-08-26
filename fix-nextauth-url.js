const fs = require('fs');
let code = fs.readFileSync('src/lib/authOptions.ts', 'utf8');

if (!code.includes('process.env.NEXTAUTH_URL =')) {
    code = 'process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "https://studio-3524371045-b11af.web.app";\n' + code;
    fs.writeFileSync('src/lib/authOptions.ts', code);
}
