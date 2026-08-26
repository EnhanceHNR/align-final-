const fs = require('fs');
try {
  const code = fs.readFileSync('src/app/dashboard/attendance/employees/[id]/page.tsx', 'utf8');
  require('@babel/parser').parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log("Syntax is valid!");
} catch(e) {
  console.error("Syntax Error:", e.message);
}
