const fs = require('fs');
const file = 'src/app/dashboard/attendance/employees/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('from "@/components/ui/select"') && !code.includes('from "~/components/ui/select"')) {
    const importToAdd = 'import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";\n';
    
    const lastImportIndex = code.lastIndexOf('import ');
    const insertPos = code.indexOf('\n', lastImportIndex) + 1;
    
    code = code.substring(0, insertPos) + importToAdd + code.substring(insertPos);
    fs.writeFileSync(file, code);
}
