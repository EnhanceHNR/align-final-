'use client';

import { useState, useContext } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bot, CalendarIcon, Loader2, Plus, Trash2, Send, Download } from 'lucide-react';
import type { Employee, Attendance, Leave, ManualAdjustment } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { exportToCSV } from '@/lib/csv-export';
import { toast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableFooter,
  TableHeader,
  TableHead,
} from '@/components/ui/table';
import {
  calculateSalaryFromRules,
  type SalaryCalculationResult,
} from '@/lib/salary-rules';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { type DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, parse, isWithinInterval } from 'date-fns';
import { AppContext } from '@/context/app-context';
import { Separator } from '@/components/ui/separator';
import type { SalaryComponent } from '@/lib/types';

interface SalaryCalculatorProps {
  employee: Employee;
  attendance: Attendance[];
  leaves: Leave[];
}

export default function SalaryCalculator({
  employee,
  attendance,
  leaves,
}: SalaryCalculatorProps) {
  const [result, setResult] = useState<SalaryCalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingPayroll, setIsSavingPayroll] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { holidays, addPayroll, currentUser } = useContext(AppContext);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [manualAdjustments, setManualAdjustments] = useState<ManualAdjustment[]>([]);
  const [newAdjustment, setNewAdjustment] = useState({
    type: 'deduction' as 'deduction' | 'increment',
    reason: '',
    amount: '',
  });

  const handleCalculate = async () => {
    if (!employee.baseSalary || !dateRange?.from || !dateRange?.to) {
      return;
    }

    setValidationError(null);

    const attendanceInRange = attendance.filter(record => {
      const recordDate = parse(record.date, 'yyyy-MM-dd', new Date());
      return isWithinInterval(recordDate, { start: dateRange.from!, end: dateRange.to! });
    });

    const incompletePunchOuts = attendanceInRange.filter(record => {
      const workedStatuses = ['Present', 'Late', 'Double Late'];
      if (workedStatuses.includes(record.status) && record.sessions && record.sessions.length > 0) {
        return record.sessions.some(session => session.clockIn && !session.clockOut);
      }
      return false;
    });

    if (incompletePunchOuts.length > 0) {
      const dates = incompletePunchOuts.map(r => format(parse(r.date, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy')).join(', ');
      setValidationError(`Cannot calculate salary. The following dates have incomplete punch outs: ${dates}. Please ensure all attendance records are complete before processing payroll.`);
      return;
    }

    setIsLoading(true);
    setResult(null);
    setManualAdjustments([]);

    try {
      const response = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          startDate: format(dateRange.from!, 'yyyy-MM-dd'),
          endDate: format(dateRange.to!, 'yyyy-MM-dd'),
          attendance,
          leaves,
          holidays,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to calculate salary');
      }

      const calculatedResult = await response.json();
      setResult(calculatedResult);
    } catch (error) {
      console.error('Salary calculation error:', error);
      setValidationError(error instanceof Error ? error.message : 'Failed to calculate salary');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAdjustment = () => {
    if (!newAdjustment.reason || !newAdjustment.amount) return;

    const adjustment: ManualAdjustment = {
      id: Date.now().toString(),
      type: newAdjustment.type,
      reason: newAdjustment.reason,
      amount: parseFloat(newAdjustment.amount),
    };

    setManualAdjustments([...manualAdjustments, adjustment]);
    setNewAdjustment({ type: 'deduction', reason: '', amount: '' });
  };

  const handleRemoveAdjustment = (id: string) => {
    setManualAdjustments(manualAdjustments.filter(adj => adj.id !== id));
  };

  const handleAddToPayroll = async () => {
    if (!result || !dateRange?.from || !dateRange?.to) return;

    setIsSavingPayroll(true);

    const netPay = finalNetPay;

    const allowances = result.appliedComponents?.filter(c => c.scope === 'post-adjustment' && c.type === 'increment') || [];
    const deductions = result.appliedComponents?.filter(c => c.scope === 'post-adjustment' && c.type === 'deduction') || [];

    const payroll = {
      employeeId: employee.id,
      employeeName: employee.name,
      period: format(dateRange.from, 'MMMM yyyy'),
      startDate: format(dateRange.from, 'yyyy-MM-dd'),
      endDate: format(dateRange.to, 'yyyy-MM-dd'),
      breakdown: {
        basePay: result.effectiveBase,
        hra: allowances.find(c => c.canonicalCode === 'HRA')?.amount || 0,
        da: allowances.find(c => c.canonicalCode === 'DA')?.amount || 0,
        specialAllowance: allowances.find(c => c.canonicalCode === 'SPECIAL_ALLOWANCE')?.amount || 0,
        grossSalary: result.effectiveBase + allowances.reduce((sum, a) => sum + a.amount, 0),
        pf: deductions.find(c => c.canonicalCode === 'PF')?.amount || 0,
        professionalTax: deductions.find(c => c.canonicalCode === 'PROFESSIONAL_TAX')?.amount || 0,
        tds: deductions.find(c => c.canonicalCode === 'TDS')?.amount || 0,
        unpaidLeaveDeduction: result.unpaidLeaveDeduction,
        absentDeduction: result.absentDeduction,
        lateArrivalDeduction: result.lateArrivalDeduction,
        multiPunchDeduction: result.multiPunchDeduction,
        incompleteHoursDeduction: result.incompleteHoursDeduction,
        extraHoursCredit: result.extraHoursCredit,
        incompleteHours: result.incompleteHours,
        extraHours: result.extraHours,
        overtimeCredit: result.overtimeCredit,
        manualAdjustments,
        netPay,
      },
      status: 'Processed' as const,
      timestamp: new Date().toISOString(),
    };

    await addPayroll(payroll);
    setIsSavingPayroll(false);
  };

  const calculateTDS = (annualIncome: number): number => {
    if (annualIncome <= 250000) return 0;
    if (annualIncome <= 500000) return (annualIncome - 250000) * 0.05;
    if (annualIncome <= 1000000) return 12500 + (annualIncome - 500000) * 0.20;
    return 112500 + (annualIncome - 1000000) * 0.30;
  };

  const handleDownloadBreakdown = () => {
    if (!result || !dateRange?.from || !dateRange?.to) return;

    const csvData: { Component: string; Type: string; 'Amount (₹)': string }[] = [];

    csvData.push({
      Component: 'Base Pay',
      Type: 'Base',
      'Amount (₹)': (result.periodBaseSalary || employee.baseSalary || 0).toFixed(2),
    });

    result.appliedComponents?.filter(c => c.scope === 'base-adjustment').forEach(comp => {
      csvData.push({
        Component: comp.description,
        Type: comp.type === 'increment' ? 'Increment' : 'Deduction',
        'Amount (₹)': comp.amount.toFixed(2),
      });
    });

    if (result.appliedComponents?.filter(c => c.scope === 'base-adjustment').length > 0) {
      csvData.push({
        Component: 'Effective Base Salary',
        Type: 'Base',
        'Amount (₹)': result.effectiveBase.toFixed(2),
      });
    }

    result.appliedComponents?.filter(c => c.scope === 'post-adjustment').forEach(comp => {
      csvData.push({
        Component: comp.description,
        Type: comp.type === 'increment' ? 'Increment' : 'Deduction',
        'Amount (₹)': comp.amount.toFixed(2),
      });
    });

    // Paid Leave Allowance (unused paid leaves become bonus)
    const unusedPaidLeaves = (result.details.paidLeaveDays || 0) - (result.details.totalLeavesTaken || 0);
    const paidLeaveBonus = unusedPaidLeaves > 0 ? (result.paidLeaveAllowance || 0) - (result.paidLeaveUsed || 0) : 0;
    csvData.push({
      Component: `Paid Leave Allowance (${result.details.paidLeaveDays || 0} days allowed, ${result.details.totalLeavesTaken || 0} taken)`,
      Type: 'Increment',
      'Amount (₹)': paidLeaveBonus > 0 ? paidLeaveBonus.toFixed(2) : '0.00',
    });

    csvData.push({
      Component: 'Unpaid Leave Deduction',
      Type: 'Deduction',
      'Amount (₹)': result.unpaidLeaveDeduction.toFixed(2),
    });

    csvData.push({
      Component: 'Absent Deduction (2x Penalty)',
      Type: 'Deduction',
      'Amount (₹)': result.absentDeduction.toFixed(2),
    });

    csvData.push({
      Component: 'Late Arrival Deduction',
      Type: 'Deduction',
      'Amount (₹)': result.lateArrivalDeduction.toFixed(2),
    });

    csvData.push({
      Component: 'Incomplete Hours Deduction',
      Type: 'Deduction',
      'Amount (₹)': result.multiPunchDeduction.toFixed(2),
    });

    csvData.push({
      Component: 'Overtime Credit',
      Type: 'Increment',
      'Amount (₹)': result.overtimeCredit.toFixed(2),
    });

    csvData.push({
      Component: 'Weekend/Holiday Pay',
      Type: 'Increment',
      'Amount (₹)': result.weekendHolidayCredit.toFixed(2),
    });

    manualAdjustments.forEach(adj => {
      csvData.push({
        Component: adj.reason,
        Type: adj.type === 'deduction' ? 'Deduction' : 'Increment',
        'Amount (₹)': adj.amount.toFixed(2),
      });
    });

    csvData.push({
      Component: 'Net Payable Salary',
      Type: 'Net',
      'Amount (₹)': finalNetPay.toFixed(2),
    });

    const month = format(dateRange.from, 'MMMM');
    const year = format(dateRange.from, 'yyyy');
    const employeeName = employee.name.replace(/\s+/g, '_');
    const filename = `${employeeName}_salary_breakdown_${month}_${year}.csv`;

    try {
      exportToCSV({ data: csvData, filename });
      toast({
        title: 'Success',
        description: 'Salary breakdown downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download salary breakdown',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadDailyBreakdown = () => {
    if (!result || !result.dayByDayBreakdown || !dateRange?.from || !dateRange?.to) return;

    const csvData = result.dayByDayBreakdown.map(day => {
      const dayDate = parse(day.date, 'yyyy-MM-dd', new Date());
      const attendanceRecord = attendance.find(a => a.date === day.date);
      
      let punchIn = '-';
      let punchOut = '-';
      let hoursWorked = '-';
      let remarks = '';

      if (attendanceRecord?.sessions && attendanceRecord.sessions.length > 0) {
        const firstSession = attendanceRecord.sessions[0];
        const lastSession = attendanceRecord.sessions[attendanceRecord.sessions.length - 1];
        
        if (firstSession.clockIn) {
          punchIn = format(new Date(firstSession.clockIn.timestamp || firstSession.clockIn.time), 'HH:mm');
        }
        
        if (lastSession.clockOut) {
          punchOut = format(new Date(lastSession.clockOut.timestamp || lastSession.clockOut.time), 'HH:mm');
        }

        hoursWorked = day.status === 'Present' || day.status === 'Late' || day.status === 'Double Late' 
          ? formatHHMM((day.expectedHours || 0) + (day.extraHours || 0) - (day.incompleteHours || 0))
          : day.extraHours && day.extraHours > 0 ? formatHHMM(day.extraHours) : '00:00h';
      }

      return {
        Date: format(dayDate, 'MMM dd, yyyy'),
        'Day of Week': format(dayDate, 'EEEE'),
        Status: day.status,
        'Punch In': punchIn,
        'Punch Out': punchOut,
        'Expected Hours': day.expectedHours ? formatHHMM(day.expectedHours) : '-',
        'Worked Hours': hoursWorked,
        'Incomplete Hrs': day.incompleteHours && day.incompleteHours > 0 ? formatHHMM(day.incompleteHours) : '-',
        'Extra Hrs': day.extraHours && day.extraHours > 0 ? formatHHMM(day.extraHours) : '-',
        'Base Salary (₹)': day.baseSalaryUsed ? day.baseSalaryUsed.toLocaleString() : '-',
        'Earnings (₹)': day.earnings > 0 ? day.earnings.toFixed(2) : '0.00',
        'Overtime Paid (₹)': day.overpaidAmount && day.overpaidAmount > 0 ? day.overpaidAmount.toFixed(2) : '0.00',
        'Deductions (₹)': day.deductions > 0 ? day.deductions.toFixed(2) : '0.00',
        'Config Changed': day.isConfigChange ? 'YES' : '',
        Remarks: remarks,
      };
    });

    const month = format(dateRange.from, 'MMMM');
    const year = format(dateRange.from, 'yyyy');
    const employeeName = employee.name.replace(/\s+/g, '_');
    const filename = `${employeeName}_daily_breakdown_${month}_${year}.csv`;

    try {
      exportToCSV({ data: csvData, filename });
      toast({
        title: 'Success',
        description: 'Daily breakdown downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download daily breakdown',
        variant: 'destructive',
      });
    }
  };

  if (!employee.baseSalary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Salary Calculation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Salary information is not available for this employee.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatHHMM = (decimalHours: number) => {
    if (isNaN(decimalHours)) return '00:00h';
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}h`;
  };

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '₹0.00';
    }
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
    });
  };

  const basePay = employee.baseSalary || 0;
  const totalPostIncrements = result?.appliedComponents?.filter(c => c.type === 'increment').reduce((sum, c) => sum + c.amount, 0) || 0;
  const totalPostDeductions = result?.appliedComponents?.filter(c => c.type === 'deduction').reduce((sum, c) => sum + c.amount, 0) || 0;

  const totalManualDeductions = manualAdjustments
    .filter(adj => adj.type === 'deduction')
    .reduce((sum, adj) => sum + adj.amount, 0);

  const totalManualIncrements = manualAdjustments
    .filter(adj => adj.type === 'increment')
    .reduce((sum, adj) => sum + adj.amount, 0);

  const finalNetPay = result ? 
    result.finalSalary - totalManualDeductions + totalManualIncrements : 0;

  const isAdmin = currentUser?.employeeType === 'Super Admin' || currentUser?.employeeType === 'Admin';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary Calculation</CardTitle>
        <CardDescription>
          Calculate salary based on a selected date range with detailed breakdown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Payroll Period</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={'outline'}
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !dateRange && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'LLL dd, y')} -{' '}
                      {format(dateRange.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(dateRange.from, 'LLL dd, y')
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button
          onClick={handleCalculate}
          disabled={isLoading || !dateRange?.from || !dateRange?.to}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Bot className="mr-2" />
          )}
          Calculate Salary
        </Button>

        {validationError && (
          <Alert variant="destructive">
            <AlertTitle>Validation Error</AlertTitle>
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <AlertTitle className="mb-0">Salary Breakdown</AlertTitle>
              <Button
                onClick={handleDownloadBreakdown}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Breakdown
              </Button>
            </div>
            <AlertDescription>
              <div className="space-y-4 mt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="font-semibold bg-muted/50">
                      <TableCell colSpan={2}>Base Salary (Period Total)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>Base Pay</span>
                          {result.periodBaseSalary !== employee.baseSalary && (
                            <span className="text-xs text-muted-foreground">
                              Based on config(s) during this period
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(result.periodBaseSalary || employee.baseSalary || 0)}
                      </TableCell>
                    </TableRow>

                    {result.appliedComponents?.filter(c => c.scope === 'base-adjustment').length > 0 && (
                      <>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={2} className="font-semibold">Base Adjustments</TableCell>
                        </TableRow>
                        {result.appliedComponents.filter(c => c.scope === 'base-adjustment').map((comp, index) => (
                          <TableRow key={`base-${index}`}>
                            <TableCell>
                              {comp.description}
                              <span className="text-xs text-muted-foreground ml-2">
                                ({comp.amountType === 'percentage' ? '%' : '₹'})
                              </span>
                            </TableCell>
                            <TableCell className={`text-right ${comp.type === 'increment' ? 'text-green-600' : 'text-destructive'}`}>
                              {comp.type === 'increment' ? '+' : '-'}{formatCurrency(comp.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell className="font-medium">Effective Base Salary</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(result.effectiveBase)}</TableCell>
                        </TableRow>
                      </>
                    )}

                    {result.appliedComponents?.filter(c => c.scope === 'post-adjustment').length > 0 && (
                      <>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={2} className="font-semibold">Post-Adjustment Components (Allowances & Deductions)</TableCell>
                        </TableRow>
                        {result.appliedComponents.filter(c => c.scope === 'post-adjustment').map((comp, index) => (
                          <TableRow key={`post-${index}`}>
                            <TableCell>
                              {comp.description}
                              <span className="text-xs text-muted-foreground ml-2">
                                ({comp.amountType === 'percentage' ? '%' : '₹'})
                              </span>
                            </TableCell>
                            <TableCell className={`text-right ${comp.type === 'increment' ? 'text-green-600' : 'text-destructive'}`}>
                              {comp.type === 'increment' ? '+' : '-'}{formatCurrency(comp.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}

                    <TableRow className="font-semibold bg-muted/50">
                      <TableCell colSpan={2}>Attendance-Based Adjustments</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/10">
                      <TableCell>
                        <div className='flex flex-col'>
                          <span className="font-medium">Paid Leave Balance</span>
                          <span className="text-xs text-muted-foreground">
                            {result.details.paidLeaveDays || 0} day(s) allowed, {result.details.totalLeavesTaken || 0} leave(s) taken
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        +{formatCurrency(result.paidLeaveAllowance)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className='flex flex-col'>
                          <span>Unpaid Leave Deduction</span>
                          <span className="text-xs text-muted-foreground">{result.details.unpaidLeaveDays} day(s) beyond paid allowance</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        -{formatCurrency(result.unpaidLeaveDeduction)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className='flex flex-col'>
                          <span>Absent Deduction (2x Penalty)</span>
                          <span className="text-xs text-muted-foreground">{result.details.absentDays} day(s)</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-destructive font-bold">
                        -{formatCurrency(result.absentDeduction)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className='flex flex-col'>
                          <span>Late Arrival Deduction</span>
                          <span className="text-xs text-muted-foreground">
                            {result.details.lateDays} normal late(s) + {result.details.doubleLateDays} double late(s) = {result.details.lateDays + (result.details.doubleLateDays * 2)} total late(s)
                          </span>
                          {(result.details.lateDays + result.details.doubleLateDays * 2) > 0 && (
                            <span className="text-xs text-muted-foreground mt-1">
                              First 2 free, 3rd @ 0.5×day, 4th+ @ 0.175×day
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        -{formatCurrency(result.lateArrivalDeduction)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className='flex flex-col'>
                          <span>Incomplete Hours Deduction</span>
                          <span className="text-xs text-muted-foreground">{formatHHMM(result.details.multiPunchHours || 0)} short</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        -{formatCurrency(result.multiPunchDeduction)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className='flex flex-col'>
                          <span>Overtime Credit</span>
                          <span className="text-xs text-muted-foreground">{formatHHMM(result.details.overtimeHours)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        +{formatCurrency(result.overtimeCredit)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className='flex flex-col'>
                          <span>Weekend/Holiday Pay</span>
                          <span className="text-xs text-muted-foreground">{formatHHMM(result.details.weekendHolidayHours)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        +{formatCurrency(result.weekendHolidayCredit)}
                      </TableCell>
                    </TableRow>

                    {manualAdjustments.length > 0 && (
                      <>
                        <TableRow className="font-semibold bg-muted/50">
                          <TableCell colSpan={2}>Manual Adjustments</TableCell>
                        </TableRow>
                        {manualAdjustments.map(adj => (
                          <TableRow key={adj.id}>
                            <TableCell>
                              <div className='flex flex-col'>
                                <span>{adj.reason}</span>
                                <span className="text-xs text-muted-foreground">
                                  {adj.type === 'deduction' ? 'Deduction' : 'Increment/Bonus'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className={cn(
                              "text-right",
                              adj.type === 'deduction' ? "text-destructive" : "text-green-600"
                            )}>
                              {adj.type === 'deduction' ? '-' : '+'}{formatCurrency(adj.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-primary/10">
                      <TableCell className="font-bold text-lg">
                        Net Payable Salary
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary text-xl">
                        {formatCurrency(finalNetPay)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {result && result.dayByDayBreakdown && result.dayByDayBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-lg">Day-by-Day Salary Breakdown</CardTitle>
                  <CardDescription>
                    Detailed earnings and deductions for each day in the selected period
                  </CardDescription>
                </div>
                <Button
                  onClick={handleDownloadDailyBreakdown}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Daily Breakdown
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Punch In</TableHead>
                      <TableHead>Punch Out</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Worked</TableHead>
                      <TableHead className="text-right">Incomplete</TableHead>
                      <TableHead className="text-right">Extra</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">Earnings</TableHead>
                      <TableHead className="text-right">Overtime Paid</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.dayByDayBreakdown.map((day) => {
                      const net = day.earnings - day.deductions;
                      const attendanceRecord = attendance.find(a => a.date === day.date);
                      let punchIn = '-';
                      let punchOut = '-';
                      let hoursWorked = '-';
                      
                      if (attendanceRecord?.sessions && attendanceRecord.sessions.length > 0) {
                        const firstSession = attendanceRecord.sessions[0];
                        const lastSession = attendanceRecord.sessions[attendanceRecord.sessions.length - 1];
                        
                        if (firstSession.clockIn) {
                          punchIn = format(new Date(firstSession.clockIn.timestamp || firstSession.clockIn.time), 'HH:mm');
                        }
                        
                        if (lastSession.clockOut) {
                          punchOut = format(new Date(lastSession.clockOut.timestamp || lastSession.clockOut.time), 'HH:mm');
                        }
                        
                        hoursWorked = day.status === 'Present' || day.status === 'Late' || day.status === 'Double Late' 
                          ? formatHHMM((day.expectedHours || 0) + (day.extraHours || 0) - (day.incompleteHours || 0))
                          : day.extraHours && day.extraHours > 0 ? formatHHMM(day.extraHours) : '00:00h';
                      }
                      
                      return (
                        <TableRow key={day.date} className={day.isConfigChange ? "bg-blue-50 border-l-4 border-l-blue-500" : ""}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{format(parse(day.date, 'yyyy-MM-dd', new Date()), 'MMM dd')}</span>
                              {day.isConfigChange && (
                                <span className="text-xs text-blue-600 font-semibold">Config Changed</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              day.status === 'Present' && "bg-green-100 text-green-800",
                              day.status === 'Late' && "bg-yellow-100 text-yellow-800",
                              day.status === 'Double Late' && "bg-orange-100 text-orange-800",
                              day.status === 'Absent' && "bg-red-100 text-red-800",
                              day.status === 'Weekend' && "bg-gray-100 text-gray-800",
                              day.status === 'Holiday' && "bg-blue-100 text-blue-800",
                              day.status === 'PaidLeave' && "bg-indigo-100 text-indigo-800",
                              day.status === 'UnpaidLeave' && "bg-purple-100 text-purple-800"
                            )}>
                              {day.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {punchIn}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {punchOut}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {day.expectedHours ? formatHHMM(day.expectedHours) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {hoursWorked}
                          </TableCell>
                          <TableCell className="text-right text-xs text-destructive">
                            {day.incompleteHours && day.incompleteHours > 0 ? formatHHMM(day.incompleteHours) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-xs text-green-600">
                            {day.extraHours && day.extraHours > 0 ? formatHHMM(day.extraHours) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {day.baseSalaryUsed ? `₹${day.baseSalaryUsed.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {day.earnings > 0 ? formatCurrency(day.earnings) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-blue-600">
                            {day.overpaidAmount && day.overpaidAmount > 0 ? formatCurrency(day.overpaidAmount) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            {day.deductions > 0 ? `-${formatCurrency(day.deductions)}` : '-'}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-medium",
                            net > 0 && "text-green-600",
                            net < 0 && "text-destructive"
                          )}>
                            {net !== 0 ? formatCurrency(Math.abs(net)) : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {result && isAdmin && (
          <>
            <Separator className="my-6" />
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Manual Adjustments</CardTitle>
                <CardDescription>
                  Add additional deductions or increments/bonuses to this salary calculation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adj-type">Type</Label>
                    <select
                      id="adj-type"
                      value={newAdjustment.type}
                      onChange={(e) => setNewAdjustment({ ...newAdjustment, type: e.target.value as 'deduction' | 'increment' })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="deduction">Deduction</option>
                      <option value="increment">Increment/Bonus</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="adj-reason">Reason</Label>
                    <Input
                      id="adj-reason"
                      placeholder="Enter reason..."
                      value={newAdjustment.reason}
                      onChange={(e) => setNewAdjustment({ ...newAdjustment, reason: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adj-amount">Amount (₹)</Label>
                    <Input
                      id="adj-amount"
                      type="number"
                      placeholder="0.00"
                      value={newAdjustment.amount}
                      onChange={(e) => setNewAdjustment({ ...newAdjustment, amount: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddAdjustment}
                  disabled={!newAdjustment.reason || !newAdjustment.amount}
                  className="w-full"
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Adjustment
                </Button>

                {manualAdjustments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Added Adjustments</h4>
                    {manualAdjustments.map(adj => (
                      <div key={adj.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex-1">
                          <p className="font-medium">{adj.reason}</p>
                          <p className="text-sm text-muted-foreground">
                            {adj.type === 'deduction' ? 'Deduction' : 'Increment/Bonus'}: {formatCurrency(adj.amount)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAdjustment(adj.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={handleAddToPayroll}
              disabled={isSavingPayroll}
              className="w-full"
              size="lg"
            >
              {isSavingPayroll ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Add To Payroll of this Month
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
