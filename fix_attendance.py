import re

with open("src/server/routers/attendance.router.ts", "r") as f:
    content = f.read()

# Replace findFirst queries
content = content.replace("where: {\n          employeeProfileId: input.employeeProfileId,", "where: {\n          organizationId: ctx.user.organizationId,\n          employeeProfileId: input.employeeProfileId,")

# Replace creates
# data: { ... } -> data: { ... , organizationId: ctx.user.organizationId }
# It's tricky to inject into creates. 
# Better:
content = content.replace("data: {\n            employeeProfileId: input.employeeProfileId,", "data: {\n            organizationId: ctx.user.organizationId,\n            employeeProfileId: input.employeeProfileId,")
content = content.replace("data: {\n          employeeProfileId: input.employeeProfileId,", "data: {\n          organizationId: ctx.user.organizationId,\n          employeeProfileId: input.employeeProfileId,")
content = content.replace("data: {\n        employeeProfileId: session.employeeProfileId,", "data: {\n        organizationId: ctx.user.organizationId,\n        employeeProfileId: session.employeeProfileId,")

# Wait, `findUnique` for session:
#       const session = await ctx.db.attendanceSession.findUnique({
#         where: { id: input.sessionId },
# We must change to findFirst to include organizationId:
content = content.replace("await ctx.db.attendanceSession.findUnique({", "await ctx.db.attendanceSession.findFirst({")
content = content.replace("where: { id: input.sessionId },", "where: { id: input.sessionId, organizationId: ctx.user.organizationId },")

# Same for update
# return ctx.db.attendanceSession.update({
#   where: { id: input.sessionId },
# In Prisma, update requires unique. But if it's not unique on orgId, we can't update securely unless we check first.
# Wait, if we use findFirst, we verify the session belongs to the org, then we update it by id. This is secure!

with open("src/server/routers/attendance.router.ts", "w") as f:
    f.write(content)

print("attendance router secured.")
