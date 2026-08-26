import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { adminDb } from "@/lib/firebaseAdmin";

export const attendanceRouter = createTRPCRouter({
  getToday: protectedProcedure
    .input(z.object({ employeeProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const snap = await adminDb
        .collection('attendances')
        .where('organizationId', '==', ctx.user.organizationId)
        .where('employeeProfileId', '==', input.employeeProfileId)
        .where('date', '>=', startOfDay)
        .where('date', '<=', endOfDay)
        .limit(1)
        .get();

      if (snap.empty) return null;
      
      const attendance = { id: snap.docs[0].id, ...snap.docs[0].data() };
      
      const sessionsSnap = await adminDb
        .collection('attendanceSessions')
        .where('attendanceId', '==', attendance.id)
        .get();
        
      return {
        ...attendance,
        sessions: sessionsSnap.docs.map(s => ({ id: s.id, ...s.data() }))
      };
    }),

  clockIn: protectedProcedure
    .input(
      z.object({
        employeeProfileId: z.string(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        photo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const snap = await adminDb
        .collection('attendances')
        .where('organizationId', '==', ctx.user.organizationId)
        .where('employeeProfileId', '==', input.employeeProfileId)
        .where('date', '>=', startOfDay)
        .where('date', '<=', endOfDay)
        .limit(1)
        .get();

      let attendanceId;
      if (snap.empty) {
        const ref = adminDb.collection('attendances').doc();
        await ref.set({
          organizationId: ctx.user.organizationId,
          employeeProfileId: input.employeeProfileId,
          date: new Date(),
        });
        attendanceId = ref.id;
      } else {
        attendanceId = snap.docs[0].id;
      }

      const sessionRef = adminDb.collection('attendanceSessions').doc();
      const sessionData = {
        attendanceId,
        organizationId: ctx.user.organizationId,
        clockInTime: new Date(),
        clockInLat: input.lat ?? null,
        clockInLng: input.lng ?? null,
        clockInPhoto: input.photo ?? null,
      };
      await sessionRef.set(sessionData);

      return { id: sessionRef.id, ...sessionData };
    }),

  clockOut: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        photo: z.string().optional(),
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
      const clockInTime = sessionData.clockInTime instanceof Date 
         ? sessionData.clockInTime 
         : sessionData.clockInTime.toDate();
         
      const diffMs = clockOutTime.getTime() - clockInTime.getTime();
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor((diffMs % 3600000) / 60000);
      const duration = `${diffHrs}h ${diffMins}m`;

      const updateData = {
        clockOutTime,
        clockOutLat: input.lat ?? null,
        clockOutLng: input.lng ?? null,
        clockOutPhoto: input.photo ?? null,
        duration,
      };

      await adminDb.collection('attendanceSessions').doc(input.sessionId).update(updateData);
      
      return { id: input.sessionId, ...sessionData, ...updateData };
    }),

  upsertAttendance: protectedProcedure
    .input(z.object({
      employeeProfileId: z.string(),
      date: z.string(), // ISO date string
      status: z.string(),
      punchInTime: z.string().optional(),
      punchOutTime: z.string().optional(),
      notes: z.string().optional(),
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

      if (!snap.empty) {
        const id = snap.docs[0].id;
        await adminDb.collection('attendances').doc(id).update({ status: input.status });
        return { id, ...snap.docs[0].data(), status: input.status };
      } else {
        const ref = adminDb.collection('attendances').doc();
        const data = {
          organizationId: ctx.user.organizationId,
          employeeProfileId: input.employeeProfileId,
          date: targetDate,
          status: input.status,
        };
        await ref.set(data);
        return { id: ref.id, ...data };
      }
    }),
});
