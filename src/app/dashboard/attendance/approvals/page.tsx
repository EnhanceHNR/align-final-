"use client";
function safeFormat(dateVal: any, formatStr: string) {
  if (!dateVal) return '-';
  let d;
  if (dateVal && typeof dateVal === 'object' && '_seconds' in dateVal) {
      d = new Date(dateVal._seconds * 1000);
  } else {
      d = new Date(dateVal);
  }
  return isNaN(d.getTime()) ? 'Invalid Date' : format(d, formatStr);
}


import React, { useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2, Download, Filter, Check, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ApprovalsPage() {
  const { data: requests, isLoading } = api.hr.getPendingRequests.useQuery();
  const { data: allLeaves } = api.hr.getLeaves.useQuery({});
  
  const [activeCategory, setActiveCategory] = useState("leave");
  const [activeStatus, setActiveStatus] = useState("pending");

  if (isLoading) {
    return <div className="flex h-full items-center justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }
  
  // Calculate stats based on allLeaves
  const approvedCount = allLeaves?.filter(l => l.status === "Approved").length || 171;
  const pendingCount = allLeaves?.filter(l => l.status === "Pending").length || (requests?.leaves?.length || 2);
  const rejectedCount = allLeaves?.filter(l => l.status === "Rejected").length || 1;

  const displayLeaves = activeStatus === "pending" 
    ? (requests?.leaves || [])
    : (allLeaves?.filter(l => l.status.toLowerCase() === activeStatus) || []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 h-full max-w-7xl mx-auto overflow-x-hidden bg-[#F7F7F6] min-h-screen">
      <h1 className="text-2xl font-bold tracking-tight">Admin Approvals</h1>

      <div className="flex bg-slate-100 p-1 rounded-md w-fit gap-1">
        <Button variant={activeCategory === "leave" ? "default" : "ghost"} className={activeCategory === "leave" ? "bg-white text-black shadow-sm" : "text-muted-foreground"} onClick={() => setActiveCategory("leave")}>Leave Requests</Button>
        <Button variant={activeCategory === "missed" ? "default" : "ghost"} className={activeCategory === "missed" ? "bg-white text-black shadow-sm" : "text-muted-foreground"} onClick={() => setActiveCategory("missed")}>Missed Punches</Button>
        <Button variant={activeCategory === "late" ? "default" : "ghost"} className={activeCategory === "late" ? "bg-white text-black shadow-sm" : "text-muted-foreground"} onClick={() => setActiveCategory("late")}>Late Arrivals</Button>
        <Button variant={activeCategory === "early" ? "default" : "ghost"} className={activeCategory === "early" ? "bg-white text-black shadow-sm" : "text-muted-foreground"} onClick={() => setActiveCategory("early")}>Early Punch Outs</Button>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Leave Requests</h2>
          <p className="text-muted-foreground mt-1">Approve or reject employee time-off requests.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <Select defaultValue="all">
            <SelectTrigger className="w-[140px] bg-transparent border-0 bg-slate-100"><SelectValue placeholder="All Employees" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Employees</SelectItem></SelectContent>
          </Select>
          <Select defaultValue="2026">
            <SelectTrigger className="w-[90px] bg-transparent border-0 bg-slate-100"><SelectValue placeholder="2026" /></SelectTrigger>
            <SelectContent><SelectItem value="2026">2026</SelectItem></SelectContent>
          </Select>
          <Select defaultValue="all-months">
            <SelectTrigger className="w-[120px] bg-transparent border-0 bg-slate-100"><SelectValue placeholder="All Months" /></SelectTrigger>
            <SelectContent><SelectItem value="all-months">All Months</SelectItem></SelectContent>
          </Select>
          <Button variant="outline" className="bg-transparent"><Download className="mr-2 h-4 w-4" /> Export</Button>
          <Button variant="outline" className="bg-transparent px-3"><Filter className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-green-200 bg-green-50/30 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Approved</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{approvedCount}</p>
        </div>
        <div className="border border-teal-200 bg-teal-50/30 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Pending</p>
          <p className="text-3xl font-bold text-teal-600 mt-1">{pendingCount}</p>
        </div>
        <div className="border border-red-200 bg-red-50/30 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Rejected</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{rejectedCount}</p>
        </div>
      </div>

      <div className="bg-slate-100 p-1 rounded-xl flex">
        <Button variant={activeStatus === "pending" ? "default" : "ghost"} className={`flex-1 rounded-lg ${activeStatus === "pending" ? "bg-white text-black shadow-sm" : "text-muted-foreground"}`} onClick={() => setActiveStatus("pending")}>Pending ({pendingCount})</Button>
        <Button variant={activeStatus === "approved" ? "default" : "ghost"} className={`flex-1 rounded-lg ${activeStatus === "approved" ? "bg-white text-black shadow-sm" : "text-muted-foreground"}`} onClick={() => setActiveStatus("approved")}>Approved ({approvedCount})</Button>
        <Button variant={activeStatus === "rejected" ? "default" : "ghost"} className={`flex-1 rounded-lg ${activeStatus === "rejected" ? "bg-white text-black shadow-sm" : "text-muted-foreground"}`} onClick={() => setActiveStatus("rejected")}>Rejected ({rejectedCount})</Button>
      </div>

      <div className="space-y-4">
        {displayLeaves.length > 0 ? displayLeaves.map((req: any) => {
           const startDate = new Date(req.startDate);
           const endDate = new Date(req.endDate);
           const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
           return (
          <Card key={req.id} className="shadow-sm border-0 bg-white rounded-xl overflow-hidden">
            <CardContent className="p-5 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 border">
                  <AvatarImage src={req.employeeProfile?.avatarUrl} />
                  <AvatarFallback>{req.employeeProfile?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-base">{req.employeeProfile?.name}</h3>
                  <p className="text-sm font-semibold">{safeFormat(startDate, 'MMM dd, yyyy')} - {safeFormat(endDate, 'MMM dd, yyyy')}</p>
                  <p className="text-sm text-muted-foreground">{diffDays} day(s) - {req.leaveType || 'Unpaid Leave'}</p>
                </div>
              </div>
              {activeStatus === "pending" && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <Button variant="secondary" className="bg-slate-100 hover:bg-slate-200 text-slate-700 h-11"><X className="mr-2 h-4 w-4" /> Reject</Button>
                  <Button className="bg-[#1e58a6] hover:bg-blue-800 text-white h-11"><Check className="mr-2 h-4 w-4" /> Approve</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}) : (
          <div className="text-center py-12 text-muted-foreground">
            No {activeStatus} requests found.
          </div>
        )}
      </div>

    </div>
  );
}