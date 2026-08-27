
'use client';

import { useContext, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { AppContext } from '@/context/app-context';
import { Check, X, Plus, ListFilter, Loader2, Download } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { Leave } from '@/lib/types';
import { exportToCSV } from '@/lib/csv-export';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
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

export default function LeaveRequestManager() {
  const { leaves, employees, updateLeaveStatus, currentUser, loading } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('team');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [overrideLeaveType, setOverrideLeaveType] = useState<'Paid Leave' | 'Unpaid Leave' | 'Sick Leave' | 'Casual Leave'>('Paid Leave');
  const [exportYear, setExportYear] = useState<string>(new Date().getFullYear().toString());
  const [exportMonth, setExportMonth] = useState<string>('all');
  const [exportEmployeeId, setExportEmployeeId] = useState<string>('all');
  const { toast } = useToast();

  const getEmployeeById = (id: string) => employees.find((e) => e.id === id);
  
  console.log('Leave Requests Debug:', { totalLeaves: leaves.length, employees: employees.length, loading });

  const handleExportLeaves = () => {
    const filteredLeaves = leaves.filter((leave) => {
      const recordDate = new Date(leave.startDate);
      const recordYear = recordDate.getFullYear().toString();
      const recordMonth = (recordDate.getMonth() + 1).toString().padStart(2, '0');
      
      const matchesYear = recordYear === exportYear;
      const matchesMonth = exportMonth !== 'all' ? recordMonth === exportMonth : true;
      const matchesEmployee = exportEmployeeId !== 'all' ? leave.employeeId === exportEmployeeId : true;

      return matchesYear && matchesMonth && matchesEmployee;
    });

    if (filteredLeaves.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data',
        description: 'No leave records found for the selected filters.',
      });
      return;
    }

    filteredLeaves.sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      
      const yearMonthA = dateA.getFullYear() * 100 + dateA.getMonth();
      const yearMonthB = dateB.getFullYear() * 100 + dateB.getMonth();
      
      if (yearMonthA !== yearMonthB) {
        return yearMonthA - yearMonthB;
      }
      
      const empA = getEmployeeById(a.employeeId)?.name || '';
      const empB = getEmployeeById(b.employeeId)?.name || '';
      
      if (empA !== empB) {
        return empA.localeCompare(empB);
      }
      
      return dateA.getTime() - dateB.getTime();
    });

    const exportData = filteredLeaves.map((leave) => {
      const employee = getEmployeeById(leave.employeeId);
      return {
        'Employee Name': employee?.name || 'Unknown',
        'Leave Type': leave.type,
        'Start Date': format(new Date(leave.startDate), 'yyyy-MM-dd'),
        'End Date': format(new Date(leave.endDate), 'yyyy-MM-dd'),
        'Days': leave.days,
        'Status': leave.status,
        'Reason': leave.reason || '-',
      };
    });

    exportToCSV({
      data: exportData,
      filename: `leaves_export_${exportYear}_${exportMonth !== 'all' ? exportMonth : 'all'}${exportEmployeeId !== 'all' ? '_employee' : ''}.csv`,
    });

    toast({
      title: 'Export Successful',
      description: `Exported ${exportData.length} leave records to CSV.`,
    });
  };

  const handleApproveClick = (leave: Leave) => {
    setSelectedLeave(leave);
    setOverrideLeaveType(leave.type as any);
    setApprovalDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedLeave) return;
    
    await updateLeaveStatus(selectedLeave.id, 'Approved', overrideLeaveType as 'Paid Leave' | 'Unpaid Leave');
    setApprovalDialogOpen(false);
    setSelectedLeave(null);
  };

  const { pending, approved, rejected } = useMemo(() => {
    const isSuperAdmin = currentUser?.employeeType === 'Super Admin';
    const visibleLeaves = isSuperAdmin ? leaves : leaves.filter(leave => {
      const emp = getEmployeeById(leave.employeeId);
      return emp && emp.employeeType === 'Employee';
    });

    const sortedLeaves = [...visibleLeaves].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    return sortedLeaves.reduce(
      (acc, leave) => {
        if (leave.status === 'Pending') acc.pending.push(leave);
        if (leave.status === 'Approved') acc.approved.push(leave);
        if (leave.status === 'Rejected') acc.rejected.push(leave);
        return acc;
      },
      { pending: [] as Leave[], approved: [] as Leave[], rejected: [] as Leave[] }
    );
  }, [leaves, currentUser, employees]);

  return (
    <div className="flex flex-col gap-6">
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
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
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
              {pending.map((leave) => {
                const employee = getEmployeeById(leave.employeeId);
                if (!employee) return null;

                return (
                  <Card key={leave.id} className="overflow-hidden shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar>
                          <AvatarImage src={employee.avatarUrl} alt={employee.name} data-ai-hint="person portrait"/>
                          <AvatarFallback>
                            {employee.name.split(' ').map((n) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{employee.name}</p>
                          <p className="text-sm font-bold">
                            {format(new Date(leave.startDate), 'MMM dd, yyyy')} -{' '}
                            {format(new Date(leave.endDate), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">{leave.days} day(s) - {leave.type}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateLeaveStatus(leave.id, 'Rejected')}
                        >
                          <X className="mr-2" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveClick(leave)}
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
                approved.map((leave) => {
                  const employee = getEmployeeById(leave.employeeId);
                  if (!employee) return null;

                  return (
                    <Card key={leave.id} className="overflow-hidden shadow-sm border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={employee.avatarUrl} alt={employee.name} data-ai-hint="person portrait"/>
                            <AvatarFallback>
                              {employee.name.split(' ').map((n) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold">{employee.name}</p>
                            <p className="text-sm font-bold">
                              {format(new Date(leave.startDate), 'MMM dd, yyyy')} -{' '}
                              {format(new Date(leave.endDate), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">{leave.days} day(s) - {leave.type}</p>
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
                rejected.map((leave) => {
                  const employee = getEmployeeById(leave.employeeId);
                  if (!employee) return null;

                  return (
                    <Card key={leave.id} className="overflow-hidden shadow-sm border-l-4 border-l-red-500">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={employee.avatarUrl} alt={employee.name} data-ai-hint="person portrait"/>
                            <AvatarFallback>
                              {employee.name.split(' ').map((n) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold">{employee.name}</p>
                            <p className="text-sm font-bold">
                              {format(new Date(leave.startDate), 'MMM dd, yyyy')} -{' '}
                              {format(new Date(leave.endDate), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">{leave.days} day(s) - {leave.type}</p>
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
                  <p className="font-semibold">{selectedLeave.employeeName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Days</p>
                  <p className="font-semibold">{selectedLeave.days} day(s)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-semibold">{format(new Date(selectedLeave.startDate), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">End Date</p>
                  <p className="font-semibold">{format(new Date(selectedLeave.endDate), 'MMM dd, yyyy')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leave-type">Leave Type (Admin Override)</Label>
                <Select value={overrideLeaveType} onValueChange={(value: any) => setOverrideLeaveType(value)}>
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
                  Original request: {selectedLeave.type}
                  {overrideLeaveType !== selectedLeave.type && (
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
            <Button onClick={handleApprove}>
              <Check className="mr-2 h-4 w-4" />
              Approve as {overrideLeaveType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
