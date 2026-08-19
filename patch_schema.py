import re

with open("prisma/schema.prisma", "r") as f:
    content = f.read()

# Add jobTitle to EmployeeProfile
target = "  employeeType               String    @default(\"Employee\") // Super Admin, Admin, Employee"
replacement = "  employeeType               String    @default(\"Employee\") // Super Admin, Admin, Employee\n  jobTitle                   String?"

content = content.replace(target, replacement)

with open("prisma/schema.prisma", "w") as f:
    f.write(content)

print("Patched schema.prisma with jobTitle")
