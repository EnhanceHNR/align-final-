const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/attendance/employees/[id]/page.tsx', 'utf8');

code = code.replace(
    'const { data: employee, isLoading } = api.employee.getEmployeeDetails.useQuery(',
    'const { data: employee, isLoading, refetch } = api.employee.getEmployeeDetails.useQuery('
);

fs.writeFileSync('src/app/dashboard/attendance/employees/[id]/page.tsx', code);
