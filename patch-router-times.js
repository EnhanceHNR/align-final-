const fs = require('fs');
let code = fs.readFileSync('src/server/routers/attendance.router.ts', 'utf8');

const replacement = `
      let pIn = null;
      if (input.punchInTime && input.punchInTime.includes(':')) {
         pIn = new Date(targetDate);
         const [hrs, mins] = input.punchInTime.split(':');
         pIn.setHours(parseInt(hrs, 10), parseInt(mins, 10), 0, 0);
      }
      
      let pOut = null;
      if (input.punchOutTime && input.punchOutTime.includes(':')) {
         pOut = new Date(targetDate);
         const [hrs, mins] = input.punchOutTime.split(':');
         pOut.setHours(parseInt(hrs, 10), parseInt(mins, 10), 0, 0);
      }
`;

code = code.replace(
    'const pIn = input.punchInTime ? new Date(input.punchInTime) : null;\n      const pOut = input.punchOutTime ? new Date(input.punchOutTime) : null;',
    replacement
);

fs.writeFileSync('src/server/routers/attendance.router.ts', code);
