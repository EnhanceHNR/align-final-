'use client';

// A tRPC-backed adapter that reproduces the subset of the reference app's
// AppContext consumed by the ported attendance components
// (attendance-tracker.tsx, employee-attendance-calendar.tsx, and their
// dialogs: clock-in-out, manual-attendance, missed-punch, edit-attendance,
// admin-attendance-override, multi-session-manager, attendance-detail).
//
// The reference app reads/writes Firestore directly from the client; Dental
// goes through tRPC + Firebase Admin instead, so this provider fetches data
// via the existing (and newly added) `attendance` / `employee` / `hr`
// routers and exposes it under the same field names the components expect,
// so those components can be rendered completely unmodified.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { api } from '~/trpc/react';
import { useToast } from '@/hooks/use-toast';
import type { Employee, ClockEvent } from '@/lib/types';

type EntryType = 'clock-in' | 'clock-out' | 'complete-session' | 'absent' | 'paid-leave' | 'unpaid-leave';

type AppContextValue = {
  currentUser: Employee | null;
  employees: Employee[];
  attendance: any[];
  leaves: any[];
  holidays: any[];
  isClockedIn: boolean;
  lastCapture: { photo: string; time: string; status: 'In' | 'Out' } | null;
  isResigned: boolean;
  loading: boolean;
  handleClockIn: (capture: ClockEvent) => Promise<void>;
  handleClockOut: (capture: ClockEvent) => Promise<void>;
  handleManualEntry: (employeeId: string, type: EntryType, time: string, date?: Date, capture?: ClockEvent) => Promise<void>;
  handleUpdateAttendance: (
    attendanceId: string,
    sessionIndex: number,
    punchInTime: string,
    punchOutTime: string | null,
    lateExcused?: boolean,
    lateExcusedReason?: string,
    remarks?: string
  ) => Promise<void>;
  addSession: (
    attendanceId: string,
    punchInTime: string,
    punchOutTime: string | null,
    punchInPhoto?: string,
    punchOutPhoto?: string,
    remarks?: string
  ) => Promise<void>;
  updateSession: (
    attendanceId: string,
    sessionIndex: number,
    punchInTime: string,
    punchOutTime: string | null,
    lateExcused?: boolean,
    lateExcusedReason?: string,
    remarks?: string
  ) => Promise<void>;
  deleteSession: (attendanceId: string, sessionIndex: number) => Promise<void>;
  addMissedPunchRequest: (req: {
    date: string;
    punchType: 'In' | 'Out' | 'Both';
    punchInTime?: string;
    punchOutTime?: string;
    photoUrl: string;
    photoUrlOut?: string;
    reason: string;
  }) => Promise<void>;
};

const defaultValue: AppContextValue = {
  currentUser: null,
  employees: [],
  attendance: [],
  leaves: [],
  holidays: [],
  isClockedIn: false,
  lastCapture: null,
  isResigned: false,
  loading: true,
  handleClockIn: async () => {},
  handleClockOut: async () => {},
  handleManualEntry: async () => {},
  handleUpdateAttendance: async () => {},
  addSession: async () => {},
  updateSession: async () => {},
  deleteSession: async () => {},
  addMissedPunchRequest: async () => {},
};

export const AppContext = createContext<AppContextValue>(defaultValue);

export function AppProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const utils = api.useUtils();

  const profileQuery = api.employee.getProfile.useQuery({}, { enabled: !!session?.user });
  const employeesQuery = api.employee.getAllEmployees.useQuery(undefined, { enabled: !!session?.user });
  const attendanceQuery = api.attendance.getAllForOrg.useQuery(undefined, { enabled: !!session?.user });
  const leavesQuery = api.hr.getLeaves.useQuery({}, { enabled: !!session?.user });
  const holidaysQuery = api.hr.getHolidays.useQuery(undefined, { enabled: !!session?.user });

  const invalidateAll = () => {
    utils.attendance.getAllForOrg.invalidate();
    utils.hr.getLeaves.invalidate();
  };

  const clockInMutation = api.attendance.clockIn.useMutation({ onSuccess: invalidateAll });
  const clockOutMutation = api.attendance.clockOutForToday.useMutation({ onSuccess: invalidateAll });
  const manualEntryMutation = api.attendance.manualEntry.useMutation({ onSuccess: invalidateAll });
  const updateSessionMutation = api.attendance.updateSession.useMutation({ onSuccess: invalidateAll });
  const addSessionMutation = api.attendance.addSession.useMutation({ onSuccess: invalidateAll });
  const deleteSessionMutation = api.attendance.deleteSession.useMutation({ onSuccess: invalidateAll });
  const addMissedPunchMutation = api.attendance.addMissedPunchRequest.useMutation();

  const currentUser: Employee | null = useMemo(() => {
    const profile: any = profileQuery.data;
    if (!profile) return null;
    return {
      id: profile.id,
      name: profile.name,
      email: session?.user?.email || '',
      role: profile.jobTitle || profile.employeeType,
      department: profile.department,
      manager: profile.manager,
      employeeType: profile.employeeType || 'Employee',
      shift: (profile.shifts || []).map((s: any) => ({ startTime: s.startTime, endTime: s.endTime })),
      bufferTime: profile.bufferTime ?? 0,
      weeklyOffs: profile.weeklyOffs || [],
      doubleLateThresholdMinutes: profile.doubleLateThresholdMinutes ?? 30,
      status: 'Active',
    };
  }, [profileQuery.data, session?.user?.email]);

  const employees: Employee[] = useMemo(() => {
    const list: any[] = employeesQuery.data || [];
    return list.map((profile: any) => ({
      id: profile.id,
      name: profile.name,
      email: profile.user?.email || '',
      role: profile.jobTitle || profile.employeeType,
      department: profile.department,
      manager: profile.manager,
      employeeType: profile.employeeType || 'Employee',
      shift: (profile.shifts || []).map((s: any) => ({ startTime: s.startTime, endTime: s.endTime })),
      bufferTime: profile.bufferTime ?? 0,
      weeklyOffs: profile.weeklyOffs || [],
      doubleLateThresholdMinutes: profile.doubleLateThresholdMinutes ?? 30,
      status: 'Active',
    }));
  }, [employeesQuery.data]);

  const attendance: any[] = attendanceQuery.data || [];

  const leaves: any[] = useMemo(() => {
    const list: any[] = leavesQuery.data || [];
    return list.map((l: any) => ({
      ...l,
      employeeId: l.employeeProfileId,
      startDate: typeof l.startDate === 'string' ? l.startDate.slice(0, 10) : l.startDate,
      endDate: typeof l.endDate === 'string' ? l.endDate.slice(0, 10) : l.endDate,
    }));
  }, [leavesQuery.data]);

  const holidays: any[] = useMemo(() => {
    const list: any[] = holidaysQuery.data || [];
    return list.map((h: any) => ({
      ...h,
      date: typeof h.date === 'string' ? h.date.slice(0, 10) : h.date,
    }));
  }, [holidaysQuery.data]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { isClockedIn, lastCapture } = useMemo(() => {
    if (!currentUser) return { isClockedIn: false, lastCapture: null as AppContextValue['lastCapture'] };
    const record = attendance.find((a) => a.employeeId === currentUser.id && a.date === todayStr);
    const sessions = record?.sessions || [];
    if (sessions.length === 0) return { isClockedIn: false, lastCapture: null as AppContextValue['lastCapture'] };
    const last = sessions[sessions.length - 1];
    if (last.clockOut) {
      return { isClockedIn: false, lastCapture: { photo: last.clockOut.photo, time: last.clockOut.time, status: 'Out' as const } };
    }
    return { isClockedIn: true, lastCapture: { photo: last.clockIn.photo, time: last.clockIn.time, status: 'In' as const } };
  }, [attendance, currentUser, todayStr]);

  const handleClockIn = async (capture: ClockEvent) => {
    if (!currentUser) return;
    try {
      await clockInMutation.mutateAsync({
        employeeProfileId: currentUser.id,
        photo: capture.photo ?? undefined,
        lat: capture.location?.latitude,
        lng: capture.location?.longitude,
        remarks: capture.remarks,
      });
      toast({ title: 'Punch In Successful!', description: `You have been clocked in at ${capture.time}` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Punch In Failed', description: error?.message || 'Please try again.' });
    }
  };

  const handleClockOut = async (capture: ClockEvent) => {
    if (!currentUser) return;
    try {
      await clockOutMutation.mutateAsync({
        employeeProfileId: currentUser.id,
        photo: capture.photo ?? undefined,
        lat: capture.location?.latitude,
        lng: capture.location?.longitude,
        remarks: capture.remarks,
      });
      toast({ title: 'Punch Out Successful!', description: `You have been clocked out at ${capture.time}` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Punch Out Failed', description: error?.message || 'Please try again.' });
    }
  };

  const handleManualEntry = async (employeeId: string, type: EntryType, time: string, date: Date = new Date(), capture?: ClockEvent) => {
    if (type === 'complete-session') return; // handled via onAddCompleteSession -> addSession, not this path
    try {
      await manualEntryMutation.mutateAsync({
        employeeProfileId: employeeId,
        type,
        time,
        date: date.toISOString(),
        photo: capture?.photo ?? undefined,
        remarks: capture?.remarks,
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error?.message || 'Could not save the entry.' });
    }
  };

  const handleUpdateAttendance = async (
    attendanceId: string,
    sessionIndex: number,
    punchInTime: string,
    punchOutTime: string | null,
    lateExcused?: boolean,
    lateExcusedReason?: string,
    remarks?: string
  ) => {
    try {
      await updateSessionMutation.mutateAsync({ attendanceId, sessionIndex, punchInTime, punchOutTime, lateExcused, lateExcusedReason, remarks });
      toast({ title: 'Attendance Updated', description: 'The attendance record has been successfully updated.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error?.message || 'Could not update attendance record.' });
    }
  };

  const addSession = async (
    attendanceId: string,
    punchInTime: string,
    punchOutTime: string | null,
    punchInPhoto?: string,
    punchOutPhoto?: string,
    remarks?: string
  ) => {
    try {
      await addSessionMutation.mutateAsync({ attendanceId, punchInTime, punchOutTime, punchInPhoto, punchOutPhoto, remarks });
      toast({ title: 'Session Added', description: 'New attendance session has been added successfully.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Add Session Failed', description: error?.message || 'Could not add session.' });
    }
  };

  const updateSession = handleUpdateAttendance;

  const deleteSession = async (attendanceId: string, sessionIndex: number) => {
    try {
      await deleteSessionMutation.mutateAsync({ attendanceId, sessionIndex });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error?.message || 'Could not delete session.' });
    }
  };

  const addMissedPunchRequest = async (req: {
    date: string;
    punchType: 'In' | 'Out' | 'Both';
    punchInTime?: string;
    punchOutTime?: string;
    photoUrl: string;
    photoUrlOut?: string;
    reason: string;
  }) => {
    await addMissedPunchMutation.mutateAsync(req);
  };

  const loading = profileQuery.isLoading || employeesQuery.isLoading || attendanceQuery.isLoading;

  const value: AppContextValue = {
    currentUser,
    employees,
    attendance,
    leaves,
    holidays,
    isClockedIn,
    lastCapture,
    isResigned: false,
    loading,
    handleClockIn,
    handleClockOut,
    handleManualEntry,
    handleUpdateAttendance,
    addSession,
    updateSession,
    deleteSession,
    addMissedPunchRequest,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
