const fs = require('fs');
let code = fs.readFileSync('src/components/attendance/clock-in-out-dialog.tsx', 'utf8');

// Remove AppContext import
code = code.replace(/import \{ AppContext \} from '@\/context\/app-context';\n/g, '');

// Remove currentUser usage
code = code.replace(/const \{ currentUser \} = useContext\(AppContext\);\n/g, '');

// Fix any other TS errors (e.g., useContext might be unused)
code = code.replace(/import \{ useState, useEffect, useRef, useContext \} from 'react';/, "import { useState, useEffect, useRef } from 'react';");

fs.writeFileSync('src/components/attendance/clock-in-out-dialog.tsx', code);
