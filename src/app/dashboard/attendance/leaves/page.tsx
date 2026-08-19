"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, CalendarIcon } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { useSession } from "next-auth/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";

export default function LeavesPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const { data: profile } = api.employee.getProfile.useQuery(
    { userId: session?.user?.id },
    { enabled: !!session?.user?.id }
  );

  const { data: leaves, isLoading, refetch } = api.hr.getLeaves.useQuery(
    { employeeProfileId: profile?.id },
    { enabled: !!profile?.id }
  );

  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("Casual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  const applyLeaveMutation = api.hr.applyLeave.useMutation({
    onSuccess: () => {
      toast({ title: "Leave applied successfully." });
      refetch();
      setIsApplyOpen(false);
      setLeaveType("Casual");
      setStartDate("");
      setEndDate("");
      setReason("");
      setEmergencyContact("");
    },
    onError: (error) => {
      toast({ title: "Failed to apply leave", description: error.message, variant: "destructive" });
    }
  });

  const handleApply = () => {
    if (!profile?.id || !startDate || !endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = differenceInDays(end, start) + 1;

    applyLeaveMutation.mutate({
      employeeProfileId: profile.id,
      type: leaveType,
      startDate: start,
      endDate: end,
      days: days > 0 ? days : 1,
      reason,
      emergencyContact,
    });
  };

  const inputClass = "w-full bg-[#f0f1f1] border-0 rounded-xl px-4 py-3 h-12 text-[15px] outline-none focus:ring-2 focus:ring-slate-300 transition-all text-slate-800 placeholder:text-slate-400";
  const labelClass = "text-[13px] font-medium text-slate-800 mb-1.5 block";
  const selectWrapperClass = "relative";
  const selectIconClass = "absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none";

  if (isLoading) {
    return <div className="flex h-full items-center justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 h-full max-w-full overflow-x-hidden bg-slate-50/30">
      <div className="flex justify-between items-center">
        <PageHeader title="My Leaves" />
        <Button onClick={() => setIsApplyOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md h-11 px-5">
          <Plus className="h-4 w-4 mr-2" /> Apply Leave
        </Button>
      </div>

      {/* Apply Leave Modal */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="sm:max-w-[480px] bg-[#f8f9f8] border-0 p-6 shadow-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-[20px] font-semibold text-slate-900">Apply Leave</DialogTitle>
            <DialogDescription className="text-[14px] text-slate-500">Submit a new leave request for approval.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div>
              <label className={labelClass}>Leave Type</label>
              <div className={selectWrapperClass}>
                 <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className={`${inputClass} appearance-none`}>
                   <option value="Casual">Casual Leave</option>
                   <option value="Sick">Sick Leave</option>
                   <option value="Annual">Annual Leave</option>
                   <option value="Unpaid">Unpaid Leave</option>
                 </select>
                 <svg className={selectIconClass} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Reason (Optional)</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} className={`${inputClass} h-24 py-3 resize-none`} placeholder="Brief description of the reason" />
            </div>

            <div>
              <label className={labelClass}>Emergency Contact (Optional)</label>
              <input value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} className={inputClass} placeholder="e.g., Jane Doe 555-0192" />
            </div>
          </div>

          <div className="flex justify-end pt-6 mt-2 border-t border-slate-200">
             <Button onClick={handleApply} disabled={applyLeaveMutation.isPending || !startDate || !endDate} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 text-[15px] font-medium shadow-md">
               {applyLeaveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Submit Application
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50 border-b p-6">
          <CardTitle className="text-xl">Leave History</CardTitle>
          <CardDescription>View your past and upcoming leave requests.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 border-b">
              <TableRow>
                <TableHead className="font-semibold text-slate-600 pl-6">Type</TableHead>
                <TableHead className="font-semibold text-slate-600">Start Date</TableHead>
                <TableHead className="font-semibold text-slate-600">End Date</TableHead>
                <TableHead className="font-semibold text-slate-600 text-center">Days</TableHead>
                <TableHead className="font-semibold text-slate-600 pr-6 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves && leaves.length > 0 ? (
                leaves.map((leave) => (
                  <TableRow key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium text-slate-900 pl-6">{leave.type}</TableCell>
                    <TableCell className="text-slate-600">{format(new Date(leave.startDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-slate-600">{format(new Date(leave.endDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-center font-medium text-slate-700">{leave.days}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <Badge variant={leave.status === 'Approved' ? 'default' : leave.status === 'Rejected' ? 'destructive' : 'outline'} className={`px-3 py-1 font-medium ${leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200/50' : leave.status === 'Pending' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200/50' : ''}`}>
                        {leave.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                    No leave requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
