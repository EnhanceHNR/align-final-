"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2, ArrowLeft, Mail, Phone, Building, Briefcase, Clock, User, Download, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Calendar } from "~/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { useParams, useRouter } from "next/navigation";
import { EditEmployeeForm } from "./EditEmployeeForm";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns";

export default function EmployeeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;
  
  const utils = api.useUtils();
  const { data: employee, isLoading } = api.employee.getEmployeeDetails.useQuery(
    { employeeProfileId: employeeId },
    { enabled: !!employeeId }
  );
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState("attendance");
  const [selectedDocument, setSelectedDocument] = useState<{title: string, url: string} | null>(null);

  // --- REAL DATA CALCULATIONS ---
  const currentMonthAttendances = employee?.attendances?.filter(a => isSameMonth(new Date(a.date), currentMonth)) || [];
  const daysPresent = currentMonthAttendances.filter(a => ["Present", "Late", "Double Late", "PaidLeave"].includes(a.status)).length;
  const daysAbsent = currentMonthAttendances.filter(a => ["Absent", "UnpaidLeave"].includes(a.status)).length;
  
  const dailyRate = (employee?.baseSalary || 0) / 30;
  const estimatedPayout = Math.max(0, (employee?.baseSalary || 0) - (dailyRate * daysAbsent));
  const absentPenalty = dailyRate * daysAbsent;

  
  // Custom Calendar Modal State
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState("Present");
  const [punchInTime, setPunchInTime] = useState("09:00 AM");
  const [punchOutTime, setPunchOutTime] = useState("05:00 PM");
  const [attendanceNotes, setAttendanceNotes] = useState("");

  const upsertAttendanceMutation = api.attendance.upsertAttendance.useMutation({
    onSuccess: () => {
      toast({ title: "Attendance updated successfully." });
      refetch();
      setIsAttendanceModalOpen(false);
    },
    onError: (error) => toast({ title: "Update failed", description: error.message, variant: "destructive" })
  });

  const handleSaveAttendance = () => {
    if (!selectedDate || !employee) return;
    upsertAttendanceMutation.mutate({
      employeeProfileId: employee.id,
      date: selectedDate.toISOString(),
      status: attendanceStatus,
      punchInTime,
      punchOutTime,
      notes: attendanceNotes,
    });
  };



  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editSalary, setEditSalary] = useState("0");

  const updateProfile = api.employee.upsertProfile.useMutation({
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      utils.employee.getEmployeeDetails.invalidate();
      setIsEditOpen(false);
    }
  });

  const handleEditOpen = () => {
    if (employee) {
      setEditName(employee.name || "");
      setEditDepartment(employee.department || "");
      setEditSalary(employee.baseSalary?.toString() || "0");
      setIsEditOpen(true);
    }
  };

  const handleSaveEdit = (data: any) => {
    updateProfile.mutate({
      userId: employee!.userId,
      name: editName,
      department: editDepartment,
      baseSalary: parseFloat(editSalary) || 0,
    });
  };


  if (isLoading) {
    return <div className="flex h-full items-center justify-center p-8"><Loader2 className="animate-spin text-muted-foreground h-8 w-8" /></div>;
  }

  if (!employee) {
    return <div className="p-8 text-center text-muted-foreground">Employee not found.</div>;
  }

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 h-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-transparent min-h-screen">
      <Button variant="ghost" onClick={() => router.back()} className="w-fit mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Employees
      </Button>

      {/* Header Profile Section */}
      <div className="flex items-center gap-6 pb-6">
        <Avatar className="h-24 w-24 border-4 border-white shadow-sm">
          <AvatarImage src={employee.avatarUrl || ""} alt={employee.name} />
          <AvatarFallback className="text-2xl">{employee.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{employee.name}</h1>
          
          <p className="text-lg text-muted-foreground">{employee.employeeType}</p>
          <div className="mt-2">
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleEditOpen}>Edit Profile & Salary</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Employee Details</DialogTitle>
                </DialogHeader>
                <EditEmployeeForm employee={employee} onSave={handleSaveEdit} isPending={updateProfile.isPending} />
              </DialogContent>
            </Dialog>
          </div>

        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-0 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4" /> <span>{employee.user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="h-4 w-4" /> <span>{employee.phoneNumber || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Building className="h-4 w-4" /> <span>{employee.department || "Human Resources"}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Briefcase className="h-4 w-4" /> <span>{employee.employeeType}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Clock className="h-4 w-4" /> <span>Shift: {employee.shifts?.[0] ? `${employee.shifts[0].startTime} - ${employee.shifts[0].endTime}` : "9:00 AM - 5:00 PM"}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <User className="h-4 w-4" /> <span>Manager: {employee.manager || "Unassigned"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="secondary" 
                className="w-full justify-start text-muted-foreground font-normal"
                onClick={() => {
                  const doc = employee?.documents?.find((d: any) => d.title.toLowerCase().includes('national id'));
                  if (doc) setSelectedDocument({ title: 'National ID', url: doc.fileUrl });
                  else alert("National ID not uploaded yet.");
                }}
              >
                <FileText className="mr-2 h-4 w-4" /> View National ID
              </Button>
              <Button 
                variant="secondary" 
                className="w-full justify-start text-muted-foreground font-normal"
                onClick={() => {
                  const doc = employee?.documents?.find((d: any) => d.title.toLowerCase().includes('acceptance'));
                  if (doc) setSelectedDocument({ title: 'Signed Acceptance', url: doc.fileUrl });
                  else alert("Signed Acceptance not uploaded yet.");
                }}
              >
                <FileText className="mr-2 h-4 w-4" /> View Signed Acceptance
              </Button>
              
              <div className="pt-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Generate Documents</p>
                <div className="flex gap-2">
                  <select className="flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option>English</option>
                  </select>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

                    <Card className="shadow-sm border-0 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Salary Calculation</CardTitle>
              <CardDescription>Calculate salary based on a selected date range with detailed breakdown.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Select Payroll Period</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-slate-50 border shadow-sm h-10">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      {format(startOfMonth(currentMonth), "MMM dd, yyyy")} - {format(endOfMonth(currentMonth), "MMM dd, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={currentMonth}
                      onSelect={(date) => date && setCurrentMonth(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                onClick={() => {
                  setActiveTab("salary");
                  toast({ title: "Salary calculated for " + format(currentMonth, "MMMM yyyy") });
                }}
              >
                <FileText className="mr-2 h-4 w-4" /> Calculate Salary
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Admin Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full justify-start text-muted-foreground font-normal bg-slate-100 hover:bg-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg> Change Password
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-md bg-white border border-slate-200 p-1 mb-6">
              <TabsTrigger value="attendance" className="flex-1 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none">Attendance History</TabsTrigger>
              <TabsTrigger value="salary" className="flex-1 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none">Salary Configuration</TabsTrigger>
              <TabsTrigger value="config" className="flex-1 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none">History & Config</TabsTrigger>
            </TabsList>

            <TabsContent value="attendance" className="space-y-6 m-0">
              <h2 className="text-2xl font-semibold">Attendance History</h2>
              
              <Card className="shadow-sm border-0 bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">Download Attendance Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                      <label className="text-sm font-medium text-slate-700">From Date</label>
                      <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Jul 17, 2026
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                      <label className="text-sm font-medium text-slate-700">To Date</label>
                      <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Aug 16, 2026
                      </div>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700 h-10 shadow-sm px-6">
                      <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                  </div>
                  <Button variant="outline" className="mt-4 shadow-sm">
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                </CardContent>
              </Card>

              {/* Custom Attendance Calendar */}
              <div className="flex justify-center pt-4">
                <Card className="w-full max-w-sm shadow-sm border-0 bg-white pb-6">
                  <div className="flex items-center justify-between p-4">
                    <Button variant="ghost" size="icon" onClick={handlePrevMonth}><ChevronLeft className="h-5 w-5" /></Button>
                    <h3 className="font-semibold text-lg">{format(currentMonth, 'MMMM yyyy')}</h3>
                    <Button variant="ghost" size="icon" onClick={handleNextMonth}><ChevronRight className="h-5 w-5" /></Button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 px-6 text-center mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                      <div key={day} className="text-xs font-medium text-muted-foreground">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2 px-6">
                    {/* Fill empty spaces before start of month */}
                    {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-8 w-8"></div>
                    ))}
                    {daysInMonth.map(day => {
                      // Real attendance logic
                      let bgColor = "bg-transparent hover:bg-slate-100";
                      let textColor = "text-slate-700";
                      
                      const attendanceRecord = currentMonthAttendances.find(a => isSameDay(new Date(a.date), day));
                      
                      if (attendanceRecord) {
                          if (attendanceRecord.status === "Present") {
                             bgColor = "bg-emerald-100";
                             textColor = "text-emerald-700";
                          } else if (attendanceRecord.status === "Absent") {
                             bgColor = "bg-red-200";
                             textColor = "text-red-700";
                          } else if (attendanceRecord.status === "Late" || attendanceRecord.status === "Double Late") {
                             bgColor = "bg-amber-700";
                             textColor = "text-white";
                          } else if (attendanceRecord.status.includes("Leave")) {
                             bgColor = "bg-amber-100";
                             textColor = "text-amber-700";
                          } else if (attendanceRecord.status === "Holiday" || attendanceRecord.status === "Weekend") {
                             bgColor = "bg-slate-100";
                             textColor = "text-slate-400";
                          }
                      }
                      const dayOfMonth = day.getDate();

                      return (
                        <div key={day.toISOString()} className="flex justify-center items-center">
                          <div 
                             onClick={() => {
                               setSelectedDate(day);
                               setAttendanceStatus(attendanceRecord ? attendanceRecord.status : "Present");
                               setPunchInTime(attendanceRecord?.punchInTime || "09:00 AM");
                               setPunchOutTime(attendanceRecord?.punchOutTime || "05:00 PM");
                               setAttendanceNotes(attendanceRecord?.notes || "");
                               setIsAttendanceModalOpen(true);
                             }}
                             className={`h-8 w-8 flex items-center justify-center rounded-sm text-sm cursor-pointer hover:ring-2 hover:ring-slate-300 transition-all ${bgColor} ${textColor} ${isToday(day) ? 'ring-2 ring-slate-400' : ''}`}>
                            {dayOfMonth}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </div>
            </TabsContent>

                        <TabsContent value="salary" className="m-0 space-y-6">
              <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-semibold">Salary Configuration</h2>
                 <Button onClick={handleEditOpen}>Update Base Salary</Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="shadow-sm border-0 bg-white">
                    <CardHeader>
                       <CardTitle>Earnings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="flex justify-between items-center p-3 border rounded-lg bg-slate-50">
                          <div>
                             <p className="font-medium">Base Salary</p>
                             <p className="text-sm text-muted-foreground">Fixed monthly</p>
                          </div>
                          <div className="font-bold">${(employee.baseSalary || 0).toFixed(2)}</div>
                       </div>
                       <div className="flex justify-between items-center p-3 border rounded-lg bg-slate-50 opacity-60">
                          <div>
                             <p className="font-medium">House Rent Allowance (HRA)</p>
                             <p className="text-sm text-muted-foreground">Dynamic module coming soon</p>
                          </div>
                          <div className="font-bold">$0.00</div>
                       </div>
                    </CardContent>
                 </Card>

                 <Card className="shadow-sm border-0 bg-white">
                    <CardHeader>
                       <CardTitle>Deductions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="flex justify-between items-center p-3 border rounded-lg bg-slate-50">
                          <div>
                             <p className="font-medium">Absenteeism Penalty</p>
                             <p className="text-sm text-muted-foreground">Calculated from calendar</p>
                          </div>
                          <div className="font-bold text-destructive">-${absentPenalty.toFixed(2)}</div>
                       </div>
                       <div className="flex justify-between items-center p-3 border rounded-lg bg-slate-50 opacity-60">
                          <div>
                             <p className="font-medium">Taxes (Provident Fund)</p>
                             <p className="text-sm text-muted-foreground">Dynamic module coming soon</p>
                          </div>
                          <div className="font-bold text-destructive">-$0.00</div>
                       </div>
                    </CardContent>
                 </Card>
              </div>

              <Card className="shadow-sm border-0 bg-white bg-blue-50/50">
                <CardContent className="p-6 flex justify-between items-center">
                   <div>
                      <h3 className="text-lg font-bold">Estimated Net Salary</h3>
                      <p className="text-sm text-muted-foreground">For the current billing cycle</p>
                   </div>
                   <div className="text-3xl font-bold text-emerald-600">
                      ${estimatedPayout.toFixed(2)}
                   </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="config" className="m-0">
              <Card className="shadow-sm border-0 bg-white">
                <CardHeader>
                  <CardTitle>Configuration History</CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
                  No configuration changes recorded.
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
{/* DOCUMENT VIEWER DIALOG */}
      <Dialog open={!!selectedDocument} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
            <DialogTitle>{selectedDocument?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-slate-100 rounded-md overflow-hidden relative">
            {selectedDocument?.url ? (
              <iframe 
                src={selectedDocument.url} 
                className="w-full h-full border-0"
                title={selectedDocument.title}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Document not found or invalid URL
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4 gap-2">
            <Button variant="outline" onClick={() => setSelectedDocument(null)}>Close</Button>
            {selectedDocument?.url && (
              <Button asChild>
                <a href={selectedDocument.url} target="_blank" rel="noreferrer" download>
                  Download
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    
      {/* Attendance Override Dialog */}
      <Dialog open={isAttendanceModalOpen} onOpenChange={setIsAttendanceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Attendance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input disabled value={selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={attendanceStatus} onValueChange={setAttendanceStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="Half Day">Half Day</SelectItem>
                  <SelectItem value="Late">Late</SelectItem>
                  <SelectItem value="Weekend">Weekend</SelectItem>
                  <SelectItem value="Holiday">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Punch In</Label>
                <Input value={punchInTime} onChange={e => setPunchInTime(e.target.value)} placeholder="09:00 AM" />
              </div>
              <div className="space-y-2">
                <Label>Punch Out</Label>
                <Input value={punchOutTime} onChange={e => setPunchOutTime(e.target.value)} placeholder="05:00 PM" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Admin Notes</Label>
              <Input value={attendanceNotes} onChange={e => setAttendanceNotes(e.target.value)} placeholder="e.g. Approved leave" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveAttendance} disabled={upsertAttendanceMutation.isPending}>Save Attendance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
</div>
  );
}
