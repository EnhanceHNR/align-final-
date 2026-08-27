'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Check, X, ListFilter, Loader2, Download } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { api } from "~/trpc/react";

const StatCard = ({
  title,
  value,
  colorClass,
}: {
  title: string;
  value: number | string;
  colorClass: string;
}) => (
  <Card className={`border-${colorClass}-200 bg-${colorClass}-50 dark:bg-${colorClass}-900/20 dark:border-${colorClass}-800`}>
    <CardContent className="p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className={`text-2xl font-bold text-${colorClass}-600 dark:text-${colorClass}-400`}>
        {value}
      </p>
    </CardContent>
  </Card>
);

export function LeaveRequestManager() {
  const { toast } = useToast();
  const { data: leaves = [], isLoading: loading, refetch } = api.hr.getLeaves.useQuery({});
  const updateLeaveStatusMutation = api.hr.updateLeaveStatus.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Leave status updated successfully." });
      refetch();
    }
  });

  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [overrideLeaveType, setOverrideLeaveType] = useState<string>('Paid Leave');
  const [exportYear, setExportYear] = useState<string>(new Date().getFullYear().toString());
  const [exportMonth, setExportMonth] = useState<string>('all');
  const [exportEmployeeId, setExportEmployeeId] = useState<string>('all');

  const employees = useMemo(() => {
    const map = new Map();
    leaves.forEach((l: any) => {
      if (l.employeeProfile) {
        map.set(l.employeeProfile.id, l.employeeProfile);
      }
    });
    return Array.from(map.values());
  }, [leaves]);

  const handleExportLeaves = () => {
    // Export logic omitted for brevity or implement if needed
    toast({
      title: 'Export Feature',
      description: `Not fully implemented in port.`,
    });
  };

  const handleApproveClick = (leave: any) => {
    setSelectedLeave(leave);
    setOverrideLeaveType(leave.type || leave.leaveType || 'Paid Leave');
    setApprovalDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedLeave) return;
    updateLeaveStatusMutation.mutate({
      id: selectedLeave.id,
      status: 'Approved',
      overrideType: overrideLeaveType
    });
    setApprovalDialogOpen(false);
    setSelectedLeave(null);
  };

  const handleReject = (leave: any) => {
    updateLeaveStatusMutation.mutate({
      id: leave.id,
      status: 'Rejected'
    });
  }

  const { pending, approved, rejected } = useMemo(() => {
    const sortedLeaves = [...leaves].sort((a: any, b: any) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime());
    return sortedLeaves.reduce(
      (acc: any, leave: any) => {
        if (leave.status === 'Pending') acc.pending.push(leave);
        if (leave.status === 'Approved') acc.approved.push(leave);
        if (leave.status === 'Rejected') acc.rejected.push(leave);
        return acc;
      },
      { pending: [], approved: [], rejected: [] }
    );
  }, [leaves]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold">Leave Requests</h1>
           <p className="text-muted-foreground">Approve or reject employee time-off requests.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={exportEmployeeId} onValueChange={setExportEmployeeId}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((emp: any) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name || emp.firstName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={exportYear} onValueChange={setExportYear}>
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>

          <Select value={exportMonth} onValueChange={setExportMonth}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              <SelectItem value="01">January</SelectItem>
              <SelectItem value="02">February</SelectItem>
              <SelectItem value="03">March</SelectItem>
              <SelectItem value="04">April</SelectItem>
              <SelectItem value="05">May</SelectItem>
              <SelectItem value="06">June</SelectItem>
              <SelectItem value="07">July</SelectItem>
              <SelectItem value="08">August</SelectItem>
              <SelectItem value="09">September</SelectItem>
              <SelectItem value="10">October</SelectItem>
              <SelectItem value="11">November</SelectItem>
              <SelectItem value="12">December</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleExportLeaves}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ListFilter className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Approved" value={approved.length} colorClass="green" />
        <StatCard title="Pending" value={pending.length} colorClass="teal" />
        <StatCard title="Rejected" value={rejected.length} colorClass="red" />
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          <Card>
            <CardContent className="mt-6 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p>Loading leave requests...</p>
                </div>
              ) : pending.length === 0 ? (
                <div className="text-center py-12">
                  <div className="rounded-full bg-muted p-3 mx-auto w-fit mb-4">
                    <Check className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">All Caught Up!</h3>
                  <p className="text-muted-foreground">
                    No pending leave requests at the moment.
                  </p>
                </div>
              ) : null}
              {pending.map((leave: any) => {
                const employee = leave.employeeProfile;
                if (!employee) return null;

                return (
                  <Card key={leave.id} className="overflow-hidden shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar>
                          <AvatarImage src={employee.avatarUrl} alt={employee.name} />
                          <AvatarFallback>
                            {(employee.name || "U")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{employee.name || employee.firstName}</p>
                          <p className="text-sm font-bold">
                            {leave.startDate && format(new Date(leave.startDate), 'MMM dd, yyyy')} -{' '}
                            {leave.endDate && format(new Date(leave.endDate), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">{leave.days} day(s) - {leave.type || leave.leaveType}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(leave)}
                          disabled={updateLeaveStatusMutation.isPending}
                        >
                          <X className="mr-2" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveClick(leave)}
                          disabled={updateLeaveStatusMutation.isPending}
                        >
                          <Check className="mr-2" /> Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardContent className="mt-6 space-y-4">
              {approved.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No approved leave requests.</p>
                </div>
              ) : (
                approved.map((leave: any) => {
                  const employee = leave.employeeProfile;
                  if (!employee) return null;

                  return (
                    <Card key={leave.id} className="overflow-hidden shadow-sm border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={employee.avatarUrl} alt={employee.name} />
                            <AvatarFallback>
                              {(employee.name || "U")[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold">{employee.name || employee.firstName}</p>
                            <p className="text-sm font-bold">
                              {leave.startDate && format(new Date(leave.startDate), 'MMM dd, yyyy')} -{' '}
                              {leave.endDate && format(new Date(leave.endDate), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">{leave.days} day(s) - {leave.type || leave.leaveType}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardContent className="mt-6 space-y-4">
              {rejected.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No rejected leave requests.</p>
                </div>
              ) : (
                rejected.map((leave: any) => {
                  const employee = leave.employeeProfile;
                  if (!employee) return null;

                  return (
                    <Card key={leave.id} className="overflow-hidden shadow-sm border-l-4 border-l-red-500">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={employee.avatarUrl} alt={employee.name} />
                            <AvatarFallback>
                              {(employee.name || "U")[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold">{employee.name || employee.firstName}</p>
                            <p className="text-sm font-bold">
                              {leave.startDate && format(new Date(leave.startDate), 'MMM dd, yyyy')} -{' '}
                              {leave.endDate && format(new Date(leave.endDate), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">{leave.days} day(s) - {leave.type || leave.leaveType}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Leave Request</DialogTitle>
            <DialogDescription>
              Review and approve the leave request. You can override the leave type if needed.
            </DialogDescription>
          </DialogHeader>

          {selectedLeave && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Employee</p>
                  <p className="font-semibold">{selectedLeave.employeeProfile?.name || selectedLeave.employeeProfile?.firstName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Days</p>
                  <p className="font-semibold">{selectedLeave.days} day(s)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-semibold">{selectedLeave.startDate && format(new Date(selectedLeave.startDate), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">End Date</p>
                  <p className="font-semibold">{selectedLeave.endDate && format(new Date(selectedLeave.endDate), 'MMM dd, yyyy')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leave-type">Leave Type (Admin Override)</Label>
                <Select value={overrideLeaveType} onValueChange={setOverrideLeaveType}>
                  <SelectTrigger id="leave-type">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid Leave">Paid Leave</SelectItem>
                    <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                    <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                    <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Original request: {selectedLeave.type || selectedLeave.leaveType}
                  {overrideLeaveType !== (selectedLeave.type || selectedLeave.leaveType) && (
                    <span className="text-amber-600"> (Modified by admin)</span>
                  )}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={updateLeaveStatusMutation.isPending}>
              {updateLeaveStatusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Approve as {overrideLeaveType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
