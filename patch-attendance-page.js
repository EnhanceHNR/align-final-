const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/attendance/page.tsx', 'utf8');

if (!code.includes('import { ClockInOutDialog }')) {
    code = code.replace(
        'import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";',
        'import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";\nimport { ClockInOutDialog } from "@/components/attendance/clock-in-out-dialog";'
    );
}

// Replace handleClockIn
code = code.replace(
    /const handleClockIn = \(\) => \{[^}]+\};/s,
    `const handleClockIn = async (capture: any) => {
    if (!profile) return;
    await clockInMutation.mutateAsync({
      employeeProfileId: profile.id,
      lat: capture.location?.lat || 0,
      lng: capture.location?.lng || 0,
      photo: capture.photo
    });
  };`
);

// Replace handleClockOut
code = code.replace(
    /const handleClockOut = \(\) => \{[^}]+\};/s,
    `const handleClockOut = async (capture: any) => {
    if (!todayAttendance || todayAttendance.sessions.length === 0) return;
    const currentSession = todayAttendance.sessions[todayAttendance.sessions.length - 1];
    await clockOutMutation.mutateAsync({
      sessionId: currentSession.id,
      lat: capture.location?.lat || 0,
      lng: capture.location?.lng || 0,
      photo: capture.photo
    });
  };`
);

// Replace the Button with ClockInOutDialog
code = code.replace(
    /<Button[^>]+onClick=\{isClockedIn \? handleClockOut : handleClockIn\}[^>]+>.*?<\/Button>/s,
    `<ClockInOutDialog 
        isClockedIn={isClockedIn} 
        onClockIn={handleClockIn} 
        onClockOut={handleClockOut} 
     />`
);

fs.writeFileSync('src/app/dashboard/attendance/page.tsx', code);
