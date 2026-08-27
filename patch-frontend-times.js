const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/attendance/employees/[id]/page.tsx', 'utf8');

// Fix the populate part
const oldPopulate = `setPunchInTime(attendanceRecord?.punchInTime || "09:00 AM");
                               setPunchOutTime(attendanceRecord?.punchOutTime || "05:00 PM");`;

const newPopulate = `const sess = attendanceRecord?.sessions?.[0];
                               setPunchInTime(sess?.clockInTime ? format(new Date(sess.clockInTime), 'HH:mm') : "");
                               setPunchOutTime(sess?.clockOutTime ? format(new Date(sess.clockOutTime), 'HH:mm') : "");`;

code = code.replace(oldPopulate, newPopulate);

// Fix the inputs
code = code.replace(
    '<Input value={punchInTime} onChange={e => setPunchInTime(e.target.value)} placeholder="09:00 AM" />',
    '<Input type="time" value={punchInTime} onChange={e => setPunchInTime(e.target.value)} />'
);

code = code.replace(
    '<Input value={punchOutTime} onChange={e => setPunchOutTime(e.target.value)} placeholder="05:00 PM" />',
    '<Input type="time" value={punchOutTime} onChange={e => setPunchOutTime(e.target.value)} />'
);

fs.writeFileSync('src/app/dashboard/attendance/employees/[id]/page.tsx', code);
