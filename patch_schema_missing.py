import re

with open("prisma/schema.prisma", "r") as f:
    content = f.read()

models_to_patch = [
    "Anamnesis", "TreatmentPlanItem", "InvoiceItem", "ShiftSegment", 
    "Attendance", "AttendanceSession", "LeaveRequest", "PayrollRecord", 
    "ResignationRequest", "RejoinRequest", "EmployeeDocument", 
    "LateRequest", "EarlyPunchOutRequest"
]

def replacer(match):
    name = match.group(1)
    body = match.group(2)
    if name in models_to_patch and "organizationId String?" not in body:
        new_body = body.rstrip() + "\n  organizationId String?\n  organization   Organization? @relation(fields: [organizationId], references: [id])\n"
        return f"model {name} {{{new_body}}}"
    return match.group(0)

content = re.sub(r"model (\w+) \{([\s\S]*?)\}", replacer, content)

with open("prisma/schema.prisma", "w") as f:
    f.write(content)

print("Patched schema.prisma with missing organizationIds")
