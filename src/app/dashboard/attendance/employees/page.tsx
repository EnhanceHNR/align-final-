"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Loader2, Plus, Users } from "lucide-react";
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
  const { data: users, isLoading: isLoadingUsers } = api.employee.getAllUsers.useQuery();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [baseSalary, setBaseSalary] = useState("0");

  const upsertMutation = api.employee.upsertProfile.useMutation({
    onSuccess: () => {
      toast({ title: "Employee profile saved successfully." });
      refetchEmployees();
      setIsAddOpen(false);
      setSelectedUserId("");
      setName("");
      setDepartment("");
      setBaseSalary("0");
    },
    onError: (error) => {
      toast({ title: "Failed to save profile", description: error.message, variant: "destructive" });
    }
  });

  const handleSave = () => {
    if (!selectedUserId || !name) return;
    upsertMutation.mutate({
      userId: selectedUserId,
      name,
      department,
      baseSalary: parseFloat(baseSalary) || 0,
    });
  };

  const usersWithoutProfile = users?.filter(u => !u.employeeProfile);

  return (
    <div className="p-8 flex flex-col gap-6 h-full">
      <PageHeader title="Employees Directory">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Profile
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Employee Profile</DialogTitle>
              <DialogDescription>Link an existing system user to an employee profile for attendance.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">System User</Label>
                <div className="col-span-3">
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user account" />
                    </SelectTrigger>
                    <SelectContent>
                      {usersWithoutProfile?.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.email} ({u.role})</SelectItem>
                      ))}
                      {usersWithoutProfile?.length === 0 && (
                        <SelectItem value="none" disabled>No users available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Full Name</Label>
                <Input className="col-span-3" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Department</Label>
                <Input className="col-span-3" value={department} onChange={e => setDepartment(e.target.value)} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Base Salary</Label>
                <Input className="col-span-3" type="number" value={baseSalary} onChange={e => setBaseSalary(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={upsertMutation.isPending || !selectedUserId || !name}>
                {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Profile
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
            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center p-8 text-muted-foreground">
                        No employees found. Create a profile to track attendance.
                      </TableCell>
                    </TableRow>
                  )}
                  {employees?.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.user.email}</TableCell>
                      <TableCell>{employee.department || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/attendance/employees/${employee.id}`}>
                          <Button variant="ghost" size="sm" className="font-medium text-slate-700 hover:text-black">
                            Edit
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
