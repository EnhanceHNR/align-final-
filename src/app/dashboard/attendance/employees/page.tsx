"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import Link from "next/link";

export default function EmployeesPage() {
  const { data: employees, isLoading: isLoadingEmployees, refetch: refetchEmployees } = api.employee.getAllEmployees.useQuery();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STAFF");
  const [department, setDepartment] = useState("");
  const [baseSalary, setBaseSalary] = useState("0");

  const createStaffMutation = api.employee.createStaffUser.useMutation({
    onSuccess: () => {
      toast({ title: "Staff member created successfully." });
      refetchEmployees();
      setIsAddOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("STAFF");
      setDepartment("");
      setBaseSalary("0");
    },
    onError: (error) => {
      toast({ title: "Failed to create staff", description: error.message, variant: "destructive" });
    }
  });

  const handleSave = () => {
    if (!name || !email || !password) {
       toast({ title: "Name, email, and password are required.", variant: "destructive" });
       return;
    }
    createStaffMutation.mutate({
      name,
      email,
      password,
      role: role as any,
      department,
      baseSalary: parseFloat(baseSalary) || 0,
    });
  };

  return (
    <div className="p-8 flex flex-col gap-6 h-full max-w-7xl mx-auto animate-in fade-in">
      <PageHeader title="Employees Directory">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Employee Profile</DialogTitle>
              <DialogDescription>Create a new system user and their employee profile in one step.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Full Name <span className="text-destructive">*</span></Label>
                <Input className="col-span-3" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Jane Doe" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Email <span className="text-destructive">*</span></Label>
                <Input className="col-span-3" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Password <span className="text-destructive">*</span></Label>
                <Input className="col-span-3" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 characters" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Role</Label>
                <div className="col-span-3">
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MASTER">Master (Owner)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Department</Label>
                <Input className="col-span-3" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g., Inventory" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Base Salary</Label>
                <Input className="col-span-3" type="number" value={baseSalary} onChange={e => setBaseSalary(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createStaffMutation.isPending || !name || !email || !password}>
                {createStaffMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Employee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Staff List</CardTitle>
          <CardDescription>All employees registered for attendance and payroll.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingEmployees ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        No employees found. Click "Add Profile" to onboard new staff.
                      </TableCell>
                    </TableRow>
                  )}
                  {employees?.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.user?.email || "No email"}</TableCell>
                      <TableCell>{employee.department || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.user?.role || employee.employeeType}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/attendance/employees/${employee.id}`}>
                          <Button variant="ghost" size="sm" className="font-medium text-slate-700 hover:text-black">
                            <Edit className="h-4 w-4 mr-2" /> View & Edit
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
