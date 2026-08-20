import re

with open("src/server/routers/appointment.router.ts", "r") as f:
    content = f.read()

# 1. getCalendarEvents (uses prisma instead of ctx.db in promise.all)
# Where is getCalendarEvents defined?
# prisma.appointment.findMany({
#                 where: {
content = content.replace("prisma.appointment.findMany({\n                where: {", "prisma.appointment.findMany({\n                where: {\n                    organizationId: ctx.user.organizationId,")
content = content.replace("const localAppointments = await ctx.db.appointment.findMany({\n                where: {", "const localAppointments = await ctx.db.appointment.findMany({\n                where: {\n                    organizationId: ctx.user.organizationId,")
content = content.replace("const chairs = await ctx.db.chair.findMany({\n                where: {", "const chairs = await ctx.db.chair.findMany({\n                where: {\n                    organizationId: ctx.user.organizationId,")

# 2. create
# It uses ctx.db.appointment.create({
content = content.replace("await ctx.db.appointment.create({\n                data: {", "await ctx.db.appointment.create({\n                data: {\n                    organizationId: ctx.user.organizationId,")

# 3. getDashboardStats
content = content.replace("prisma.appointment.findMany({\n                where: {\n                    startTime: {", "prisma.appointment.findMany({\n                where: {\n                    organizationId: ctx.user.organizationId,\n                    startTime: {")

with open("src/server/routers/appointment.router.ts", "w") as f:
    f.write(content)

print("Appointment router secured.")
