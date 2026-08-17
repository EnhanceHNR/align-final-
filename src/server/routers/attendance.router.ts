import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const attendanceRouter = createTRPCRouter({
  getToday: protectedProcedure
    .input(z.object({ employeeProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      return ctx.db.attendance.findFirst({
        where: {
          employeeProfileId: input.employeeProfileId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          sessions: true,
        },
      });
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

      let attendance = await ctx.db.attendance.findFirst({
        where: {
          employeeProfileId: input.employeeProfileId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      if (!attendance) {
        attendance = await ctx.db.attendance.create({
          data: {
            employeeProfileId: input.employeeProfileId,
            date: new Date(),
          },
        });
      }

      return ctx.db.attendanceSession.create({
        data: {
          attendanceId: attendance.id,
          clockInTime: new Date(),
          clockInLat: input.lat,
          clockInLng: input.lng,
          clockInPhoto: input.photo,
        },
      });
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
      const session = await ctx.db.attendanceSession.findUnique({
        where: { id: input.sessionId },
      });

      if (!session) {
        throw new Error("Session not found");
      }

      const clockOutTime = new Date();
      const diffMs = clockOutTime.getTime() - session.clockInTime.getTime();
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor((diffMs % 3600000) / 60000);
      const duration = `${diffHrs}h ${diffMins}m`;

      return ctx.db.attendanceSession.update({
        where: { id: input.sessionId },
        data: {
          clockOutTime,
          clockOutLat: input.lat,
          clockOutLng: input.lng,
          clockOutPhoto: input.photo,
          duration,
        },
      });
    }),
});
