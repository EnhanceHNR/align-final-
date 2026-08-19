"use client";

import React, { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Loader2, Plus, Trash2, History, UserPlus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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

  // Shared form fields to match the screenshot exactly
  const renderFormFields = (isEdit: boolean) => (
    <div className="space-y-4 pt-2">
      {!isEdit && (
        <>
          <div>
            <label className="text-sm font-medium mb-1 block">Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-transparent border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-transparent border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-transparent border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
        </>
      )}

      <div>
        <label className="text-sm font-medium mb-1 block">Mobile Number</label>
        <input value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} className="w-full bg-transparent border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">User Role</label>
        <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-transparent border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 appearance-none">
          <option value="STAFF">Employee</option>
          <option value="ADMIN">Admin</option>
          <option value="MASTER">Super Admin</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Job Title</label>
        <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="w-full bg-transparent border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="e.g. Associate doctor" />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Department</label>
        <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full bg-transparent border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 appearance-none">
          <option value="">Select department...</option>
          <option value="Human Resources">Human Resources</option>
          <option value="Medical">Medical</option>
          <option value="Operations">Operations</option>
          <option value="Management">Management</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Manager</label>
        <select value={manager} onChange={e => setManager(e.target.value)} className="w-full bg-transparent border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 appearance-none">
          <option value="">Select manager...</option>
          {employees?.filter(e => e.id !== editingEmployeeId).map(e => (
             <option key={e.id} value={e.name}>{e.name}</option>
          ))}
        </select>
      </div>

      <div className="pt-2 border-t mt-4">
        <label className="text-sm font-medium block">Shift Timings</label>
        <p className="text-xs text-gray-500 mb-3">Define one or more work periods for the day.</p>
        <div className="space-y-3">
          {shifts.map(shift => (
            <div key={shift.id} className="flex items-center gap-3">
              <input 
                type="time" 
                value={shift.startTime} 
                onChange={e => updateShift(shift.id, "startTime", e.target.value)} 
                className="flex-1 bg-transparent border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" 
              />
              <span className="text-gray-400 font-bold">-</span>
              <input 
                type="time" 
                value={shift.endTime} 
                onChange={e => updateShift(shift.id, "endTime", e.target.value)} 
                className="flex-1 bg-transparent border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" 
              />
              <button onClick={() => removeShift(shift.id)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <Button variant="ghost" onClick={addShift} size="sm" className="mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 w-full border border-dashed border-blue-200">
          <Plus className="w-4 h-4 mr-2" /> Add Shift Period
        </Button>
      </div>

      <div className="pt-2 border-t mt-4">
        <label className="text-sm font-medium mb-1 block">Base Salary (₹)</label>
        <input type="number" value={baseSalary} onChange={e => setBaseSalary(e.target.value)} className="w-full bg-transparent border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
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
            <Button onClick={() => { resetForm(); setIsAddOpen(true); }} className="bg-slate-900 hover:bg-slate-800 text-white">
              <UserPlus className="h-4 w-4 mr-2" /> Add Employee
            </Button>
         </div>
      </div>

      {/* Add Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[450px] bg-[#f4f5f4] border-0 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Add Employee</DialogTitle>
            <DialogDescription>Create a new employee profile and system account.</DialogDescription>
          </DialogHeader>
          {renderFormFields(false)}
          <div className="flex justify-end pt-4 mt-4 border-t">
             <Button onClick={handleSaveAdd} disabled={createStaffMutation.isPending || !name || !email || !password} className="w-full bg-slate-900 hover:bg-slate-800">
               {createStaffMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Create Employee
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[450px] bg-[#f4f5f4] border-0 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Employee</DialogTitle>
            <DialogDescription>Update the details of the employee.</DialogDescription>
          </DialogHeader>
          {renderFormFields(true)}
          <div className="flex justify-end pt-4 mt-4 border-t">
             <Button onClick={handleSaveEdit} disabled={updateProfileMutation.isPending} className="w-full bg-slate-900 hover:bg-slate-800">
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
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
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
                      No employees found. Click "Add Employee" to onboard new staff.
                    </TableCell>
                  </TableRow>
                )}
                {employees?.map((employee) => (
                  <TableRow key={employee.id} className="hover:bg-slate-50/50">
                    <TableCell>
                       <div className="flex items-center gap-3 py-2">
                          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold uppercase shrink-0">
                             {employee.name.charAt(0)}
                          </div>
                          <div>
                             <div className="font-medium text-slate-900">{employee.name}</div>
                             <div className="text-xs text-slate-500">{employee.user?.email || "No email"}</div>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200/50">Active</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(employee)} className="font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100">
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
