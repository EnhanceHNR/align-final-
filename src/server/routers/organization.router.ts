import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { hashPassword } from "~/lib/password";
import { adminDb } from "@/lib/firebaseAdmin";

export const organizationRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.user.organizationId;
    if (!orgId) throw new TRPCError({ code: "NOT_FOUND", message: "No organization linked" });
    
    const orgDoc = await adminDb.collection("organizations").doc(orgId).get();
    let org: any = orgDoc.exists ? { id: orgDoc.id, ...orgDoc.data() } : null;
    
    // Fallback to the creator's account email if the organization email isn't set yet
    if (org && !org.email && ctx.user.email) {
      org.email = ctx.user.email;
    }
    
    return org;
  }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      address: z.string().optional(),
      orgType: z.string(),
      workingHoursStart: z.string(),
      workingHoursEnd: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new TRPCError({ code: "NOT_FOUND" });
      
      await adminDb.collection("organizations").doc(orgId).update({
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        orgType: input.orgType,
        workingHoursStart: input.workingHoursStart,
        workingHoursEnd: input.workingHoursEnd
      });
      
      return { success: true };
    }),

  changePassword: protectedProcedure
    .input(z.object({
      newPassword: z.string().min(6)
    }))
    .mutation(async ({ ctx, input }) => {
      const hashedPassword = await hashPassword(input.newPassword);
      await adminDb.collection("users").doc(ctx.user.id).update({ 
        passwordHash: hashedPassword 
      });
      return { success: true };
    })
});
