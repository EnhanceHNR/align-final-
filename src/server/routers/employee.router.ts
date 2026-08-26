import bcrypt from 'bcryptjs';
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
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
      let attendances = attendancesSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      attendances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      attendances = await Promise.all(attendances.map(async (att) => {
         const sessionsSnap = await adminDb
           .collection('attendanceSessions')
           .where('attendanceId', '==', att.id)
           .get();
         return {
           ...att,
           sessions: sessionsSnap.docs.map(s => ({ id: s.id, ...s.data() }))
         };
      }));
      
      const payrollsSnap = await adminDb
        .collection('payrolls')
        .where('employeeProfileId', '==', profileData.id)
        .get();
      let payrolls = payrollsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
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
      department: z.string().optional(),
      baseSalary: z.number().optional(),
      mobileNumber: z.string().optional(),
      jobTitle: z.string().optional(),
      manager: z.string().optional(),
      shifts: z.array(z.object({ startTime: z.string(), endTime: z.string() })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
      // 1. Check if email exists
      const existingUserSnap = await adminDb
        .collection('users')
        .where('email', '==', input.email)
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
        email: input.email,
        passwordHash,
        role: input.role,
        organizationId: orgId,
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
        employeeProfile: profileSnap.empty ? null : { id: profileSnap.docs[0].id }
      };
    }));
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
