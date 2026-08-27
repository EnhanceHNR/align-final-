const fs = require('fs');
let code = fs.readFileSync('src/server/routers/attendance.router.ts', 'utf8');

const oldReturn = `      return {
        ...attendance,
        sessions: sessionsSnap.docs.map(s => ({ id: s.id, ...s.data() }))
      };`;

const newReturn = `      const attData = snap.docs[0].data();
      return {
        id: attendance.id,
        ...attData,
        date: attData.date && typeof attData.date.toDate === 'function' ? attData.date.toDate().toISOString() : attData.date,
        sessions: sessionsSnap.docs.map(s => {
          const d = s.data();
          return {
            id: s.id,
            ...d,
            clockInTime: d.clockInTime && typeof d.clockInTime.toDate === 'function' ? d.clockInTime.toDate().toISOString() : (d.clockInTime || null),
            clockOutTime: d.clockOutTime && typeof d.clockOutTime.toDate === 'function' ? d.clockOutTime.toDate().toISOString() : (d.clockOutTime || null),
          };
        })
      };`;

code = code.replace(oldReturn, newReturn);
fs.writeFileSync('src/server/routers/attendance.router.ts', code);
