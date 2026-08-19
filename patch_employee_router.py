with open("src/server/routers/employee.router.ts", "r") as f:
    content = f.read()

import re

# Update createStaffUser input
content = re.sub(
    r"department: z.string\(\).optional\(\),[\s\n]*baseSalary: z.number\(\).optional\(\),",
    "department: z.string().optional(),\n      baseSalary: z.number().optional(),\n      mobileNumber: z.string().optional(),\n      jobTitle: z.string().optional(),\n      manager: z.string().optional(),\n      shifts: z.array(z.object({ startTime: z.string(), endTime: z.string() })).optional(),",
    content
)

# Update createStaffUser implementation
target_profile_create = """      // 5. Create EmployeeProfile
      const profile = await ctx.db.employeeProfile.create({
        data: {
          userId: newUser.id,
          name: input.name,
          department: input.department,
          baseSalary: input.baseSalary ?? 0,
          employeeType: input.role === "ADMIN" ? "Admin" : "Employee"
        }
      });"""

new_profile_create = """      // 5. Create EmployeeProfile
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
      });"""
content = content.replace(target_profile_create, new_profile_create)

# Update upsertProfile
target_upsert_input = """        department: z.string().optional(),
        manager: z.string().optional(),
        employeeType: z.string().optional(),
        baseSalary: z.number().optional(),"""

new_upsert_input = """        department: z.string().optional(),
        manager: z.string().optional(),
        employeeType: z.string().optional(),
        baseSalary: z.number().optional(),
        mobileNumber: z.string().optional(),
        jobTitle: z.string().optional(),
        shifts: z.array(z.object({ id: z.string().optional(), startTime: z.string(), endTime: z.string() })).optional(),"""
content = content.replace(target_upsert_input, new_upsert_input)

# Replace upsertProfile mutation body
target_upsert_mut = """    .mutation(async ({ ctx, input }) => {
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
    }),"""

new_upsert_mut = """    .mutation(async ({ ctx, input }) => {
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
    }),"""
content = content.replace(target_upsert_mut, new_upsert_mut)

with open("src/server/routers/employee.router.ts", "w") as f:
    f.write(content)

print("Patched employee router.")
