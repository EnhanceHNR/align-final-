"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Download, TrendingUp, Activity, BarChart3, FlaskConical, Users, Receipt, Calendar, Maximize2 } from "lucide-react";
import Papa from "papaparse";
import { Submission } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AnalyticsClientPage({ submissions, labs }: { submissions: Submission[], labs: any[] }) {
  // Extract all unique services from labs
  const allServices = useMemo(() => {
    const services = new Set<string>();
    labs.forEach(lab => {
      if (lab.services && Array.isArray(lab.services)) {
        lab.services.forEach((s: any) => {
          if (s.name) services.add(s.name.trim());
        });
      }
    });
    return Array.from(services).sort();
  }, [labs]);

  // Extract all unique years from submissions
  const allYears = useMemo(() => {
    const years = new Set<string>();
    submissions.forEach(sub => {
      if (sub.createdAt) {
        years.add(new Date(sub.createdAt).getFullYear().toString());
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a)); // Descending
  }, [submissions]);

  // Extract all unique patients
  const allPatients = useMemo(() => {
      const patients = new Set<string>();
      submissions.forEach(sub => {
          if (sub.patientName) patients.add(sub.patientName.trim());
      });
      return Array.from(patients).sort();
  }, [submissions]);

  // Extract all unique labs from submissions
  const submissionLabs = useMemo(() => {
      const sLabs = new Set<string>();
      submissions.forEach(sub => {
          if (sub.labName) sLabs.add(sub.labName.trim());
      });
      return Array.from(sLabs).sort();
  }, [submissions]);

  const currentYear = new Date().getFullYear().toString();

  // State for Service Price Comparison
  const [selectedService, setSelectedService] = useState<string>(allServices[0] || "");

  // State for Order History Chart
  const [selectedYear, setSelectedYear] = useState<string>(allYears.includes(currentYear) ? currentYear : (allYears[0] || currentYear));
  const [orderHistoryPatient, setOrderHistoryPatient] = useState<string>("All");
  const [orderHistoryLab, setOrderHistoryLab] = useState<string>("All");

  // State for CSV Download
  const [exportYear, setExportYear] = useState<string>("All");
  const [exportMonthFrom, setExportMonthFrom] = useState<string>("All");
  const [exportMonthTo, setExportMonthTo] = useState<string>("All");
  const [exportService, setExportService] = useState<string>("All");
  const [exportPatient, setExportPatient] = useState<string>("All");
  const [exportLab, setExportLab] = useState<string>("All");

  const monthsList = [
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" }
  ];

  // Data for Service Price Comparison
  const priceComparisonData = useMemo(() => {
    if (!selectedService) return [];
    const data: any[] = [];
    labs.forEach(lab => {
      if (lab.services && Array.isArray(lab.services)) {
        const serviceMatch = lab.services.find((s: any) => s.name.trim().toLowerCase() === selectedService.toLowerCase());
        if (serviceMatch && serviceMatch.price) {
          data.push({
            name: lab.name,
            price: Number(serviceMatch.price)
          });
        }
      }
    });
    return data.sort((a, b) => a.price - b.price);
  }, [labs, selectedService]);

  // Data for Order History Chart
  const orderHistoryData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const data = months.map(m => ({ name: m, orders: 0 }));

    submissions.forEach(sub => {
      if (!sub.createdAt) return;
      const date = new Date(sub.createdAt);
      
      let match = true;
      if (date.getFullYear().toString() !== selectedYear) match = false;
      if (sub.type !== 'send') match = false;
      if (orderHistoryPatient !== "All" && sub.patientName !== orderHistoryPatient) match = false;
      if (orderHistoryLab !== "All" && sub.labName !== orderHistoryLab) match = false;

      if (match) {
        data[date.getMonth()].orders += 1;
      }
    });

    return data;
  }, [submissions, selectedYear, orderHistoryPatient, orderHistoryLab]);

  // Handle Export CSV
  const handleExportCSV = () => {
    let filtered = submissions;
    
    if (exportYear !== "All") {
        filtered = filtered.filter(s => s.createdAt && new Date(s.createdAt).getFullYear().toString() === exportYear);
    }
    
    if (exportMonthFrom !== "All" || exportMonthTo !== "All") {
        const fromMonth = exportMonthFrom !== "All" ? parseInt(exportMonthFrom) : 0;
        const toMonth = exportMonthTo !== "All" ? parseInt(exportMonthTo) : 11;
        
        filtered = filtered.filter(s => {
            if (!s.createdAt) return false;
            const month = new Date(s.createdAt).getMonth();
            return month >= fromMonth && month <= toMonth;
        });
    }

    if (exportService !== "All") {
        filtered = filtered.filter(s => s.item && s.item.toLowerCase() === exportService.toLowerCase());
    }
    if (exportPatient !== "All") {
        filtered = filtered.filter(s => s.patientName && s.patientName.toLowerCase() === exportPatient.toLowerCase());
    }
    if (exportLab !== "All") {
        filtered = filtered.filter(s => s.labName && s.labName.toLowerCase() === exportLab.toLowerCase());
    }

    const exportData = filtered.map(s => ({
        Type: s.type === 'send' ? 'Sent' : 'Received',
        Date: s.createdAt ? new Date(s.createdAt).toLocaleString() : 'N/A',
        Patient: s.patientName,
        Lab: s.labName,
        Service: s.item,
        'Bill Amount': s.documents && s.documents.length > 0 ? s.documents.filter((d: any) => d.type === 'Bill').reduce((acc: number, d: any) => acc + (Number(d.amount) || 0), 0) || '' : (s.hasBill && s.billAmount ? s.billAmount : ''),
        'Payment Status': s.paymentStatus || '',
        'Receiver/Delivery': s.receiverName || s.deliveryPerson || ''
    }));

    if (exportData.length === 0) {
        alert("No records found for the selected filters.");
        return;
    }

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `LabTrack_Order_History_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6'];

  const renderPriceChart = () => (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={priceComparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.2} />
            <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 }}
                angle={-45}
                textAnchor="end"
                height={60}
            />
            <YAxis 
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `₹${value}`}
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 }}
            />
            <RechartsTooltip 
                cursor={{ fill: 'hsl(var(--primary)/0.05)' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)', fontWeight: 'bold' }}
                formatter={(value: number) => [`₹${value}`, 'Price']}
            />
            <Bar dataKey="price" radius={[6, 6, 0, 0]}>
                {priceComparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
            </Bar>
        </BarChart>
    </ResponsiveContainer>
  );

  const renderOrderChart = () => (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={orderHistoryData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.2} />
            <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 }}
            />
            <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 }}
                allowDecimals={false}
            />
            <RechartsTooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)', fontWeight: 'bold' }}
                formatter={(value: number) => [value, 'Orders Sent']}
            />
            <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={4} dot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }} activeDot={{ r: 8 }} />
        </LineChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl">
                <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            Analytics Hub
          </h1>
          <p className="text-muted-foreground font-medium mt-2">Insights, pricing comparisons, and data exports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Price Comparison Chart */}
        <Card className="glass-card border-none shadow-xl flex flex-col h-[600px]">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <CardTitle className="flex items-center gap-2 text-xl font-black">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        Price Comparison
                    </CardTitle>
                    <CardDescription className="font-medium">Compare lab prices for a specific service.</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {allServices.length > 0 && (
                        <Select value={selectedService} onValueChange={setSelectedService}>
                            <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-xl bg-background/50 border-none font-bold">
                                <SelectValue placeholder="Select Service" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                {allServices.map(s => (
                                    <SelectItem key={s} value={s} className="rounded-xl font-medium">{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl shrink-0">
                                <Maximize2 className="w-5 h-5 text-muted-foreground" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[90vw] w-full h-[90vh] glass-card border-none p-6">
                            <DialogHeader>
                                <DialogTitle className="text-2xl flex items-center gap-2">
                                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                                    Price Comparison: {selectedService}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="flex-1 w-full h-full min-h-0 pt-4">
                                {allServices.length === 0 || priceComparisonData.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-muted-foreground font-medium">No pricing data available.</div>
                                ) : renderPriceChart()}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pt-0">
            {allServices.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground font-medium">No services found in Labs.</div>
            ) : priceComparisonData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground font-medium">No pricing data available for this service.</div>
            ) : renderPriceChart()}
          </CardContent>
        </Card>

        {/* Order History Line Chart */}
        <Card className="glass-card border-none shadow-xl flex flex-col h-[600px]">
          <CardHeader>
             <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <CardTitle className="flex items-center gap-2 text-xl font-black">
                        <Activity className="w-5 h-5 text-blue-500" />
                        Order History
                    </CardTitle>
                    <CardDescription className="font-medium">Monthly submission volume.</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <div className="flex gap-2 w-full">
                        {allYears.length > 0 && (
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="w-full sm:w-[100px] h-10 rounded-xl bg-background/50 border-none font-bold">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                    {allYears.map(y => (
                                        <SelectItem key={y} value={y} className="rounded-xl font-medium">{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl shrink-0">
                                    <Maximize2 className="w-5 h-5 text-muted-foreground" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[90vw] w-full h-[90vh] glass-card border-none p-6">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl flex items-center gap-2">
                                        <Activity className="w-6 h-6 text-blue-500" />
                                        Order History ({selectedYear})
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="flex-1 w-full h-full min-h-0 pt-4">
                                    {allYears.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-muted-foreground font-medium">No order history available.</div>
                                    ) : renderOrderChart()}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2 mt-4 flex-wrap">
                 <Select value={orderHistoryPatient} onValueChange={setOrderHistoryPatient}>
                    <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs rounded-lg bg-background/50 border-none font-bold">
                        <SelectValue placeholder="Patient" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                        <SelectItem value="All" className="rounded-xl font-bold text-primary">All Patients</SelectItem>
                        {allPatients.map(p => <SelectItem key={p} value={p} className="rounded-xl font-medium">{p}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={orderHistoryLab} onValueChange={setOrderHistoryLab}>
                    <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs rounded-lg bg-background/50 border-none font-bold">
                        <SelectValue placeholder="Lab" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                        <SelectItem value="All" className="rounded-xl font-bold text-primary">All Labs</SelectItem>
                        {submissionLabs.map(l => <SelectItem key={l} value={l} className="rounded-xl font-medium">{l}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pt-0">
             {allYears.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-muted-foreground font-medium">No order history available.</div>
             ) : renderOrderChart()}
          </CardContent>
        </Card>
      </div>

      {/* Advanced Export Section */}
      <Card className="glass-card border-none shadow-xl">
        <CardHeader className="bg-primary/5 pb-6">
            <CardTitle className="flex items-center gap-2 text-2xl font-black">
                <Download className="w-6 h-6 text-primary" />
                Data Export
            </CardTitle>
            <CardDescription className="text-base font-medium">Filter your order history and download a detailed CSV report.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Year
                    </label>
                    <Select value={exportYear} onValueChange={setExportYear}>
                        <SelectTrigger className="h-10 rounded-xl bg-background/50 border-none font-bold">
                            <SelectValue placeholder="All Years" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                            <SelectItem value="All" className="rounded-xl font-bold text-primary">All Years</SelectItem>
                            {allYears.map(y => <SelectItem key={y} value={y} className="rounded-xl font-medium">{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Month From
                    </label>
                    <Select value={exportMonthFrom} onValueChange={setExportMonthFrom}>
                        <SelectTrigger className="h-10 rounded-xl bg-background/50 border-none font-bold">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                            <SelectItem value="All" className="rounded-xl font-bold text-primary">All</SelectItem>
                            {monthsList.map(m => <SelectItem key={m.value} value={m.value} className="rounded-xl font-medium">{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Month To
                    </label>
                    <Select value={exportMonthTo} onValueChange={setExportMonthTo}>
                        <SelectTrigger className="h-10 rounded-xl bg-background/50 border-none font-bold">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                            <SelectItem value="All" className="rounded-xl font-bold text-primary">All</SelectItem>
                            {monthsList.map(m => <SelectItem key={m.value} value={m.value} className="rounded-xl font-medium">{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <FlaskConical className="w-4 h-4" /> Service / Item
                    </label>
                    <Select value={exportService} onValueChange={setExportService}>
                        <SelectTrigger className="h-10 rounded-xl bg-background/50 border-none font-bold">
                            <SelectValue placeholder="All Services" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                            <SelectItem value="All" className="rounded-xl font-bold text-primary">All Services</SelectItem>
                            {allServices.map(s => <SelectItem key={s} value={s} className="rounded-xl font-medium">{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Users className="w-4 h-4" /> Patient
                    </label>
                    <Select value={exportPatient} onValueChange={setExportPatient}>
                        <SelectTrigger className="h-10 rounded-xl bg-background/50 border-none font-bold">
                            <SelectValue placeholder="All Patients" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl max-h-[300px]">
                            <SelectItem value="All" className="rounded-xl font-bold text-primary">All Patients</SelectItem>
                            {allPatients.map(p => <SelectItem key={p} value={p} className="rounded-xl font-medium">{p}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Receipt className="w-4 h-4" /> Lab / Partner
                    </label>
                    <Select value={exportLab} onValueChange={setExportLab}>
                        <SelectTrigger className="h-10 rounded-xl bg-background/50 border-none font-bold">
                            <SelectValue placeholder="All Labs" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl max-h-[300px]">
                            <SelectItem value="All" className="rounded-xl font-bold text-primary">All Labs</SelectItem>
                            {submissionLabs.map(l => <SelectItem key={l} value={l} className="rounded-xl font-medium">{l}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Button 
                onClick={handleExportCSV} 
                className="w-full md:w-auto h-14 px-8 rounded-2xl font-black shadow-lg shadow-primary/20 gap-3 mt-4 text-lg hover:scale-105 transition-transform"
            >
                <Download className="w-5 h-5" />
                Download CSV Report
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
