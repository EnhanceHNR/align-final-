const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/attendance/employees/[id]/page.tsx', 'utf8');

// Add state for punch times
if (!code.includes('const [punchInTime, setPunchInTime]')) {
    code = code.replace(
        'const [attendanceStatus, setAttendanceStatus] = useState("Present");',
        'const [attendanceStatus, setAttendanceStatus] = useState("Present");\n  const [punchInTime, setPunchInTime] = useState("09:00 AM");\n  const [punchOutTime, setPunchOutTime] = useState("05:00 PM");\n  const [attendanceNotes, setAttendanceNotes] = useState("");'
    );
}

// Update handleSaveAttendance
code = code.replace(
    'status: attendanceStatus,',
    'status: attendanceStatus,\n      punchInTime,\n      punchOutTime,\n      notes: attendanceNotes,'
);

// Update onClick on the calendar day to populate the state
code = code.replace(
    'setAttendanceStatus(attendanceRecord ? attendanceRecord.status : "Present");',
    `setAttendanceStatus(attendanceRecord ? attendanceRecord.status : "Present");
                               setPunchInTime(attendanceRecord?.punchInTime || "09:00 AM");
                               setPunchOutTime(attendanceRecord?.punchOutTime || "05:00 PM");
                               setAttendanceNotes(attendanceRecord?.notes || "");`
);

// Update the Dialog UI
const oldDialogUI = `<div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input disabled value={selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={attendanceStatus} onValueChange={setAttendanceStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="Half Day">Half Day</SelectItem>
                  <SelectItem value="Late">Late</SelectItem>
                  <SelectItem value="Weekend">Weekend</SelectItem>
                  <SelectItem value="Holiday">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>`;

const newDialogUI = `<div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input disabled value={selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={attendanceStatus} onValueChange={setAttendanceStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="Half Day">Half Day</SelectItem>
                  <SelectItem value="Late">Late</SelectItem>
                  <SelectItem value="Weekend">Weekend</SelectItem>
                  <SelectItem value="Holiday">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Punch In</Label>
                <Input value={punchInTime} onChange={e => setPunchInTime(e.target.value)} placeholder="09:00 AM" />
              </div>
              <div className="space-y-2">
                <Label>Punch Out</Label>
                <Input value={punchOutTime} onChange={e => setPunchOutTime(e.target.value)} placeholder="05:00 PM" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Admin Notes</Label>
              <Input value={attendanceNotes} onChange={e => setAttendanceNotes(e.target.value)} placeholder="e.g. Approved leave" />
            </div>
          </div>`;

code = code.replace(oldDialogUI, newDialogUI);

fs.writeFileSync('src/app/dashboard/attendance/employees/[id]/page.tsx', code);
