const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/attendance/employees/[id]/page.tsx', 'utf8');

// Import EditEmployeeForm
if (!code.includes('EditEmployeeForm')) {
    code = code.replace(
        'import { useParams, useRouter } from "next/navigation";',
        `import { useParams, useRouter } from "next/navigation";\nimport { EditEmployeeForm } from "./EditEmployeeForm";`
    );
}

// Update handleSaveEdit signature
code = code.replace(
    'const handleSaveEdit = () => {',
    'const handleSaveEdit = (data: any) => {'
);
code = code.replace(
    'updateProfile.mutate({\n      userId: employee!.userId,\n      name: editName,\n      department: editDepartment,\n      baseSalary: Number(editSalary),\n    });',
    `updateProfile.mutate({
      userId: employee!.userId,
      ...data
    });`
);

// Replace the Edit Dialog content
const oldEditDialog = `<DialogHeader>
                  <DialogTitle>Edit Employee Details</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Name</Label>
                    <Input className="col-span-3" value={editName} onChange={e => setEditName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Department</Label>
                    <Input className="col-span-3" value={editDepartment} onChange={e => setEditDepartment(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Base Salary</Label>
                    <Input className="col-span-3" type="number" value={editSalary} onChange={e => setEditSalary(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveEdit} disabled={updateProfile.isPending}>Save Changes</Button>
                </DialogFooter>`;

const newEditDialog = `<DialogHeader>
                  <DialogTitle>Edit Employee Details</DialogTitle>
                </DialogHeader>
                <EditEmployeeForm employee={employee} onSave={handleSaveEdit} isPending={updateProfile.isPending} />`;

code = code.replace(oldEditDialog, newEditDialog);

// Add the Attendance Override Dialog at the end of the file, just before the last </div>
const attendanceDialog = `
      {/* Attendance Override Dialog */}
      <Dialog open={isAttendanceModalOpen} onOpenChange={setIsAttendanceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Attendance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          </div>
          <DialogFooter>
            <Button onClick={handleSaveAttendance} disabled={upsertAttendanceMutation.isPending}>Save Attendance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
`;

if (!code.includes('Override Attendance')) {
    const lastDivIndex = code.lastIndexOf('</div>');
    code = code.substring(0, lastDivIndex) + attendanceDialog + code.substring(lastDivIndex);
}

fs.writeFileSync('src/app/dashboard/attendance/employees/[id]/page.tsx', code);
