const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/attendance/page.tsx', 'utf8');

code = "import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns';\nimport { ChevronLeft, ChevronRight } from 'lucide-react';\n" + code;

fs.writeFileSync('src/app/dashboard/attendance/page.tsx', code);
