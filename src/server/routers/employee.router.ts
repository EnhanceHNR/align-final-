import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const employeeRouter = createTRPCRouter({
  getProfile: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const targetUserId = input.userId ?? ctx.user.id;
      let profile = await ctx.db.employeeProfile.findUnique({
        where: { userId: targetUserId },
        include: {
          shifts: true,
        },
      });
      
      // Auto-create EmployeeProfile for the SaaS organization owner if it doesn't exist
      if (!profile && targetUserId === ctx.user.id) {
         const user = await ctx.db.user.findUnique({ where: { id: targetUserId }});
         if (user && user.role === "MASTER") {
             profile = await ctx.db.employeeProfile.create({
                 data: {
                    userId: user.id,
                    name: user.email.split('@')[0],
                    employeeType: "Super Admin",
                 },
                 include: { shifts: true }
             });
         }
      }
      return profile;
    }),

  getAllEmployees: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.employeeProfile.findMany({
      include: {
        user: true,
        shifts: true,
      },
    });
  }),

  getEmployeeDetails: protectedProcedure
    .input(z.object({ employeeProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.employeeProfile.findUnique({
        where: { id: input.employeeProfileId },
        include: {
          user: true,
          shifts: true,
          documents: true,
          attendances: {
            include: { sessions: true },
            orderBy: { date: 'desc' }
          },
          payrolls: {
            orderBy: { createdAt: 'desc' }
          }
        },
      });
    }),

  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        employeeProfile: {
          select: { id: true }
        }
      }
    });
  }),

  upsertProfile: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string(),
        department: z.string().optional(),
        manager: z.string().optional(),
        employeeType: z.string().optional(),
        baseSalary: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.employeeProfile.upsert({
        where: { userId: input.userId },
        update: {
          name: input.name,
          department: input.department,
          manager: input.manager,
          employeeType: input.employeeType,
          baseSalary: input.baseSalary,
        },
        create: {
          userId: input.userId,
          name: input.name,
          department: input.department,
          manager: input.manager,
          employeeType: input.employeeType ?? "Employee",
          baseSalary: input.baseSalary ?? 0,
        },
      });
    }),
});
