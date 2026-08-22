import bcrypt from 'bcryptjs';
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const employeeRouter = createTRPCRouter({
  listStaff: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: { organizationId: ctx.user.organizationId, isActive: true },
      select: { id: true, email: true, employeeProfile: { select: { name: true } } }
    });
  }),
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


  createStaffUser: protectedProcedure
    .input(z.object({
      name: z.string(),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["STAFF", "ADMIN", "MASTER"]),
      department: z.string().optional(),
      baseSalary: z.number().optional(),
      mobileNumber: z.string().optional(),
      jobTitle: z.string().optional(),
      manager: z.string().optional(),
      shifts: z.array(z.object({ startTime: z.string(), endTime: z.string() })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Check if email exists
      const existingUser = await ctx.db.user.findUnique({ where: { email: input.email } });
      if (existingUser) {
        throw new Error("Email already in use");
      }

      // 2. Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // 3. Get organization from current user
      const currentUser = await ctx.db.user.findUnique({ where: { id: ctx.user.id } });
      const orgId = currentUser?.organizationId;

      // 4. Create User
      const newUser = await ctx.db.user.create({
        data: {
          email: input.email,
          passwordHash,
          role: input.role,
          organizationId: orgId,
        }
      });

      // 5. Create EmployeeProfile
      const profile = await ctx.db.employeeProfile.create({
        data: {
          userId: newUser.id,
          name: input.name,
          department: input.department,
          baseSalary: input.baseSalary ?? 0,
          employeeType: input.role === "ADMIN" ? "Admin" : "Employee",
          mobileNumber: input.mobileNumber,
          jobTitle: input.jobTitle,
          manager: input.manager,
          shifts: input.shifts ? {
             create: input.shifts.map(s => ({ startTime: s.startTime, endTime: s.endTime }))
          } : undefined
        }
      });

      return profile;
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
        mobileNumber: z.string().optional(),
        jobTitle: z.string().optional(),
        shifts: z.array(z.object({ id: z.string().optional(), startTime: z.string(), endTime: z.string() })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // First upsert the profile
      const profile = await ctx.db.employeeProfile.upsert({
        where: { userId: input.userId },
        update: {
          name: input.name,
          department: input.department,
          manager: input.manager,
          employeeType: input.employeeType,
          baseSalary: input.baseSalary,
          mobileNumber: input.mobileNumber,
          jobTitle: input.jobTitle,
        },
        create: {
          userId: input.userId,
          name: input.name,
          department: input.department,
          manager: input.manager,
          employeeType: input.employeeType ?? "Employee",
          baseSalary: input.baseSalary ?? 0,
          mobileNumber: input.mobileNumber,
          jobTitle: input.jobTitle,
        },
      });

      // Handle shifts
      if (input.shifts) {
         // Delete all existing shifts
         await ctx.db.shiftSegment.deleteMany({
            where: { employeeProfileId: profile.id }
         });
         // Create new ones
         if (input.shifts.length > 0) {
            await ctx.db.shiftSegment.createMany({
               data: input.shifts.map(s => ({
                  employeeProfileId: profile.id,
                  startTime: s.startTime,
                  endTime: s.endTime,
                  organizationId: ctx.user.organizationId
               }))
            });
         }
      }

      return profile;
    }),
});
