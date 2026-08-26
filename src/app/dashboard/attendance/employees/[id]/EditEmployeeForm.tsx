"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, PlusCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function EditEmployeeForm({ employee, onSave, isPending }: { employee: any; onSave: (data: any) => void; isPending: boolean }) {
  const [formData, setFormData] = useState({
    name: employee.name || "",
    email: employee.user?.email || "",
    organization: employee.organizationId || "Enhance Head Neck Rehabilitation",
    mobileNumber: employee.mobileNumber || "",
    role: employee.role || "Employee",
    jobTitle: employee.jobTitle || "",
    department: employee.department || "Human Resources",
    manager: employee.manager || "",
    baseSalary: employee.baseSalary || 0,
    paidLeaveBalance: employee.paidLeaveBalance ?? 12,
    sickLeaveBalance: employee.sickLeaveBalance ?? 5,
    latePunchinBuffer: employee.latePunchinBuffer ?? 15,
    avatarUrl: employee.avatarUrl || "",
  });

  const [shifts, setShifts] = useState<{startTime: string, endTime: string}[]>(
    employee.shifts?.length ? employee.shifts : [{ startTime: "09:00 AM", endTime: "05:00 PM" }]
  );
  
  const [weeklyOffs, setWeeklyOffs] = useState<string[]>(
    employee.weeklyOffs || ["Sunday"]
  );

  const [salaryComponents, setSalaryComponents] = useState<{name: string, amount: number, type: 'addition'|'deduction'}[]>(
    employee.salaryComponents || []
  );

  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const handleSave = () => {
    onSave({
      ...formData,
      shifts,
      weeklyOffs,
      salaryComponents
    });
  };

  return (
    <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-2 px-1">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. John Doe" />
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input disabled value={formData.email} placeholder="e.g. john.d@test.com" />
      </div>

      <div className="space-y-2">
        <Label>Organization Name</Label>
        <Select value={formData.organization} onValueChange={v => setFormData({...formData, organization: v})}>
          <SelectTrigger><SelectValue placeholder="Select Organization" /></SelectTrigger>
          <SelectContent>
             <SelectItem value="Enhance Head Neck Rehabilitation">Enhance Head Neck Rehabilitation</SelectItem>
             <SelectItem value="Smileinn Dental Clinic">Smileinn Dental Clinic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Mobile Number</Label>
        <Input value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} placeholder="e.g. +91 98765 43210" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>User Role</Label>
          <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
            <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
               <SelectItem value="Super Admin">Super Admin</SelectItem>
               <SelectItem value="Admin">Admin</SelectItem>
               <SelectItem value="Employee">Employee</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Job Title</Label>
          <Input value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} placeholder="e.g. Software Engineer" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Department</Label>
          <Select value={formData.department} onValueChange={v => setFormData({...formData, department: v})}>
            <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
               <SelectItem value="Technology">Technology</SelectItem>
               <SelectItem value="Product">Product</SelectItem>
               <SelectItem value="Design">Design</SelectItem>
               <SelectItem value="Human Resources">Human Resources</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Manager</Label>
          <Select value={formData.manager} onValueChange={v => setFormData({...formData, manager: v})}>
            <SelectTrigger><SelectValue placeholder="Manager" /></SelectTrigger>
            <SelectContent>
               <SelectItem value="Sneha Rao">Sneha Rao</SelectItem>
               <SelectItem value="Super Admin">Super Admin</SelectItem>
               <SelectItem value="Dr. Kalyani Phad">Dr. Kalyani Phad</SelectItem>
               <SelectItem value="Unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Shift Timings</Label>
        <div className="space-y-3">
          {shifts.map((shift, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input className="flex-1" value={shift.startTime} onChange={e => {
                const newShifts = [...shifts]; newShifts[i].startTime = e.target.value; setShifts(newShifts);
              }} placeholder="09:00 AM" />
              <span>-</span>
              <Input className="flex-1" value={shift.endTime} onChange={e => {
                const newShifts = [...shifts]; newShifts[i].endTime = e.target.value; setShifts(newShifts);
              }} placeholder="05:00 PM" />
              <Button type="button" variant="ghost" size="icon" onClick={() => setShifts(shifts.filter((_, idx) => idx !== i))}>
                 <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setShifts([...shifts, {startTime: "09:00 AM", endTime: "05:00 PM"}])}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Shift Segment
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Base Salary (Monthly, INR)</Label>
        <Input type="number" value={formData.baseSalary} onChange={e => setFormData({...formData, baseSalary: Number(e.target.value)})} placeholder="e.g. 50000" />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Salary Increments & Deductions</Label>
        <div className="space-y-3">
          {salaryComponents.map((comp, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input className="flex-[2]" value={comp.name} onChange={e => {
                const newC = [...salaryComponents]; newC[i].name = e.target.value; setSalaryComponents(newC);
              }} placeholder="e.g. Bonus" />
              <Input type="number" className="flex-1" value={comp.amount} onChange={e => {
                const newC = [...salaryComponents]; newC[i].amount = Number(e.target.value); setSalaryComponents(newC);
              }} placeholder="Amount" />
              <Select value={comp.type} onValueChange={v => {
                const newC = [...salaryComponents]; newC[i].type = v as any; setSalaryComponents(newC);
              }}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="addition">Addition</SelectItem>
                  <SelectItem value="deduction">Deduction</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="ghost" size="icon" onClick={() => setSalaryComponents(salaryComponents.filter((_, idx) => idx !== i))}>
                 <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setSalaryComponents([...salaryComponents, {name: "", amount: 0, type: "addition"}])}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Component
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Paid Leave (Days)</Label>
          <Input type="number" value={formData.paidLeaveBalance} onChange={e => setFormData({...formData, paidLeaveBalance: Number(e.target.value)})} />
        </div>
        <div className="space-y-2">
          <Label>Sick Leave (Days)</Label>
          <Input type="number" value={formData.sickLeaveBalance} onChange={e => setFormData({...formData, sickLeaveBalance: Number(e.target.value)})} />
        </div>
        <div className="space-y-2">
          <Label>Late Buffer (mins)</Label>
          <Input type="number" value={formData.latePunchinBuffer} onChange={e => setFormData({...formData, latePunchinBuffer: Number(e.target.value)})} />
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <Label>Weekly Offs</Label>
        <div className="flex flex-wrap gap-4">
          {WEEKDAYS.map(day => (
            <div key={day} className="flex items-center space-x-2">
              <Checkbox 
                id={`day-${day}`} 
                checked={weeklyOffs.includes(day)}
                onCheckedChange={(checked) => {
                  if (checked) setWeeklyOffs([...weeklyOffs, day]);
                  else setWeeklyOffs(weeklyOffs.filter(d => d !== day));
                }}
              />
              <label htmlFor={`day-${day}`} className="text-sm font-medium leading-none">{day}</label>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={isPending} className="w-full mt-4">
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
