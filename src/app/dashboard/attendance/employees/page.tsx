"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Loader2, Plus, Trash2, History, UserPlus, ChevronDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog";

type Shift = { id: string; startTime: string; endTime: string };

export default function EmployeesPage() {
  const { data: employees, isLoading: isLoadingEmployees, refetch: refetchEmployees } = api.employee.getAllEmployees.useQuery();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STAFF");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [manager, setManager] = useState("");
  const [baseSalary, setBaseSalary] = useState("0");
  const [shifts, setShifts] = useState<Shift[]>([{ id: Date.now().toString(), startTime: "09:00", endTime: "17:00" }]);

  const resetForm = () => {
    setName(""); setEmail(""); setPassword(""); setRole("STAFF"); setDepartment("");
    setJobTitle(""); setMobileNumber(""); setManager(""); setBaseSalary("0");
    setShifts([{ id: Date.now().toString(), startTime: "09:00", endTime: "17:00" }]);
    setEditingEmployeeId(null);
  };

  const createStaffMutation = api.employee.createStaffUser.useMutation({
    onSuccess: () => {
      toast({ title: "Staff member created successfully." });
      refetchEmployees();
      setIsAddOpen(false);
      resetForm();
    },
    onError: (error) => toast({ title: "Failed to create", description: error.message, variant: "destructive" })
  });

  const updateProfileMutation = api.employee.upsertProfile.useMutation({
    onSuccess: () => {
      toast({ title: "Employee updated successfully." });
      refetchEmployees();
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error) => toast({ title: "Failed to update", description: error.message, variant: "destructive" })
  });

  const handleSaveAdd = () => {
    createStaffMutation.mutate({
      name, email, password, role: role as any, department, 
      baseSalary: parseFloat(baseSalary) || 0, mobileNumber, jobTitle, manager, shifts
    });
  };

  const handleSaveEdit = () => {
    if (!editingEmployeeId) return;
    const emp = employees?.find(e => e.id === editingEmployeeId);
    if (!emp) return;
    updateProfileMutation.mutate({
      userId: emp.userId,
      name, department, employeeType: role, baseSalary: parseFloat(baseSalary) || 0,
      mobileNumber, jobTitle, manager, shifts: shifts.map(s => ({ startTime: s.startTime, endTime: s.endTime }))
    });
  };

  const openEdit = (emp: any) => {
    setEditingEmployeeId(emp.id);
    setName(emp.name);
    setEmail(emp.user?.email || "");
    setRole(emp.user?.role || emp.employeeType || "STAFF");
    setDepartment(emp.department || "");
    setJobTitle(emp.jobTitle || "");
    setMobileNumber(emp.mobileNumber || "");
    setManager(emp.manager || "");
    setBaseSalary(emp.baseSalary?.toString() || "0");
    if (emp.shifts && emp.shifts.length > 0) {
      setShifts(emp.shifts.map((s: any) => ({ id: Math.random().toString(), startTime: s.startTime, endTime: s.endTime })));
    } else {
      setShifts([]);
    }
    setIsEditOpen(true);
  };

  const addShift = () => setShifts([...shifts, { id: Date.now().toString(), startTime: "09:00", endTime: "17:00" }]);
  const removeShift = (id: string) => setShifts(shifts.filter(s => s.id !== id));
  const updateShift = (id: string, field: "startTime" | "endTime", val: string) => {
    setShifts(shifts.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  // Convert HH:MM to 12-hour format for the UI
  const formatTime12 = (time24: string) => {
     if(!time24) return { time: "09:00", period: "AM" };
     const [h, m] = time24.split(":");
     let hour = parseInt(h, 10);
     const period = hour >= 12 ? "PM" : "AM";
     hour = hour % 12 || 12;
     return { time: `${hour.toString().padStart(2, '0')}:${m}`, period };
  };

  // Convert 12-hour format back to HH:MM 
  const parseTime24 = (time12: string, period: string) => {
     const [h, m] = time12.split(":");
     let hour = parseInt(h, 10);
     if (period === "PM" && hour < 12) hour += 12;
     if (period === "AM" && hour === 12) hour = 0;
     return `${hour.toString().padStart(2, '0')}:${m}`;
  };

  const handleTimeChange = (id: string, field: "startTime" | "endTime", newTime12: string, currentPeriod: string) => {
      updateShift(id, field, parseTime24(newTime12, currentPeriod));
  };

  const handlePeriodChange = (id: string, field: "startTime" | "endTime", currentTime12: string, newPeriod: string) => {
      updateShift(id, field, parseTime24(currentTime12, newPeriod));
  };

  const inputClass = "w-full bg-[#f0f1f1] border-0 rounded-xl px-4 py-3 h-12 text-[15px] outline-none focus:ring-2 focus:ring-slate-300 transition-all text-slate-800 placeholder:text-slate-400";
  const labelClass = "text-[13px] font-medium text-slate-800 mb-1.5 block";
  const selectWrapperClass = "relative";
  const selectIconClass = "absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none";

  const renderFormFields = (isEdit: boolean) => (
    <div className="space-y-5 pt-2">
      {!isEdit && (
        <>
          <div>
            <label className={labelClass}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="e.g. Jane Doe" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="jane@example.com" />
            </div>
            <div>
              <label className={labelClass}>Temporary Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} placeholder="Min. 6 characters" />
            </div>
          </div>
        </>
      )}

      <div>
        <label className={labelClass}>Mobile Number</label>
        <input value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} className={inputClass} placeholder="e.g. 7499286968" />
      </div>

      <div>
        <label className={labelClass}>User Role</label>
        <div className={selectWrapperClass}>
           <select value={role} onChange={e => setRole(e.target.value)} className={`${inputClass} appearance-none`}>
             <option value="STAFF">Employee</option>
             <option value="ADMIN">Admin</option>
             <option value="MASTER">Super Admin</option>
           </select>
           <ChevronDown className={selectIconClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Job Title</label>
        <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className={inputClass} placeholder="e.g. Associate doctor" />
      </div>

      <div>
        <label className={labelClass}>Department</label>
        <div className={selectWrapperClass}>
           <select value={department} onChange={e => setDepartment(e.target.value)} className={`${inputClass} appearance-none`}>
             <option value="">Select department...</option>
             <option value="Human Resources">Human Resources</option>
             <option value="Medical">Medical</option>
             <option value="Operations">Operations</option>
             <option value="Management">Management</option>
           </select>
           <ChevronDown className={selectIconClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Manager</label>
        <div className={selectWrapperClass}>
           <select value={manager} onChange={e => setManager(e.target.value)} className={`${inputClass} appearance-none`}>
             <option value="">Select manager...</option>
             {employees?.filter(e => e.id !== editingEmployeeId).map(e => (
                <option key={e.id} value={e.name}>{e.name}</option>
             ))}
           </select>
           <ChevronDown className={selectIconClass} />
        </div>
      </div>

      <div className="pt-2">
        <label className={labelClass}>Shift Timings</label>
        <p className="text-[13px] text-slate-500 mb-3">Define one or more work periods for the day.</p>
        <div className="space-y-3">
          {shifts.map(shift => {
             const startObj = formatTime12(shift.startTime);
             const endObj = formatTime12(shift.endTime);
             
             return (
               <div key={shift.id} className="flex items-center gap-2">
                 <input 
                   value={startObj.time} 
                   onChange={e => handleTimeChange(shift.id, "startTime", e.target.value, startObj.period)} 
                   className={`${inputClass} w-24 text-center px-2`} 
                 />
                 <div className={selectWrapperClass}>
                   <select 
                     value={startObj.period} 
                     onChange={e => handlePeriodChange(shift.id, "startTime", startObj.time, e.target.value)} 
                     className={`${inputClass} w-20 appearance-none px-3`}
                   >
                     <option value="AM">AM</option>
                     <option value="PM">PM</option>
                   </select>
                   <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                 </div>
                 
                 <span className="text-slate-400 font-bold mx-1">-</span>
                 
                 <input 
                   value={endObj.time} 
                   onChange={e => handleTimeChange(shift.id, "endTime", e.target.value, endObj.period)} 
                   className={`${inputClass} w-24 text-center px-2`} 
                 />
                 <div className={selectWrapperClass}>
                   <select 
                     value={endObj.period} 
                     onChange={e => handlePeriodChange(shift.id, "endTime", endObj.time, e.target.value)} 
                     className={`${inputClass} w-20 appearance-none px-3`}
                   >
                     <option value="AM">AM</option>
                     <option value="PM">PM</option>
                   </select>
                   <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                 </div>
                 
                 <button onClick={() => removeShift(shift.id)} className="ml-1 p-2.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
                   <Trash2 className="w-4 h-4" />
                 </button>
               </div>
             );
          })}
        </div>
        <Button variant="ghost" onClick={addShift} size="sm" className="mt-4 text-slate-600 hover:text-slate-900 hover:bg-slate-100 w-full border border-dashed border-slate-300 rounded-xl h-11">
          <Plus className="w-4 h-4 mr-2" /> Add Shift Period
        </Button>
      </div>

      <div className="pt-2">
        <label className={labelClass}>Base Salary (₹)</label>
        <input type="number" value={baseSalary} onChange={e => setBaseSalary(e.target.value)} className={inputClass} />
      </div>
    </div>
  );

  return (
    <div className="p-8 flex flex-col gap-6 h-full w-full bg-slate-50/30">
      <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold text-gray-900">Employee Directory</h1>
         <div className="flex gap-3">
            <Button variant="outline" className="bg-white">Export</Button>
            <Button variant="outline" className="bg-white">Import</Button>
            <AddEmployeeDialog />
         </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px] bg-[#f8f9f8] border-0 p-6 shadow-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-[20px] font-semibold text-slate-900">Edit Employee</DialogTitle>
            <DialogDescription className="text-[14px] text-slate-500">Update the details of the employee.</DialogDescription>
          </DialogHeader>
          {renderFormFields(true)}
          <div className="flex justify-end pt-6 mt-2">
             <Button onClick={handleSaveEdit} disabled={updateProfileMutation.isPending} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 text-[15px] font-medium shadow-md">
               {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Save Changes
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="p-4 border-b flex items-center justify-between">
           <input placeholder="Search employees..." className="bg-slate-50 border-0 rounded-lg px-4 py-2 text-sm w-full max-w-xs outline-none" />
        </div>
        <CardContent className="p-0">
          {isLoadingEmployees ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 border-b">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">Employee</TableHead>
                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">Config History</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-12 text-slate-500">
                      No employees found. Click "Add" to onboard new staff.
                    </TableCell>
                  </TableRow>
                )}
                {employees?.map((employee) => (
                  <TableRow key={employee.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                       <Link href={`/dashboard/attendance/employees/${employee.id}`}>
                         <div className="flex items-center gap-3 py-2 cursor-pointer hover:bg-slate-50 rounded-lg p-2 transition-colors -ml-2">
                            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold uppercase shrink-0">
                               {employee.name.charAt(0)}
                            </div>
                            <div>
                               <div className="font-medium text-slate-900 hover:text-blue-600 transition-colors">{employee.name}</div>
                               <div className="text-xs text-slate-500">{employee.user?.email || "No email"}</div>
                            </div>
                         </div>
                       </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200/50 px-3 py-1 font-medium">Active</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(employee)} className="font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                        <History className="h-4 w-4 mr-2 text-slate-400" /> Manage Config
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
