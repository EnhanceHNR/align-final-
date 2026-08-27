const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/attendance/employees/[id]/page.tsx', 'utf8');

// Add state variables
code = code.replace(
    'const [attendanceNotes, setAttendanceNotes] = useState("");',
    'const [attendanceNotes, setAttendanceNotes] = useState("");\n  const [clockInPhoto, setClockInPhoto] = useState<string>("");\n  const [clockOutPhoto, setClockOutPhoto] = useState<string>("");'
);

// Reset state when clicking day
code = code.replace(
    'setAttendanceNotes(attendanceRecord?.notes || "");',
    'setAttendanceNotes(attendanceRecord?.notes || "");\n                               setClockInPhoto(attendanceRecord?.sessions?.[0]?.clockInPhoto || "");\n                               setClockOutPhoto(attendanceRecord?.sessions?.[0]?.clockOutPhoto || "");'
);

// Update handleSaveAttendance
code = code.replace(
    /notes: attendanceNotes,/,
    'notes: attendanceNotes,\n      clockInPhoto: clockInPhoto || undefined,\n      clockOutPhoto: clockOutPhoto || undefined,'
);

// Add UI inputs for the photos
const uploadUI = `
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Clock In Photo</Label>
                <div className="flex flex-col gap-2">
                   {clockInPhoto && <img src={clockInPhoto} className="w-full h-24 object-cover rounded-md border" />}
                   <Input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => setClockInPhoto(evt.target?.result as string);
                            reader.readAsDataURL(file);
                         }
                      }} 
                   />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Clock Out Photo</Label>
                <div className="flex flex-col gap-2">
                   {clockOutPhoto && <img src={clockOutPhoto} className="w-full h-24 object-cover rounded-md border" />}
                   <Input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => setClockOutPhoto(evt.target?.result as string);
                            reader.readAsDataURL(file);
                         }
                      }} 
                   />
                </div>
              </div>
            </div>
`;

code = code.replace(
    '</div>\n          <DialogFooter>',
    '</div>\n          ' + uploadUI + '\n          <DialogFooter>'
);

fs.writeFileSync('src/app/dashboard/attendance/employees/[id]/page.tsx', code);
