const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/attendance/employees/[id]/page.tsx', 'utf8');

// Add "Grace Period" to the color logic
code = code.replace(
    'bgColor = "bg-amber-700";\n                             textColor = "text-white";\n                          } else if (attendanceRecord.status.includes("Leave")) {',
    `bgColor = "bg-amber-700";\n                             textColor = "text-white";\n                          } else if (attendanceRecord.status === "Grace Period") {\n                             bgColor = "bg-yellow-400";\n                             textColor = "text-yellow-900";\n                          } else if (attendanceRecord.status.includes("Leave")) {`
);

// Add "Grace Period" to the Override Dialog Select
code = code.replace(
    '<SelectItem value="Late">Late</SelectItem>',
    '<SelectItem value="Late">Late</SelectItem>\n                  <SelectItem value="Grace Period">Late (Grace Period)</SelectItem>'
);

fs.writeFileSync('src/app/dashboard/attendance/employees/[id]/page.tsx', code);
