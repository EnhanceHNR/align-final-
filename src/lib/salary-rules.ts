import type { Employee, Attendance, Leave, Holiday, EmployeeConfigSnapshot, ShiftSegment } from "./types";
import {
  format,
  isWithinInterval,
  startOfDay,
  endOfDay,
  parse,
  eachDayOfInterval,
  isSameDay,
  differenceInMinutes,
  getDaysInMonth,
  subDays,
  addDays,
} from "date-fns";
import type { ConfigSegment } from "./config-snapshots";
import { calculateAttendanceStatus } from "./attendance-utils";

export interface DayBreakdown {
  date: string;
  status:
  | "Present"
  | "Late"
  | "Double Late"
  | "Absent"
  | "Weekend"
  | "Holiday"
  | "PaidLeave"
  | "UnpaidLeave";
  earnings: number;
  deductions: number;
  configSnapshotId?: string;
  baseSalaryUsed?: number;
  baseEarnings?: number;
  overtimeEarnings?: number;
  overpaidAmount?: number; // Amount earned beyond base for extra hours worked
  weekendHolidayEarnings?: number;
  unpaidLeaveDeduction?: number;
  absentDeduction?: number;
  multiPunchDeduction?: number;
  latePenalty?: number;
  isLate?: boolean;
  isDoubleLate?: boolean;
  hoursWorked?: number;
  overtimeHours?: number;
  expectedHours?: number;
  shiftTiming?: string;
  isConfigChange?: boolean;
  incompleteHours?: number;
  extraHours?: number;
}

export interface SalaryCalculationResult {
  monthlySalary: number;
  periodBaseSalary: number;
  finalSalary: number;
  paidLeaveAllowance: number;
  paidLeaveUsed: number;
  unpaidLeaveDeduction: number;
  absentDeduction: number;
  lateArrivalDeduction: number;
  multiPunchDeduction: number;
  incompleteHoursDeduction: number;
  overtimeCredit: number;
  extraHoursCredit: number;
  incompleteHours: number;
  extraHours: number;
  weekendHolidayCredit: number;
  summary: string;
  details: {
    paidLeaveDays: number;
    unpaidLeaveDays: number;
    absentDays: number;
    lateDays: number;
    doubleLateDays: number;
    overtimeHours: number;
    multiPunchHours: number; // Represents missing/incomplete hours
    weekendHolidayHours: number;
    workingDays: number;
    activeAdjustments: number;
    totalLeavesTaken: number;
    totalWorkedHours: number; // Actual sum of hours worked
  };
  warnings: {
    missingPunchOuts: string[];
  };
  dayByDayBreakdown: DayBreakdown[];
  appliedComponents: {
    description: string;
    amount: number;
    type: "increment" | "deduction";
    amountType: "percentage" | "fixed";
    scope: "base-adjustment" | "post-adjustment";
    canonicalCode?: string;
  }[];
  effectiveBase: number;
}

interface SalaryCalculationInput {
  employee: Employee;
  attendance: Attendance[];
  leaves: Leave[];
  holidays: Holiday[];
  startDate: Date;
  endDate: Date;
  configTimeline?: ConfigSegment[]; // Optional: pre-loaded config timeline for multi-config calculations
}

// Helper to get config values for a specific date from timeline
function getConfigForDate(
  date: string,
  configTimeline: ConfigSegment[] | undefined,
  employee: Employee
): {
  baseSalary: number;
  shiftSegments: ShiftSegment[];
  punchInBufferMinutes: number;
  lateThresholdMinutes: number;
  doubleLateThresholdMinutes: number;
  overtimeThresholdMinutes: number;
  snapshotId: string | undefined;
} {
  if (configTimeline && configTimeline.length > 0) {
    // Find the segment that contains this date
    for (const segment of configTimeline) {
      if (date >= segment.startDate && date <= segment.endDate) {
        return {
          baseSalary: segment.config.baseSalary,
          shiftSegments: segment.config.shiftSegments,
          punchInBufferMinutes: segment.config.punchInBufferMinutes,
          lateThresholdMinutes: segment.config.lateThresholdMinutes,
          doubleLateThresholdMinutes: segment.config.doubleLateThresholdMinutes,
          overtimeThresholdMinutes: segment.config.overtimeThresholdMinutes,
          snapshotId: segment.config.id,
        };
      }
    }
  }

  // Fallback to employee record
  return {
    baseSalary: employee.baseSalary || 0,
    shiftSegments: Array.isArray(employee.shift) ? employee.shift : [],
    punchInBufferMinutes: employee.bufferTime ?? 15,
    lateThresholdMinutes: 1,
    doubleLateThresholdMinutes: 30,
    overtimeThresholdMinutes: 30,
    snapshotId: undefined,
  };
}

// Helper to calculate shift hours from segments
function calculateShiftHours(shiftSegments: ShiftSegment[]): number {
  return shiftSegments.reduce((total, segment) => {
    try {
      const start = parse(segment.startTime, "HH:mm", new Date());
      const end = parse(segment.endTime, "HH:mm", new Date());
      const duration = differenceInMinutes(end, start);
      return total + (duration > 0 ? duration / 60 : 0);
    } catch (e) {
      return total;
    }
  }, 0);
}

// Helper to determine the status of any day (used for sandwich rule boundaries)
function getDayStatus(
  day: Date,
  employee: Employee,
  attendance: Attendance[],
  leaves: Leave[],
  holidays: Holiday[]
): "Weekend" | "Holiday" | "PaidLeave" | "UnpaidLeave" | "Present" | "Late" | "Double Late" | "Absent" {
  const dayStr = format(day, "yyyy-MM-dd");
  const dayName = format(day, "EEEE");
  const weeklyOffs = employee.weeklyOffs || [];

  if (weeklyOffs.includes(dayName)) return "Weekend";
  if (holidays.some((h) => h.date === dayStr)) return "Holiday";

  const dayLeave = leaves.find(
    (l) =>
      l.employeeId === employee.id &&
      l.status === "Approved" &&
      isWithinInterval(day, {
        start: parse(l.startDate, "yyyy-MM-dd", new Date()),
        end: parse(l.endDate, "yyyy-MM-dd", new Date()),
      })
  );
  if (dayLeave) {
    // Determine if it's paid or unpaid based on type naming (simplified)
    const isUnpaid = dayLeave.type.toLowerCase().includes("unpaid") || 
                    dayLeave.type.toLowerCase().includes("sick") || 
                    dayLeave.type.toLowerCase().includes("absent");
    return isUnpaid ? "UnpaidLeave" : "PaidLeave";
  }

  const dayAttendance = attendance.find(
    (a) => a.employeeId === employee.id && a.date === dayStr
  );
  if (dayAttendance) return dayAttendance.status as any;

  return "Absent";
}

export function calculateSalaryFromRules({
  employee,
  attendance,
  leaves,
  holidays,
  startDate,
  endDate,
  configTimeline,
}: SalaryCalculationInput): SalaryCalculationResult {
  // Use dates directly - they're already parsed from yyyy-MM-dd format representing business days
  // No need to apply startOfDay/endOfDay which would re-introduce timezone issues
  const periodInterval = {
    start: startDate,
    end: endDate,
  };

  const allDaysInPeriod = eachDayOfInterval(periodInterval);
  const weeklyOffs = employee.weeklyOffs || [];

  // Get paid leave allowance from salary component (not employee.paidLeave balance)
  // Look for active "Paid Leave Days" component within the calculation period
  const employeeComponents = employee.salaryComponents || [];
  const paidLeaveComponent = employeeComponents.find((comp) => {
    if ((comp as any).componentType !== 'paid-leave-encashment') return false;
    // Check if component is active in this period
    const compStart = parse(comp.startDate, "yyyy-MM-dd", new Date());
    const compEnd = comp.endDate ? parse(comp.endDate, "yyyy-MM-dd", new Date()) : new Date(2099, 11, 31);
    return (
      isWithinInterval(startDate, { start: compStart, end: compEnd }) ||
      isWithinInterval(endDate, { start: compStart, end: compEnd }) ||
      (startDate < compStart && endDate > compEnd) ||
      (compStart <= startDate && compEnd >= endDate)
    );
  });

  // Paid leave allowance tracking - use days from component, not employee.paidLeave balance
  const allowedPaidLeavesFromComponent = paidLeaveComponent ? (Number((paidLeaveComponent as any).days) || 0) : 0;
  const allowedPaidLeaves = allowedPaidLeavesFromComponent + (Number(employee.paidLeave) || 0) + (Number(employee.sickLeave) || 0);

  console.log(`[Salary Debug] Leave Allowance: total=${allowedPaidLeaves}, fromComponent=${allowedPaidLeavesFromComponent}, profilPaid=${employee.paidLeave}, profilSick=${employee.sickLeave}`);
  console.log(`[Salary Debug] Employee Object Keys:`, Object.keys(employee));
  const allowedSickLeaves = employee.sickLeave || 0;
  let totalLeavesTaken = 0; // Count all approved leaves taken
  let paidLeavesDaysUsed = 0; // Leaves covered by paid allowance

  console.log(`[Salary Debug] Leave Allowance: component=${allowedPaidLeavesFromComponent}, employee.paidLeave=${employee.paidLeave || 0}, employee.sickLeave=${employee.sickLeave || 0}, totalAllowed=${allowedPaidLeaves}`);
  if (paidLeaveComponent) {
    console.log(`[Salary Debug] Paid Leave Component Details: ${JSON.stringify(paidLeaveComponent)}`);
  }

  // For backward compatibility and summary display, use the first config or employee record
  const firstDayStr = format(allDaysInPeriod[0], "yyyy-MM-dd");
  const defaultConfig = getConfigForDate(firstDayStr, configTimeline, employee);
  const baseSalary = defaultConfig.baseSalary;

  let unpaidLeaveDays = 0;
  let absentDays = 0;
  let normalLateDays = 0;
  let doubleLateDays = 0;
  let doubleLateHoursTotal = 0; // Total hours late for 'Double Late' status
  let overtimeHours = 0;
  let multiPunchDeductionHours = 0;
  let weekendHolidayHours = 0;
  let finalTotalWorkedHours = 0; // Track actual worked hours for the period

  // Track components globally across the period we calculate
  let totalPeriodBaseSalary = 0; // Sum of daily salaries for the period
  let totalLateDeductionBase = 0; // Track daily salary amounts for late penalty calculation

  const dayByDayBreakdown: DayBreakdown[] = [];
  const warnings: string[] = [];

  allDaysInPeriod.forEach((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayName = format(day, "EEEE");

    // Get config for this specific day
    const dayConfig = getConfigForDate(dayStr, configTimeline, employee);
    const dayBaseSalary = dayConfig.baseSalary;
    const dayShiftSegments = dayConfig.shiftSegments;
    const dayShiftHours = calculateShiftHours(dayShiftSegments);
    const workingHoursPerDay = dayShiftHours > 0 ? dayShiftHours : 8;

    // Calculate daysInMonth for THIS specific day's month (fixes timezone issue)
    const daysInThisMonth = getDaysInMonth(day);

    // Debug: Log config for this day
    console.log(`[Salary Debug] ${dayStr}: Config - baseSalary=${dayBaseSalary}, shiftSegments=${JSON.stringify(dayShiftSegments)}, calculatedShiftHours=${dayShiftHours.toFixed(2)}, workingHoursPerDay=${workingHoursPerDay}, daysInMonth=${daysInThisMonth}`);

    // Calculate daily and hourly rates for this day using the correct month's days
    const dailySalary = dayBaseSalary / daysInThisMonth;
    const hourlySalary = dailySalary / workingHoursPerDay;

    // Track for aggregation
    totalPeriodBaseSalary += dailySalary;

    // Get shift start time for this day's config
    const shiftStartTime = dayShiftSegments.length > 0
      ? parse(dayShiftSegments[0].startTime, "HH:mm", new Date())
      : parse("09:00", "HH:mm", new Date());

    const isWeekend = weeklyOffs.includes(dayName);
    const isHoliday = holidays.some((h) =>
      isSameDay(parse(h.date, "yyyy-MM-dd", new Date()), day)
    );

    const dayLeave = leaves.find(
      (l) =>
        l.employeeId === employee.id &&
        l.status === "Approved" &&
        isWithinInterval(day, {
          start: parse(l.startDate, "yyyy-MM-dd", new Date()),
          end: parse(l.endDate, "yyyy-MM-dd", new Date()),
        })
    );

    const dayAttendance = attendance.find(
      (a) => a.employeeId === employee.id && a.date === dayStr
    );

    let status:
      | "Present"
      | "Late"
      | "Double Late"
      | "Absent"
      | "Weekend"
      | "Holiday"
      | "PaidLeave"
      | "UnpaidLeave" = "Absent";
    let earnings = 0;
    let deductions = 0;

    if (isWeekend) {
      status = "Weekend";
      // Check if employee worked on weekend - add overtime credit
      if (dayAttendance && dayAttendance.sessions && dayAttendance.sessions.length > 0) {
        let totalWorkedMinutes = 0;
        dayAttendance.sessions.forEach((session) => {
          if (session.clockIn && session.clockOut) {
            try {
              const clockInTime = new Date(session.clockIn.timestamp || session.clockIn.time);
              const clockOutTime = new Date(session.clockOut.timestamp || session.clockOut.time);
              const workedMinutes = differenceInMinutes(clockOutTime, clockInTime);
              if (workedMinutes > 0) {
                totalWorkedMinutes += workedMinutes;
              }
            } catch (e) {
              console.error("Error calculating weekend session time:", e);
            }
          }
        });
        const workedHours = totalWorkedMinutes / 60;
        weekendHolidayHours += workedHours;
        earnings = workedHours * hourlySalary;
        finalTotalWorkedHours += workedHours;
      }
    } else if (isHoliday) {
      status = "Holiday";
      // Check if employee worked on holiday - add overtime credit
      if (dayAttendance && dayAttendance.sessions && dayAttendance.sessions.length > 0) {
        let totalWorkedMinutes = 0;
        dayAttendance.sessions.forEach((session) => {
          if (session.clockIn && session.clockOut) {
            try {
              const clockInTime = new Date(session.clockIn.timestamp || session.clockIn.time);
              const clockOutTime = new Date(session.clockOut.timestamp || session.clockOut.time);
              const workedMinutes = differenceInMinutes(clockOutTime, clockInTime);
              if (workedMinutes > 0) {
                totalWorkedMinutes += workedMinutes;
              }
            } catch (e) {
              console.error("Error calculating holiday session time:", e);
            }
          }
        });
        const workedHours = totalWorkedMinutes / 60;
        weekendHolidayHours += workedHours;
        earnings = workedHours * hourlySalary;
        finalTotalWorkedHours += workedHours;
      }
    } else if (dayLeave && (!dayAttendance || !dayAttendance.sessions || dayAttendance.sessions.length === 0 || !dayAttendance.sessions.some(s => s.clockIn))) {
      // Count this leave day
      totalLeavesTaken++;

      // Respect leave types: Unpaid Leave is always unpaid. 
      // Other types (Paid, Casual, Sick) use the allowance pool.
      const isExplicitUnpaid = dayLeave.type?.toLowerCase().includes("unpaid");

      if (!isExplicitUnpaid && paidLeavesDaysUsed < allowedPaidLeaves) {
        // This leave is covered by paid allowance
        status = "PaidLeave";
        earnings = dailySalary; // Employee gets paid for this day
        paidLeavesDaysUsed++;
      } else {
        // Paid allowance exhausted or explicit unpaid leave
        status = "UnpaidLeave";
        unpaidLeaveDays++;
        deductions = dailySalary;
      }

      dayByDayBreakdown.push({
        date: dayStr,
        status,
        earnings,
        deductions,
        configSnapshotId: dayConfig.snapshotId,
        baseSalaryUsed: dayBaseSalary,
        expectedHours: workingHoursPerDay,
        overpaidAmount: 0,
        shiftTiming: '-',
        incompleteHours: 0,
        extraHours: 0,
      });
    } else if (dayAttendance) {
      status = dayAttendance.status;

      if (status === "Present" || status === "Late" || status === "Double Late") {
        let dayIncompleteHours = 0;
        let dayExtraHours = 0;
        let dayOvertimeHours = 0;

        if (dayAttendance.sessions && dayAttendance.sessions.length > 0) {
          let totalWorkedMinutes = 0;
          let firstClockInTime: Date | null = null;
          let lastClockOutTime: Date | null = null;
          let dayLateMinutes = 0;

          dayAttendance.sessions.forEach((session, sessionIdx) => {
            if (session.clockIn && session.clockOut) {
              try {
                const originalClockIn = new Date(session.clockIn.timestamp || session.clockIn.time);
                let clockInTime = new Date(session.clockIn.timestamp || session.clockIn.time);
                const clockOutTime = new Date(session.clockOut.timestamp || session.clockOut.time);

                // TIMEZONE FIX: Punch times are stored in UTC but shift times are local (IST = UTC+5:30)
                const IST_OFFSET_MINUTES = 330; 
                const attendanceDate = parse(dayStr, "yyyy-MM-dd", new Date());
                const dayShiftStart = new Date(Date.UTC(
                  attendanceDate.getFullYear(),
                  attendanceDate.getMonth(),
                  attendanceDate.getDate(),
                  shiftStartTime.getHours(),
                  shiftStartTime.getMinutes(),
                  0, 0
                ));
                dayShiftStart.setTime(dayShiftStart.getTime() - IST_OFFSET_MINUTES * 60 * 1000);

                // Early punch-in credit rule:
                // Credit the time only if employee is 15 minutes or more early.
                // Otherwise, snap to shift start to avoid tiny variances for regular arrivals.
                const earlyMinutes = differenceInMinutes(dayShiftStart, clockInTime);
                if (earlyMinutes > 0) {
                  if (earlyMinutes < 15) {
                    clockInTime = dayShiftStart;
                  }
                  // If >= 15 mins early, keep clockInTime as is (Full credit)
                }
                // No capping at 30 minutes anymore - if they are early and it's >15m, they get full credit.

                const workedMinutes = differenceInMinutes(clockOutTime, clockInTime);
                if (workedMinutes > 0) {
                  totalWorkedMinutes += workedMinutes;
                }

                if (!firstClockInTime || clockInTime < firstClockInTime) {
                  firstClockInTime = clockInTime;
                }
                if (!lastClockOutTime || clockOutTime > lastClockOutTime) {
                  lastClockOutTime = clockOutTime;
                }
              } catch (e) {
                console.error("Error calculating session time:", e);
              }
            } else if (session.clockIn && !session.clockOut) {
              warnings.push(dayStr);
            }
          });

          // Late Penalty Handling
          if (firstClockInTime && !dayAttendance.lateExcused) {
            const IST_OFFSET_MINUTES = 330;
            const attendanceDateForLate = parse(dayStr, "yyyy-MM-dd", new Date());
            const dayShiftStartForLate = new Date(Date.UTC(
              attendanceDateForLate.getFullYear(),
              attendanceDateForLate.getMonth(),
              attendanceDateForLate.getDate(),
              shiftStartTime.getHours(),
              shiftStartTime.getMinutes(),
              0, 0
            ));
            dayShiftStartForLate.setTime(dayShiftStartForLate.getTime() - IST_OFFSET_MINUTES * 60 * 1000);

            const lateDiffMs = (firstClockInTime as Date).getTime() - dayShiftStartForLate.getTime();
            dayLateMinutes = Math.max(0, Math.floor(lateDiffMs / (1000 * 60)));
            
            // Re-evaluate status dynamically for historical consistency
            const evaluatedStatus = calculateAttendanceStatus(
              firstClockInTime,
              dayShiftStartForLate,
              dayConfig.punchInBufferMinutes,
              dayConfig.doubleLateThresholdMinutes
            );

            if (evaluatedStatus === "Double Late") {
              doubleLateDays++;
              const lateHours = dayLateMinutes / 60;
              doubleLateHoursTotal += lateHours;
              if (dayLateMinutes > 120 && dayAttendance) {
                dayAttendance.isLateException = true;
                dayAttendance.lateMinutes = dayLateMinutes;
              }
              status = "Double Late"; // Ensure it's treated as Double Late in logic below
            } else if (evaluatedStatus === "Late") {
              normalLateDays++;
              status = "Late";
            }
          }

          const totalWorkedHours = totalWorkedMinutes / 60;
          finalTotalWorkedHours += totalWorkedHours;
          const expectedHours = workingHoursPerDay;

          if (totalWorkedHours < expectedHours) {
            let missingHours = expectedHours - totalWorkedHours;
            
            // USER RULE: if late is NOT excused, add a credit to working hours logic (subtract from missing)
            // because they are already being penalized by the tiered daily penalty (0.175/0.5 day).
            // The credit is capped at 1 hour AND at the actual late arrival time to avoid
            // incorrectly offsetting time missing due to early departures.
            if ((status === 'Late' || status === 'Double Late') && !dayAttendance.lateExcused) {
              const credit = Math.min(1.0, dayLateMinutes / 60);
              console.log(`[Salary Debug] ${dayStr}: Unexcused Late - applying ${credit.toFixed(2)}h credit to missing hours (capped at actual late time)`);
              missingHours = Math.max(0, missingHours - credit);
            }

            console.log(`[Salary Debug] ${dayStr}: UNDER expected - totalWorkedHours=${totalWorkedHours.toFixed(2)}, expectedHours=${expectedHours.toFixed(2)}, adjustedMissingHours=${missingHours.toFixed(2)}`);
            if (missingHours > 0) {
              dayIncompleteHours = missingHours;
              multiPunchDeductionHours += missingHours;
              deductions = missingHours * hourlySalary;
            }
          } else if (totalWorkedHours > expectedHours) {
            const excessHours = totalWorkedHours - expectedHours;
            console.log(`[Salary Debug] ${dayStr}: OVER expected - totalWorkedHours=${totalWorkedHours.toFixed(2)}, expectedHours=${expectedHours.toFixed(2)}, excessHours=${excessHours.toFixed(2)}`);
            const overtimeThresholdHours = dayConfig.overtimeThresholdMinutes / 60;
            if (excessHours > overtimeThresholdHours) {
              dayExtraHours = excessHours;
              dayOvertimeHours = excessHours;
              overtimeHours += dayOvertimeHours;
            }
          }
          earnings = dailySalary; // Base pay for the day
        }
        
        // Finalize credits for day-by-day
        const overtimeEarnings = dayOvertimeHours * hourlySalary;
        const overpaidAmount = overtimeEarnings;

        dayByDayBreakdown.push({
          date: dayStr,
          status,
          earnings,
          deductions,
          configSnapshotId: dayConfig.snapshotId,
          baseSalaryUsed: dayBaseSalary,
          expectedHours: workingHoursPerDay,
          overpaidAmount,
          shiftTiming: dayShiftSegments.length > 0 ? dayShiftSegments.map(s => `${s.startTime}-${s.endTime}`).join(', ') : '-',
          incompleteHours: dayIncompleteHours,
          extraHours: dayExtraHours,
        });
      } else if (status === "Absent") {
        absentDays++;
        deductions = 2 * dailySalary;
        dayByDayBreakdown.push({
          date: dayStr,
          status,
          earnings: 0,
          deductions,
          configSnapshotId: dayConfig.snapshotId,
          baseSalaryUsed: dayBaseSalary,
          expectedHours: workingHoursPerDay,
          overpaidAmount: 0,
          shiftTiming: '-',
          incompleteHours: 0,
          extraHours: 0,
        });
      } else if (status === "UnpaidLeave") {
        unpaidLeaveDays++;
        deductions = dailySalary;
        dayByDayBreakdown.push({
          date: dayStr,
          status,
          earnings: 0,
          deductions,
          configSnapshotId: dayConfig.snapshotId,
          baseSalaryUsed: dayBaseSalary,
          expectedHours: workingHoursPerDay,
          overpaidAmount: 0,
          shiftTiming: '-',
          incompleteHours: 0,
          extraHours: 0,
        });
      } else if (status === "PaidLeave") {
        totalLeavesTaken++;
        if (paidLeavesDaysUsed < allowedPaidLeaves) {
          earnings = dailySalary;
          paidLeavesDaysUsed++;
        } else {
          status = "UnpaidLeave";
          unpaidLeaveDays++;
          deductions = dailySalary;
        }
        dayByDayBreakdown.push({
          date: dayStr,
          status,
          earnings,
          deductions,
          configSnapshotId: dayConfig.snapshotId,
          baseSalaryUsed: dayBaseSalary,
          expectedHours: workingHoursPerDay,
          overpaidAmount: 0,
          shiftTiming: '-',
          incompleteHours: 0,
          extraHours: 0,
        });
      } else {
        // Fallback for any other unhandled status in attendance
        dayByDayBreakdown.push({
          date: dayStr,
          status: status as any,
          earnings: 0,
          deductions: 0,
          configSnapshotId: dayConfig.snapshotId,
          baseSalaryUsed: dayBaseSalary,
          expectedHours: workingHoursPerDay,
          overpaidAmount: 0,
          shiftTiming: '-',
          incompleteHours: 0,
          extraHours: 0,
        });
      }
    } else {
      // Not weekend, not holiday, not leave, no attendance = Absent
      status = "Absent";
      absentDays++;
      deductions = 2 * dailySalary;
      dayByDayBreakdown.push({
        date: dayStr,
        status,
        earnings: 0,
        deductions,
        configSnapshotId: dayConfig.snapshotId,
        baseSalaryUsed: dayBaseSalary,
        expectedHours: workingHoursPerDay,
        overpaidAmount: 0,
        shiftTiming: '-',
        incompleteHours: 0,
        extraHours: 0,
      });
    }

    // Add weekend/holiday days to breakdown if not already added (i.e. if they weren't attendance/leave)
    if ((isWeekend || isHoliday) && !dayByDayBreakdown.find(d => d.date === dayStr)) {
      dayByDayBreakdown.push({
        date: dayStr,
        status, // Weekend or Holiday
        earnings: earnings, // Potential earnings from weekend work calculated above
        deductions: 0,
        configSnapshotId: dayConfig.snapshotId,
        baseSalaryUsed: dayBaseSalary,
        expectedHours: workingHoursPerDay,
        overpaidAmount: isWeekend || isHoliday ? earnings : 0,
        shiftTiming: '-',
        incompleteHours: 0,
        extraHours: 0,
      });
    }
  });

  // Apply sandwich leave rule (Weekends or Holidays between leaves become leaves)
  const isLeaveStatus = (s: string) => ["PaidLeave", "UnpaidLeave", "Absent"].includes(s);

  for (let i = 0; i < dayByDayBreakdown.length; i++) {
    const currentDay = dayByDayBreakdown[i];
    if (currentDay.status === "Weekend" || currentDay.status === "Holiday") {
      const sandwichDayConfig = getConfigForDate(currentDay.date, configTimeline, employee);
      const sandwichDate = parse(currentDay.date, "yyyy-MM-dd", new Date());
      const sandwichDailySalary = sandwichDayConfig.baseSalary / getDaysInMonth(sandwichDate);

      // Find nearest non-weekend/non-holiday day before
      let dayBeforeStatus: string | null = null;
      for (let j = i - 1; j >= 0; j--) {
        if (dayByDayBreakdown[j].status !== "Weekend" && dayByDayBreakdown[j].status !== "Holiday") {
          dayBeforeStatus = dayByDayBreakdown[j].status;
          break;
        }
      }

      // Look back context if start of period
      if (!dayBeforeStatus) {
        let checkDate = subDays(sandwichDate, 1);
        for (let j = 0; j < 10; j++) { // Limit lookback
          const status = getDayStatus(checkDate, employee, attendance, leaves, holidays);
          if (status !== "Weekend" && status !== "Holiday") {
            dayBeforeStatus = status;
            break;
          }
          checkDate = subDays(checkDate, 1);
        }
      }

      // Find nearest non-weekend/non-holiday day after
      let dayAfterStatus: string | null = null;
      for (let j = i + 1; j < dayByDayBreakdown.length; j++) {
        if (dayByDayBreakdown[j].status !== "Weekend" && dayByDayBreakdown[j].status !== "Holiday") {
          dayAfterStatus = dayByDayBreakdown[j].status;
          break;
        }
      }

      // Look forward context if end of period
      if (!dayAfterStatus) {
        let checkDate = addDays(sandwichDate, 1);
        for (let j = 0; j < 10; j++) { // Limit lookforward
          const status = getDayStatus(checkDate, employee, attendance, leaves, holidays);
          if (status !== "Weekend" && status !== "Holiday") {
            dayAfterStatus = status;
            break;
          }
          checkDate = addDays(checkDate, 1);
        }
      }

      if (dayBeforeStatus && dayAfterStatus && isLeaveStatus(dayBeforeStatus) && isLeaveStatus(dayAfterStatus)) {
        // Determine the sandwich status based on priority: Absent > UnpaidLeave > PaidLeave
        let targetStatus: DayBreakdown['status'] = "PaidLeave";
        if (dayBeforeStatus === "Absent" || dayAfterStatus === "Absent") {
          targetStatus = "Absent";
        } else if (dayBeforeStatus === "UnpaidLeave" || dayAfterStatus === "UnpaidLeave") {
          targetStatus = "UnpaidLeave";
        }

        // Now handle allowance and deductions for the sandwich day
        totalLeavesTaken++;
        if (targetStatus === "Absent") {
          currentDay.status = "Absent";
          currentDay.deductions = 2 * sandwichDailySalary;
          absentDays++;
        } else if (targetStatus === "UnpaidLeave") {
          currentDay.status = "UnpaidLeave";
          currentDay.deductions = sandwichDailySalary;
          unpaidLeaveDays++;
        } else {
          // Candidate for PaidLeave - must check allowance
          if (paidLeavesDaysUsed < allowedPaidLeaves) {
            currentDay.status = "PaidLeave";
            currentDay.earnings = currentDay.earnings > 0 ? currentDay.earnings : sandwichDailySalary;
            paidLeavesDaysUsed++;
          } else {
            // Allowance exhausted, falls back to UnpaidLeave
            currentDay.status = "UnpaidLeave";
            currentDay.deductions = sandwichDailySalary;
            unpaidLeaveDays++;
          }
        }
      }
    }
  }


  // Calculate average daily salary for deductions and bonuses
  const avgDailySalary = totalPeriodBaseSalary / allDaysInPeriod.length;

  // Calculate late arrival deduction using average daily salary
  const totalLates = normalLateDays + (doubleLateDays * 2);
  let lateArrivalDeduction = 0;

  if (totalLates > 2) {
    lateArrivalDeduction = 0.5 * avgDailySalary;
    if (totalLates > 3) {
      const extraLates = totalLates - 3;
      lateArrivalDeduction += extraLates * 0.175 * avgDailySalary;
    }
  }

  // Use the sums from the daily breakdown for total consistency
  const multiPunchDeduction = dayByDayBreakdown.reduce((sum, day) => {
    if (['Present', 'Late', 'Double Late'].includes(day.status)) return sum + day.deductions;
    return sum;
  }, 0);

  const weekendHolidayCredit = dayByDayBreakdown.reduce((sum, day) => {
    if (day.status === 'Weekend' || day.status === 'Holiday') return sum + day.earnings;
    return sum;
  }, 0);

  const overtimeCredit = dayByDayBreakdown.reduce((sum, day) => {
    if (!['Weekend', 'Holiday'].includes(day.status)) return sum + (day.overpaidAmount || 0);
    return sum;
  }, 0);

  const totalDailyDeductions = dayByDayBreakdown.reduce((sum, day) => sum + day.deductions, 0);
  const totalUnpaidLeaveDeductionSum = dayByDayBreakdown.reduce((sum, day) => day.status === 'UnpaidLeave' ? sum + day.deductions : sum, 0);
  const totalAbsentDeductionSum = dayByDayBreakdown.reduce((sum, day) => day.status === 'Absent' ? sum + day.deductions : sum, 0);

  let finalSalary = totalPeriodBaseSalary;
  finalSalary += (overtimeCredit + weekendHolidayCredit);
  finalSalary -= totalDailyDeductions;
  finalSalary -= lateArrivalDeduction;

  // Paid Leave bonus - only for the specific encashment components (not for the whole profile balance)
  const bonusDaysFromComponents = (employee.salaryComponents || [])
    .filter(c => c.componentType === 'paid-leave-encashment')
    .reduce((sum, c) => sum + (Number(c.days) || 0), 0);
  
  const unusedBonusDays = Math.max(0, bonusDaysFromComponents - paidLeavesDaysUsed);
  const paidLeaveBonus = unusedBonusDays * avgDailySalary;
  finalSalary += paidLeaveBonus;

  console.log(`[Salary Debug] FINAL: base=${totalPeriodBaseSalary.toFixed(2)}, credit=${(overtimeCredit+weekendHolidayCredit).toFixed(2)}, deduct=${totalDailyDeductions.toFixed(2)}, late=${lateArrivalDeduction.toFixed(2)}, encashBonus=${paidLeaveBonus.toFixed(2)}, final=${finalSalary.toFixed(2)}`);

  // Track applied components for result
  const appliedComponents: SalaryCalculationResult['appliedComponents'] = [];
  
  // Base adjustments (already handled in daily calculations mostly, but we add them to the list for tracking)
  employeeComponents.forEach(comp => {
    const compStart = parse(comp.startDate, "yyyy-MM-dd", new Date());
    const compEnd = comp.endDate ? parse(comp.endDate, "yyyy-MM-dd", new Date()) : new Date(2099, 11, 31);
    const isActive = (compStart <= endDate && compEnd >= startDate);
    
    if (isActive && comp.scope === 'base-adjustment') {
      appliedComponents.push({
        description: comp.description,
        amount: comp.amount,
        type: comp.type,
        amountType: comp.amountType,
        scope: 'base-adjustment'
      });
    }
  });

  // Post-adjustments
  const postAdjustments = employeeComponents.filter(c => c.scope === 'post-adjustment');
  const primaryMonthDays = getDaysInMonth(startDate);

  postAdjustments.forEach((comp) => {
    if ((comp as any).componentType === 'paid-leave-encashment') return;
    const monthlyAmount = comp.amountType === "percentage" ? (comp.amount / 100) * totalPeriodBaseSalary : comp.amount;
    const proratedAmount = (monthlyAmount / primaryMonthDays) * allDaysInPeriod.length;

    if (comp.type === "increment") finalSalary += proratedAmount;
    else finalSalary -= proratedAmount;

    appliedComponents.push({
      description: comp.description,
      amount: proratedAmount,
      type: comp.type,
      amountType: comp.amountType,
      scope: 'post-adjustment'
    });
  });

  const summary = `Salary calculated for ${format(startDate, "MMM dd, yyyy")} to ${format(endDate, "MMM dd, yyyy")}. Base: ${baseSalary.toFixed(2)}, Final: ${finalSalary.toFixed(2)}`;

  return {
    monthlySalary: baseSalary,
    periodBaseSalary: totalPeriodBaseSalary,
    finalSalary,
    paidLeaveAllowance: paidLeaveBonus,
    paidLeaveUsed: paidLeavesDaysUsed * avgDailySalary,
    unpaidLeaveDeduction: totalUnpaidLeaveDeductionSum,
    absentDeduction: totalAbsentDeductionSum,
    lateArrivalDeduction,
    multiPunchDeduction,
    incompleteHoursDeduction: multiPunchDeduction,
    extraHoursCredit: overtimeCredit + weekendHolidayCredit,
    incompleteHours: multiPunchDeductionHours,
    extraHours: overtimeHours + weekendHolidayHours,
    overtimeCredit,
    weekendHolidayCredit,
    summary,
    details: {
      paidLeaveDays: allowedPaidLeaves,
      unpaidLeaveDays,
      absentDays,
      lateDays: normalLateDays,
      doubleLateDays,
      overtimeHours,
      multiPunchHours: multiPunchDeductionHours,
      weekendHolidayHours,
      workingDays: allDaysInPeriod.length,
      activeAdjustments: appliedComponents.length,
      totalLeavesTaken,
      totalWorkedHours: finalTotalWorkedHours,
    },
    warnings: {
      missingPunchOuts: warnings,
    },
    dayByDayBreakdown,
    appliedComponents,
    effectiveBase: totalPeriodBaseSalary,
  };
}
