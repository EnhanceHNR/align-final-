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
          organizationId: ctx.user.organizationId,
          employeeProfileId: input.employeeProfileId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          sessions: true,
        },
      
  upsertAttendance: protectedProcedure
    .input(z.object({
      employeeProfileId: z.string(),
      date: z.string(), // ISO date string
      status: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const targetDate = new Date(input.date);
      targetDate.setHours(0, 0, 0, 0);
      const startOfDay = new Date(targetDate);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await ctx.db.attendance.findFirst({
        where: {
          organizationId: ctx.user.organizationId,
          employeeProfileId: input.employeeProfileId,
          date: { gte: startOfDay, lte: endOfDay },
        }
      });

      if (existing) {
        return ctx.db.attendance.update({
          where: { id: existing.id },
          data: { status: input.status }
        });
      } else {
        return ctx.db.attendance.create({
          data: {
            organizationId: ctx.user.organizationId,
            employeeProfileId: input.employeeProfileId,
            date: targetDate,
            status: input.status,
            organizationId: ctx.user.organizationId,
          }
        });
      }
    }),
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
          organizationId: ctx.user.organizationId,
          employeeProfileId: input.employeeProfileId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      
  upsertAttendance: protectedProcedure
    .input(z.object({
      employeeProfileId: z.string(),
      date: z.string(), // ISO date string
      status: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const targetDate = new Date(input.date);
      targetDate.setHours(0, 0, 0, 0);
      const startOfDay = new Date(targetDate);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await ctx.db.attendance.findFirst({
        where: {
          organizationId: ctx.user.organizationId,
          employeeProfileId: input.employeeProfileId,
          date: { gte: startOfDay, lte: endOfDay },
        }
      });

      if (existing) {
        return ctx.db.attendance.update({
          where: { id: existing.id },
          data: { status: input.status }
        });
      } else {
        return ctx.db.attendance.create({
          data: {
            organizationId: ctx.user.organizationId,
            employeeProfileId: input.employeeProfileId,
            date: targetDate,
            status: input.status,
            organizationId: ctx.user.organizationId,
          }
        });
      }
    }),
});

      if (!attendance) {
        attendance = await ctx.db.attendance.create({
          data: {
            organizationId: ctx.user.organizationId,
            employeeProfileId: input.employeeProfileId,
            date: new Date(),
          },
        
  upsertAttendance: protectedProcedure
    .input(z.object({
      employeeProfileId: z.string(),
      date: z.string(), // ISO date string
      status: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const targetDate = new Date(input.date);
      targetDate.setHours(0, 0, 0, 0);
      const startOfDay = new Date(targetDate);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await ctx.db.attendance.findFirst({
        where: {
          organizationId: ctx.user.organizationId,
          employeeProfileId: input.employeeProfileId,
          date: { gte: startOfDay, lte: endOfDay },
        }
      });

      if (existing) {
        return ctx.db.attendance.update({
          where: { id: existing.id },
          data: { status: input.status }
        });
      } else {
        return ctx.db.attendance.create({
          data: {
            organizationId: ctx.user.organizationId,
            employeeProfileId: input.employeeProfileId,
            date: targetDate,
            status: input.status,
            organizationId: ctx.user.organizationId,
          }
        });
      }
    }),
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
      
  upsertAttendance: protectedProcedure
    .input(z.object({
      employeeProfileId: z.string(),
      date: z.string(), // ISO date string
      status: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const targetDate = new Date(input.date);
      targetDate.setHours(0, 0, 0, 0);
      const startOfDay = new Date(targetDate);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await ctx.db.attendance.findFirst({
        where: {
          organizationId: ctx.user.organizationId,
          employeeProfileId: input.employeeProfileId,
          date: { gte: startOfDay, lte: endOfDay },
        }
      });

      if (existing) {
        return ctx.db.attendance.update({
          where: { id: existing.id },
          data: { status: input.status }
        });
      } else {
        return ctx.db.attendance.create({
          data: {
            organizationId: ctx.user.organizationId,
            employeeProfileId: input.employeeProfileId,
            date: targetDate,
            status: input.status,
            organizationId: ctx.user.organizationId,
          }
        });
      }
    }),
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
      const session = await ctx.db.attendanceSession.findFirst({
        where: { id: input.sessionId, organizationId: ctx.user.organizationId },
      
  upsertAttendance: protectedProcedure
    .input(z.object({
      employeeProfileId: z.string(),
      date: z.string(), // ISO date string
      status: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const targetDate = new Date(input.date);
      targetDate.setHours(0, 0, 0, 0);
      const startOfDay = new Date(targetDate);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await ctx.db.attendance.findFirst({
        where: {
          organizationId: ctx.user.organizationId,
          employeeProfileId: input.employeeProfileId,
          date: { gte: startOfDay, lte: endOfDay },
        }
      });

      if (existing) {
        return ctx.db.attendance.update({
          where: { id: existing.id },
          data: { status: input.status }
        });
      } else {
        return ctx.db.attendance.create({
          data: {
            organizationId: ctx.user.organizationId,
            employeeProfileId: input.employeeProfileId,
            date: targetDate,
            status: input.status,
            organizationId: ctx.user.organizationId,
          }
        });
      }
    }),
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
        where: { id: input.sessionId, organizationId: ctx.user.organizationId },
        data: {
          clockOutTime,
          clockOutLat: input.lat,
          clockOutLng: input.lng,
          clockOutPhoto: input.photo,
          duration,
        },
      
  upsertAttendance: protectedProcedure
    .input(z.object({
      employeeProfileId: z.string(),
      date: z.string(), // ISO date string
      status: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const targetDate = new Date(input.date);
      targetDate.setHours(0, 0, 0, 0);
      const startOfDay = new Date(targetDate);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await ctx.db.attendance.findFirst({
        where: {
          organizationId: ctx.user.organizationId,
          employeeProfileId: input.employeeProfileId,
          date: { gte: startOfDay, lte: endOfDay },
        }
      });

      if (existing) {
        return ctx.db.attendance.update({
          where: { id: existing.id },
          data: { status: input.status }
        });
      } else {
        return ctx.db.attendance.create({
          data: {
            organizationId: ctx.user.organizationId,
            employeeProfileId: input.employeeProfileId,
            date: targetDate,
            status: input.status,
            organizationId: ctx.user.organizationId,
          }
        });
      }
    }),
});
    }),

  upsertAttendance: protectedProcedure
    .input(z.object({
      employeeProfileId: z.string(),
      date: z.string(), // ISO date string
      status: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const targetDate = new Date(input.date);
      targetDate.setHours(0, 0, 0, 0);
      const startOfDay = new Date(targetDate);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await ctx.db.attendance.findFirst({
        where: {
          organizationId: ctx.user.organizationId,
          employeeProfileId: input.employeeProfileId,
          date: { gte: startOfDay, lte: endOfDay },
        }
      });

      if (existing) {
        return ctx.db.attendance.update({
          where: { id: existing.id },
          data: { status: input.status }
        });
      } else {
        return ctx.db.attendance.create({
          data: {
            organizationId: ctx.user.organizationId,
            employeeProfileId: input.employeeProfileId,
            date: targetDate,
            status: input.status,
            organizationId: ctx.user.organizationId,
          }
        });
      }
    }),
});
