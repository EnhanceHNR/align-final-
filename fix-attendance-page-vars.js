const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/attendance/page.tsx', 'utf8');

// Ensure imports
if (!code.includes('startOfMonth')) {
    code = code.replace(
        'import { format } from "date-fns";',
        'import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from "date-fns";\nimport { ChevronLeft, ChevronRight } from "lucide-react";'
    );
}

// Ensure state
if (!code.includes('const [currentMonth')) {
    code = code.replace(
        'const [currentTime, setCurrentTime] = useState(new Date());',
        'const [currentTime, setCurrentTime] = useState(new Date());\n  const [currentMonth, setCurrentMonth] = useState(new Date());\n  const [selectedDate, setSelectedDate] = useState<Date | null>(null);'
    );
}

fs.writeFileSync('src/app/dashboard/attendance/page.tsx', code);
