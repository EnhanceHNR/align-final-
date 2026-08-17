"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2, ArrowLeft, Mail, Phone, Building, Briefcase, Clock, User, Download, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { useParams, useRouter } from "next/navigation";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns";

export default function EmployeeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;
  
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: employee, isLoading } = api.employee.getEmployeeDetails.useQuery(
    { employeeProfileId: employeeId },
    { enabled: !!employeeId }
  );

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
              <Button variant="secondary" className="w-full justify-start text-muted-foreground font-normal">
                <FileText className="mr-2 h-4 w-4" /> View National ID
              </Button>
              <Button variant="secondary" className="w-full justify-start text-muted-foreground font-normal">
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
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${employee.baseSalary.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground mt-1">Base Monthly Salary</p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="attendance" className="w-full">
            <TabsList className="w-full justify-start rounded-md bg-white border border-slate-200 p-1 mb-6">
              <TabsTrigger value="attendance" className="flex-1 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none">Attendance History</TabsTrigger>
              <TabsTrigger value="config" className="flex-1 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none">Configuration History</TabsTrigger>
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
                      // Logic to mock the screenshot's color coded attendance
                      const dayOfMonth = day.getDate();
                      let bgColor = "bg-transparent hover:bg-slate-100";
                      let textColor = "text-slate-700";
                      
                      // Example mocking to match screenshot colors (yellow for leave, red for absent, brown for late)
                      if (dayOfMonth >= 27 && dayOfMonth <= 31) {
                         bgColor = dayOfMonth === 27 ? "bg-amber-100" : dayOfMonth === 31 ? "bg-red-200" : "bg-red-200";
                         textColor = dayOfMonth === 27 ? "text-amber-700" : "text-red-700";
                      }
                      if (dayOfMonth >= 3 && dayOfMonth <= 8) {
                         bgColor = dayOfMonth === 8 ? "bg-amber-100" : "bg-red-200";
                         textColor = dayOfMonth === 8 ? "text-amber-700" : "text-red-700";
                      }
                      if (dayOfMonth >= 10 && dayOfMonth <= 15) {
                         bgColor = dayOfMonth === 12 ? "bg-amber-700" : "bg-amber-100";
                         textColor = dayOfMonth === 12 ? "text-white" : "text-amber-700";
                      }
                      if (dayOfMonth >= 16 && dayOfMonth <= 18) {
                         bgColor = "bg-amber-100";
                         textColor = "text-amber-700";
                      }

                      return (
                        <div key={day.toISOString()} className="flex justify-center items-center">
                          <div className={`h-8 w-8 flex items-center justify-center rounded-sm text-sm cursor-pointer ${bgColor} ${textColor} ${isToday(day) ? 'ring-2 ring-slate-400' : ''}`}>
                            {dayOfMonth}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </div>
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
    </div>
  );
}
