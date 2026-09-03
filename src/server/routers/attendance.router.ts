import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, createModuleProcedure } from "../trpc";

const moduleProcedure = createModuleProcedure("attendance");
import { adminDb } from "@/lib/firebaseAdmin";
import { format } from "date-fns";
import { calculateAttendanceStatus } from "@/lib/attendance-utils";

// Accepts either a 24-hour "HH:mm" string or a 12-hour "h:mm AM/PM" string
// (the manual attendance dialog sends the latter) and returns [hours, minutes]
// in 24-hour time. Falls back gracefully if the format is unrecognized.
function parseTimeToHoursMinutes(timeStr: string): [number, number] | null {
  const trimmed = timeStr.trim();
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    const hStr = ampmMatch[1];
    const mStr = ampmMatch[2];
    const period = ampmMatch[3];
    if (!hStr || !mStr || !period) return null;
    let hour = parseInt(hStr, 10);
    const minutes = parseInt(mStr, 10);
    const upperPeriod = period.toUpperCase();
    if (upperPeriod === "PM" && hour !== 12) hour += 12;
    if (upperPeriod === "AM" && hour === 12) hour = 0;
    return [hour, minutes];
  }
  const hhmmMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    const hStr = hhmmMatch[1];
    const mStr = hhmmMatch[2];
    if (!hStr || !mStr) return null;
    return [parseInt(hStr, 10), parseInt(mStr, 10)];
  }
  return null;
}

// Firestore Timestamp fields (date, clockInTime, clockOutTime) come back from
// the Admin SDK as Timestamp instances, which are not directly parseable by
// `new Date(...)` on the client once serialized over tRPC. Convert them to
// ISO strings before returning.
function toIsoIfTimestamp(value: any): any {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function toDateIfTimestamp(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

async function getEmployeeProfileForUser(userId: string) {
  const snap = await adminDb.collection('employeeProfiles').where('userId', '==', userId).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  if (!doc) return null;
  return { id: doc.id, ...doc.data() } as any;
}

async function getEmployeeShiftInfo(employeeProfileId: string) {
  const profileDoc = await adminDb.collection('employeeProfiles').doc(employeeProfileId).get();
  const profile: any = profileDoc.exists ? profileDoc.data() : {};
  const shiftsSnap = await adminDb
    .collection('shiftSegments')
    .where('employeeProfileId', '==', employeeProfileId)
    .get();
  const shifts = shiftsSnap.docs.map(d => d.data() as any);
  return {
    name: profile?.name || 'Employee',
    shiftStartTime: shifts[0]?.startTime as string | undefined,
    bufferTime: profile?.bufferTime ?? 0,
    doubleLateThresholdMinutes: profile?.doubleLateThresholdMinutes ?? 30,
    organizationId: profile?.organizationId,
  };
}

// Mirrors the reference app's getAttendanceStatus(): compares a clock-in
// instant against the employee's first shift segment (+ grace buffer) to
// decide Present / Late / Double Late. Falls back to 'Present' when the
// employee has no shift configured, or on any parsing error.
async function computeStatusForClockIn(employeeProfileId: string, clockInDate: Date): Promise<'Present' | 'Late' | 'Double Late'> {
  try {
    const info = await getEmployeeShiftInfo(employeeProfileId);
    if (!info.shiftStartTime) return 'Present';
    const [h, m] = info.shiftStartTime.split(':').map((n: string) => parseInt(n, 10));
    const shiftStart = new Date(clockInDate);
    shiftStart.setHours(h || 0, m || 0, 0, 0);
    return calculateAttendanceStatus(clockInDate, shiftStart, info.bufferTime, info.doubleLateThresholdMinutes);
  } catch (e) {
    return 'Present';
  }
}

function formatSessionEvent(dateObj: Date | null, photo: any, lat: any, lng: any, remarks: any, isManual?: boolean) {
  if (!dateObj) return null;
  return {
    time: format(dateObj, 'p'),
    timestamp: dateObj.toISOString(),
    photo: photo || null,
    location: (lat != null && lng != null) ? { latitude: lat, longitude: lng } : null,
    ...(remarks ? { remarks } : {}),
    ...(isManual ? { isManual: true } : {}),
  };
}

function computeDuration(clockIn: Date | null, clockOut: Date | null): string {
  if (!clockIn || !clockOut) return '-';
  const diffMs = clockOut.getTime() - clockIn.getTime();
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor((diffMs % 3600000) / 60000);
  return `${diffHrs}h ${diffMins}m`;
}

// Returns an attendance doc's sessions, in the reference app's embedded
// shape (Attendance.sessions[].clockIn/.clockOut), ordered by clock-in time.
async function getOrderedSessionDocs(attendanceId: string) {
  const snap = await adminDb
    .collection('attendanceSessions')
    .where('attendanceId', '==', attendanceId)
    .get();
  const docs = snap.docs.map(d => ({ id: d.id, ref: d.ref, data: d.data() as any }));
  docs.sort((a, b) => {
    const ta = toDateIfTimestamp(a.data.clockInTime)?.getTime() ?? 0;
    const tb = toDateIfTimestamp(b.data.clockInTime)?.getTime() ?? 0;
    return ta - tb;
  });
  return docs;
}

function shapeSession(d: any) {
  const clockIn = formatSessionEvent(
    toDateIfTimestamp(d.clockInTime),
    d.clockInPhoto,
    d.clockInLat,
    d.clockInLng,
    d.clockInRemarks,
    d.clockInIsManual
  );
  const clockOut = d.clockOutTime
    ? formatSessionEvent(toDateIfTimestamp(d.clockOutTime), d.clockOutPhoto, d.clockOutLat, d.clockOutLng, d.clockOutRemarks, d.clockOutIsManual)
    : null;
  return {
    clockIn,
    clockOut,
    duration: d.duration || '-',
  };
}

async function findAttendanceDocForDay(organizationId: string, employeeProfileId: string, dayStart: Date, dayEnd: Date) {
  const snap = await adminDb
    .collection('attendances')
    .where('organizationId', '==', organizationId)
    .where('employeeProfileId', '==', employeeProfileId)
    .where('date', '>=', dayStart)
    .where('date', '<=', dayEnd)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  if (!doc) return null;
  return { id: doc.id, ref: doc.ref, data: doc.data() as any };
}

function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export const attendanceRouter = createTRPCRouter({
  getToday: moduleProcedure
    .input(z.object({ employeeProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { start, end } = dayBounds(new Date());

      const snap = await adminDb
        .collection('attendances')
        .where('organizationId', '==', ctx.user.organizationId)
        .where('employeeProfileId', '==', input.employeeProfileId)
        .where('date', '>=', start)
        .where('date', '<=', end)
        .limit(1)
        .get();

      if (snap.empty) return null;
      const doc0 = snap.docs[0];
      if (!doc0) return null;

      const attendanceData: any = doc0.data();
      const attendance = { id: doc0.id, ...attendanceData, date: toIsoIfTimestamp(attendanceData.date) };

      const sessionsSnap = await adminDb
        .collection('attendanceSessions')
        .where('attendanceId', '==', attendance.id)
        .get();

      return {
        ...attendance,
        sessions: sessionsSnap.docs.map(s => {
          const d: any = s.data();
          return {
            id: s.id,
            ...d,
            clockInTime: toIsoIfTimestamp(d.clockInTime),
            clockOutTime: toIsoIfTimestamp(d.clockOutTime),
          };
        })
      };
    }),

  // Returns every attendance record for the organization in the reference
  // app's shape: date as a plain 'yyyy-MM-dd' string and sessions embedded
  // as an array of {clockIn, clockOut, duration}, so the ported reference
  // components (AttendanceTracker / EmployeeAttendanceCalendar) can consume
  // it without modification.
  getAllForOrg: moduleProcedure
    .query(async ({ ctx }) => {
      const snap = await adminDb
        .collection('attendances')
        .where('organizationId', '==', ctx.user.organizationId)
        .get();

      const records = await Promise.all(snap.docs.map(async (doc) => {
        const data: any = doc.data();
        const dateObj = toDateIfTimestamp(data.date) || new Date();
        const sessionDocs = await getOrderedSessionDocs(doc.id);
        const sessions = sessionDocs.map(s => shapeSession(s.data)).filter(s => s.clockIn);

        return {
          id: doc.id,
          employeeId: data.employeeProfileId,
          date: format(dateObj, 'yyyy-MM-dd'),
          status: data.status || (sessions.length > 0 ? 'Present' : 'Absent'),
          sessions,
          modifiedBy: data.modifiedBy || null,
          modifiedAt: data.modifiedAt || null,
          lateExcused: data.lateExcused || false,
          lateExcusedReason: data.lateExcusedReason || null,
        };
      }));

      return records;
    }),

  clockIn: moduleProcedure
    .input(
      z.object({
        employeeProfileId: z.string(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        photo: z.string().optional(),
        remarks: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const { start, end } = dayBounds(now);
      const status = await computeStatusForClockIn(input.employeeProfileId, now);

      const existing = await findAttendanceDocForDay(ctx.user.organizationId!, input.employeeProfileId, start, end);

      let attendanceId: string;
      if (!existing) {
        const ref = adminDb.collection('attendances').doc();
        await ref.set({
          organizationId: ctx.user.organizationId,
          employeeProfileId: input.employeeProfileId,
          date: now,
          status,
        });
        attendanceId = ref.id;
      } else {
        attendanceId = existing.id;
        // Only Absent/undefined gets overwritten by a fresh clock-in; an
        // already-Present/Late day keeps its status when a second session starts.
        const currentStatus = existing.data.status;
        if (!currentStatus || currentStatus === 'Absent') {
          await existing.ref.update({ status });
        }
      }

      const sessionRef = adminDb.collection('attendanceSessions').doc();
      const sessionData = {
        attendanceId,
        organizationId: ctx.user.organizationId,
        clockInTime: now,
        clockInLat: input.lat ?? null,
        clockInLng: input.lng ?? null,
        clockInPhoto: input.photo ?? null,
        clockInRemarks: input.remarks ?? null,
      };
      await sessionRef.set(sessionData);

      return { id: sessionRef.id, ...sessionData };
    }),

  // Like clockOut, but self-locates today's open session for the given
  // employee instead of requiring a raw session id — used by the ported
  // ClockInOutDialog, which (like the reference app) only ever tracks
  // isClockedIn/employeeId, never a Firestore doc id.
  clockOutForToday: moduleProcedure
    .input(
      z.object({
        employeeProfileId: z.string(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        photo: z.string().optional(),
        remarks: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const { start, end } = dayBounds(now);
      const existing = await findAttendanceDocForDay(ctx.user.organizationId!, input.employeeProfileId, start, end);
      if (!existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No open punch-in session found to punch-out against." });
      }
      const sessionDocs = await getOrderedSessionDocs(existing.id);
      const openSession = [...sessionDocs].reverse().find(s => !s.data.clockOutTime);
      if (!openSession) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No open punch-in session found to punch-out against." });
      }

      const clockInTime = toDateIfTimestamp(openSession.data.clockInTime);
      const duration = computeDuration(clockInTime, now);

      await openSession.ref.update({
        clockOutTime: now,
        clockOutLat: input.lat ?? null,
        clockOutLng: input.lng ?? null,
        clockOutPhoto: input.photo ?? null,
        clockOutRemarks: input.remarks ?? null,
        duration,
      });

      return { id: openSession.id, ...openSession.data, clockOutTime: now, duration };
    }),

  clockOut: moduleProcedure
    .input(
      z.object({
        sessionId: z.string(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        photo: z.string().optional(),
        remarks: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sessionDoc = await adminDb.collection('attendanceSessions').doc(input.sessionId).get();

      if (!sessionDoc.exists) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      const sessionData: any = sessionDoc.data();
      if (sessionData.organizationId !== ctx.user.organizationId) {
         throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      }

      const clockOutTime = new Date();
      const clockInTime = toDateIfTimestamp(sessionData.clockInTime) || clockOutTime;
      const duration = computeDuration(clockInTime, clockOutTime);

      const updateData = {
        clockOutTime,
        clockOutLat: input.lat ?? null,
        clockOutLng: input.lng ?? null,
        clockOutPhoto: input.photo ?? null,
        clockOutRemarks: input.remarks ?? null,
        duration,
      };

      await adminDb.collection('attendanceSessions').doc(input.sessionId).update(updateData);

      return { id: input.sessionId, ...sessionData, ...updateData };
    }),

  // Admin-facing manual entry: mirrors the reference app's handleManualEntry.
  // Used both for the plain "Manual Entry" dialog and for marking a day
  // Absent / Paid Leave / Unpaid Leave.
  manualEntry: moduleProcedure
    .input(z.object({
      employeeProfileId: z.string(),
      type: z.enum(['clock-in', 'clock-out', 'absent', 'paid-leave', 'unpaid-leave']),
      time: z.string().optional(),
      date: z.string(), // ISO date string
      photo: z.string().optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId!;
      const targetDate = new Date(input.date);
      const { start, end } = dayBounds(targetDate);
      const existing = await findAttendanceDocForDay(orgId, input.employeeProfileId, start, end);

      if (input.type === 'absent' || input.type === 'paid-leave' || input.type === 'unpaid-leave') {
        const newStatus = input.type === 'absent' ? 'Absent' : input.type === 'paid-leave' ? 'PaidLeave' : 'UnpaidLeave';

        if (input.type !== 'absent') {
          const profile = await getEmployeeShiftInfo(input.employeeProfileId);
          const dateStr = format(targetDate, 'yyyy-MM-dd');
          await adminDb.collection('leaveRequests').add({
            organizationId: orgId,
            employeeProfileId: input.employeeProfileId,
            employeeName: profile.name,
            type: input.type === 'paid-leave' ? 'Paid Leave' : 'Unpaid Leave',
            startDate: dateStr,
            endDate: dateStr,
            days: 1,
            dateOfApplying: new Date(),
            status: 'Approved',
          });
        }

        if (existing) {
          // Clear any existing sessions for the day when overriding to Absent/Leave.
          const sessionDocs = await getOrderedSessionDocs(existing.id);
          await Promise.all(sessionDocs.map(s => s.ref.delete()));
          await existing.ref.update({
            status: newStatus,
            modifiedBy: ctx.user.email,
            modifiedAt: new Date().toISOString(),
          });
        } else {
          await adminDb.collection('attendances').add({
            organizationId: orgId,
            employeeProfileId: input.employeeProfileId,
            date: targetDate,
            status: newStatus,
            modifiedBy: ctx.user.email,
            modifiedAt: new Date().toISOString(),
          });
        }
        return { success: true };
      }

      // clock-in / clock-out
      const parsed = input.time ? parseTimeToHoursMinutes(input.time) : null;
      const eventDate = new Date(targetDate);
      if (parsed) eventDate.setHours(parsed[0], parsed[1], 0, 0);

      if (input.type === 'clock-in') {
        const status = await computeStatusForClockIn(input.employeeProfileId, eventDate);

        let attendanceId: string;
        if (existing) {
          attendanceId = existing.id;
          await existing.ref.update({
            status,
            modifiedBy: ctx.user.email,
            modifiedAt: new Date().toISOString(),
          });
        } else {
          const ref = adminDb.collection('attendances').doc();
          await ref.set({
            organizationId: orgId,
            employeeProfileId: input.employeeProfileId,
            date: targetDate,
            status,
            modifiedBy: ctx.user.email,
            modifiedAt: new Date().toISOString(),
          });
          attendanceId = ref.id;
        }

        await adminDb.collection('attendanceSessions').add({
          attendanceId,
          organizationId: orgId,
          clockInTime: eventDate,
          clockInPhoto: input.photo || 'https://picsum.photos/seed/manual/300/225',
          clockInRemarks: input.remarks || null,
          clockInIsManual: true,
        });
      } else {
        // clock-out
        if (!existing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot record a punch-out without a punch-in for this day." });
        }
        const sessionDocs = await getOrderedSessionDocs(existing.id);
        const openSession = [...sessionDocs].reverse().find(s => !s.data.clockOutTime);
        if (!openSession) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No open punch-in session found to punch-out against." });
        }
        const clockInTime = toDateIfTimestamp(openSession.data.clockInTime);
        const duration = computeDuration(clockInTime, eventDate);
        await openSession.ref.update({
          clockOutTime: eventDate,
          clockOutPhoto: input.photo || 'https://picsum.photos/seed/manual/300/225',
          clockOutRemarks: input.remarks || null,
          clockOutIsManual: true,
          duration,
        });
        await existing.ref.update({
          modifiedBy: ctx.user.email,
          modifiedAt: new Date().toISOString(),
        });
      }

      return { success: true };
    }),

  // Adds a brand-new session (a full punch-in/out pair, or a single side)
  // to an existing attendance record. Backs EmployeeAttendanceCalendar's
  // "Add Session" flow.
  addSession: moduleProcedure
    .input(z.object({
      attendanceId: z.string(),
      punchInTime: z.string(),
      punchOutTime: z.string().nullable().optional(),
      punchInPhoto: z.string().optional(),
      punchOutPhoto: z.string().optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const attDoc = await adminDb.collection('attendances').doc(input.attendanceId).get();
      if (!attDoc.exists) throw new TRPCError({ code: "NOT_FOUND", message: "Attendance record not found." });
      const attData: any = attDoc.data();
      if (attData.organizationId !== ctx.user.organizationId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const baseDate = toDateIfTimestamp(attData.date) || new Date();
      const pIn = parseTimeToHoursMinutes(input.punchInTime);
      const clockInTime = new Date(baseDate);
      if (pIn) clockInTime.setHours(pIn[0], pIn[1], 0, 0);

      let clockOutTime: Date | null = null;
      if (input.punchOutTime) {
        const pOut = parseTimeToHoursMinutes(input.punchOutTime);
        if (pOut) {
          clockOutTime = new Date(baseDate);
          clockOutTime.setHours(pOut[0], pOut[1], 0, 0);
        }
      }

      await adminDb.collection('attendanceSessions').add({
        attendanceId: input.attendanceId,
        organizationId: ctx.user.organizationId,
        clockInTime,
        clockInPhoto: input.punchInPhoto || 'https://picsum.photos/seed/manual-add/300/225',
        clockInRemarks: input.remarks || null,
        clockInIsManual: true,
        clockOutTime,
        clockOutPhoto: clockOutTime ? (input.punchOutPhoto || 'https://picsum.photos/seed/manual-add-out/300/225') : null,
        clockOutIsManual: clockOutTime ? true : null,
        duration: computeDuration(clockInTime, clockOutTime),
      });

      // Recalculate the day's status from the earliest session's clock-in.
      const sessionDocs = await getOrderedSessionDocs(input.attendanceId);
      const earliest = sessionDocs[0];
      const status = earliest ? await computeStatusForClockIn(attData.employeeProfileId, toDateIfTimestamp(earliest.data.clockInTime) || clockInTime) : attData.status;

      await attDoc.ref.update({
        status,
        modifiedBy: ctx.user.email,
        modifiedAt: new Date().toISOString(),
      });

      return { success: true };
    }),

  // Edits an existing session's punch-in/out times (by ordinal index, same
  // ordering as getAllForOrg returns), used by EditAttendanceDialog.
  updateSession: moduleProcedure
    .input(z.object({
      attendanceId: z.string(),
      sessionIndex: z.number(),
      punchInTime: z.string(),
      punchOutTime: z.string().nullable().optional(),
      lateExcused: z.boolean().optional(),
      lateExcusedReason: z.string().optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const attDoc = await adminDb.collection('attendances').doc(input.attendanceId).get();
      if (!attDoc.exists) throw new TRPCError({ code: "NOT_FOUND", message: "Attendance record not found." });
      const attData: any = attDoc.data();
      if (attData.organizationId !== ctx.user.organizationId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const sessionDocs = await getOrderedSessionDocs(input.attendanceId);
      const target = sessionDocs[input.sessionIndex];
      if (!target) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid session index." });

      const baseDate = toDateIfTimestamp(attData.date) || new Date();
      const pIn = parseTimeToHoursMinutes(input.punchInTime);
      const clockInTime = new Date(baseDate);
      if (pIn) clockInTime.setHours(pIn[0], pIn[1], 0, 0);

      let clockOutTime: Date | null = null;
      if (input.punchOutTime) {
        const pOut = parseTimeToHoursMinutes(input.punchOutTime);
        if (pOut) {
          clockOutTime = new Date(baseDate);
          clockOutTime.setHours(pOut[0], pOut[1], 0, 0);
        }
      }

      await target.ref.update({
        clockInTime,
        clockOutTime,
        clockInIsManual: true,
        clockOutIsManual: clockOutTime ? true : null,
        clockInRemarks: input.remarks !== undefined ? (input.remarks || null) : target.data.clockInRemarks ?? null,
        duration: computeDuration(clockInTime, clockOutTime),
      });

      const status = await computeStatusForClockIn(attData.employeeProfileId, clockInTime);
      const updateData: any = {
        status,
        modifiedBy: ctx.user.email,
        modifiedAt: new Date().toISOString(),
      };
      if (input.lateExcused !== undefined) updateData.lateExcused = input.lateExcused;
      if (input.lateExcusedReason !== undefined) updateData.lateExcusedReason = input.lateExcusedReason;
      await attDoc.ref.update(updateData);

      return { success: true };
    }),

  // Deletes a session (by ordinal index). If it was the last remaining
  // session for the day, the day falls back to Absent.
  deleteSession: moduleProcedure
    .input(z.object({
      attendanceId: z.string(),
      sessionIndex: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const attDoc = await adminDb.collection('attendances').doc(input.attendanceId).get();
      if (!attDoc.exists) throw new TRPCError({ code: "NOT_FOUND", message: "Attendance record not found." });
      const attData: any = attDoc.data();
      if (attData.organizationId !== ctx.user.organizationId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const sessionDocs = await getOrderedSessionDocs(input.attendanceId);
      const target = sessionDocs[input.sessionIndex];
      if (!target) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid session index." });

      await target.ref.delete();

      const remaining = sessionDocs.filter((_, i) => i !== input.sessionIndex);
      await attDoc.ref.update({
        status: remaining.length === 0 ? 'Absent' : attData.status,
        modifiedBy: ctx.user.email,
        modifiedAt: new Date().toISOString(),
      });

      return { success: true };
    }),

  // Employee self-service request for a punch they forgot to make.
  addMissedPunchRequest: moduleProcedure
    .input(z.object({
      date: z.string(),
      punchType: z.enum(['In', 'Out', 'Both']),
      punchInTime: z.string().optional(),
      punchOutTime: z.string().optional(),
      photoUrl: z.string(),
      photoUrlOut: z.string().optional(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await getEmployeeProfileForUser(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Employee profile not found." });

      await adminDb.collection('missedPunchRequests').add({
        organizationId: ctx.user.organizationId,
        employeeProfileId: profile.id,
        employeeName: profile.name,
        date: input.date,
        punchType: input.punchType,
        punchInTime: input.punchInTime || null,
        punchOutTime: input.punchOutTime || null,
        photoUrl: input.photoUrl,
        photoUrlOut: input.photoUrlOut || null,
        reason: input.reason,
        submittedDate: new Date().toISOString(),
        status: 'Pending',
      });

      return { success: true };
    }),

  upsertAttendance: moduleProcedure
    .input(z.object({
      employeeProfileId: z.string(),
      date: z.string(), // ISO date string
      status: z.string(),
      punchInTime: z.string().optional(),
      punchOutTime: z.string().optional(),
      notes: z.string().optional(),
      clockInPhoto: z.string().optional(),
      clockOutPhoto: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const targetDate = new Date(input.date);
      targetDate.setHours(0, 0, 0, 0);
      const startOfDay = new Date(targetDate);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const snap = await adminDb
        .collection('attendances')
        .where('organizationId', '==', ctx.user.organizationId)
        .where('employeeProfileId', '==', input.employeeProfileId)
        .where('date', '>=', startOfDay)
        .where('date', '<=', endOfDay)
        .limit(1)
        .get();

      let attendanceId: string | null = null;
      if (!snap.empty && snap.docs[0]) {
        attendanceId = snap.docs[0].id;
        await adminDb.collection('attendances').doc(attendanceId).update({
            status: input.status,
            notes: input.notes || null,
        });
      } else {
        const ref = adminDb.collection('attendances').doc();
        const data = {
          organizationId: ctx.user.organizationId,
          employeeProfileId: input.employeeProfileId,
          date: targetDate,
          status: input.status,
          notes: input.notes || null,
        };
        await ref.set(data);
        attendanceId = ref.id;
      }

      // Upsert the session
      const sessionsSnap = await adminDb
        .collection('attendanceSessions')
        .where('attendanceId', '==', attendanceId)
        .limit(1)
        .get();


      let pIn = null;
      if (input.punchInTime && input.punchInTime.includes(':')) {
         const parsed = parseTimeToHoursMinutes(input.punchInTime);
         if (parsed) {
           pIn = new Date(targetDate);
           pIn.setHours(parsed[0], parsed[1], 0, 0);
         }
      }

      let pOut = null;
      if (input.punchOutTime && input.punchOutTime.includes(':')) {
         const parsed = parseTimeToHoursMinutes(input.punchOutTime);
         if (parsed) {
           pOut = new Date(targetDate);
           pOut.setHours(parsed[0], parsed[1], 0, 0);
         }
      }


      let duration = null;
      if (pIn && pOut) {
         const diffMs = pOut.getTime() - pIn.getTime();
         const diffHrs = Math.floor(diffMs / 3600000);
         const diffMins = Math.floor((diffMs % 3600000) / 60000);
         duration = `${diffHrs}h ${diffMins}m`;
      }

      if (!sessionsSnap.empty && sessionsSnap.docs[0]) {
          const sId = sessionsSnap.docs[0].id;
          const updates: any = {};
          if (pIn) updates.clockInTime = pIn;
          if (pOut) updates.clockOutTime = pOut;
          if (duration) updates.duration = duration;
          if (input.clockInPhoto) updates.clockInPhoto = input.clockInPhoto;
          if (input.clockOutPhoto) updates.clockOutPhoto = input.clockOutPhoto;

          if (Object.keys(updates).length > 0) {
              await adminDb.collection('attendanceSessions').doc(sId).update(updates);
          }
      } else if (pIn || pOut || input.clockInPhoto || input.clockOutPhoto) {
          await adminDb.collection('attendanceSessions').add({
              attendanceId,
              organizationId: ctx.user.organizationId,
              clockInTime: pIn || new Date(),
              clockOutTime: pOut || null,
              duration,
              clockInPhoto: input.clockInPhoto || null,
              clockOutPhoto: input.clockOutPhoto || null,
          });
      }

      return { success: true };
    }),
});
