const fs = require('fs');
const glob = require('glob'); // Not available by default, I'll use simple fs reads

const files = [
    'src/app/dashboard/attendance/approvals/page.tsx',
    'src/app/dashboard/attendance/holidays/page.tsx',
    'src/app/dashboard/attendance/leaves/page.tsx',
    'src/app/dashboard/attendance/rejoin-requests/page.tsx',
    'src/app/dashboard/attendance/resignations/page.tsx'
];

const helper = `
function safeFormat(dateVal: any, formatStr: string) {
  if (!dateVal) return '-';
  let d;
  if (dateVal && typeof dateVal === 'object' && '_seconds' in dateVal) {
      d = new Date(dateVal._seconds * 1000);
  } else {
      d = new Date(dateVal);
  }
  return isNaN(d.getTime()) ? 'Invalid Date' : format(d, formatStr);
}
`;

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let code = fs.readFileSync(file, 'utf8');
    
    if (!code.includes('function safeFormat(')) {
        // Insert after imports
        const importEndIndex = code.lastIndexOf('import ');
        if (importEndIndex !== -1) {
            const nextLineIndex = code.indexOf('\\n', importEndIndex) + 1;
            const insertPos = code.indexOf('\\n', nextLineIndex) + 1;
            code = code.substring(0, insertPos) + helper + code.substring(insertPos);
        } else {
            code = helper + code;
        }
    }
    
    // Replace format(..., ...) with safeFormat(..., ...)
    // Note: in approvals, it does format(startDate, ...) where startDate = new Date()
    // safeFormat can handle Date objects just fine.
    code = code.replace(/format\(([^,]+),\s*'([^']+)'\)/g, "safeFormat($1, '$2')");
    
    fs.writeFileSync(file, code);
}
