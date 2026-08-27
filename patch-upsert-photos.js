const fs = require('fs');
let code = fs.readFileSync('src/server/routers/attendance.router.ts', 'utf8');

code = code.replace(
    'notes: z.string().optional(),',
    'notes: z.string().optional(),\n      clockInPhoto: z.string().optional(),\n      clockOutPhoto: z.string().optional(),'
);

code = code.replace(
    'const sessionData = {\n          attendanceId,',
    'const sessionData = {\n          attendanceId,\n          clockInPhoto: input.clockInPhoto || null,\n          clockOutPhoto: input.clockOutPhoto || null,'
);

// Wait, the upsert logic updates or creates a session. Let's see the rest of upsertAttendance.
