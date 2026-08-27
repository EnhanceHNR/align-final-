const fs = require('fs');

const file = 'src/app/dashboard/attendance/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Check if the file contains a use client directive
if (code.includes('"use client"') || code.includes("'use client'")) {
    // Remove all occurrences of "use client"; or 'use client';
    code = code.replace(/"use client"\s*;/g, '');
    code = code.replace(/'use client'\s*;/g, '');
    code = code.replace(/"use client"/g, '');
    code = code.replace(/'use client'/g, '');
    
    // Add exactly one "use client"; at the absolute top
    code = '"use client";\n' + code.trim();
    
    fs.writeFileSync(file, code);
}
console.log("Fixed use client directive!");
