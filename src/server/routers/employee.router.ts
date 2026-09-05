import bcrypt from 'bcryptjs';
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import type { ModuleKey } from "../trpc";
import { MODULE_KEYS } from "../trpc";
import { adminDb } from "@/lib/firebaseAdmin";

export const employeeRouter = createTRPCRouter({
  listStaff: protectedProcedure.query(async ({ ctx }) => {
    const usersSnap = await adminDb
      .collection('users')
      .where('organizationId', '==', ctx.user.organizationId)
      .where('isActive', '==', true)
      .get();
    
    const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return Promise.all(users.map(async (u: any) => {
      const profileSnap = await adminDb
        .collection('employeeProfiles')
        .where('userId', '==', u.id)
        .limit(1)
        .get();
      const profile = profileSnap.empty ? null : profileSnap.docs[0].data();
      return {
        id: u.id,
        email: u.email,
        employeeProfile: profile ? { name: profile.name } : null
      };
    }));
  }),

  getProfile: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const targetUserId = input.userId ?? ctx.user.id;
      
      const profileSnap = await adminDb
        .collection('employeeProfiles')
        .where('userId', '==', targetUserId)
        .limit(1)
        .get();
        
      let profile: any = profileSnap.empty ? null : { id: profileSnap.docs[0].id, ...profileSnap.docs[0].data() };
      
      if (profile) {
        const shiftsSnap = await adminDb
          .collection('shiftSegments')
          .where('employeeProfileId', '==', profile.id)
          .get();
        profile.shifts = shiftsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      
      // Auto-create EmployeeProfile for the SaaS organization owner if it doesn't exist
      if (!profile && targetUserId === ctx.user.id) {
         const userDoc = await adminDb.collection('users').doc(targetUserId).get();
         if (userDoc.exists) {
           const userData = userDoc.data();
           if (userData?.role === "MASTER") {
               const newProfileRef = adminDb.collection('employeeProfiles').doc();
               const newProfileData = {
                  userId: userDoc.id,
                  name: userData.email.split('@')[0],
                  employeeType: "Super Admin",
                  organizationId: ctx.user.organizationId,
               };
               await newProfileRef.set(newProfileData);
               profile = { id: newProfileRef.id, ...newProfileData, shifts: [] };
           }
         }
      }
      return profile;
    }),

  getAllEmployees: protectedProcedure.query(async ({ ctx }) => {
    const profilesSnap = await adminDb
      .collection('employeeProfiles')
      .where('organizationId', '==', ctx.user.organizationId)
      .get();
      
    const profiles = profilesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    return Promise.all(profiles.map(async (profile: any) => {
      const userDoc = await adminDb.collection('users').doc(profile.userId).get();
      const user = userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null;
      
      const shiftsSnap = await adminDb
        .collection('shiftSegments')
        .where('employeeProfileId', '==', profile.id)
        .get();
      const shifts = shiftsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      return { ...profile, user, shifts };
    }));
  }),

  getEmployeeDetails: protectedProcedure
    .input(z.object({ employeeProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const profileDoc = await adminDb.collection('employeeProfiles').doc(input.employeeProfileId).get();
      if (!profileDoc.exists) return null;
      
      const profileData: any = { id: profileDoc.id, ...profileDoc.data() };
      
      const userDoc = await adminDb.collection('users').doc(profileData.userId).get();
      const user = userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null;
      
      const shiftsSnap = await adminDb
        .collection('shiftSegments')
        .where('employeeProfileId', '==', profileData.id)
        .get();
      const shifts = shiftsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const docsSnap = await adminDb
        .collection('documents')
        .where('employeeProfileId', '==', profileData.id)
        .get();
      const documents = docsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const attendancesSnap = await adminDb
        .collection('attendances')
        .where('employeeProfileId', '==', profileData.id)
        .get();
      let attendances = attendancesSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          date: data.date && typeof data.date.toDate === 'function' ? data.date.toDate().toISOString() : data.date
        } as any;
      });
      attendances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      attendances = await Promise.all(attendances.map(async (att) => {
         const sessionsSnap = await adminDb
           .collection('attendanceSessions')
           .where('attendanceId', '==', att.id)
           .get();
         return {
           ...att,
           sessions: sessionsSnap.docs.map(s => {
       const d = s.data();
       return {
         id: s.id,
         ...d,
         clockInTime: d.clockInTime && typeof d.clockInTime.toDate === 'function' ? d.clockInTime.toDate().toISOString() : (d.clockInTime || null),
         clockOutTime: d.clockOutTime && typeof d.clockOutTime.toDate === 'function' ? d.clockOutTime.toDate().toISOString() : (d.clockOutTime || null),
       };
    })
         };
      }));
      
      const payrollsSnap = await adminDb
        .collection('payrolls')
        .where('employeeProfileId', '==', profileData.id)
        .get();
      let payrolls = payrollsSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate().toISOString() : data.updatedAt
        } as any;
      });
      payrolls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return {
        ...profileData,
        user,
        shifts,
        documents,
        attendances,
        payrolls
      };
    }),

  createStaffUser: protectedProcedure
    .input(z.object({
      name: z.string(),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["STAFF", "ADMIN", "MASTER"]),
      allowedModules: z.array(z.string()).optional(),
      department: z.string().optional(),
      baseSalary: z.number().optional(),
      mobileNumber: z.string().optional(),
      jobTitle: z.string().optional(),
      manager: z.string().optional(),
      shifts: z.array(z.object({ startTime: z.string(), endTime: z.string() })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
      const email = input.email.toLowerCase().trim();
      // Only an org's MASTER (or the platform Owner) may create another
      // MASTER or ADMIN account. An ADMIN may only create STAFF accounts,
      // and only grant modules they themselves have been granted -- they
      // can never hand out access wider than their own.
      const actorIsOrgOwner = ctx.user.role === "MASTER" || ctx.user.isSuperAdmin;
      if (!actorIsOrgOwner && ctx.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot create staff accounts" });
      }
      if (!actorIsOrgOwner && input.role !== "STAFF") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only a Super Admin can create Admin accounts" });
      }
      let allowedModules = (input.allowedModules || []).filter((m): m is ModuleKey =>
        (MODULE_KEYS as readonly string[]).includes(m)
      );
      if (!actorIsOrgOwner) {
        const actorModules: string[] = (ctx.user as any).allowedModules || [];
        allowedModules = allowedModules.filter((m) => actorModules.includes(m));
      }
      // 1. Check if email exists
      const existingUserSnap = await adminDb
        .collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
        
      if (!existingUserSnap.empty) {
        throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });
      }

      // 2. Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      const orgId = ctx.user.organizationId;

      // 4. Create User
      const newUserRef = adminDb.collection('users').doc();
      await newUserRef.set({
        email,
        passwordHash,
        role: input.role,
        organizationId: orgId,
        isActive: true,
        emailVerified: true,
        allowedModules: input.role === "MASTER" ? [] : allowedModules,
      });

      // 5. Create EmployeeProfile
      const profileRef = adminDb.collection('employeeProfiles').doc();
      const profileData = {
        userId: newUserRef.id,
        organizationId: orgId,
        name: input.name,
        department: input.department ?? null,
        baseSalary: input.baseSalary ?? 0,
        employeeType: input.role === "ADMIN" ? "Admin" : "Employee",
        mobileNumber: input.mobileNumber ?? null,
        jobTitle: input.jobTitle ?? null,
        manager: input.manager ?? null,
      };
      await profileRef.set(profileData);
      
      if (input.shifts && input.shifts.length > 0) {
        const batch = adminDb.batch();
        input.shifts.forEach(s => {
           const shiftRef = adminDb.collection('shiftSegments').doc();
           batch.set(shiftRef, {
              employeeProfileId: profileRef.id,
              organizationId: orgId,
              startTime: s.startTime,
              endTime: s.endTime
           });
        });
        await batch.commit();
      }

      return { id: profileRef.id, ...profileData };
      } catch (err: any) {
        console.error("CREATE STAFF ERROR:", err);
        throw err;
      }
    }),

  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    const usersSnap = await adminDb
      .collection('users')
      .where('organizationId', '==', ctx.user.organizationId)
      .get();
      
    const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return Promise.all(users.map(async (u: any) => {
      const profileSnap = await adminDb
        .collection('employeeProfiles')
        .where('userId', '==', u.id)
        .limit(1)
        .get();
      
      return {
        id: u.id,
        email: u.email,
        role: u.role,
        isActive: u.isActive !== false,
        allowedModules: u.allowedModules || [],
        employeeProfile: profileSnap.empty ? null : { id: profileSnap.docs[0].id, name: (profileSnap.docs[0].data() as any)?.name }
      };
    }));
  }),

  // Change an existing team member's role/module grants. Same subset rule as
  // createStaffUser: an ADMIN can only grant modules they themselves have.
  updateStaffAccess: protectedProcedure
    .input(z.object({
      userId: z.string(),
      role: z.enum(["STAFF", "ADMIN"]),
      allowedModules: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const actorIsOrgOwner = ctx.user.role === "MASTER" || ctx.user.isSuperAdmin;
      if (!actorIsOrgOwner && ctx.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot manage team access" });
      }
      if (!actorIsOrgOwner && input.role !== "STAFF") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only a Super Admin can grant Admin rights" });
      }

      const targetSnap = await adminDb.collection('users').doc(input.userId).get();
      if (!targetSnap.exists || targetSnap.data()?.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (targetSnap.data()?.role === "MASTER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "The Super Admin account can't be modified here" });
      }

      let allowedModules = input.allowedModules.filter((m): m is ModuleKey =>
        (MODULE_KEYS as readonly string[]).includes(m)
      );
      if (!actorIsOrgOwner) {
        const actorModules: string[] = (ctx.user as any).allowedModules || [];
        allowedModules = allowedModules.filter((m) => actorModules.includes(m));
      }

      await adminDb.collection('users').doc(input.userId).update({
        role: input.role,
        allowedModules,
      });
      return { success: true };
    }),

  // Deactivate / reactivate a team member. This never deletes the user
  // document or their employeeProfile/attendance/payroll history -- it only
  // flips `isActive`, which is exactly what every existing query already
  // filters on, and what createTRPCContext checks to block their login.
  setStaffActive: protectedProcedure
    .input(z.object({ userId: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const actorIsOrgOwner = ctx.user.role === "MASTER" || ctx.user.isSuperAdmin;
      if (!actorIsOrgOwner && ctx.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot manage team access" });
      }
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You can't deactivate your own account" });
      }

      const targetSnap = await adminDb.collection('users').doc(input.userId).get();
      if (!targetSnap.exists || targetSnap.data()?.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (targetSnap.data()?.role === "MASTER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "The Super Admin account can't be deactivated" });
      }

      await adminDb.collection('users').doc(input.userId).update({ isActive: input.isActive });
      return { success: true };
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
        paidLeaveBalance: z.number().optional(),
        sickLeaveBalance: z.number().optional(),
        latePunchinBuffer: z.number().optional(),
        weeklyOffs: z.array(z.string()).optional(),
        salaryComponents: z.array(z.object({ name: z.string(), amount: z.number(), type: z.enum(['addition', 'deduction']) })).optional(),
        avatarUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // This can rewrite salary, leave balances, and shifts for ANY
      // employee -- it must be restricted to the same Master/Owner/Admin
      // tier as the rest of team management, and the target user must
      // belong to the caller's own organization (otherwise a guessed
      // userId from another org could have its profile silently
      // reassigned into this one).
      const actorIsOrgOwner = ctx.user.role === "MASTER" || ctx.user.isSuperAdmin;
      const actorModules: string[] = (ctx.user as any).allowedModules || [];
      if (!actorIsOrgOwner && !(ctx.user.role === "ADMIN" && actorModules.includes("attendance"))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot manage employee profiles" });
      }
      const targetUserSnap = await adminDb.collection('users').doc(input.userId).get();
      if (!targetUserSnap.exists || targetUserSnap.data()?.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const profileSnap = await adminDb
        .collection('employeeProfiles')
        .where('userId', '==', input.userId)
        .limit(1)
        .get();
        
      let profileId;
      let profileData = {
        name: input.name,
        department: input.department ?? null,
        manager: input.manager ?? null,
        employeeType: input.employeeType ?? "Employee",
        baseSalary: input.baseSalary ?? 0,
        mobileNumber: input.mobileNumber ?? null,
        jobTitle: input.jobTitle ?? null,
        organizationId: ctx.user.organizationId,
      };

      if (!profileSnap.empty) {
         profileId = profileSnap.docs[0].id;
         await adminDb.collection('employeeProfiles').doc(profileId).update(profileData);
      } else {
         profileData = { ...profileData, userId: input.userId } as any;
         const ref = adminDb.collection('employeeProfiles').doc();
         await ref.set(profileData);
         profileId = ref.id;
      }
      
      const returnProfile = { id: profileId, ...profileData, userId: input.userId };

      // Handle shifts
      if (input.shifts) {
         // Delete existing shifts
         const existingShiftsSnap = await adminDb
            .collection('shiftSegments')
            .where('employeeProfileId', '==', profileId)
            .get();
            
         if (!existingShiftsSnap.empty) {
            const batch = adminDb.batch();
            existingShiftsSnap.docs.forEach(doc => {
               batch.delete(doc.ref);
            });
            await batch.commit();
         }
         
         // Create new ones
         if (input.shifts.length > 0) {
            const createBatch = adminDb.batch();
            input.shifts.forEach(s => {
               const shiftRef = adminDb.collection('shiftSegments').doc();
               createBatch.set(shiftRef, {
                  employeeProfileId: profileId,
                  organizationId: ctx.user.organizationId,
                  startTime: s.startTime,
                  endTime: s.endTime
               });
            });
            await createBatch.commit();
         }
      }

      return returnProfile;
    }),
});
