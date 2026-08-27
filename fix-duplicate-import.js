const fs = require('fs');

const file = 'src/app/dashboard/attendance/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// The original import might look like: import { format } from "date-fns";
// We want to remove the redundant one. We have our big one at the top:
// import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns';

// We can just replace the specific redundant line:
code = code.replace(/import\s*\{\s*format\s*\}\s*from\s*["']date-fns["']\s*;/g, '');

fs.writeFileSync(file, code);
console.log("Fixed duplicate import!");
