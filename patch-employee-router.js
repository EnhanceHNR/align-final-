const fs = require('fs');
let code = fs.readFileSync('src/server/routers/employee.router.ts', 'utf8');

code = code.replace(
    'sessions: sessionsSnap.docs.map(s => ({ id: s.id, ...s.data() }))',
    `sessions: sessionsSnap.docs.map(s => {
       const d = s.data();
       return {
         id: s.id,
         ...d,
         clockInTime: d.clockInTime && typeof d.clockInTime.toDate === 'function' ? d.clockInTime.toDate().toISOString() : (d.clockInTime || null),
         clockOutTime: d.clockOutTime && typeof d.clockOutTime.toDate === 'function' ? d.clockOutTime.toDate().toISOString() : (d.clockOutTime || null),
       };
    })`
);

fs.writeFileSync('src/server/routers/employee.router.ts', code);
