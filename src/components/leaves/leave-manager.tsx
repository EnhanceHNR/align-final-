'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Download } from 'lucide-react';
import { addDays, format, differenceInDays, parseISO } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api } from "~/trpc/react";

export function LeaveManager() {
  const { toast } = useToast();
  const { data: currentUserProfile } = api.employee.getProfile.useQuery({});
  const { data: leaves = [], refetch } = api.hr.getLeaves.useQuery(
    { employeeProfileId: currentUserProfile?.id },
    { enabled: !!currentUserProfile?.id }
  );
  
  const applyLeaveMutation = api.hr.applyLeave.useMutation({
    onSuccess: () => {
      toast({
          title: 'Leave Request Submitted',
          description: 'Your request has been submitted for approval.',
      });
      refetch();
      setOpen(false);
      setLeaveType('');
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate(format(addDays(new Date(), 4), 'yyyy-MM-dd'));
      setReason('');
      setEmergencyContact('');
    }
  });

  const [open, setOpen] = useState(false);
  
  const [leaveType, setLeaveType] = useState<string>('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 4), 'yyyy-MM-dd'));
  const [reason, setReason] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('');

  const filterByMonth = (dateStr: string) => {
    if (!filterMonth || !dateStr) return true;
    return dateStr.startsWith(filterMonth);
  };

  const userLeaves = useMemo(() => {
    return leaves
      .filter((l: any) => filterByMonth(l.startDate || ''))
      .sort((a: any, b: any) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime());
  }, [leaves, filterMonth]);
  
  const userLateRequests: any[] = [];
  const userEarlyRequests: any[] = [];
  
  const pendingLeaves = userLeaves.filter((l: any) => l.status === 'Pending');
  const approvedLeaves = userLeaves.filter((l: any) => l.status === 'Approved');
  const rejectedLeaves = userLeaves.filter((l: any) => l.status === 'Rejected');

  const handleSubmit = () => {
    if (!leaveType || !startDate || !currentUserProfile?.id) {
        toast({
            variant: 'destructive',
            title: 'Incomplete Form',
            description: 'Please fill out all the required fields.',
        });
        return;
    }
    
    const fromDate = parseISO(startDate);
    const toDate = endDate ? parseISO(endDate) : fromDate;
    
    const days = differenceInDays(toDate, fromDate) + 1;

    // Use paidLeaveBalance/sickLeaveBalance from profile if available, else fallback to 0
    const paidLeaveBalance = currentUserProfile?.paidLeaveBalance ?? currentUserProfile?.paidLeave ?? 0;
    const sickLeaveBalance = currentUserProfile?.sickLeaveBalance ?? currentUserProfile?.sickLeave ?? 0;
    
    if (leaveType === 'Casual Leave' || leaveType === 'Sick Leave') {
      const approvedLeavesByType = approvedLeaves.filter((l: any) => l.type === leaveType || l.leaveType === leaveType);
      const totalUsedDays = approvedLeavesByType.reduce((sum: number, l: any) => sum + (l.days || 0), 0);
      
      let availableBalance = 0;
      if (leaveType === 'Casual Leave') {
        availableBalance = paidLeaveBalance - totalUsedDays;
      } else if (leaveType === 'Sick Leave') {
        availableBalance = sickLeaveBalance - totalUsedDays;
      }
      
      if (availableBalance < days) {
        const deficit = days - availableBalance;
        toast({
          variant: 'destructive',
          title: 'Insufficient Leave Balance',
          description: `You only have ${availableBalance} ${leaveType} day(s) available. You need ${deficit} more day(s). Please apply for Unpaid Leave instead.`,
        });
        return;
      }
    }

    applyLeaveMutation.mutate({
        employeeProfileId: currentUserProfile.id,
        type: leaveType,
        startDate: fromDate,
        endDate: toDate,
        days: days,
        reason: reason || undefined,
        emergencyContact: emergencyContact || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const handleExportLeaves = () => {
    toast({
      title: 'Export Feature',
      description: `Not implemented yet.`,
    });
  };

  const casualLeaveUsed = approvedLeaves.filter((l: any) => l.type === 'Casual Leave' || l.leaveType === 'Casual Leave').reduce((sum: number, l: any) => sum + (l.days || 0), 0);
  const sickLeaveUsed = approvedLeaves.filter((l: any) => l.type === 'Sick Leave' || l.leaveType === 'Sick Leave').reduce((sum: number, l: any) => sum + (l.days || 0), 0);

  const paidLeaveBalance = currentUserProfile?.paidLeaveBalance ?? currentUserProfile?.paidLeave ?? 0;
  const sickLeaveBalance = currentUserProfile?.sickLeaveBalance ?? currentUserProfile?.sickLeave ?? 0;
  const remainingCasual = Math.max(0, paidLeaveBalance - casualLeaveUsed);
  const remainingSick = Math.max(0, sickLeaveBalance - sickLeaveUsed);

  const isResigned = false; 

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Casual Leave</CardTitle>
            <CardDescription>Remaining balance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-headline text-4xl font-bold">{remainingCasual}</p>
            <p className="text-sm text-muted-foreground">out of {paidLeaveBalance} Days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sick Leave</CardTitle>
            <CardDescription>Remaining balance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-headline text-4xl font-bold">{remainingSick}</p>
            <p className="text-sm text-muted-foreground">out of {sickLeaveBalance} Days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>My Requests</CardTitle>
            <CardDescription>Your past leaves, late arrivals, and early punch outs.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input 
              type="month" 
              value={filterMonth} 
              onChange={(e) => setFilterMonth(e.target.value)} 
              className="w-auto h-9" 
            />
            {filterMonth && (
              <Button variant="ghost" size="sm" onClick={() => setFilterMonth('')}>
                Clear
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleExportLeaves}
              disabled={userLeaves.length === 0}
            >
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={isResigned ? 0 : undefined}>
                      <DialogTrigger asChild>
                        <Button disabled={isResigned}>
                          <Plus className="mr-2" /> Request Leave
                        </Button>
                      </DialogTrigger>
                    </span>
                  </TooltipTrigger>
                  {isResigned && (
                    <TooltipContent>
                      <p>Leave requests are disabled due to resignation. Submit a rejoin request to restore access.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>New Leave Request</DialogTitle>
                <DialogDescription>
                  Fill out the form to apply for a new leave.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-muted-foreground">
                    Employee Name
                  </Label>
                  <Input className="col-span-3" value={currentUserProfile?.name || ''} disabled />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-muted-foreground">
                    Designation
                  </Label>
                  <Input className="col-span-3" value={currentUserProfile?.jobTitle || currentUserProfile?.role || ''} disabled />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-muted-foreground">
                    Date of Applying
                  </Label>
                  <Input className="col-span-3" value={format(new Date(), 'MMM dd, yyyy')} disabled />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="leave-type" className="text-right">
                    Leave Type
                  </Label>
                  <Select onValueChange={(value) => setLeaveType(value)} value={leaveType}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                      <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                      <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="start-date" className="text-right">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    className="col-span-3"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="end-date" className="text-right">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    className="col-span-3"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-muted-foreground">
                    No. of Days
                  </Label>
                  <Input 
                    className="col-span-3" 
                    value={startDate && endDate ? differenceInDays(parseISO(endDate), parseISO(startDate)) + 1 : 0} 
                    disabled 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reason" className="text-right">
                    Reason
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="Provide a reason for your leave"
                    className="col-span-3"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="emergency-contact" className="text-right">
                    Emergency Contact
                  </Label>
                  <Input
                    id="emergency-contact"
                    type="tel"
                    placeholder="Contact number in case of emergency"
                    className="col-span-3"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSubmit} disabled={applyLeaveMutation.isPending}>
                  {applyLeaveMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="leaves" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="leaves">
                Leave History ({userLeaves.length})
              </TabsTrigger>
              <TabsTrigger value="late">
                Late Arrivals ({userLateRequests.length})
              </TabsTrigger>
              <TabsTrigger value="early">
                Early Punch Outs ({userEarlyRequests.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="leaves">
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">
                    All ({userLeaves.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    Pending ({pendingLeaves.length})
                  </TabsTrigger>
                  <TabsTrigger value="approved">
                    Approved ({approvedLeaves.length})
                  </TabsTrigger>
                  <TabsTrigger value="rejected">
                    Rejected ({rejectedLeaves.length})
                  </TabsTrigger>
                </TabsList>
            
            <TabsContent value="all" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userLeaves.length > 0 ? (
                    userLeaves.map((leave: any) => (
                      <TableRow key={leave.id}>
                        <TableCell>
                          {leave.startDate ? format(new Date(leave.startDate), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {leave.endDate ? format(new Date(leave.endDate), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell>{leave.type || leave.leaveType}</TableCell>
                        <TableCell>{leave.days}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(leave.status)}>
                            {leave.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No leave requests found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="pending" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingLeaves.length > 0 ? (
                    pendingLeaves.map((leave: any) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-medium">{leave.id}</TableCell>
                        <TableCell>{leave.type || leave.leaveType}</TableCell>
                        <TableCell>
                          {leave.startDate ? format(new Date(leave.startDate), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {leave.endDate ? format(new Date(leave.endDate), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell>{leave.days}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(leave.status)}>
                            {leave.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No pending leave requests.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="approved" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedLeaves.length > 0 ? (
                    approvedLeaves.map((leave: any) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-medium">{leave.id}</TableCell>
                        <TableCell>{leave.type || leave.leaveType}</TableCell>
                        <TableCell>
                          {leave.startDate ? format(new Date(leave.startDate), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {leave.endDate ? format(new Date(leave.endDate), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell>{leave.days}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(leave.status)}>
                            {leave.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No approved leave requests.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="rejected" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rejectedLeaves.length > 0 ? (
                    rejectedLeaves.map((leave: any) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-medium">{leave.id}</TableCell>
                        <TableCell>{leave.type || leave.leaveType}</TableCell>
                        <TableCell>
                          {leave.startDate ? format(new Date(leave.startDate), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {leave.endDate ? format(new Date(leave.endDate), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell>{leave.days}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(leave.status)}>
                            {leave.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No rejected leave requests.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </TabsContent>
        </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
